# 🚀 Deployment Guide - Vercel + Railway

## Overview

Since Vercel doesn't support WebSockets, we'll deploy in two parts:
- **Frontend (Next.js)**: Vercel ✅ (already done!)
- **Backend (Socket.IO)**: Railway.app 🚂 (easy setup!)

---

## 🎯 Architecture

```
[Players' Browsers]
        ↓
[Vercel - Next.js Frontend]
        ↓ (Socket.IO connection)
[Railway - Socket.IO Server]
```

---

## 📝 Step-by-Step: Railway Deployment

### **1. Create Standalone Socket.IO Server**

Create a new file `socket-server.ts`:

```typescript
import { createServer } from 'http';
import { Server } from 'socket.io';

const PORT = process.env.PORT || 3001;

const httpServer = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Socket.IO Server Running');
});

const io = new Server(httpServer, {
    cors: {
        origin: '*', // In production, set to your Vercel URL
        methods: ['GET', 'POST'],
    },
});

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

io.on('connection', (socket) => {
    console.log('[SERVER] Player connected:', socket.id);

    // Send current players
    const currentPlayers = Array.from(gameState.players.entries())
        .filter(([id, data]) => data.spawned)
        .map(([id, data]) => ({ id, ...data }));
    socket.emit('current-players', currentPlayers);

    // Initialize player
    const playerData: PlayerData = {
        position: { x: 0, y: 0.5, z: 0 },
        direction: { x: 0, y: 0, z: -1 },
        trail: [],
        length: 20,
        score: 0,
        color: \`hsl(\${Math.random() * 360}, 70%, 50%)\`,
        alive: false,
        spawned: false,
    };

    gameState.players.set(socket.id, playerData);
    socket.emit('player-id', socket.id);
    socket.emit('player-spawn-data', { color: playerData.color });

    // Handle player updates
    socket.on('player-update', (data: Partial<PlayerData>) => {
        if (gameState.players.has(socket.id)) {
            const currentPlayer = gameState.players.get(socket.id)!;
            if (currentPlayer.spawned && currentPlayer.alive) {
                gameState.players.set(socket.id, { ...currentPlayer, ...data });
                socket.broadcast.emit('player-moved', { id: socket.id, ...data });
            }
        }
    });

    // Handle respawn
    socket.on('request-respawn', () => {
        if (gameState.players.has(socket.id)) {
            const spawnRadius = 40;
            const angle = Math.random() * Math.PI * 2;
            const radius = 10 + Math.random() * spawnRadius;
            const spawnX = Math.cos(angle) * radius;
            const spawnZ = Math.sin(angle) * radius;
            const dirAngle = Math.random() * Math.PI * 2;

            const newSpawnData = {
                position: { x: spawnX, y: 0.5, z: spawnZ },
                direction: { x: Math.sin(dirAngle), y: 0, z: Math.cos(dirAngle) },
            };

            const player = gameState.players.get(socket.id)!;
            player.position = newSpawnData.position;
            player.direction = newSpawnData.direction;
            player.trail = [];
            player.alive = true;
            player.spawned = true;
            player.length = 20;

            socket.emit('player-spawn-data', newSpawnData);
            socket.broadcast.emit('player-joined', {
                id: socket.id,
                position: newSpawnData.position,
                direction: newSpawnData.direction,
                color: player.color,
                length: player.length,
            });
        }
    });

    // Handle death
    socket.on('player-died', (data: { trail?: Vector3[] }) => {
        if (gameState.players.has(socket.id)) {
            const player = gameState.players.get(socket.id)!;
            player.alive = false;
            player.spawned = false;
            const playerTrail = data?.trail || player.trail;
            player.trail = [];

            io.emit('player-died', {
                id: socket.id,
                trail: playerTrail,
            });
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        gameState.players.delete(socket.id);
        io.emit('player-left', socket.id);
    });
});

httpServer.listen(PORT, () => {
    console.log(\`> Socket.IO server ready on port \${PORT}\`);
});
```

