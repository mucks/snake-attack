import { createServer } from 'http';
import next from 'next';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { Encoder } from '@colyseus/schema';
import { GameRoom } from './colyseus-server/rooms/GameRoom';
import express from 'express';

// Increase buffer size for multiplayer
Encoder.BUFFER_SIZE = 32 * 1024; // 32 KB

const dev = process.env.NODE_ENV !== 'production';
const hostname = dev ? 'localhost' : '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);
const colyseusPort = dev ? 2567 : port; // Separate port in dev to avoid WebSocket conflicts

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    if (dev) {
        // In development: Run Colyseus on separate port to avoid WebSocket conflicts with Next.js HMR
        const gameServer = new Server({
            transport: new WebSocketTransport({
                pingInterval: 3000,
                pingMaxRetries: 3,
            }),
        });

        gameServer.define('game', GameRoom);

        gameServer.listen(colyseusPort).then(() => {
            console.log(`[COLYSEUS] Server listening on ws://${hostname}:${colyseusPort}`);
            console.log('[COLYSEUS] Game room available');
        });

        // Start Next.js on main port
        const nextServer = createServer((req, res) => {
            handle(req, res);
        });

        nextServer.listen(port, hostname, () => {
            console.log(`> Next.js ready on http://${hostname}:${port}`);
            console.log(`> Colyseus ready on ws://${hostname}:${colyseusPort}`);
        });
    } else {
        // In production: Use shared HTTP server with Express
        const expressApp = express();
        const httpServer = createServer(expressApp);

        const gameServer = new Server({
            transport: new WebSocketTransport({
                server: httpServer,
                pingInterval: 3000,
                pingMaxRetries: 3,
            }),
        });

        gameServer.define('game', GameRoom);

        // All routes go to Next.js
        expressApp.use((req, res) => {
            handle(req, res);
        });

        httpServer.listen(port, hostname, () => {
            console.log(`> Ready on http://${hostname}:${port}`);
            console.log('[COLYSEUS] Server ready');
            console.log('[COLYSEUS] Game room available');
        });
    }
}).catch((err) => {
    console.error('[ERROR] Server failed to start:', err);
    process.exit(1);
});

