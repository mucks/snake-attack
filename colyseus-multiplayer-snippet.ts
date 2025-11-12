// Complete Colyseus multiplayer setup - paste this to replace lines 2437-2691 in SnakeGame.tsx

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

        // Listen for new players being added
        room.state.players.onAdd((player, sessionId) => {
            console.log('[COLYSEUS] Player added:', sessionId);

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
                updatePlayersOnlineCount();
            }
        });

        // Listen for player state changes
        room.state.players.onChange((player, sessionId) => {
            if (sessionId === myPlayerId) return; // Skip self

            const multiPlayer = gameState.multiplayerPlayers.get(sessionId);

            if (player.spawned && !multiPlayer) {
                // Player just spawned - create them
                const position = new THREE.Vector3(player.x, player.y, player.z);
                const direction = new THREE.Vector3(1, 0, 0);

                const newPlayer = createMultiplayerPlayer(
                    sessionId,
                    player.color,
                    position,
                    direction
                );
                gameState.multiplayerPlayers.set(sessionId, newPlayer);
                console.log('[COLYSEUS] Player spawned:', sessionId);
                updatePlayersOnlineCount();
            } else if (multiPlayer) {
                if (player.spawned) {
                    // Update position (smooth interpolation via targetPosition)
                    multiPlayer.targetPosition.set(player.x, player.y, player.z);
                    multiPlayer.length = player.length;
                } else {
                    // Player died - remove from scene
                    scene.remove(multiPlayer.head);
                    scene.remove(multiPlayer.light);
                    if (multiPlayer.trailMesh) {
                        disposeTrailMesh(multiPlayer.trailMesh);
                    }
                    gameState.multiplayerPlayers.delete(sessionId);
                    console.log('[COLYSEUS] Player died:', sessionId);
                    updatePlayersOnlineCount();
                }
            }
        });

        // Listen for players being removed (disconnect)
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

// Don't auto-start - wait for player to press space
// Player must press space to spawn

