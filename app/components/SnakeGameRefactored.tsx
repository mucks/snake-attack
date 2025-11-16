'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Client, Room } from 'colyseus.js';
import type { GameState as ColyseusGameState, Player } from '../../colyseus-server/schema/GameState';

// Import all the refactored modules
import type { Snake, MultiplayerPlayer, Item, Tree, Obstacle, Maze, MinimapData, LeaderboardEntry, UpgradeType } from '../game/types';
import {
    BASE_SPEED,
    BASE_BOOST_SPEED,
    BASE_TURN_SPEED,
    BOOST_COST_RATE,
    BOOST_COOLDOWN,
    WORLD_BOUNDARY,
    MAX_ITEMS,
    ITEM_SPAWN_INTERVAL,
    ITEM_AUTO_RESPAWN_INTERVAL,
    MAX_TREES,
    MAX_OBSTACLES,
    MAZE_COUNT,
    CAMERA_DISTANCE,
    CAMERA_HEIGHT,
    UPGRADE_LEVEL_INTERVAL,
    ITEM_COLLECTION_RADIUS,
} from '../game/constants';
import { getRandomUpgrades, applyUpgradeToStats, AVAILABLE_UPGRADES } from '../game/upgrades';
import {
    createScene,
    createCamera,
    createRenderer,
    createFloor,
    createBoundaryWalls,
    createSnakeHead,
    createMultiplayerHead,
} from '../three/sceneSetup';
import {
    updateSnakeTrailMesh,
    updateMultiplayerTrailMesh,
    disposeMultiplayerPlayer,
    rotateHeadTowardsDirection,
} from '../three/renderingUtils';
import { spawnItem, spawnTree, spawnObstacle, spawnMaze } from '../utils/spawning';
import {
    checkBoundaryCollision,
    checkItemCollection,
    checkObstacleCollision,
    checkMazeCollision,
    checkSelfCollision,
    checkMultiplayerCollision,
} from '../game/collision';
import Minimap from './Minimap';
import GameUI from './GameUI';

