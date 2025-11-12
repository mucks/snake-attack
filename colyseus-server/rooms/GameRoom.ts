import { Room, Client } from 'colyseus';
import { GameState, Player } from '../schema/GameState';

const gridSize = 1000;

export class GameRoom extends Room<GameState> {
    maxClients = 15; // Maximum 15 players per room

    onCreate(options: any) {
        this.setState(new GameState());

        // Increase seat reservation timeout to 20 seconds (default is 10s)
        this.setSeatReservationTime(20);

        console.log('[COLYSEUS] GameRoom created');

        // Handle player spawn
        this.onMessage('spawn', (client, message) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                player.spawned = true;
                // Use server-side position (already set away from others in onJoin)
                // Don't override with client position to ensure proper spacing
                player.length = 5;
                console.log(`[COLYSEUS] Player ${client.sessionId} spawned at (${player.x.toFixed(0)}, ${player.z.toFixed(0)})`);
            }
        });

        // Handle player movement
        this.onMessage('move', (client, message) => {
            const player = this.state.players.get(client.sessionId);
            if (player && player.spawned) {
                player.x = message.x;
                player.y = message.y;
                player.z = message.z;
                player.targetRotation = message.targetRotation;
                player.boosting = message.boosting || false;
            }
        });

        // Handle player death
        this.onMessage('player-died', (client, message) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                player.spawned = false;
                player.length = 0;
                console.log(`[COLYSEUS] Player ${client.sessionId} died`);
            }
        });

        // Handle player growth
        this.onMessage('player-grow', (client, message) => {
            const player = this.state.players.get(client.sessionId);
            if (player && player.spawned) {
                player.length = message.length;
            }
        });
    }

    onJoin(client: Client, options: any) {
        console.log(`[COLYSEUS] ${client.sessionId} joined`);

        // Generate spawn position away from other players
        let x = 0, z = 0;
        let attempts = 0;
        const minDistance = 100; // Minimum distance from other players

        while (attempts < 20) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 200 + 100; // Spawn further out
            x = Math.cos(angle) * distance;
            z = Math.sin(angle) * distance;

            // Check distance from all other players
            let tooClose = false;
            this.state.players.forEach((otherPlayer) => {
                const dx = x - otherPlayer.x;
                const dz = z - otherPlayer.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < minDistance) {
                    tooClose = true;
                }
            });

            if (!tooClose) break;
            attempts++;
        }

        // Generate random color
        const hue = Math.random() * 360;
        const color = `hsl(${hue}, 70%, 50%)`;

        // Create player
        const player = new Player();
        player.id = client.sessionId;
        player.x = x;
        player.y = 1;
        player.z = z;
        player.color = color;
        player.spawned = false;

        this.state.players.set(client.sessionId, player);

        console.log(`[COLYSEUS] Player ${client.sessionId} initialized at (${x.toFixed(0)}, ${z.toFixed(0)})`);
    }

    onLeave(client: Client, consented: boolean) {
        console.log(`[COLYSEUS] ${client.sessionId} left`);
        this.state.players.delete(client.sessionId);
    }

    onDispose() {
        console.log('[COLYSEUS] GameRoom disposed');
    }
}

