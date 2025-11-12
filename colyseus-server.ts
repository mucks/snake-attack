import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { GameRoom } from './colyseus-server/rooms/GameRoom';

const dev = process.env.NODE_ENV !== 'production';
const hostname = dev ? 'localhost' : '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const httpServer = createServer((req, res) => {
        const parsedUrl = parse(req.url!, true);
        handle(req, res, parsedUrl);
    });

    // Create Colyseus server with explicit WebSocket transport
    const gameServer = new Server({
        transport: new WebSocketTransport({
            server: httpServer,
            pingInterval: 3000,
            pingMaxRetries: 3,
        }),
    });

    // Register game room
    gameServer.define('game', GameRoom);

    // Start listening
    httpServer.listen(port, hostname, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
        console.log('[COLYSEUS] Server ready');
        console.log('[COLYSEUS] Game room available');
    });
}).catch((err) => {
    console.error('[ERROR] Server failed to start:', err);
    process.exit(1);
});