export default function SnakeGame({ isActive }: { isActive?: boolean } = {}) {
    const containerRef = useRef<HTMLDivElement>(null);

    // State
    const [score, setScore] = useState(0);
    const [itemsCollected, setItemsCollected] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [playersOnline, setPlayersOnline] = useState(1);
    const [isBoosting, setIsBoosting] = useState(false);
    const [fps, setFps] = useState(60);
    const [spawned, setSpawned] = useState(false);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [level, setLevel] = useState(0);
    const [showUpgradeChoice, setShowUpgradeChoice] = useState(false);
    const [upgradeOptions, setUpgradeOptions] = useState(AVAILABLE_UPGRADES.slice(0, 3));
    const [activeUpgrades, setActiveUpgrades] = useState<UpgradeType[]>([]);
    const [myPlayerColor, setMyPlayerColor] = useState('#00ffff');

    // Refs for game state
    const isFocusedRef = useRef(false);
    const showUpgradeChoiceRef = useRef(false);
    const upgradeOptionsRef = useRef(AVAILABLE_UPGRADES.slice(0, 3));
    const minimapDataRef = useRef<MinimapData>({
        playerPos: { x: 0, z: 0 },
        playerDirection: { x: 0, z: -1 },
        multiplayerPlayers: [],
        treasures: [],
        mazes: [],
    });

    const gameStateRef = useRef({
        isRunning: false,
        score: 0,
        gameOver: false,
        spawned: false,
        lastLevelUp: 0,
        hasShield: false,
    });

    // Three.js and Colyseus refs
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const roomRef = useRef<Room<ColyseusGameState> | null>(null);
    const myPlayerIdRef = useRef<string | null>(null);

    // Game objects
    const snakeRef = useRef<Snake | null>(null);
    const itemsRef = useRef<Item[]>([]);
    const treesRef = useRef<Tree[]>([]);
    const obstaclesRef = useRef<Obstacle[]>([]);
    const mazesRef = useRef<Maze[]>([]);
    const multiplayerPlayersRef = useRef<Map<string, MultiplayerPlayer>>(new Map());

    // Keyboard state
    const keysRef = useRef<Record<string, boolean>>({});

    // Sync refs with state
    useEffect(() => {
        showUpgradeChoiceRef.current = showUpgradeChoice;
        upgradeOptionsRef.current = upgradeOptions;
    }, [showUpgradeChoice, upgradeOptions]);

    useEffect(() => {
        isFocusedRef.current = isActive ?? true;
    }, [isActive]);

    // Upgrade selection handler
    const selectUpgrade = (index: number) => {
        if (index >= 0 && index < upgradeOptionsRef.current.length) {
            const upgrade = upgradeOptionsRef.current[index];
            setActiveUpgrades(prev => [...prev, upgrade.id]);

            if (upgrade.id === 'thick_skin') {
                gameStateRef.current.hasShield = true;
            }

            // Apply upgrade to snake
            if (snakeRef.current) {
                const newStats = applyUpgradeToStats(
                    upgrade.id,
                    {
                        baseSpeed: snakeRef.current.baseSpeed,
                        boostSpeed: snakeRef.current.boostSpeed,
                        turnSpeed: snakeRef.current.turnSpeed,
                        boostCostRate: BOOST_COST_RATE,
                        collectionRadius: ITEM_COLLECTION_RADIUS,
                    },
                    activeUpgrades
                );

                snakeRef.current.baseSpeed = newStats.baseSpeed;
                snakeRef.current.boostSpeed = newStats.boostSpeed;
                snakeRef.current.turnSpeed = newStats.turnSpeed;
            }

            setShowUpgradeChoice(false);
            showUpgradeChoiceRef.current = false;
        }
    };

    const restart = () => {
        setGameOver(false);
        gameStateRef.current.gameOver = false;
        setScore(0);
        setItemsCollected(0);
        setLevel(0);
        setActiveUpgrades([]);
        gameStateRef.current.hasShield = false;
        gameStateRef.current.lastLevelUp = 0;

        if (roomRef.current) {
            roomRef.current.send('spawn');
        }

        if (snakeRef.current) {
            snakeRef.current.alive = true;
            snakeRef.current.trail = [];
            snakeRef.current.length = 5;
        }

        setSpawned(true);
        gameStateRef.current.spawned = true;
        gameStateRef.current.isRunning = true;
    };

    // Main game initialization
    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const scene = createScene();
        const camera = createCamera(container.clientWidth / container.clientHeight);
        const renderer = createRenderer(container);

        sceneRef.current = scene;
        cameraRef.current = camera;
        rendererRef.current = renderer;

        createFloor(scene);
        createBoundaryWalls(scene);

        // Create player snake
        const head = createSnakeHead();
        head.position.set(0, 0, 0);
        scene.add(head);

        const snakeLight = new THREE.PointLight(0x00ffff, 1, 10);
        snakeLight.position.copy(head.position);
        scene.add(snakeLight);

        const snake: Snake = {
            position: new THREE.Vector3(0, 0, 0),
            direction: new THREE.Vector3(1, 0, 0),
            speed: BASE_SPEED,
            baseSpeed: BASE_SPEED,
            boostSpeed: BASE_BOOST_SPEED,
            turnSpeed: BASE_TURN_SPEED,
            head,
            trail: [],
            trailMesh: null,
            light: snakeLight,
            alive: false,
            length: 5,
            boosting: false,
            boostCostTimer: 0,
            boostCooldown: 0,
        };

        snakeRef.current = snake;

        // Spawn initial world objects
        const itemGeometries = {
            common: new THREE.OctahedronGeometry(0.4, 0),
            uncommon: new THREE.OctahedronGeometry(0.5, 0),
            rare: new THREE.OctahedronGeometry(0.6, 0),
            epic: new THREE.OctahedronGeometry(0.7, 0),
        };

        // Spawn trees
        for (let i = 0; i < MAX_TREES; i++) {
            const tree = spawnTree(scene, obstaclesRef.current, mazesRef.current);
            if (tree) treesRef.current.push(tree);
        }

        // Spawn obstacles
        for (let i = 0; i < MAX_OBSTACLES; i++) {
            const obstacle = spawnObstacle(scene, obstaclesRef.current, mazesRef.current);
            if (obstacle) obstaclesRef.current.push(obstacle);
        }

        // Spawn mazes
        for (let i = 0; i < MAZE_COUNT; i++) {
            const maze = spawnMaze(scene, itemGeometries, mazesRef.current, obstaclesRef.current);
            if (maze) mazesRef.current.push(maze);
        }

        // Update minimap maze data
        minimapDataRef.current.mazes = mazesRef.current.map(m => ({ x: m.position.x, z: m.position.z }));

        // Spawn initial items
        for (let i = 0; i < MAX_ITEMS; i++) {
            const item = spawnItem(scene, itemGeometries, itemsRef.current, obstaclesRef.current, mazesRef.current);
            if (item) itemsRef.current.push(item);
        }

        // Keyboard handlers
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isFocusedRef.current) return;
            keysRef.current[e.key.toLowerCase()] = true;

            // Upgrade selection
            if (showUpgradeChoiceRef.current) {
                if (e.key === '1') selectUpgrade(0);
                if (e.key === '2') selectUpgrade(1);
                if (e.key === '3') selectUpgrade(2);
            }

            // Spawn/Restart
            if (e.key === ' ') {
                e.preventDefault();
                if (gameStateRef.current.gameOver) {
                    restart();
                } else if (!gameStateRef.current.spawned) {
                    roomRef.current?.send('spawn');
                    setSpawned(true);
                    gameStateRef.current.spawned = true;
                    gameStateRef.current.isRunning = true;
                }
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            keysRef.current[e.key.toLowerCase()] = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Connect to Colyseus (shortened version - main logic remains the same as original)
        const client = new Client(
            process.env.NODE_ENV === 'production'
                ? 'wss://your-domain.com'
                : 'ws://localhost:2567'
        );

        (async () => {
            try {
                const room = await client.joinOrCreate<ColyseusGameState>('game');
                roomRef.current = room;
                myPlayerIdRef.current = room.sessionId;

                room.onStateChange.once((state) => {
                    const myPlayer = state.players.get(room.sessionId);
                    if (myPlayer?.color) {
                        setMyPlayerColor(myPlayer.color);
                    }
                });

                room.onMessage('death', () => {
                    setGameOver(true);
                    gameStateRef.current.gameOver = true;
                    gameStateRef.current.isRunning = false;
                    setSpawned(false);
                });

                // Sync loop for multiplayer players
                setInterval(() => {
                    if (!room?.state?.players) return;

                    room.state.players.forEach((player: Player, sessionId: string) => {
                        if (sessionId === room.sessionId) return;

                        const multiPlayer = multiplayerPlayersRef.current.get(sessionId);

                        if (player.spawned && !multiPlayer) {
                            // Create new player
                            const newPlayer: MultiplayerPlayer = {
                                id: sessionId,
                                name: player.name,
                                color: player.color,
                                x: player.x,
                                y: player.y,
                                z: player.z,
                                length: player.length,
                                head: createMultiplayerHead(player.color),
                                trail: [],
                                light: new THREE.PointLight(0xff00ff, 0.5, 5),
                            };

                            newPlayer.head!.position.set(player.x, player.y, player.z);
                            scene.add(newPlayer.head!);
                            scene.add(newPlayer.light!);

                            multiplayerPlayersRef.current.set(sessionId, newPlayer);
                            setPlayersOnline(multiplayerPlayersRef.current.size + 1);
                        } else if (multiPlayer && player.spawned) {
                            // Update player
                            multiPlayer.x = player.x;
                            multiPlayer.y = player.y;
                            multiPlayer.z = player.z;
                            multiPlayer.length = player.length;

                            // Sync trail
                            if (player.trail?.length > 0) {
                                multiPlayer.trail.length = player.trail.length;
                                for (let i = 0; i < player.trail.length; i++) {
                                    const pt = player.trail[i];
                                    if (!multiPlayer.trail[i]) {
                                        multiPlayer.trail[i] = new THREE.Vector3();
                                    }
                                    multiPlayer.trail[i].set(pt.x, pt.y, pt.z);
                                }
                            }
                        } else if (multiPlayer && !player.spawned) {
                            // Remove dead player
                            disposeMultiplayerPlayer(multiPlayer, scene);
                            multiplayerPlayersRef.current.delete(sessionId);
                            setPlayersOnline(multiplayerPlayersRef.current.size + 1);
                        }
                    });
                }, 33);
            } catch (error) {
                console.error('[COLYSEUS] Connection error:', error);
            }
        })();

        setIsLoading(false);

        // Animation loop (simplified)
        let frameCount = 0;
        let lastFpsUpdate = Date.now();
        const animate = () => {
            requestAnimationFrame(animate);
            frameCount++;

            if (!gameStateRef.current.isRunning || !snakeRef.current?.alive) {
                renderer.render(scene, camera);
                return;
            }

            const snake = snakeRef.current!;

            // Movement input
            if (keysRef.current['w'] || keysRef.current['arrowup']) {
                snake.direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), snake.turnSpeed);
            }
            if (keysRef.current['s'] || keysRef.current['arrowdown']) {
                snake.direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), -snake.turnSpeed);
            }
            if (keysRef.current['a'] || keysRef.current['arrowleft']) {
                snake.direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), snake.turnSpeed);
            }
            if (keysRef.current['d'] || keysRef.current['arrowright']) {
                snake.direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), -snake.turnSpeed);
            }

            // Boost
            snake.boosting = keysRef.current['shift'] && snake.boostCooldown === 0 && snake.length > 6;
            setIsBoosting(snake.boosting);
            snake.speed = snake.boosting ? snake.boostSpeed : snake.baseSpeed;

            // Move snake
            snake.direction.normalize();
            snake.position.add(snake.direction.clone().multiplyScalar(snake.speed));
            snake.head.position.copy(snake.position);
            snake.light.position.copy(snake.position);

            // Update trail
            if (snake.trail.length === 0 || snake.position.distanceTo(snake.trail[snake.trail.length - 1]) > 0.3) {
                snake.trail.push(snake.position.clone());
                while (snake.trail.length > snake.length) {
                    snake.trail.shift();
                }
            }

            // Collision checks
            if (
                checkBoundaryCollision(snake.position) ||
                checkObstacleCollision(snake.position, obstaclesRef.current) ||
                checkMazeCollision(snake.position, mazesRef.current) ||
                checkSelfCollision(snake) ||
                checkMultiplayerCollision(snake.position, multiplayerPlayersRef.current)
            ) {
                setGameOver(true);
                gameStateRef.current.gameOver = true;
                setSpawned(false);
                return;
            }

            // Item collection
            const collectedItem = checkItemCollection(snake.position, itemsRef.current);
            if (collectedItem) {
                setScore(prev => prev + collectedItem.value);
                setItemsCollected(prev => prev + 1);
                snake.length += collectedItem.growthAmount;

                scene.remove(collectedItem.mesh);
                collectedItem.mesh.geometry.dispose();
                (collectedItem.mesh.material as THREE.Material).dispose();
                itemsRef.current = itemsRef.current.filter(i => i !== collectedItem);

                // Respawn item
                const newItem = spawnItem(scene, itemGeometries, itemsRef.current, obstaclesRef.current, mazesRef.current);
                if (newItem) itemsRef.current.push(newItem);
            }

            // Update camera
            camera.position.set(
                snake.position.x - snake.direction.x * CAMERA_DISTANCE,
                snake.position.y + CAMERA_HEIGHT,
                snake.position.z - snake.direction.z * CAMERA_DISTANCE
            );
            camera.lookAt(snake.position.clone().add(snake.direction.clone().multiplyScalar(10)));

            // Render multiplayer players
            multiplayerPlayersRef.current.forEach(player => {
                if (player.head && player.trail.length > 0) {
                    player.head.position.set(player.x, player.y, player.z);
                    updateMultiplayerTrailMesh(player, scene);
                }
            });

            // FPS counter
            if (frameCount % 30 === 0) {
                const now = Date.now();
                const deltaTime = now - lastFpsUpdate;
                setFps(Math.round((30 / deltaTime) * 1000));
                lastFpsUpdate = now;
            }

            // Send movement to server
            if (frameCount % 2 === 0 && roomRef.current) {
                roomRef.current.send('move', {
                    x: snake.position.x,
                    y: snake.position.y,
                    z: snake.position.z,
                    dirX: snake.direction.x,
                    dirY: snake.direction.y,
                    dirZ: snake.direction.z,
                    length: snake.length,
                });
            }

            renderer.render(scene, camera);
        };

        animate();

        // Cleanup
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);

            if (roomRef.current) {
                roomRef.current.leave();
            }

            multiplayerPlayersRef.current.forEach(player => {
                disposeMultiplayerPlayer(player, scene);
            });

            if (container && renderer.domElement.parentNode === container) {
                container.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, []);

    return (
        <div
            ref={containerRef}
            style={{ width: '100%', height: '100%', position: 'relative', cursor: 'crosshair' }}
            onClick={() => (isFocusedRef.current = true)}
            onMouseEnter={() => (isFocusedRef.current = true)}
        >
            {isLoading && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: 'white',
                    fontSize: '24px',
                }}>
                    Loading...
                </div>
            )}

            <GameUI
                score={score}
                itemsCollected={itemsCollected}
                level={level}
                fps={fps}
                playersOnline={playersOnline}
                isBoosting={isBoosting}
                gameOver={gameOver}
                spawned={spawned}
                leaderboard={leaderboard}
                showUpgradeChoice={showUpgradeChoice}
                upgradeOptions={upgradeOptions}
                activeUpgrades={activeUpgrades}
                onSelectUpgrade={selectUpgrade}
                onRestart={restart}
            />

            {spawned && !gameOver && <Minimap data={minimapDataRef.current} />}
        </div>
    );
}




