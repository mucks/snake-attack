import { Room, Client } from 'colyseus';
import { GameState, Player, TailPoint, WorldTree, WorldObstacle, WorldItem, Maze, MazeWall } from '../schema/GameState';
import * as THREE from 'three';

const gridSize = 1000;
const WORLD_BOUNDARY = 500;

// Movement constants (must match client constants)
const BASE_SPEED = 0.3; // Doubled from 0.15
const BASE_BOOST_SPEED = 0.6; // Doubled from 0.3
const BASE_TURN_SPEED = 0.06; // Slower turn speed
const BOOST_COST_RATE = 40.0; // Length cost per second while boosting (5x increased - extremely fast mass consumption like Slither.io!)
const MIN_BOOST_LENGTH = 30; // Must have more than 30 length to boost (can't boost at exactly 30)
const BOOST_REQUIRE_RELEASE_DELAY = 200; // After boost stops, must release and wait 200ms before boosting again
// Slither.io style: No max duration or cooldown - boost as long as you have mass
// Boost is limited only by minimum length requirement
const SEGMENT_SPACING = 0.8; // Distance between tail segments
const MAX_PATH_BUFFER_LENGTH = 2000; // Maximum path points to store (prevents memory issues)
const TAIL_COLLISION_RADIUS = 1.2; // Collision radius for tail segments
const SELF_TAIL_SAFE_ZONE = 5; // Number of tail segments near head that don't cause self-collision

interface PlayerInput {
    left: boolean;
    right: boolean;
    boost: boolean;
    lastUpdate: number;
}

export class GameRoom extends Room<GameState> {
    maxClients = 15; // Maximum 15 players per room
    isDev = process.env.NODE_ENV !== 'production';
    private playerInputs = new Map<string, PlayerInput>(); // Store input commands from clients
    private lastBoostReleaseTime = new Map<string, number>(); // Track when boost was released (to prevent continuous holding)
    private spawnTimes = new Map<string, number>(); // Track when players spawned for grace period
    private playerPathBuffers = new Map<string, Array<{ x: number; y: number; z: number; distance: number }>>(); // Path buffer for tail calculation
    private boostStartTimes = new Map<string, number>(); // Track when boost started for each player
    private boostEndTimes = new Map<string, number>(); // Track when boost ended for cooldown
    private botTargets = new Map<string, { x: number; z: number } | null>(); // Bot target positions (items, etc.)
    private botColors = [
        '#ff00ff', '#00ffff', '#ff0088', '#88ff00', '#ff8800',
        '#0088ff', '#8800ff', '#ffff00', '#ff4444', '#44ff44'
    ]; // Colors for bots
    private mazeTreasureItems = new Map<string, string>(); // Map maze ID to treasure item ID
    private mazeTreasureRespawnTimes = new Map<string, number>(); // Map maze ID to respawn timestamp

