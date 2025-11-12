import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'colyseus';
import { monitor } from '@colyseus/monitor';
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

    // Create Colyseus server
    const gameServer = new Server({
        server: httpServer,
        express: undefined,
    });

    // Register game room
    gameServer.define('game', GameRoom);

    // (Optional) Attach monitoring panel (development only)
    if (dev) {
        // Note: Monitor requires express, we're skipping it for simplicity
        console.log('[COLYSEUS] Monitor not available in dev mode (requires express)');
    }

    gameServer.listen(port);

    console.log(`> Ready on http://${hostname}:${port}`);
    console.log('[COLYSEUS] Server ready');
    console.log('[COLYSEUS] Game room available');
}).catch((err) => {
    console.error('[ERROR] Server failed to start:', err);
    process.exit(1);
});