### **2. Update package.json**

Add a start script for production:

```json
{
  "scripts": {
    "dev": "tsx server.ts",
    "dev:socket": "tsx socket-server.ts",
    "build": "next build",
    "start:socket": "tsx socket-server.ts",
    "start": "next start"
  }
}
```

### **3. Deploy to Railway**

1. Go to **railway.app**
2. Sign in with GitHub
3. Click **"New Project"**
4. Choose **"Deploy from GitHub repo"**
5. Select your `snake-attack` repo
6. Railway will:
   - Auto-detect Node.js
   - Install dependencies
   - Run `start:socket` script
   - Give you a URL like: `snake-attack-production.up.railway.app`

### **4. Update Frontend to Use Railway URL**

In `SnakeGame.tsx`, update the Socket.IO connection:

```typescript
// Find this line (around line 2000):
socket = io({
    path: '/socket.io',
});

// Change to:
socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
    path: '/socket.io',
});
```

### **5. Add Environment Variable in Vercel**

1. Go to Vercel dashboard
2. Select your project
3. Settings → Environment Variables
4. Add:
   - **Key**: `NEXT_PUBLIC_SOCKET_URL`
   - **Value**: `https://your-railway-url.railway.app`
5. Redeploy

---

## 🚂 Railway Configuration

Create `railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "pnpm start:socket",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## 🔧 Alternative: Render.com (Free Tier)

### **Deploy on Render**

1. Go to render.com
2. New → Web Service
3. Connect your GitHub repo
4. Settings:
   - **Name**: snake-attack-socket
   - **Environment**: Node
   - **Build Command**: `pnpm install`
   - **Start Command**: `pnpm start:socket`
   - **Plan**: Free
5. Deploy!

**Note**: Free tier spins down after 15min inactivity (30s wake time)

---

## 💰 Cost Comparison

| Service | Free Tier | Cost | Wake Time | Uptime |
|---------|-----------|------|-----------|---------|
| Railway | $5 credit/month | $5/month after | Instant | 24/7 |
| Render | 750 hours/month | Free | 30s spin-up | Sleeps after 15min |
| Fly.io | 3 VMs free | Free | Instant | 24/7 |

**Recommendation**: Railway for best experience, Render if you want completely free.

---

## 🔐 Production Security

Update CORS in `socket-server.ts`:

```typescript
const io = new Server(httpServer, {
    cors: {
        origin: [
            'https://your-vercel-app.vercel.app',
            'http://localhost:3000', // For local dev
        ],
        methods: ['GET', 'POST'],
    },
});
```

---

## 🧪 Testing

### **Local Testing (Both Servers)**
```bash
# Terminal 1 - Socket.IO server
pnpm dev:socket

# Terminal 2 - Next.js frontend
pnpm dev:next
```

### **Production Testing**
1. Deploy Socket.IO to Railway
2. Get Railway URL: `https://xxx.railway.app`
3. Add to Vercel env vars
4. Redeploy Vercel
5. Test on your Vercel URL!

---

## 📊 Which Option Should You Choose?

### **Railway** ⭐ (Best Overall)
- Perfect for WebSockets
- Always-on (no cold starts)
- $5/month (very affordable)
- Professional solution

### **Render Free Tier**
- Completely free
- Good for testing/hobby projects
- 30-second wake time (annoying for users)
- Spins down after 15 minutes

### **Fly.io**
- Free tier generous
- Global edge deployment
- Requires Docker knowledge
- More setup but very powerful

---

## 🎯 My Recommendation

**Use Railway** because:
1. ✅ Easiest setup (5 minutes)
2. ✅ No cold starts
3. ✅ $5/month is reasonable
4. ✅ Auto-deploys from GitHub
5. ✅ Perfect for Socket.IO

Would you like me to create the `socket-server.ts` file and update the connection code in `SnakeGame.tsx` for you?

