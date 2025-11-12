# Socket.IO to Colyseus Replacement Guide

## Complete replacement for the multiplayer section (lines 2437-2673 in SnakeGame.tsx)

Replace the entire Socket.IO setup block with this Colyseus version:

```typescript
// Set up multiplayer connection with Colyseus
(async () => {
    try {
        room = await client.joinOrCreate('game');
        myPlayerId = room.sessionId;
        
        console.log('[COLYSEUS] Connected! Session ID:', myPlayerId);

        // Get initial player data (color)
        const myPlayer = room.state.players.get(myPlayerId);
        if (myPlayer && myPlayer.color) {
            const hue = parseInt(myPlayer.color.match(/\d+/)?.[0] || '0');
            const colorNum = new THREE.Color().setHSL(hue / 360, 0.7, 0.5).getHex();
            
            head.traverse((child) => {
                if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                    if (child.material.color.getHex() !== 0xffffff && child.material.color.getHex() !== 0x000000) {
                        child.material.color.setHex(colorNum);
                        child.material.emissive.setHex(colorNum);
                    }
                }
            });
            
            snakeLight.color.setHex(colorNum);
            setMyPlayerColor('#' + colorNum.toString(16).padStart(6, '0'));
        }

        // Listen for new players
        room.state.players.onAdd((player, sessionId) => {
            if (sessionId !== myPlayerId && player.spawned) {
                const position = new THREE.Vector3(player.x, player.y, player.z);
                const direction = new THREE.Vector3(1, 0, 0);
                
                const multiPlayer = createMultiplayerPlayer(
                    sessionId,
                    player.color,
                    position,
                    direction
                );
                gameState.multiplayerPlayers.set(sessionId, multiPlayer);
                
                console.log('[COLYSEUS] Player added:', sessionId);
                updatePlayersOnlineCount();
            }
        });

        // Listen for player changes (position updates)
        room.state.players.onChange((player, sessionId) => {
            if (sessionId !== myPlayerId) {
                const multiPlayer = gameState.multiplayerPlayers.get(sessionId);
                
                if (player.spawned && !multiPlayer) {
                    // Player just spawned
                    const position = new THREE.Vector3(player.x, player.y, player.z);
                    const direction = new THREE.Vector3(1, 0, 0);
                    
                    const newPlayer = createMultiplayerPlayer(
                        sessionId,
                        player.color,
                        position,
                        direction
                    );
                    gameState.multiplayerPlayers.set(sessionId, newPlayer);
                    updatePlayersOnlineCount();
                } else if (multiPlayer && player.spawned) {
                    // Update position (smooth interpolation)
                    multiPlayer.targetPosition.set(player.x, player.y, player.z);
                    multiPlayer.length = player.length;
                } else if (multiPlayer && !player.spawned) {
                    // Player died - remove from scene
                    scene.remove(multiPlayer.head);
                    scene.remove(multiPlayer.light);
                    if (multiPlayer.trailMesh) {
                        disposeTrailMesh(multiPlayer.trailMesh);
                    }
                    gameState.multiplayerPlayers.delete(sessionId);
                    updatePlayersOnlineCount();
                }
            }
        });

        // Listen for players leaving
        room.state.players.onRemove((player, sessionId) => {
            const multiPlayer = gameState.multiplayerPlayers.get(sessionId);
            if (multiPlayer) {
                scene.remove(multiPlayer.head);
                scene.remove(multiPlayer.light);
                if (multiPlayer.trailMesh) {
                    disposeTrailMesh(multiPlayer.trailMesh);
                }
                gameState.multiplayerPlayers.delete(sessionId);
                console.log('[COLYSEUS] Player removed:', sessionId);
                updatePlayersOnlineCount();
            }
        });

        updatePlayersOnlineCount();
    } catch (error) {
        console.error('[COLYSEUS] Connection error:', error);
    }
})();
```

## Key Changes

1. **Connection**: `room = await client.joinOrCreate('game')` instead of `socket = io()`
2. **Player ID**: `room.sessionId` instead of waiting for `player-id` event
3. **State Sync**: `room.state.players.onAdd/onChange/onRemove` instead of individual socket events
4. **Automatic Updates**: Colyseus automatically syncs state changes - no manual `player-moved` events needed

## Update Movement Broadcasting

In the animate() loop, replace socket.emit with:

```typescript
// OLD:
if (socket && gameStateRef.current.spawned) {
    socket.emit('player-move', {
        position: gameState.snake.position,
        direction: gameState.snake.direction,
        // ...
    });
}

// NEW:
if (room && gameStateRef.current.spawned) {
    room.send('move', {
        x: gameState.snake.position.x,
        y: gameState.snake.position.y,
        z: gameState.snake.position.z,
        targetRotation: gameState.snake.targetRotation,
        boosting: gameState.snake.boost > 0,
    });
}
```

## Update Spawn

Replace socket.emit('request-spawn') with:

```typescript
room.send('spawn', {
    x: spawnPosition.x,
    y: spawnPosition.y,
    z: spawnPosition.z,
});
```

## Update Death

Replace socket.emit('player-died') with:

```typescript
room.send('player-died', {
    trail: gameState.snake.trail
});
```

This gives you:
- ✅ Binary state sync (faster)
- ✅ Delta compression (less bandwidth)
- ✅ Automatic interpolation
- ✅ Better latency (60Hz tick rate)

