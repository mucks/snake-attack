import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server, Socket } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const hostname = dev ? 'localhost' : '0.0.0.0'; // Bind to all interfaces in production
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Types for game state
interface Vector3 {
    x: number;
    y: number;
    z: number;
}

interface PlayerData {
    position: Vector3;
    direction: Vector3;
    trail: Vector3[];
    length: number;
    score: number;
    color: string;
    alive: boolean;
    spawned: boolean;
}

interface GameState {
    players: Map<string, PlayerData>;
}

const gameState: GameState = {
    players: new Map(),
};

app.prepare().then(() => {
    const httpServer = createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url || '', true);
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    });

    const io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN || '*',
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    io.on('connection', (socket: Socket) => {
        console.log('[SERVER] ===== NEW PLAYER CONNECTION =====');
        console.log('[SERVER] Player connected:', socket.id);

        // Send current players to new player (only spawned ones)
        const currentPlayers = Array.from(gameState.players.entries())
            .filter(([id, data]) => data.spawned)
            .map(([id, data]) => ({
                id,
                ...data,
            }));
        console.log(`[SERVER] Sending ${currentPlayers.length} spawned players to new player`);
        socket.emit('current-players', currentPlayers);

        // Initialize player as NOT spawned - they must press space to spawn
        const playerData: PlayerData = {
            position: { x: 0, y: 0.5, z: 0 },
            direction: { x: 0, y: 0, z: -1 },
            trail: [],
            length: 20,
            score: 0,
            color: `hsl(${Math.random() * 360}, 70%, 50%)`,
            alive: false,
            spawned: false,
        };

        gameState.players.set(socket.id, playerData);

        console.log(`[SERVER] Player ${socket.id} initialized (NOT spawned yet - awaiting space press)`);
        console.log(`[SERVER] Total connected players: ${gameState.players.size}`);

        // Send player their ID and color
        socket.emit('player-id', socket.id);
        socket.emit('player-spawn-data', { color: playerData.color });

        // Handle player updates (only if spawned and alive)
        socket.on('player-update', (data: Partial<PlayerData>) => {
            if (gameState.players.has(socket.id)) {
                const currentPlayer = gameState.players.get(socket.id)!;
                if (currentPlayer.spawned && currentPlayer.alive) {
                    gameState.players.set(socket.id, {
                        ...currentPlayer,
                        ...data,
                    });

                    socket.broadcast.emit('player-moved', {
                        id: socket.id,
                        ...data,
                    });
                }
            }
        });

        // Handle spawn/respawn requests
        socket.on('request-respawn', () => {
            if (gameState.players.has(socket.id)) {
                // Generate new random spawn position, avoiding other players
                const spawnRadius = 40;
                const minDistanceBetweenPlayers = 15;
                let spawnX: number = 0;
                let spawnZ: number = 0;
                let attempts = 0;
                const maxAttempts = 20;

                do {
                    const angle = Math.random() * Math.PI * 2;
                    const radius = 10 + Math.random() * spawnRadius;
                    spawnX = Math.cos(angle) * radius;
                    spawnZ = Math.sin(angle) * radius;

                    let tooClose = false;
                    for (const [id, player] of gameState.players) {
                        if (id === socket.id) continue; // Skip self
                        const dx = player.position.x - spawnX;
                        const dz = player.position.z - spawnZ;
                        const distance = Math.sqrt(dx * dx + dz * dz);
                        if (distance < minDistanceBetweenPlayers) {
                            tooClose = true;
                            break;
                        }
                    }

                    if (!tooClose) break;
                    attempts++;
                } while (attempts < maxAttempts);

                const dirAngle = Math.random() * Math.PI * 2;

                const newSpawnData = {
                    position: { x: spawnX, y: 0.5, z: spawnZ },
                    direction: { x: Math.sin(dirAngle), y: 0, z: Math.cos(dirAngle) },
                };

                // Update player data
                const player = gameState.players.get(socket.id)!;
                player.position = newSpawnData.position;
                player.direction = newSpawnData.direction;
                player.trail = [];
                player.alive = true;
                player.spawned = true;
                player.length = 20;

                console.log(`[SERVER] Player ${socket.id} spawning at (${spawnX.toFixed(1)}, ${spawnZ.toFixed(1)})`);

                // Send new spawn data to player
                socket.emit('player-spawn-data', newSpawnData);

                console.log(`[SERVER] Broadcasting player-joined for ${socket.id} to other players`);
                // Broadcast to other players that this player has spawned
                socket.broadcast.emit('player-joined', {
                    id: socket.id,
                    position: newSpawnData.position,
                    direction: newSpawnData.direction,
                    color: player.color,
                    length: player.length,
                });
            }
        });

        // Handle player death
        socket.on('player-died', (data: { trail?: Vector3[] }) => {
            console.log(`[SERVER] Received player-died from ${socket.id}. Trail points: ${data?.trail?.length || 0}`);

            if (gameState.players.has(socket.id)) {
                const player = gameState.players.get(socket.id)!;
                player.alive = false;
                player.spawned = false;
                const playerTrail = data?.trail || player.trail;
                player.trail = [];

                console.log(`[SERVER] Player ${socket.id} died with trail of ${playerTrail.length} points. Broadcasting to all clients...`);

                // Notify all players that this player died and where to spawn items
                io.emit('player-died', {
                    id: socket.id,
                    trail: playerTrail,
                });

                console.log(`[SERVER] Broadcast complete for death of ${socket.id}`);
            } else {
                console.log(`[SERVER] ERROR: player-died received but player ${socket.id} not found in gameState`);
            }
        });

        // Handle player disconnect
        socket.on('disconnect', () => {
            console.log('Player disconnected:', socket.id);
            gameState.players.delete(socket.id);
            io.emit('player-left', socket.id);
        });
    });

    httpServer
        .once('error', (err) => {
            console.error(err);
            process.exit(1);
        })
        .listen(port, () => {
            console.log(`> Ready on http://${hostname}:${port}`);
            console.log(`> Socket.IO server ready`);
        });
});