    onCreate(options: any) {
        this.setState(new GameState());

        // Increase seat reservation timeout to 20 seconds (default is 10s)
        this.setSeatReservationTime(20);

        // Set state update rate to 60Hz for smooth multiplayer (default is 20Hz/50ms)
        // This dramatically reduces stuttering for other players
        this.setPatchRate(16); // 16ms = ~60Hz

        console.log('[COLYSEUS] GameRoom created (dev mode:', this.isDev, ')');

        // Generate world once for all players
        this.generateWorld();

        // Create 10 server-side bots
        this.createBots();

        // Server-side simulation loop (runs at 60Hz for smooth movement)
        // This is where ALL movement is calculated - server is authoritative
        this.setSimulationInterval((deltaTime) => {
            this.updateBotAI(deltaTime);
            this.checkBotItemCollection();
            this.checkMazeTreasureRespawns();
            this.simulateMovement(deltaTime);
            this.checkCollisions();
        }, 16); // ~60Hz

        // Handle player spawn/respawn
        this.onMessage('spawn', (client, message) => {
            this.handleSpawn(client.sessionId);
        });

        // Handle player input commands (NOT positions - server calculates movement)
        this.onMessage('input', (client, message) => {
            this.handleInput(client.sessionId, message);
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

        // Handle upgrade selection
        this.onMessage('select-upgrade', (client, message) => {
            try {
                const player = this.state.players.get(client.sessionId);
                if (player && player.spawned && message && typeof message.upgrade === 'string') {
                    const upgrade = message.upgrade;
                    // Valid upgrade types
                    const validUpgrades = ['speed_boost', 'turn_master', 'boost_efficiency', 'item_magnet', 
                                         'vampire', 'thick_skin', 'double_points', 'mega_boost',
                                         'regeneration', 'lucky_collector', 'tail_whip', 'ghost_mode'];
                    if (validUpgrades.includes(upgrade)) {
                        // Add upgrade if not already present (some upgrades can stack)
                        if (!player.upgrades.includes(upgrade)) {
                            player.upgrades.push(upgrade);
                            console.log(`[UPGRADE] Player ${client.sessionId} selected upgrade: ${upgrade}`);
                        }
                    }
                }
            } catch (error) {
                console.error(`[UPGRADE] Error handling select-upgrade for ${client.sessionId}:`, error);
            }
        });

        // Handle player growth (also check for maze treasure collection)
        this.onMessage('player-grow', (client, message) => {
            try {
            const player = this.state.players.get(client.sessionId);
                if (player && player.spawned && message && typeof message.length === 'number') {
                    // Ensure length is valid and doesn't cause issues
                    const newLength = Math.max(5, Math.min(message.length, 1000)); // Clamp between 5 and 1000
                    player.length = newLength;
                    
                    // Check if player collected a maze treasure (if itemId is provided)
                    if (message.itemId && typeof message.itemId === 'string') {
                        const itemId = message.itemId;
                        // Check if this is a maze treasure
                        for (const [mazeId, treasureItemId] of this.mazeTreasureItems.entries()) {
                            if (treasureItemId === itemId) {
                                // Schedule respawn after 15 seconds
                                this.mazeTreasureRespawnTimes.set(mazeId, Date.now() + 15000);
                                this.mazeTreasureItems.delete(mazeId);
                                // Remove the item from state
                                this.state.items.delete(itemId);
                                console.log(`[MAZE] Player ${client.sessionId} collected treasure in ${mazeId}, respawning in 15 seconds`);
                                break;
                            }
                        }
                    }
                }
            } catch (error) {
                console.error(`[GROWTH] Error handling player-grow for ${client.sessionId}:`, error);
            }
        });
    }

    private handleSpawn(sessionId: string) {
        const player = this.state.players.get(sessionId);
        if (player) {
                // Find a new safe spawn position (especially important for respawns)
                let x = 0, z = 0;
                let attempts = 0;
                // Dev mode: spawn very close for testing; production: spread out more
                const minDistance = this.isDev ? 15 : 50;
                const spawnRange = this.isDev ? { min: 10, max: 40 } : { min: 30, max: 100 };

                console.log('[SPAWN] Finding position with minDistance:', minDistance, 'range:', spawnRange);

                while (attempts < 20) {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = Math.random() * (spawnRange.max - spawnRange.min) + spawnRange.min;
                    x = Math.cos(angle) * distance;
                    z = Math.sin(angle) * distance;

                    // Check distance from all spawned players
                    let tooClose = false;
                    this.state.players.forEach((otherPlayer) => {
                        if (otherPlayer.id !== player.id && otherPlayer.spawned) {
                            const dx = x - otherPlayer.x;
                            const dz = z - otherPlayer.z;
                            const dist = Math.sqrt(dx * dx + dz * dz);
                            if (dist < minDistance) {
                                tooClose = true;
                            }
                        }
                    });

                    if (!tooClose) break;
                    attempts++;
                }

                // Update player position and spawn
                player.x = x;
                player.z = z;
                player.y = 1;
                player.spawned = true;
                player.length = 10;
                
                // Clear upgrades on spawn (fresh start)
                while (player.upgrades.length > 0) {
                    player.upgrades.pop();
                }

                // Initialize path buffer for tail system
                const pathBuffer: Array<{ x: number; y: number; z: number; distance: number }> = [];
                pathBuffer.push({ x, y: 1, z, distance: 0 });
                this.playerPathBuffers.set(sessionId, pathBuffer);

                // Initialize empty tail
                while (player.tail.length > 0) {
                    player.tail.pop();
                }

                this.spawnTimes.set(sessionId, Date.now()); // Record spawn time for grace period
                
                // Reset boost tracking on spawn/respawn
                this.boostStartTimes.delete(sessionId);
                this.boostEndTimes.delete(sessionId);
                
                console.log(`[COLYSEUS] Player ${sessionId} spawned/respawned at (${x.toFixed(0)}, ${z.toFixed(0)})`);
            }
    }

    // Handle input commands from clients (server is authoritative - no position updates accepted)
    private handleInput(sessionId: string, message: any) {
        const input: PlayerInput = {
            left: message.left === true,
            right: message.right === true,
            boost: message.boost === true,
            lastUpdate: Date.now(),
        };
        
        // Track boost release to prevent continuous holding
        const previousInput = this.playerInputs.get(sessionId);
        if (previousInput && previousInput.boost && !input.boost) {
            // Boost was just released
            this.lastBoostReleaseTime.set(sessionId, Date.now());
        }
        
        this.playerInputs.set(sessionId, input);
    }

    // Server-authoritative movement simulation
    private simulateMovement(deltaTime: number) {
        // deltaTime is in milliseconds, convert to seconds
        // At 60Hz (16ms intervals), deltaSeconds ≈ 0.016
        const deltaSeconds = deltaTime / 1000;
        // Normalize to 60fps equivalent (constants are per-frame at 60fps)
        const frameMultiplier = deltaSeconds * 60;

        this.state.players.forEach((player, sessionId) => {
            try {
                if (!player || !player.spawned) {
                    return;
                }

                // Validate player has required properties
                if (typeof player.x !== 'number' || typeof player.z !== 'number' || 
                    typeof player.dirX !== 'number' || typeof player.dirZ !== 'number') {
                    console.warn(`[SIMULATION] Player ${sessionId} has invalid properties - x: ${typeof player.x}, z: ${typeof player.z}, dirX: ${typeof player.dirX}, dirZ: ${typeof player.dirZ}`);
                    return;
                }

                const input = this.playerInputs.get(sessionId);
                if (!input) {
                    // No input yet, don't move
                    return;
                }

                // Check if input is stale (client disconnected or lagging)
                const timeSinceLastInput = Date.now() - input.lastUpdate;
                if (timeSinceLastInput > 500) {
                    // Input is stale, stop moving
                    return;
                }

                // Calculate speed (boost or normal) with upgrades
                // Prevent continuous boost holding - must have length > 30 and not recently released
                const canBoost = player.length > MIN_BOOST_LENGTH; // Must be > 30, not >= 30
                const lastReleaseTime = this.lastBoostReleaseTime.get(sessionId) || 0;
                const timeSinceRelease = Date.now() - lastReleaseTime;
                const canBoostAgain = timeSinceRelease >= BOOST_REQUIRE_RELEASE_DELAY;
                const isBoosting = input.boost && canBoost && canBoostAgain;
                
                // Apply upgrade modifiers
                const upgrades = Array.from(player.upgrades || []);
                let speedMultiplier = 1.0;
                let turnSpeedMultiplier = 1.0;
                let boostSpeedMultiplier = 1.0;
                let boostCostMultiplier = 1.0;
                
                upgrades.forEach(upgrade => {
                    switch (upgrade) {
                        case 'speed_boost':
                            speedMultiplier *= 1.15; // +15% base speed (nerfed from 30%)
                            break;
                        case 'turn_master':
                            turnSpeedMultiplier *= 1.2; // +20% turn speed (nerfed from 50%)
                            break;
                        case 'boost_efficiency':
                            boostCostMultiplier *= 0.9; // 10% less cost (nerfed from 50%)
                            break;
                        case 'mega_boost':
                            boostSpeedMultiplier *= 1.1; // +10% boost speed (nerfed from 200%)
                            break;
                        case 'regeneration':
                            // Passive length gain over time (handled elsewhere)
                            break;
                        case 'lucky_collector':
                            // Higher chance for rare items (handled in item collection)
                            break;
                        case 'tail_whip':
                            // Longer tail safe zone (handled in collision)
                            break;
                    }
                });
                
                // Apply regeneration upgrade (passive length gain)
                const hasRegeneration = upgrades.includes('regeneration');
                if (hasRegeneration && !isBoosting) {
                    // Gain 0.1 length per second when not boosting
                    player.length += 0.1 * deltaSeconds;
                }
                
                // Slither.io style: No tracking needed - boost is simply on/off based on input and length
                
                player.boosting = isBoosting;
                const baseSpeed = BASE_SPEED * speedMultiplier;
                const boostSpeed = BASE_BOOST_SPEED * boostSpeedMultiplier;
                const speed = isBoosting ? boostSpeed : baseSpeed;

                // Handle turning (with upgrade modifier)
                // Slither.io style: boosting makes turning much harder (reduced turn speed)
                let turnSpeed = BASE_TURN_SPEED * turnSpeedMultiplier;
                if (isBoosting) {
                    // Reduce turn speed by 60% while boosting (makes turning much harder)
                    turnSpeed *= 0.4; // Only 40% of normal turn speed while boosting
                }
                
                if (input.left) {
                    const angle = -turnSpeed * frameMultiplier;
                    const newX = player.dirX * Math.cos(angle) - player.dirZ * Math.sin(angle);
                    const newZ = player.dirX * Math.sin(angle) + player.dirZ * Math.cos(angle);
                    player.dirX = newX;
                    player.dirZ = newZ;
                }
                if (input.right) {
                    const angle = turnSpeed * frameMultiplier;
                    const newX = player.dirX * Math.cos(angle) - player.dirZ * Math.sin(angle);
                    const newZ = player.dirX * Math.sin(angle) + player.dirZ * Math.cos(angle);
                    player.dirX = newX;
                    player.dirZ = newZ;
                }

                // Normalize direction
                const dirLength = Math.sqrt(player.dirX ** 2 + player.dirZ ** 2);
                if (dirLength > 0.01) {
                    player.dirX /= dirLength;
                    player.dirZ /= dirLength;
                }

                // Move player forward
                // Only move if we have valid direction
                if (isFinite(player.dirX) && isFinite(player.dirZ)) {
                    player.x += player.dirX * speed * frameMultiplier;
                    player.z += player.dirZ * speed * frameMultiplier;
                } else {
                    console.warn(`[SIMULATION] Invalid direction for player ${sessionId} - dirX: ${player.dirX}, dirZ: ${player.dirZ}`);
                    return;
                }

                // Handle boost cost (consume length while boosting, with upgrade modifier)
                // Slither.io style: boost consumes mass VERY quickly - you can see your snake shrinking!
                if (isBoosting) {
                    const costAmount = BOOST_COST_RATE * boostCostMultiplier * deltaSeconds;
                    const newLength = Math.max(MIN_BOOST_LENGTH, player.length - costAmount);
                    // Always update length when boosting - mass consumption should be very visible
                    player.length = newLength;
                    
                    // If player drops to or below minimum boost length, stop boosting and record release time
                    if (player.length <= MIN_BOOST_LENGTH) {
                        const input = this.playerInputs.get(sessionId);
                        if (input && input.boost) {
                            input.boost = false;
                            this.lastBoostReleaseTime.set(sessionId, Date.now()); // Record when boost was forced to stop
                        }
                    }
                }

                // ===== TAIL SYSTEM (Server-Authoritative) =====
                // 1. Add head position to path buffer
                let pathBuffer = this.playerPathBuffers.get(sessionId);
                if (!pathBuffer) {
                    pathBuffer = [];
                    this.playerPathBuffers.set(sessionId, pathBuffer);
                }

                // Calculate distance moved this frame
                const distanceMoved = speed * frameMultiplier;
                
                // Add new point to path buffer with cumulative distance
                const lastDistance = pathBuffer.length > 0 ? pathBuffer[pathBuffer.length - 1].distance : 0;
                pathBuffer.push({
                    x: player.x,
                    y: player.y,
                    z: player.z,
                    distance: lastDistance + distanceMoved
                });

                // Limit path buffer size to prevent memory issues
                if (pathBuffer.length > MAX_PATH_BUFFER_LENGTH) {
                    const removeCount = pathBuffer.length - MAX_PATH_BUFFER_LENGTH;
                    pathBuffer.splice(0, removeCount);
                }

                // 2. Calculate tail segments based on segmentSpacing × index
                const requiredTailLength = Math.max(0, Math.floor((player.length - 5) / SEGMENT_SPACING)); // Subtract 5 for head
                const currentTailLength = player.tail.length;

                // Update tail array size if needed (growth or shrinkage)
                if (currentTailLength < requiredTailLength) {
                    // Grow tail - add new segments at the end
                    for (let i = currentTailLength; i < requiredTailLength; i++) {
                        const tailPoint = new TailPoint();
                        // New segments start at the last tail position (or head if no tail yet)
                        if (player.tail.length > 0) {
                            const lastTail = player.tail[player.tail.length - 1];
                            tailPoint.x = lastTail.x;
                            tailPoint.y = lastTail.y;
                            tailPoint.z = lastTail.z;
                        } else {
                            tailPoint.x = player.x;
                            tailPoint.y = player.y;
                            tailPoint.z = player.z;
                        }
                        player.tail.push(tailPoint);
                    }
                } else if (currentTailLength > requiredTailLength) {
                    // Shrink tail - remove segments from the end
                    while (player.tail.length > requiredTailLength) {
                        player.tail.pop();
                    }
                }

                // 3. Update each tail segment position based on path buffer
                for (let i = 0; i < player.tail.length; i++) {
                    const segmentIndex = i + 1; // Index 0 is first segment after head
                    const targetDistance = segmentIndex * SEGMENT_SPACING;
                    
                    // Find position in path buffer that is targetDistance behind the head
                    const headDistance = pathBuffer[pathBuffer.length - 1].distance;
                    const targetPathDistance = headDistance - targetDistance;

                    // Find the two path points that bracket the target distance
                    let segmentPos = { x: player.x, y: player.y, z: player.z };
                    
                    if (pathBuffer.length >= 2 && targetPathDistance >= pathBuffer[0].distance) {
                        // Binary search for efficiency (or linear search for small buffers)
                        for (let j = pathBuffer.length - 1; j >= 1; j--) {
                            const p1 = pathBuffer[j - 1];
                            const p2 = pathBuffer[j];
                            
                            if (targetPathDistance >= p1.distance && targetPathDistance <= p2.distance) {
                                // Interpolate between p1 and p2
                                const t = (targetPathDistance - p1.distance) / (p2.distance - p1.distance);
                                segmentPos = {
                                    x: p1.x + (p2.x - p1.x) * t,
                                    y: p1.y + (p2.y - p1.y) * t,
                                    z: p1.z + (p2.z - p1.z) * t
                                };
                                break;
                            } else if (targetPathDistance > p2.distance) {
                                // Target is ahead of this segment, use p2
                                segmentPos = { x: p2.x, y: p2.y, z: p2.z };
                                break;
                            }
                        }
                    } else if (pathBuffer.length > 0) {
                        // Not enough path data yet, use oldest point
                        segmentPos = pathBuffer[0];
                    }

                    // Update tail segment position
                    const tailSegment = player.tail[i];
                    if (tailSegment) {
                        tailSegment.x = segmentPos.x;
                        tailSegment.y = segmentPos.y;
                        tailSegment.z = segmentPos.z;
                    }
                }
            } catch (playerError) {
                console.error(`[SIMULATION] CRITICAL: Error processing player ${sessionId}:`, playerError);
                console.error(`[SIMULATION] Player error details:`, {
                    message: playerError instanceof Error ? playerError.message : String(playerError),
                    stack: playerError instanceof Error ? playerError.stack : undefined,
                    sessionId,
                    playerExists: !!player,
                    playerSpawned: player?.spawned,
                    trailExists: !!player?.trail
                });
                // Continue with other players even if one fails
            }
        });
    }

    onJoin(client: Client, options: any) {
        console.log(`[COLYSEUS] ${client.sessionId} joined`);

        // Generate spawn position away from other players
        let x = 0, z = 0;
        let attempts = 0;
        // Dev mode: spawn close for testing; production: spread out more
        const minDistance = this.isDev ? 15 : 50;
        const spawnRange = this.isDev ? { min: 10, max: 40 } : { min: 30, max: 100 };

        while (attempts < 20) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * (spawnRange.max - spawnRange.min) + spawnRange.min;
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
        player.dirX = 0;
        player.dirY = 0;
        player.dirZ = -1; // Default facing direction
        player.color = color;
        player.spawned = false;


        this.state.players.set(client.sessionId, player);

        console.log(`[COLYSEUS] Player ${client.sessionId} initialized at (${x.toFixed(0)}, ${z.toFixed(0)})`);
    }

    onLeave(client: Client, consented: boolean) {
        const sessionId = client.sessionId;
        // Don't remove bots when clients leave
        if (sessionId.startsWith('bot_')) {
            return;
        }
        
        console.log(`[COLYSEUS] ${sessionId} left`);
        this.state.players.delete(sessionId);
        this.playerInputs.delete(sessionId);
        this.lastBoostReleaseTime.delete(sessionId);
        this.spawnTimes.delete(sessionId);
        this.playerPathBuffers.delete(sessionId);
        this.boostStartTimes.delete(sessionId);
        this.boostEndTimes.delete(sessionId);
    }

    onDispose() {
        console.log('[COLYSEUS] GameRoom disposed');
    }

    private checkCollisions() {
        const playersArray = Array.from(this.state.players.values());

        for (const player of playersArray) {
            if (!player.spawned) continue;

            // Check spawn grace period (2 seconds) - skip all collision checks during grace period
            const spawnTime = this.spawnTimes.get(player.id);
            if (spawnTime) {
                const timeSinceSpawn = Date.now() - spawnTime;
                const gracePeriod = 2000; // 2 seconds grace period
                if (timeSinceSpawn < gracePeriod) {
                    continue; // Skip all collision checks during grace period
                }
            }

            let playerDied = false;

            // Check boundary collision
            const boundary = gridSize / 2 - 2;
            if (Math.abs(player.x) > boundary || Math.abs(player.z) > boundary) {
                this.handlePlayerDeath(player.id, 'boundary');
                continue;
            }

            // Check collision with maze walls (AABB collision)
            for (const maze of this.state.mazes) {
                if (playerDied) break;
                for (const wall of maze.walls) {
                    // AABB collision detection
                    const halfWidth = wall.width / 2;
                    const halfDepth = wall.depth / 2;
                    const playerRadius = 1.2; // Increased collision radius for better detection

                    const closestX = Math.max(wall.x - halfWidth, Math.min(player.x, wall.x + halfWidth));
                    const closestZ = Math.max(wall.z - halfDepth, Math.min(player.z, wall.z + halfDepth));

                    const distanceX = player.x - closestX;
                    const distanceZ = player.z - closestZ;
                    const distanceSq = distanceX * distanceX + distanceZ * distanceZ;

                    if (distanceSq < (playerRadius * playerRadius)) {
                        this.handlePlayerDeath(player.id, 'maze wall');
                        playerDied = true;
                        break;
                    }
                }
            }

            if (playerDied) continue;

            // Check self-collision with own tail (with safe zone near head)
            // Apply tail_whip and ghost_mode upgrades
            const upgrades = Array.from(player.upgrades || []);
            const hasTailWhip = upgrades.includes('tail_whip');
            const hasGhostMode = upgrades.includes('ghost_mode');
            const safeZone = hasTailWhip ? SELF_TAIL_SAFE_ZONE * 1.5 : SELF_TAIL_SAFE_ZONE; // 50% longer safe zone
            
            // Ghost mode: skip self-collision entirely
            if (!hasGhostMode && player.tail && player.tail.length > safeZone) {
                try {
                    const collisionRadiusSq = TAIL_COLLISION_RADIUS * TAIL_COLLISION_RADIUS;
                    
                    // Skip the first safeZone segments (safe zone near head)
                    for (let i = Math.floor(safeZone); i < player.tail.length; i++) {
                        const tailSegment = player.tail[i];
                        if (!tailSegment || 
                            typeof tailSegment.x !== 'number' || 
                            typeof tailSegment.z !== 'number' ||
                            !isFinite(tailSegment.x) || 
                            !isFinite(tailSegment.z)) {
                            continue;
                        }

                        const dx = player.x - tailSegment.x;
                        const dz = player.z - tailSegment.z;
                        const distSq = dx * dx + dz * dz;

                        if (distSq < collisionRadiusSq) {
                            this.handlePlayerDeath(player.id, 'own tail');
                            playerDied = true;
                            break;
                        }
                    }
                } catch (error) {
                    console.error(`[COLLISION] Error checking own tail collision for player ${player.id}:`, error);
                }
            }

            if (playerDied) continue;

            // Check collision with other players
            for (const otherPlayer of playersArray) {
                if (otherPlayer.id === player.id || !otherPlayer.spawned) continue;

                // Check head-to-head collision (2.5 unit radius)
                const dx = player.x - otherPlayer.x;
                const dz = player.z - otherPlayer.z;
                const distSq = dx * dx + dz * dz;
                if (distSq < 6.25) { // 2.5^2
                    // Both players die in head-to-head, but check who was bigger
                    if (player.length >= otherPlayer.length) {
                        this.handlePlayerDeath(otherPlayer.id, 'head-to-head', player.id);
                    }
                    this.handlePlayerDeath(player.id, 'head-to-head', otherPlayer.id);
                    playerDied = true;
                    break;
                }

                // Check collision with other player's tail
                if (otherPlayer.tail && otherPlayer.tail.length > 0) {
                    try {
                        const collisionRadiusSq = TAIL_COLLISION_RADIUS * TAIL_COLLISION_RADIUS;
                        
                        // Sample every 2nd tail segment for performance (still accurate enough)
                        for (let i = 0; i < otherPlayer.tail.length; i += 2) {
                            const tailSegment = otherPlayer.tail[i];
                            if (!tailSegment || 
                                typeof tailSegment.x !== 'number' || 
                                typeof tailSegment.z !== 'number' ||
                                !isFinite(tailSegment.x) || 
                                !isFinite(tailSegment.z)) {
                                continue;
                            }

                            const dx = player.x - tailSegment.x;
                            const dz = player.z - tailSegment.z;
                            const distSq = dx * dx + dz * dz;

                            if (distSq < collisionRadiusSq) {
                                this.handlePlayerDeath(player.id, 'tail', otherPlayer.id);
                                playerDied = true;
                        break;
                    }
                }
                    } catch (error) {
                        console.error(`[COLLISION] Error checking tail collision for player ${player.id}:`, error);
                    }
                }

                if (playerDied) break;
            }
        }
    }

    private handlePlayerDeath(playerId: string, reason: string, killerId?: string) {
        const player = this.state.players.get(playerId);
        if (player && player.spawned) {
            const isBot = playerId.startsWith('bot_');
            const upgrades = Array.from(player.upgrades || []);
            const hasThickSkin = upgrades.includes('thick_skin');
            
            // Check for thick_skin upgrade (one free death)
            if (hasThickSkin && !player.upgrades.includes('thick_skin_used')) {
                // Use the shield
                player.upgrades.push('thick_skin_used');
                console.log(`[SERVER] ${isBot ? 'Bot' : 'Player'} ${playerId} used thick_skin shield!`);
                return; // Don't die, shield absorbed the hit
            }
            
            console.log(`[SERVER] ${isBot ? 'Bot' : 'Player'} ${playerId} died (${reason})`);
            
            // Handle vampire upgrade - killer gains length
            if (killerId && reason !== 'boundary' && reason !== 'maze wall' && reason !== 'own tail') {
                const killer = this.state.players.get(killerId);
                if (killer && killer.spawned) {
                    const killerUpgrades = Array.from(killer.upgrades || []);
                    if (killerUpgrades.includes('vampire')) {
                        const gainedLength = Math.floor(player.length * 0.2); // 20% of killed player's length
                        killer.length = Math.min(killer.length + gainedLength, 1000);
                        console.log(`[VAMPIRE] ${killerId} gained ${gainedLength} length from killing ${playerId}`);
                    }
                }
            }
            
            player.spawned = false;

            // Clear upgrades on death
            while (player.upgrades.length > 0) {
                player.upgrades.pop();
            }

            // Clear tail on death
            while (player.tail.length > 0) {
                player.tail.pop();
            }

            // Clear path buffer on death
            this.playerPathBuffers.delete(playerId);
            
            // Clear boost tracking on death
            this.boostStartTimes.delete(playerId);
            this.boostEndTimes.delete(playerId);

            // Notify the client (only for real players, not bots)
            if (!isBot) {
            const client = Array.from(this.clients).find(c => c.sessionId === playerId);
            if (client) {
                client.send('death', { reason });
                }
            } else {
                // Respawn bot after 2 seconds
                setTimeout(() => {
                    this.handleSpawn(playerId);
                }, 2000);
            }
        }
    }

    private generateWorld() {
        if (this.state.worldGenerated) {
            return; // Already generated
        }

        console.log('[SERVER] Generating world...');

        // Generate trees (40 trees)
        const treeColorOptions = [
            0xff00ff, // Magenta
            0x00ffff, // Cyan
            0xff0088, // Pink
            0x88ff00, // Lime
            0xff8800, // Orange
            0x0088ff, // Blue
            0x8800ff, // Purple
            0xffff00, // Yellow
        ];
        
        for (let i = 0; i < 40; i++) {
            const tree = new WorldTree();
            tree.id = `tree_${i}`;
            tree.x = (Math.random() - 0.5) * (WORLD_BOUNDARY * 2 - 20);
            tree.z = (Math.random() - 0.5) * (WORLD_BOUNDARY * 2 - 20);
            tree.height = 6 + Math.random() * 4;
            // Set color from server (random selection from color options)
            tree.color = treeColorOptions[Math.floor(Math.random() * treeColorOptions.length)];
            this.state.trees.push(tree);
        }

        // Generate obstacles (DISABLED - removed black balls)
        // for (let i = 0; i < 25; i++) {
        //     const obstacle = new WorldObstacle();
        //     obstacle.id = `obstacle_${i}`;
        //     obstacle.x = (Math.random() - 0.5) * (WORLD_BOUNDARY * 2 - 20);
        //     obstacle.z = (Math.random() - 0.5) * (WORLD_BOUNDARY * 2 - 20);
        //     obstacle.radius = 1.5 + Math.random() * 1.5;
        //     obstacle.obstacleType = 'ring';
        //     this.state.obstacles.push(obstacle);
        // }

        // Generate mazes (5 mazes)
        for (let i = 0; i < 5; i++) {
            const maze = this.generateMaze();
            maze.id = `maze_${i}`;
            // Set random color for maze walls (HSL hue converted to hex)
            const hue = Math.random();
            const wallColor = new THREE.Color().setHSL(hue, 0.7, 0.5);
            maze.color = wallColor.getHex();
            this.state.mazes.push(maze);
            
            // Spawn initial treasure in maze center
            this.spawnMazeTreasure(maze.id, maze.treasureX, maze.treasureZ);
        }

        this.state.worldGenerated = true;
        console.log(`[SERVER] World generated: ${this.state.trees.length} trees, ${this.state.obstacles.length} obstacles, ${this.state.mazes.length} mazes`);
    }

    private generateMaze(): Maze {
        const maze = new Maze();
        const mazeSize = 50; // HUGE maze!
        const wallThickness = 1.0;
        const gapSize = 20; // MASSIVE gaps - super easy to navigate!

        // Find a position that's not too close to center
        let attempts = 0;
        while (attempts < 20) {
            maze.centerX = (Math.random() - 0.5) * (WORLD_BOUNDARY * 2 - 60);
            maze.centerZ = (Math.random() - 0.5) * (WORLD_BOUNDARY * 2 - 60);

            const distFromCenter = Math.sqrt(maze.centerX ** 2 + maze.centerZ ** 2);
            if (distFromCenter > 80) break;
            attempts++;
        }

        // Create maze walls with wide gaps and clear center
        // Design: 4 outer walls with entrances, and 4 corner obstacles
        // Center is completely open for the treasure!
        const wallPattern = [
            // Outer walls - with 4 wide entrances (one on each side)

            // North wall - with entrance in middle
            { x: -mazeSize / 2, z: -mazeSize / 2, width: (mazeSize - gapSize) / 2, depth: wallThickness },
            { x: mazeSize / 2 - (mazeSize - gapSize) / 2, z: -mazeSize / 2, width: (mazeSize - gapSize) / 2, depth: wallThickness },

            // South wall - with entrance in middle
            { x: -mazeSize / 2, z: mazeSize / 2 - wallThickness, width: (mazeSize - gapSize) / 2, depth: wallThickness },
            { x: mazeSize / 2 - (mazeSize - gapSize) / 2, z: mazeSize / 2 - wallThickness, width: (mazeSize - gapSize) / 2, depth: wallThickness },

            // West wall - with entrance in middle
            { x: -mazeSize / 2, z: -mazeSize / 2, width: wallThickness, depth: (mazeSize - gapSize) / 2 },
            { x: -mazeSize / 2, z: mazeSize / 2 - (mazeSize - gapSize) / 2, width: wallThickness, depth: (mazeSize - gapSize) / 2 },

            // East wall - with entrance in middle
            { x: mazeSize / 2 - wallThickness, z: -mazeSize / 2, width: wallThickness, depth: (mazeSize - gapSize) / 2 },
            { x: mazeSize / 2 - wallThickness, z: mazeSize / 2 - (mazeSize - gapSize) / 2, width: wallThickness, depth: (mazeSize - gapSize) / 2 },

            // 4 corner obstacles - short walls that don't block the center
            { x: -mazeSize / 3, z: -mazeSize / 3, width: wallThickness, depth: mazeSize / 6 },
            { x: mazeSize / 3, z: -mazeSize / 3, width: wallThickness, depth: mazeSize / 6 },
            { x: -mazeSize / 3, z: mazeSize / 3 - mazeSize / 6, width: wallThickness, depth: mazeSize / 6 },
            { x: mazeSize / 3, z: mazeSize / 3 - mazeSize / 6, width: wallThickness, depth: mazeSize / 6 },
        ];

        wallPattern.forEach(pattern => {
            const wall = new MazeWall();
            wall.id = `wall_${Date.now()}_${Math.random()}`;
            wall.x = maze.centerX + pattern.x;
            wall.z = maze.centerZ + pattern.z;
            wall.width = pattern.width;
            wall.depth = pattern.depth;
            maze.walls.push(wall);
        });

        // Treasure EXACTLY in center with completely clear space around it
        maze.treasureX = maze.centerX;
        maze.treasureZ = maze.centerZ;

        console.log(`[SERVER] Maze created at (${maze.centerX.toFixed(1)}, ${maze.centerZ.toFixed(1)}) with treasure at (${maze.treasureX.toFixed(1)}, ${maze.treasureZ.toFixed(1)})`);
        return maze;
    }

    // Create 10 server-side bots
    private createBots() {
        for (let i = 0; i < 10; i++) {
            const botId = `bot_${i}`;
            
            // Find a safe spawn position
            let x = 0, z = 0;
            let attempts = 0;
            const minDistance = 50;
            const spawnRange = { min: 30, max: 200 };

            while (attempts < 20) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * (spawnRange.max - spawnRange.min) + spawnRange.min;
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

            // Create bot player
            const bot = new Player();
            bot.id = botId;
            bot.x = x;
            bot.y = 1;
            bot.z = z;
            // Random initial direction
            const initialAngle = Math.random() * Math.PI * 2;
            bot.dirX = Math.cos(initialAngle);
            bot.dirY = 0;
            bot.dirZ = Math.sin(initialAngle);
            bot.color = this.botColors[i % this.botColors.length];
            bot.spawned = true;
            bot.length = 25; // Start bots with more length (increased from 15)
            
            // Give bots random upgrades to make them stronger - all bots get at least 3 upgrades
            const botUpgrades = ['speed_boost', 'turn_master', 'boost_efficiency', 'item_magnet', 'mega_boost', 'thick_skin', 'regeneration', 'tail_whip'];
            const numUpgrades = 3 + Math.floor(Math.random() * 2); // 3-4 upgrades per bot (increased from 2-3)
            const selectedUpgrades = botUpgrades.sort(() => Math.random() - 0.5).slice(0, numUpgrades);
            selectedUpgrades.forEach(upgrade => bot.upgrades.push(upgrade));

            this.state.players.set(botId, bot);

            // Initialize path buffer for tail
            const pathBuffer: Array<{ x: number; y: number; z: number; distance: number }> = [];
            pathBuffer.push({ x, y: 1, z, distance: 0 });
            this.playerPathBuffers.set(botId, pathBuffer);

            // Initialize empty input
            this.playerInputs.set(botId, {
                left: false,
                right: false,
                boost: false,
                lastUpdate: Date.now(),
            });

            // Initialize spawn time for grace period
            this.spawnTimes.set(botId, Date.now());

            // Initialize target
            this.botTargets.set(botId, null);

            console.log(`[BOT] Created bot ${botId} at (${x.toFixed(0)}, ${z.toFixed(0)})`);
        }
    }

    // Update bot AI - decides where bots should move
    private updateBotAI(deltaTime: number) {
        const deltaSeconds = deltaTime / 1000;
        
        this.state.players.forEach((bot, botId) => {
            // Only process bots
            if (!botId.startsWith('bot_') || !bot.spawned) return;

            // Find nearest item to target
            let nearestItem: { x: number; z: number; distance: number } | null = null;
            let minDistance = Infinity;

            this.state.items.forEach((item) => {
                const dx = item.x - bot.x;
                const dz = item.z - bot.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestItem = { x: item.x, z: item.z, distance };
                }
            });

            // Update target - improved AI for stronger bots
            const currentTarget = this.botTargets.get(botId);
            const upgrades = Array.from(bot.upgrades || []);
            const hasItemMagnet = upgrades.includes('item_magnet');
            const searchRange = hasItemMagnet ? 150 : 100; // Larger search range with upgrade
            
            // Prioritize treasure items - bots are more aggressive about treasures
            let nearestTreasure: { x: number; z: number; distance: number } | null = null;
            let minTreasureDistance = Infinity;
            
            this.state.items.forEach((item) => {
                if (item.type === 'treasure') {
                    const dx = item.x - bot.x;
                    const dz = item.z - bot.z;
                    const distance = Math.sqrt(dx * dx + dz * dz);
                    // Increased treasure search range
                    if (distance < minTreasureDistance && distance < searchRange * 2.0) {
                        minTreasureDistance = distance;
                        nearestTreasure = { x: item.x, z: item.z, distance };
                    }
                }
            });
            
            // Also look for high-value items (epic, rare)
            let nearestHighValueItem: { x: number; z: number; distance: number } | null = null;
            let minHighValueDistance = Infinity;
            
            this.state.items.forEach((item) => {
                if (item.type === 'epic' || item.type === 'rare') {
                    const dx = item.x - bot.x;
                    const dz = item.z - bot.z;
                    const distance = Math.sqrt(dx * dx + dz * dz);
                    if (distance < minHighValueDistance && distance < searchRange * 1.2) {
                        minHighValueDistance = distance;
                        nearestHighValueItem = { x: item.x, z: item.z, distance };
                    }
                }
            });
            
            if (nearestTreasure) {
                // Highest priority: treasures
                this.botTargets.set(botId, { x: nearestTreasure.x, z: nearestTreasure.z });
            } else if (nearestHighValueItem) {
                // Second priority: high-value items
                this.botTargets.set(botId, { x: nearestHighValueItem.x, z: nearestHighValueItem.z });
            } else if (nearestItem && nearestItem.distance < searchRange) {
                // Third priority: nearby items
                this.botTargets.set(botId, { x: nearestItem.x, z: nearestItem.z });
            } else if (!currentTarget || Math.random() < 0.003) {
                // Less random wandering, more focused (reduced from 0.005)
                const angle = Math.random() * Math.PI * 2;
                const distance = 50 + Math.random() * 100;
                this.botTargets.set(botId, {
                    x: bot.x + Math.cos(angle) * distance,
                    z: bot.z + Math.sin(angle) * distance,
                });
            }

            const target = this.botTargets.get(botId);
            if (!target) return;

            // Calculate direction to target
            const dx = target.x - bot.x;
            const dz = target.z - bot.z;
            const distanceToTarget = Math.sqrt(dx * dx + dz * dz);

            // Normalize direction
            const targetDirX = distanceToTarget > 0.1 ? dx / distanceToTarget : 0;
            const targetDirZ = distanceToTarget > 0.1 ? dz / distanceToTarget : 0;

            // Calculate angle between current direction and target direction
            const currentAngle = Math.atan2(bot.dirZ, bot.dirX);
            const targetAngle = Math.atan2(targetDirZ, targetDirX);
            let angleDiff = targetAngle - currentAngle;

            // Normalize angle difference to [-PI, PI]
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

            // Check for obstacles and boundaries - start avoiding earlier
            const boundary = WORLD_BOUNDARY - 30; // Start avoiding 30 units before boundary (increased from 10)
            const nearBoundary = Math.abs(bot.x) > boundary || Math.abs(bot.z) > boundary;
            
            // Avoid boundaries - more aggressive avoidance
            let avoidAngle = 0;
            if (Math.abs(bot.x) > boundary) {
                avoidAngle = bot.x > 0 ? Math.PI : 0; // Turn away from boundary
            } else if (Math.abs(bot.z) > boundary) {
                avoidAngle = bot.z > 0 ? -Math.PI / 2 : Math.PI / 2;
            }

            // Check for nearby players - prioritize attacking over avoiding
            let avoidPlayerAngle = 0;
            let hasNearbyPlayer = false;
            let nearestPlayerDist = Infinity;
            let nearestPlayer: Player | null = null;
            let targetPlayer: Player | null = null; // Player to attack
            let targetPlayerDist = Infinity;
            
            this.state.players.forEach((otherPlayer) => {
                if (otherPlayer.id === botId || !otherPlayer.spawned) return;
                const pdx = bot.x - otherPlayer.x;
                const pdz = bot.z - otherPlayer.z;
                const playerDist = Math.sqrt(pdx * pdx + pdz * pdz);
                
                // Track nearest player
                if (playerDist < nearestPlayerDist) {
                    nearestPlayerDist = playerDist;
                    nearestPlayer = otherPlayer;
                }
                
                // VERY AGGRESSIVE behavior: bots should attack, not run away!
                const sizeRatio = bot.length / (otherPlayer.length || 1);
                
                // Attack ANY player within range - be extremely aggressive!
                // Attack if: any size and within 100 units (very aggressive range)
                const inAttackRange = playerDist < 100; // Increased attack range to 100 units
                
                // Prioritize attacking - bots are fearless!
                // Attack if within range, regardless of size (bots are very brave!)
                if (inAttackRange && playerDist < targetPlayerDist) {
                    targetPlayer = otherPlayer;
                    targetPlayerDist = playerDist;
                }
                
                // Only avoid if player is MASSIVELY larger (3x bigger) AND very close (almost never avoid)
                if (sizeRatio < 0.33 && playerDist < 5) { // Only avoid if 3x smaller AND within 5 units
                    hasNearbyPlayer = true;
                    const awayAngle = Math.atan2(pdz, pdx);
                    avoidPlayerAngle = awayAngle;
                }
            });
            
            // Check for own tail - avoid it more aggressively
            let avoidTailAngle = 0;
            let hasNearbyTail = false;
            if (bot.tail && bot.tail.length > SELF_TAIL_SAFE_ZONE) {
                for (let i = SELF_TAIL_SAFE_ZONE; i < Math.min(bot.tail.length, SELF_TAIL_SAFE_ZONE + 20); i++) {
                    const tailSegment = bot.tail[i];
                    if (!tailSegment || typeof tailSegment.x !== 'number' || typeof tailSegment.z !== 'number') continue;
                    
                    const tdx = bot.x - tailSegment.x;
                    const tdz = bot.z - tailSegment.z;
                    const tailDist = Math.sqrt(tdx * tdx + tdz * tdz);
                    
                    if (tailDist < 8) { // Avoid own tail at 8 units
                        hasNearbyTail = true;
                        avoidTailAngle = Math.atan2(tdz, tdx);
                        break;
                    }
                }
            }

            // Combine avoidance with target direction - prioritize attacking over safety
            let finalAngle = targetAngle;
            
            // Priority 1: Attack target player (highest priority for aggressive bots)
            if (targetPlayer) {
                // Calculate intercept angle - try to cut off the player
                const playerDirAngle = Math.atan2(targetPlayer.dirZ, targetPlayer.dirX);
                const toPlayerAngle = Math.atan2(targetPlayer.z - bot.z, targetPlayer.x - bot.x);
                
                // Predict where player will be and intercept
                // Try to get ahead of the player's path
                const interceptAngle = playerDirAngle + (Math.random() > 0.5 ? Math.PI / 3 : -Math.PI / 3);
                finalAngle = interceptAngle;
            } else if (hasNearbyTail) {
                // Priority 2: avoid own tail (safety)
                finalAngle = avoidTailAngle;
            } else if (nearBoundary) {
                // Priority 3: avoid boundaries (safety)
                finalAngle = avoidAngle;
            } else if (hasNearbyPlayer) {
                // Priority 4: avoid much larger players (safety)
                finalAngle = avoidPlayerAngle;
            } else if (nearestPlayer && nearestPlayerDist < 150) {
                // Priority 5: Try to intercept ANY nearby player (EXTREMELY aggressive - attack anyone!)
                const playerDirAngle = Math.atan2(nearestPlayer.dirZ, nearestPlayer.dirX);
                
                // Attack ANY player within range - bots are fearless!
                // Calculate intercept angle - try to cut them off aggressively
                const interceptAngle = playerDirAngle + (Math.random() > 0.5 ? Math.PI / 2.0 : -Math.PI / 2.0);
                finalAngle = interceptAngle;
            }

            // Recalculate angle difference with final angle
            angleDiff = finalAngle - currentAngle;
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

            // Generate input based on angle difference
            const turnThreshold = 0.1; // Minimum angle to turn
            const input: PlayerInput = {
                left: false,
                right: false,
                boost: false,
                lastUpdate: Date.now(),
            };

            if (Math.abs(angleDiff) > turnThreshold) {
                if (angleDiff > 0) {
                    input.right = true;
                } else {
                    input.left = true;
                }
            }

            // Use boost more intelligently - stronger bots boost more often
            const canBoost = bot.length > MIN_BOOST_LENGTH; // Must be > 30, not >= 30
            // Slither.io style: no cooldown, just need enough length
            const hasBoostUpgrades = upgrades.includes('boost_efficiency') || upgrades.includes('mega_boost');
            const boostChance = hasBoostUpgrades ? 0.7 : 0.5; // Higher chance with upgrades (increased from 0.5/0.3)
            
            if (canBoost) {
                // Boost when: attacking player, avoiding tail, chasing treasure, or moving to target
                const shouldBoost = 
                    (targetPlayer && targetPlayerDist < 50) || // Boost when attacking
                    hasNearbyTail || // Boost to escape own tail
                    (nearestTreasure && nearestTreasure.distance < 60) || // Boost to get treasure
                    (nearestPlayer && nearestPlayerDist < 50 && bot.length >= nearestPlayer.length * 0.8) || // Boost when similar/larger size
                    distanceToTarget > 15; // Boost when moving to target
                if (shouldBoost) {
                    input.boost = Math.random() < boostChance;
                }
            }

            // Update bot input
            this.playerInputs.set(botId, input);
        });
    }

    // Check if bots collect items (server-side)
    private checkBotItemCollection() {
        this.state.players.forEach((bot, botId) => {
            // Only process bots
            if (!botId.startsWith('bot_') || !bot.spawned) return;

            // Check collision with items - bots are more efficient at collecting
            const collectionRange = 3.0; // Larger range for bots (increased from 2.5)
            const itemsToRemove: string[] = [];

            this.state.items.forEach((item, itemId) => {
                const dx = item.x - bot.x;
                const dz = item.z - bot.z;
                const distance = Math.sqrt(dx * dx + dz * dz);

                if (distance < collectionRange) {
                    // Collect item
                    itemsToRemove.push(itemId);

                    // Grow bot based on item type
                    let growthAmount = 3; // Default for common items
                    if (item.type === 'uncommon') growthAmount = 5;
                    else if (item.type === 'rare') growthAmount = 8;
                    else if (item.type === 'epic') growthAmount = 15;
                    else if (item.type === 'treasure') growthAmount = 30;

                    bot.length = Math.max(5, Math.min(bot.length + growthAmount, 1000));
                }
            });

            // Remove collected items
            itemsToRemove.forEach(itemId => {
                // Check if this is a maze treasure
                for (const [mazeId, treasureItemId] of this.mazeTreasureItems.entries()) {
                    if (treasureItemId === itemId) {
                        // Schedule respawn after 15 seconds
                        this.mazeTreasureRespawnTimes.set(mazeId, Date.now() + 15000);
                        this.mazeTreasureItems.delete(mazeId);
                        console.log(`[MAZE] Treasure collected in ${mazeId}, respawning in 15 seconds`);
                        break;
                    }
                }
                this.state.items.delete(itemId);
            });
        });
    }

    // Spawn treasure item in maze center
    private spawnMazeTreasure(mazeId: string, x: number, z: number) {
        const treasure = new WorldItem();
        treasure.id = `maze_treasure_${mazeId}_${Date.now()}`;
        treasure.x = x;
        treasure.y = 0.5; // Slightly above ground
        treasure.z = z;
        treasure.type = 'treasure';
        treasure.value = 30; // High value treasure
        
        this.state.items.set(treasure.id, treasure);
        this.mazeTreasureItems.set(mazeId, treasure.id);
        console.log(`[MAZE] Spawned treasure in ${mazeId} at (${x.toFixed(1)}, ${z.toFixed(1)})`);
    }

    // Check and respawn maze treasures
    private checkMazeTreasureRespawns() {
        const now = Date.now();
        
        for (const [mazeId, respawnTime] of this.mazeTreasureRespawnTimes.entries()) {
            if (now >= respawnTime) {
                // Find the maze
                const maze = this.state.mazes.find(m => m.id === mazeId);
                if (maze) {
                    // Check if treasure already exists
                    if (!this.mazeTreasureItems.has(mazeId)) {
                        // Spawn new treasure
                        this.spawnMazeTreasure(mazeId, maze.treasureX, maze.treasureZ);
                    }
                    // Remove from respawn queue
                    this.mazeTreasureRespawnTimes.delete(mazeId);
                }
            }
        }
    }
}
