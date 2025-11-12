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
                player.x = message.x;
                player.y = message.y;
                player.z = message.z;
                player.length = 5;
                console.log(`[COLYSEUS] Player ${client.sessionId} spawned`);
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

        // Generate random spawn position
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 100 + 50;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

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

        console.log(`[COLYSEUS] Player ${client.sessionId} initialized`);
    }

    onLeave(client: Client, consented: boolean) {
        console.log(`[COLYSEUS] ${client.sessionId} left`);
        this.state.players.delete(client.sessionId);
    }

    onDispose() {
        console.log('[COLYSEUS] GameRoom disposed');
    }
}

