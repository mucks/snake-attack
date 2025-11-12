'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { io, Socket } from 'socket.io-client';

// Upgrade types
type UpgradeType =
    | 'speed_boost'
    | 'turn_master'
    | 'boost_efficiency'
    | 'item_magnet'
    | 'vampire'
    | 'thick_skin'
    | 'double_points'
    | 'mega_boost';

type Upgrade = {
    id: UpgradeType;
    name: string;
    description: string;
    icon: string;
};

const AVAILABLE_UPGRADES: Upgrade[] = [
    { id: 'speed_boost', name: 'Speed Demon', description: '+30% Base Speed', icon: '⚡' },
    { id: 'turn_master', name: 'Turn Master', description: '+50% Turn Speed', icon: '🌀' },
    { id: 'boost_efficiency', name: 'Efficient Boost', description: 'Boost costs 50% less', icon: '💨' },
    { id: 'item_magnet', name: 'Item Magnet', description: '2x Collection Range', icon: '🧲' },
    { id: 'vampire', name: 'Vampire', description: 'Gain 20% of killed snake length', icon: '🧛' },
    { id: 'thick_skin', name: 'Thick Skin', description: '1 Free Death (Shield)', icon: '🛡️' },
    { id: 'double_points', name: 'Double Points', description: '2x Score from items', icon: '💰' },
    { id: 'mega_boost', name: 'Mega Boost', description: '2x Boost Speed', icon: '🚀' },
];

export default function SnakeGame({ isActive }: { isActive?: boolean } = {}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const minimapCanvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [itemsCollected, setItemsCollected] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [botsAlive, setBotsAlive] = useState(0);
    const [playersOnline, setPlayersOnline] = useState(1);
    const [isBoosting, setIsBoosting] = useState(false);
    const [fps, setFps] = useState(60);
    const [myPlayerColor, setMyPlayerColor] = useState('#00ffff');
    const [spawned, setSpawned] = useState(false);
    const [leaderboard, setLeaderboard] = useState<Array<{ name: string; length: number; isMe: boolean; color: string }>>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [level, setLevel] = useState(0);
    const [showUpgradeChoice, setShowUpgradeChoice] = useState(false);
    const [upgradeOptions, setUpgradeOptions] = useState<Upgrade[]>([]);
    const [activeUpgrades, setActiveUpgrades] = useState<UpgradeType[]>([]);
    const showUpgradeChoiceRef = useRef(false);
    const upgradeOptionsRef = useRef<Upgrade[]>([]);
    const isFocusedRef = useRef(false);
    const minimapDataRef = useRef<{
        playerPos: { x: number; z: number };
        bots: Array<{ x: number; z: number }>;
        multiplayerPlayers: Array<{ x: number; z: number }>;
        treasures: Array<{ x: number; z: number }>;
        mazes: Array<{ x: number; z: number }>;
    }>({
        playerPos: { x: 0, z: 0 },
        bots: [],
        multiplayerPlayers: [],
        treasures: [],
        mazes: [], // Will be populated by spawnRandomMazes
    });
    const gameStateRef = useRef({
        isRunning: false,
        score: 0,
        gameOver: false,
        spawned: false,
        lastLevelUp: 0, // Track last level for upgrades
        hasShield: false, // Thick skin upgrade
    });

    // Upgrade selection handler (outside useEffect so JSX can access it)
    const selectUpgrade = (index: number) => {
        if (index >= 0 && index < upgradeOptionsRef.current.length) {
            const upgrade = upgradeOptionsRef.current[index];
            setActiveUpgrades(prev => [...prev, upgrade.id]);
            if (upgrade.id === 'thick_skin') {
                gameStateRef.current.hasShield = true;
            }
            setShowUpgradeChoice(false);
            showUpgradeChoiceRef.current = false;
        }
    };

    // Sync refs with state for event handlers
    useEffect(() => {
        showUpgradeChoiceRef.current = showUpgradeChoice;
        upgradeOptionsRef.current = upgradeOptions;
    }, [showUpgradeChoice, upgradeOptions]);

    useEffect(() => {
        if (!containerRef.current) return;

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0a0a);
        // Dense fog for performance and atmosphere
        scene.fog = new THREE.Fog(0x0a0a0a, 30, 150);

        // Camera setup - third person view
        // Use container size for aspect ratio (split screen support)
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        const camera = new THREE.PerspectiveCamera(
            75,
            containerWidth / containerHeight,
            0.1,
            200 // Match fog far distance for performance
        );

        // Renderer setup with aggressive performance optimizations for Safari
        const renderer = new THREE.WebGLRenderer({
            antialias: false, // Disable AA for better performance
            powerPreference: "high-performance",
            stencil: false, // Disable stencil buffer
            depth: true,
        });
        // Use container size, not window size (for split screen support)
        renderer.setSize(containerWidth, containerHeight);
        // Lower pixel ratio for Safari (often has higher DPR on retina displays)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Cap pixel ratio for performance
        renderer.domElement.style.display = 'block'; // Remove inline spacing
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';

        containerRef.current.appendChild(renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        scene.add(directionalLight);

        // Add minimal atmospheric colored lights (2 only for performance)
        const accentLights = [
            { color: 0xff00ff, pos: [400, 20, 0] },
            { color: 0x00ffff, pos: [-400, 20, 0] },
        ];

        for (const lightConfig of accentLights) {
            const light = new THREE.PointLight(lightConfig.color, 1.2, 500);
            light.position.set(lightConfig.pos[0], lightConfig.pos[1], lightConfig.pos[2]);
            scene.add(light);
        }

        // Add point light that follows the snake
        const snakeLight = new THREE.PointLight(0x00ffff, 2, 30);
        scene.add(snakeLight);

        // Create grid floor - optimized world size
        const gridSize = 1000; // Reduced for better gameplay density
        const gridDivisions = 100;
        const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x00ffff, 0x003333);
        gridHelper.position.y = -0.5;
        scene.add(gridHelper);

        // Add glowing floor plane with subtle gradient
        const floorGeometry = new THREE.PlaneGeometry(gridSize, gridSize);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.9,
            emissive: 0x001a1a,
            emissiveIntensity: 0.2,
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.51;
        scene.add(floor);

        // Bot snake type
        type BotSnake = {
            position: THREE.Vector3;
            direction: THREE.Vector3;
            speed: number;
            baseSpeed: number;
            boostSpeed: number;
            turnSpeed: number;
            head: THREE.Group;
            trail: THREE.Vector3[];
            trailMesh: THREE.Mesh | null;
            light: THREE.PointLight;
            alive: boolean;
            length: number;
            boosting: boolean;
            boostCostTimer: number;
            boostCooldown: number;
        };

        // Item type with rarity and value support
        type Item = {
            position: THREE.Vector3;
            mesh: THREE.Mesh;
            spawnTime: number;
            type: 'common' | 'uncommon' | 'rare' | 'epic' | 'treasure';
            value: number;
        };

        // Tree type
        type Tree = {
            position: THREE.Vector3;
            group: THREE.Group;
        };

        // Obstacle type
        type Obstacle = {
            position: THREE.Vector3;
            mesh: THREE.Mesh | THREE.Group;
            radius: number;
        };

        // Multiplayer player type
        type MultiplayerPlayer = {
            id: string;
            position: THREE.Vector3;
            targetPosition: THREE.Vector3; // For smooth interpolation
            direction: THREE.Vector3;
            targetDirection: THREE.Vector3; // For smooth interpolation
            head: THREE.Group;
            trail: THREE.Vector3[];
            trailMesh: THREE.Mesh | null;
            light: THREE.PointLight;
            length: number;
            color: string;
        };

        // Game state
        const gameState = {
            snake: {
                position: new THREE.Vector3(0, 0.5, 0),
                direction: new THREE.Vector3(0, 0, -1),
                speed: 0.3,
                baseSpeed: 0.3,
                boostSpeed: 0.6,
                turnSpeed: 0.05,
                segments: [] as (THREE.Mesh | THREE.Group)[],
                trail: [] as THREE.Vector3[],
                trailMesh: null as THREE.Mesh | null,
                length: 20, // Current trail length - start with visible body
                boosting: false,
                boostCostTimer: 0,
                spawnFrameCount: 0, // Track frames since spawn to delay trail rendering
            },
            bots: [] as BotSnake[],
            items: [] as Item[],
            trees: [] as Tree[],
            obstacles: [] as Obstacle[],
            multiplayerPlayers: new Map<string, MultiplayerPlayer>(),
            keys: {
                left: false,
                right: false,
                boost: false,
            },
        };

        // Socket.IO connection
        let socket: Socket | null = null;
        let myPlayerId: string | null = null;

        // Helper function to create a snake-like head with eyes
        const createSnakeHead = (color: number | THREE.Color): THREE.Group => {
            const headGroup = new THREE.Group();

            const colorObj = typeof color === 'number' ? new THREE.Color(color) : color;

            // Main head - elongated ellipsoid shape (balanced geometry)
            const headGeometry = new THREE.CapsuleGeometry(0.35, 1.2, 7, 14);
            const headMaterial = new THREE.MeshStandardMaterial({
                color: colorObj,
                emissive: colorObj,
                emissiveIntensity: 0.5,
                metalness: 0.8,
                roughness: 0.2,
            });
            const head = new THREE.Mesh(headGeometry, headMaterial);
            head.rotation.x = Math.PI / 2; // Point forward
            headGroup.add(head);

            // Eyes (balanced geometry)
            const eyeGeometry = new THREE.SphereGeometry(0.15, 7, 7);
            const eyeMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                emissive: 0xffffff,
                emissiveIntensity: 0.8,
                metalness: 0.3,
                roughness: 0.1,
            });

            // Left eye
            const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            leftEye.position.set(-0.25, 0.15, 0.5);
            headGroup.add(leftEye);

            // Right eye
            const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            rightEye.position.set(0.25, 0.15, 0.5);
            headGroup.add(rightEye);

            // Eye pupils (balanced geometry)
            const pupilGeometry = new THREE.SphereGeometry(0.08, 5, 5);
            const pupilMaterial = new THREE.MeshStandardMaterial({
                color: 0x000000,
                emissive: 0x000000,
                emissiveIntensity: 0.3,
            });

            const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
            leftPupil.position.set(-0.25, 0.15, 0.6);
            headGroup.add(leftPupil);

            const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
            rightPupil.position.set(0.25, 0.15, 0.6);
            headGroup.add(rightPupil);

            // Snout detail - small pointed tip (balanced geometry)
            const snoutGeometry = new THREE.ConeGeometry(0.2, 0.3, 7);
            const snoutMaterial = new THREE.MeshStandardMaterial({
                color: colorObj.clone().multiplyScalar(0.8),
                emissive: colorObj,
                emissiveIntensity: 0.3,
                metalness: 0.8,
                roughness: 0.2,
            });
            const snout = new THREE.Mesh(snoutGeometry, snoutMaterial);
            snout.rotation.x = -Math.PI / 2;
            snout.position.set(0, 0, 0.9);
            headGroup.add(snout);

            return headGroup;
        };

        // Create snake head
        const head = createSnakeHead(0x00ffff);
        head.position.copy(gameState.snake.position);
        scene.add(head);
        gameState.snake.segments.push(head);

        // Input handling
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only respond to input if this game instance is focused
            if (!isFocusedRef.current) return;

            // Handle upgrade selection with number keys (using code for layout independence)
            if (showUpgradeChoiceRef.current) {
                if (e.code === 'Digit1' || e.code === 'Numpad1') {
                    e.preventDefault();
                    selectUpgrade(0);
                    return;
                }
                if (e.code === 'Digit2' || e.code === 'Numpad2') {
                    e.preventDefault();
                    selectUpgrade(1);
                    return;
                }
                if (e.code === 'Digit3' || e.code === 'Numpad3') {
                    e.preventDefault();
                    selectUpgrade(2);
                    return;
                }
                // Don't return here - allow movement keys to work!
            }

            // Handle spawn/respawn with space
            if (e.key === ' ' || e.key === 'Enter') {
                if (!gameStateRef.current.spawned || gameStateRef.current.gameOver) {
                    // Request spawn from server
                    if (socket) {
                        socket.emit('request-respawn');
                    }

                    // Reset game state for new spawn
                    setGameOver(false);
                    gameStateRef.current.gameOver = false;
                    gameStateRef.current.spawned = true;
                    setSpawned(true);
                    gameStateRef.current.isRunning = true;

                    // Reset score
                    setScore(0);
                    gameStateRef.current.score = 0;
                    setItemsCollected(0);

                    // Reset upgrades and level
                    setLevel(0);
                    setActiveUpgrades([]);
                    gameStateRef.current.lastLevelUp = 0;
                    gameStateRef.current.hasShield = false;

                    // Reset snake state
                    gameState.snake.length = 20;
                    // Initialize trail with just 2 close points - will build naturally as snake moves
                    gameState.snake.trail = [
                        gameState.snake.position.clone(),
                        gameState.snake.position.clone().sub(gameState.snake.direction.clone().multiplyScalar(0.1)),
                    ];
                    gameState.snake.boosting = false;
                    gameState.snake.spawnFrameCount = 0; // Reset spawn frame counter

                    // Update player count when we spawn
                    setTimeout(() => updatePlayersOnlineCount(), 100);

                    return;
                }
            }

            // Use physical key position (code) for layout-independent controls
            if (e.key === 'ArrowLeft' || e.code === 'KeyA') {
                gameState.keys.left = true;
            }
            if (e.key === 'ArrowRight' || e.code === 'KeyD') {
                gameState.keys.right = true;
            }
            if (e.code === 'KeyW' || e.key === 'ArrowUp') {
                gameState.keys.boost = true;
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            // Only respond to input if this game instance is focused
            if (!isFocusedRef.current) return;

            // Use physical key position (code) for layout-independent controls
            if (e.key === 'ArrowLeft' || e.code === 'KeyA') {
                gameState.keys.left = false;
            }
            if (e.key === 'ArrowRight' || e.code === 'KeyD') {
                gameState.keys.right = false;
            }
            if (e.code === 'KeyW' || e.key === 'ArrowUp') {
                gameState.keys.boost = false;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Helper function to dispose trail mesh (which is now a Group containing tube + caps)
        const disposeTrailMesh = (trailMesh: any) => {
            if (!trailMesh) return;

            try {
                scene.remove(trailMesh);

                // Traverse and dispose all geometries and materials in the group
                if (trailMesh.traverse && typeof trailMesh.traverse === 'function') {
                    trailMesh.traverse((child: any) => {
                        if (!child) return;

                        if (child instanceof THREE.Mesh) {
                            if (child.geometry) {
                                child.geometry.dispose();
                            }
                            if (child.material) {
                                if (Array.isArray(child.material)) {
                                    child.material.forEach((mat: any) => mat?.dispose?.());
                                } else {
                                    child.material.dispose();
                                }
                            }
                        }
                    });
                }
            } catch (error) {
                console.error('Error disposing trail mesh:', error);
            }
        };

        // Create trail mesh function with LOD (Level of Detail)
        const updateTrailMesh = (trail: THREE.Vector3[], currentMesh: THREE.Mesh | null, color: number, lowDetail: boolean = false): THREE.Mesh | null => {
            if (trail.length < 2) return currentMesh;

            // Validate trail points - filter out any invalid points
            const validTrail = trail.filter(p => {
                if (!p) return false;
                if (typeof p.x !== 'number' || typeof p.y !== 'number' || typeof p.z !== 'number') return false;
                if (isNaN(p.x) || isNaN(p.y) || isNaN(p.z)) return false;
                if (!isFinite(p.x) || !isFinite(p.y) || !isFinite(p.z)) return false;
                return true;
            });

            // Remove duplicate consecutive points (can cause curve issues)
            // IMPORTANT: Always keep at least first and last point
            const uniqueTrail: THREE.Vector3[] = [];
            for (let i = 0; i < validTrail.length; i++) {
                // Always include first point, last point, or points with sufficient distance
                if (i === 0 || i === validTrail.length - 1 || validTrail[i].distanceTo(validTrail[i - 1]) > 0.01) {
                    uniqueTrail.push(validTrail[i]);
                }
            }

            // If validation removed too many points, keep the current mesh
            if (uniqueTrail.length < 2) {
                // Don't dispose the current mesh, just return it to keep the trail visible
                return currentMesh;
            }

            try {
                // Final validation: ensure all points are proper Vector3 instances with valid properties
                for (let i = 0; i < uniqueTrail.length; i++) {
                    const point = uniqueTrail[i];
                    if (!point || !(point instanceof THREE.Vector3) ||
                        typeof point.x !== 'number' || typeof point.y !== 'number' || typeof point.z !== 'number' ||
                        !isFinite(point.x) || !isFinite(point.y) || !isFinite(point.z)) {
                        console.error('Invalid point in uniqueTrail at index', i, point);
                        return currentMesh; // Keep current mesh if any point is invalid
                    }
                }

                // Create curve - use simpler curve for short trails to avoid CatmullRom issues
                let curve;
                if (uniqueTrail.length === 2) {
                    // For 2 points, use a simple LineCurve3 to avoid CatmullRom interpolation issues
                    curve = new THREE.LineCurve3(uniqueTrail[0], uniqueTrail[1]);
                } else if (uniqueTrail.length === 3) {
                    // For 3 points, use QuadraticBezierCurve3 for smooth interpolation
                    curve = new THREE.QuadraticBezierCurve3(uniqueTrail[0], uniqueTrail[1], uniqueTrail[2]);
                } else {
                    // For 4+ points, use CatmullRomCurve3 for very smooth curves
                    curve = new THREE.CatmullRomCurve3(uniqueTrail, false, 'catmullrom', 0.3);
                }

                // Verify curve was created successfully and can sample points
                if (!curve || !curve.getPoint) {
                    console.error('Failed to create valid curve');
                    return currentMesh;
                }

                // Test that the curve can actually return valid points at multiple samples
                try {
                    const samples = [0, 0.5, 1];
                    for (const t of samples) {
                        const testPoint = curve.getPoint(t);
                        if (!testPoint || typeof testPoint.x !== 'number' || !isFinite(testPoint.x) ||
                            !isFinite(testPoint.y) || !isFinite(testPoint.z)) {
                            console.error(`Curve getPoint(${t}) returned invalid data:`, testPoint);
                            return currentMesh;
                        }
                    }
                } catch (e) {
                    console.error('curve.getPoint threw error:', e, 'Trail length:', uniqueTrail.length);
                    return currentMesh;
                }

                // Balanced for performance with many bots - ensure minimum of 3 segments for TubeGeometry
                const tubularSegments = Math.max(
                    lowDetail ? Math.max(uniqueTrail.length, 20) : Math.max(uniqueTrail.length * 1.5, 30),
                    3
                );
                const radialSegments = lowDetail ? 5 : 7;

                // Additional safety: ensure segments are valid numbers
                if (!isFinite(tubularSegments) || !isFinite(radialSegments) || tubularSegments < 3 || radialSegments < 3) {
                    console.error('Invalid geometry segments:', tubularSegments, radialSegments);
                    return currentMesh;
                }

                let tubeGeometry;
                try {
                    tubeGeometry = new THREE.TubeGeometry(curve, Math.floor(tubularSegments), 0.4, Math.floor(radialSegments), false);

                    // Verify geometry was created with valid attributes
                    if (!tubeGeometry || !tubeGeometry.attributes || !tubeGeometry.attributes.position) {
                        console.error('TubeGeometry created but has invalid attributes');
                        return currentMesh;
                    }
                } catch (geometryError) {
                    console.error('TubeGeometry creation failed:', geometryError, 'Trail points:', uniqueTrail.length, 'Curve type:', curve.type);
                    return currentMesh;
                }

                const trailMaterial = new THREE.MeshStandardMaterial({
                    color: color,
                    emissive: color,
                    emissiveIntensity: 0.5,
                    metalness: 0.8,
                    roughness: 0.2,
                });

                // Create a group to hold the tube and caps
                const trailGroup = new THREE.Group();

                const tubeMesh = new THREE.Mesh(tubeGeometry, trailMaterial);
                trailGroup.add(tubeMesh);

                // Add spherical caps at both ends of the trail for a polished look
                const capGeometry = new THREE.SphereGeometry(0.4, radialSegments, radialSegments);

                // Cap at the start (tail end) of the trail
                const startCap = new THREE.Mesh(capGeometry, trailMaterial);
                startCap.position.copy(uniqueTrail[uniqueTrail.length - 1]);
                trailGroup.add(startCap);

                // Cap at the end (head end) of the trail
                const endCap = new THREE.Mesh(capGeometry, trailMaterial);
                endCap.position.copy(uniqueTrail[0]);
                trailGroup.add(endCap);

                scene.add(trailGroup);

                // Only dispose the old mesh AFTER successfully creating the new one
                if (currentMesh) {
                    disposeTrailMesh(currentMesh);
                }

                return trailGroup as any;
            } catch (error) {
                console.error('Error creating trail mesh:', error, 'Trail length:', uniqueTrail.length);
                // Keep the current mesh if creation fails
                return currentMesh;
            }
        };

        // Create bot snake
        const createBot = (startPos: THREE.Vector3, color: number): BotSnake => {
            const head = createSnakeHead(color);
            head.position.copy(startPos);
            head.scale.set(0.9, 0.9, 0.9); // Slightly smaller for bots
            scene.add(head);

            const light = new THREE.PointLight(color, 1.5, 25);
            scene.add(light);

            // Random initial direction
            const angle = Math.random() * Math.PI * 2;
            const direction = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).normalize();

            // Initialize trail with multiple points spread behind the head for natural appearance
            const backDir = direction.clone().multiplyScalar(-1);
            return {
                position: startPos.clone(),
                direction: direction,
                speed: 0.25,
                baseSpeed: 0.25,
                boostSpeed: 0.5,
                turnSpeed: 0.04,
                head: head,
                trail: [
                    startPos.clone(),
                    startPos.clone().add(backDir.clone().multiplyScalar(0.8)),
                    startPos.clone().add(backDir.clone().multiplyScalar(1.6)),
                    startPos.clone().add(backDir.clone().multiplyScalar(2.4)),
                ],
                trailMesh: null,
                light: light,
                alive: true,
                length: 20, // Bots start with visible body
                boosting: false,
                boostCostTimer: 0,
                boostCooldown: 0,
            };
        };

        // Spawn bots spread across the world with some near player
        const spawnSingleBot = () => {
            const colors = [0xff0088, 0xff8800, 0x88ff00, 0xff00ff, 0x00ffff, 0xff0000, 0x0088ff, 0x88ff88];
            // Mix of close, medium, and far spawns so player sees bots immediately
            const spawnRadiusMin = 30; // Some bots spawn closer
            const spawnRadiusMax = 300; // Reduced max range for better visibility

            const angle = (Math.random()) * Math.PI * 2;
            const radius = spawnRadiusMin + Math.random() * (spawnRadiusMax - spawnRadiusMin);
            const spawnPos = new THREE.Vector3(
                Math.cos(angle) * radius,
                0.5,
                Math.sin(angle) * radius
            );
            const color = colors[gameState.bots.length % colors.length];
            const bot = createBot(spawnPos, color);
            gameState.bots.push(bot);
            return bot;
        };

        const removeSingleBot = () => {
            if (gameState.bots.length === 0) return;

            // Try to remove a dead bot first, otherwise remove the last alive bot
            let botIndex = gameState.bots.findIndex(b => !b.alive);
            if (botIndex === -1) {
                botIndex = gameState.bots.length - 1;
            }

            const bot = gameState.bots[botIndex];
            if (bot) {
                scene.remove(bot.head);
                scene.remove(bot.light);
                if (bot.trailMesh) {
                    disposeTrailMesh(bot.trailMesh);
                }
                gameState.bots.splice(botIndex, 1);
            }
        };

        const TARGET_BOT_COUNT = 25; // Good balance for Safari with bots spawning closer

        const manageBotCount = () => {
            const currentBotCount = gameState.bots.length;

            if (currentBotCount < TARGET_BOT_COUNT) {
                // Add bots to reach target
                const botsToAdd = TARGET_BOT_COUNT - currentBotCount;
                for (let i = 0; i < botsToAdd; i++) {
                    spawnSingleBot();
                }
                console.log(`Added ${botsToAdd} bots. Total bots: ${TARGET_BOT_COUNT}`);
            }

            // Update bot alive count
            const aliveCount = gameState.bots.filter(b => b.alive).length;
            setBotsAlive(aliveCount);
        };

        const updatePlayersOnlineCount = () => {
            const realPlayerCount = gameState.multiplayerPlayers.size + (gameStateRef.current.spawned ? 1 : 0);
            setPlayersOnline(realPlayerCount);
        };

        const updateLeaderboard = () => {
            const allSnakes: Array<{ name: string; length: number; isMe: boolean; color: string }> = [];

            // Add player if spawned
            if (gameStateRef.current.spawned) {
                allSnakes.push({
                    name: 'You',
                    length: gameState.snake.length,
                    isMe: true,
                    color: myPlayerColor,
                });
            }

            // Add bots
            gameState.bots.forEach((bot, index) => {
                if (bot.alive) {
                    // Get bot color from head mesh
                    let botColorHex = '#ffffff';
                    bot.head.traverse((child) => {
                        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                            const childColor = child.material.color.getHex();
                            if (childColor !== 0xffffff && childColor !== 0x000000) {
                                botColorHex = '#' + childColor.toString(16).padStart(6, '0');
                            }
                        }
                    });

                    allSnakes.push({
                        name: `Bot ${index + 1}`,
                        length: bot.length,
                        isMe: false,
                        color: botColorHex,
                    });
                }
            });

            // Add multiplayer players
            gameState.multiplayerPlayers.forEach((player, id) => {
                // Parse player color to hex
                let playerColorHex = '#ff00ff';
                if (player.color.startsWith('hsl')) {
                    const hue = parseInt(player.color.match(/\d+/)?.[0] || '0');
                    const colorNum = new THREE.Color().setHSL(hue / 360, 0.7, 0.5).getHex();
                    playerColorHex = '#' + colorNum.toString(16).padStart(6, '0');
                } else if (player.color.startsWith('#')) {
                    playerColorHex = player.color;
                }

                allSnakes.push({
                    name: `Player`,
                    length: player.length,
                    isMe: false,
                    color: playerColorHex,
                });
            });

            // Sort by length (descending) and take top 5
            allSnakes.sort((a, b) => b.length - a.length);
            setLeaderboard(allSnakes.slice(0, 5));
        };

        // Items now support multiple types with different values and rarities
        // Handled by itemHelpers.ts

        // Shared geometries for tree branches (cache for reuse)
        const treeBranchGeometryCache = new Map<string, THREE.CylinderGeometry>();
        const getTreeBranchGeometry = (length: number, thickness: number): THREE.CylinderGeometry => {
            // Round values to reduce unique geometries
            const key = `${Math.round(length * 10)}_${Math.round(thickness * 100)}`;
            if (!treeBranchGeometryCache.has(key)) {
                treeBranchGeometryCache.set(key, new THREE.CylinderGeometry(thickness, thickness * 0.7, length, 4)); // Reduced to 4 segments
            }
            return treeBranchGeometryCache.get(key)!;
        };

        // Create fractal tree with recursive branching
        const createFractalBranch = (
            startPos: THREE.Vector3,
            direction: THREE.Vector3,
            length: number,
            thickness: number,
            depth: number,
            color: THREE.Color,
            group: THREE.Group
        ) => {
            if (depth <= 0 || length < 0.5) return;

            const endPos = startPos.clone().add(direction.clone().multiplyScalar(length));

            // Reuse cached geometry and create material (material is cheap, geometry is expensive)
            const geometry = getTreeBranchGeometry(length, thickness);
            const material = new THREE.MeshStandardMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.6, // Much brighter glow
                metalness: 0.3,
                roughness: 0.7,
            });
            const branch = new THREE.Mesh(geometry, material);

            // Position and orient the branch
            branch.position.copy(startPos.clone().add(direction.clone().multiplyScalar(length / 2)));
            branch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());

            group.add(branch);

            // Create child branches
            const numBranches = depth > 2 ? 3 : 2;
            const angleSpread = Math.PI / 3;

            for (let i = 0; i < numBranches; i++) {
                const angle = (i - (numBranches - 1) / 2) * angleSpread + (Math.random() - 0.5) * 0.3;
                const rotationAxis = new THREE.Vector3(
                    Math.random() - 0.5,
                    0,
                    Math.random() - 0.5
                ).normalize();

                const newDirection = direction.clone();
                newDirection.applyAxisAngle(rotationAxis, angle);
                newDirection.normalize();

                createFractalBranch(
                    endPos.clone(),
                    newDirection,
                    length * 0.7,
                    thickness * 0.6,
                    depth - 1,
                    color,
                    group
                );
            }
        };

        // Create a complete fractal tree
        const createFractalTree = (position: THREE.Vector3): Tree => {
            const group = new THREE.Group();

            // Random tree color variations - brighter colors
            const colorOptions = [
                new THREE.Color(0xff00ff), // Magenta
                new THREE.Color(0x00ffff), // Cyan
                new THREE.Color(0xff0088), // Pink
                new THREE.Color(0x88ff00), // Lime
                new THREE.Color(0xff8800), // Orange
                new THREE.Color(0x0088ff), // Blue
                new THREE.Color(0x8800ff), // Purple
                new THREE.Color(0xffff00), // Yellow
            ];

            const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];
            const height = 6 + Math.random() * 4; // Shorter trees
            const initialDirection = new THREE.Vector3(0, 1, 0);

            // Create trunk and branches
            createFractalBranch(
                new THREE.Vector3(0, 0, 0),
                initialDirection,
                height,
                0.5, // Medium thickness
                4, // Recursion depth
                color,
                group
            );

            group.position.set(position.x, 0, position.z); // Ensure trees are on the ground
            scene.add(group);

            return {
                position: position.clone(),
                group: group,
            };
        };

        // Spawn fractal trees around the world
        const spawnTrees = (count: number) => {
            const boundary = (gridSize / 2) - 100;
            const minDistance = 80; // Keep spawn area clear

            // Scatter all trees around the world (not at spawn)
            for (let i = 0; i < count; i++) {
                let pos: THREE.Vector3;
                let attempts = 0;

                // Find a position not too close to center
                do {
                    pos = new THREE.Vector3(
                        (Math.random() - 0.5) * boundary * 2,
                        0,
                        (Math.random() - 0.5) * boundary * 2
                    );
                    attempts++;
                } while (pos.length() < minDistance && attempts < 10);

                const tree = createFractalTree(pos);
                gameState.trees.push(tree);
            }
        };

        // Shared geometry and material for obstacles (created once, reused for all)
        const sharedTorusGeometry = new THREE.TorusGeometry(8, 1.5, 4, 8); // Reduced segments for performance
        const sharedTorusMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 0.3,
            metalness: 0.8,
            roughness: 0.2,
        });

        // Spawn minimal simple geometric obstacles for visual interest
        const spawnObstacles = (count: number) => {
            const boundary = (gridSize / 2) - 200;
            const minDistance = 150; // Keep spawn area clear

            for (let i = 0; i < count; i++) {
                let pos: THREE.Vector3;
                let attempts = 0;

                // Find a position not too close to center
                do {
                    pos = new THREE.Vector3(
                        (Math.random() - 0.5) * boundary * 2,
                        0,
                        (Math.random() - 0.5) * boundary * 2
                    );
                    attempts++;
                } while (pos.length() < minDistance && attempts < 10);

                // Reuse shared geometry and material
                const mesh = new THREE.Mesh(sharedTorusGeometry, sharedTorusMaterial);
                mesh.rotation.x = Math.PI / 2; // Lay flat
                mesh.position.set(pos.x, 0.5, pos.z);

                scene.add(mesh);
                gameState.obstacles.push({
                    position: new THREE.Vector3(pos.x, 0, pos.z),
                    mesh: mesh,
                    radius: 10,
                });
            }
        };

        // Create multiplayer player
        const createMultiplayerPlayer = (id: string, color: string, position?: any, direction?: any): MultiplayerPlayer => {
            // Parse HSL color to hex
            let colorNum = 0xff00ff;
            if (color.startsWith('hsl')) {
                // Extract hue from hsl string
                const hue = parseInt(color.match(/\d+/)?.[0] || '0');
                colorNum = new THREE.Color().setHSL(hue / 360, 0.7, 0.5).getHex();
            } else {
                colorNum = parseInt(color.replace('#', ''), 16) || 0xff00ff;
            }

            const playerHead = createSnakeHead(colorNum);

            const spawnPos = position
                ? new THREE.Vector3(position.x, position.y, position.z)
                : new THREE.Vector3(0, 0.5, 0);
            const spawnDir = direction
                ? new THREE.Vector3(direction.x, direction.y, direction.z)
                : new THREE.Vector3(0, 0, -1);

            playerHead.position.copy(spawnPos);
            scene.add(playerHead);

            const playerLight = new THREE.PointLight(colorNum, 2, 30);
            scene.add(playerLight);

            // Initialize trail with multiple points spread behind the head for natural appearance
            const backDir = spawnDir.clone().multiplyScalar(-1);
            return {
                id,
                position: spawnPos,
                targetPosition: spawnPos.clone(),
                direction: spawnDir,
                targetDirection: spawnDir.clone(),
                head: playerHead,
                trail: [
                    spawnPos.clone(),
                    spawnPos.clone().add(backDir.clone().multiplyScalar(0.8)),
                    spawnPos.clone().add(backDir.clone().multiplyScalar(1.6)),
                    spawnPos.clone().add(backDir.clone().multiplyScalar(2.4)),
                ],
                trailMesh: null,
                light: playerLight,
                length: 20,
                color,
            };
        };

        // Item spawning handled by itemHelpers - supports multiple types with different rarities

        // Import item types for growth amounts
        const ITEM_TYPES_LOCAL = {
            common: { value: 1, growthAmount: 3 },
            uncommon: { value: 3, growthAmount: 5 },
            rare: { value: 5, growthAmount: 8 },
            epic: { value: 10, growthAmount: 15 },
            treasure: { value: 30, growthAmount: 30 }, // Maze treasure worth 10+ collectibles!
        };

        // Check and collect items - now with variable values
        const checkItemCollection = (position: THREE.Vector3) => {
            for (let i = gameState.items.length - 1; i >= 0; i--) {
                const item = gameState.items[i];
                const distance = position.distanceTo(item.position);

                // Apply item magnet upgrade
                const collectionRange = activeUpgrades.includes('item_magnet') ? 4 : 2;

                if (distance < collectionRange) {
                    // Collect item
                    scene.remove(item.mesh);
                    item.mesh.geometry.dispose();
                    if (item.mesh.material) {
                        if (Array.isArray(item.mesh.material)) {
                            item.mesh.material.forEach((m: THREE.Material) => m.dispose());
                        } else {
                            item.mesh.material.dispose();
                        }
                    }
                    gameState.items.splice(i, 1);

                    // Grow snake based on item type
                    const config = ITEM_TYPES_LOCAL[item.type as keyof typeof ITEM_TYPES_LOCAL];
                    let growthAmount = config.growthAmount;

                    // Apply item magnet upgrade (already applied in distance check)

                    gameState.snake.length += growthAmount;

                    // Update score based on item value
                    const pointMultiplier = activeUpgrades.includes('double_points') ? 2 : 1;
                    gameStateRef.current.score += item.value * 10 * pointMultiplier;
                    setScore(gameStateRef.current.score);
                    setItemsCollected(prev => prev + 1);

                    // Check for level up (every 50 length = 1 level)
                    const newLevel = Math.floor(gameState.snake.length / 50);
                    if (newLevel > gameStateRef.current.lastLevelUp) {
                        gameStateRef.current.lastLevelUp = newLevel;
                        setLevel(newLevel);

                        // Show upgrade choices (game continues running!)
                        const shuffled = [...AVAILABLE_UPGRADES].sort(() => Math.random() - 0.5);
                        const options = shuffled.slice(0, 3); // Show 3 random options
                        setUpgradeOptions(options);
                        upgradeOptionsRef.current = options;
                        setShowUpgradeChoice(true);
                        showUpgradeChoiceRef.current = true;
                        // Don't pause game - let player choose while playing!
                    }

                    return true;
                }
            }
            return false;
        };

        // Helper: Check collision with box (AABB collision for maze walls)
        const checkBoxCollision = (point: THREE.Vector3, boxCenter: THREE.Vector3, width: number, depth: number): boolean => {
            const halfWidth = width / 2 + 1.0; // Add margin for snake thickness
            const halfDepth = depth / 2 + 1.0;

            return (
                point.x >= boxCenter.x - halfWidth &&
                point.x <= boxCenter.x + halfWidth &&
                point.z >= boxCenter.z - halfDepth &&
                point.z <= boxCenter.z + halfDepth
            );
        };

        // Check collision with trail (slither.io style) - optimized
        const checkCollision = (position: THREE.Vector3, skipTrailCount: number = 10, ownTrail?: THREE.Vector3[]) => {
            // Check boundaries
            const boundary = gridSize / 2 - 2;
            if (
                Math.abs(position.x) > boundary ||
                Math.abs(position.z) > boundary
            ) {
                return true;
            }

            const collisionDistance = 1.2;
            const collisionDistanceSq = collisionDistance * collisionDistance; // Use squared distance to avoid sqrt

            // Check maze wall collisions (AABB collision for boxes)
            for (const mazeWall of allMazeWalls) {
                if (!mazeWall.mesh.visible) continue;
                if (checkBoxCollision(position, mazeWall.position, mazeWall.width, mazeWall.depth)) {
                    return true;
                }
            }

            // Check tree collisions - trees are obstacles
            const treeCollisionDistance = 3; // Larger radius for trees
            const treeCollisionDistanceSq = treeCollisionDistance * treeCollisionDistance;

            for (const tree of gameState.trees) {
                if (!tree.group.visible) continue; // Skip non-visible trees
                const distanceSq = position.distanceToSquared(tree.position);
                if (distanceSq < treeCollisionDistanceSq) {
                    return true;
                }
            }

            // Check obstacle collisions (rings, pillars, platforms - use radius for these)
            for (const obstacle of gameState.obstacles) {
                if (!obstacle.mesh.visible) continue; // Skip non-visible obstacles
                const distanceSq = position.distanceToSquared(obstacle.position);
                const collisionRadiusSq = obstacle.radius * obstacle.radius;
                if (distanceSq < collisionRadiusSq) {
                    return true;
                }
            }

            // Check player trail collision - sample every 3rd point for better performance (Safari)
            const playerTrailToCheck = ownTrail === gameState.snake.trail
                ? gameState.snake.trail.slice(0, -skipTrailCount)
                : gameState.snake.trail;

            for (let i = 0; i < playerTrailToCheck.length; i += 3) { // Skip every 3rd point for Safari
                const segment = playerTrailToCheck[i];
                const distanceSq = position.distanceToSquared(segment);
                if (distanceSq < collisionDistanceSq) {
                    return true;
                }
            }

            // Check all bot trails - only check visible bots and sample points
            for (const bot of gameState.bots) {
                if (!bot.alive || !bot.head.visible) continue; // Skip non-visible bots

                const botTrailToCheck = ownTrail === bot.trail
                    ? bot.trail.slice(0, -skipTrailCount)
                    : bot.trail;

                for (let i = 0; i < botTrailToCheck.length; i += 3) { // Skip every 3rd point for Safari
                    const segment = botTrailToCheck[i];
                    const distanceSq = position.distanceToSquared(segment);
                    if (distanceSq < collisionDistanceSq) {
                        return true;
                    }
                }
            }

            // Check multiplayer players' trails
            for (const [id, player] of gameState.multiplayerPlayers) {
                const playerTrailToCheck = ownTrail === player.trail
                    ? player.trail.slice(0, -skipTrailCount)
                    : player.trail;

                for (let i = 0; i < playerTrailToCheck.length; i += 2) {
                    const segment = playerTrailToCheck[i];
                    const distanceSq = position.distanceToSquared(segment);
                    if (distanceSq < collisionDistanceSq) {
                        return true;
                    }
                }
            }

            return false;
        };


        // Animation loop with FPS tracking
        let lastTime = Date.now();
        let frameCount = 0;
        let fpsUpdateTime = Date.now();

        const animate = () => {
            requestAnimationFrame(animate);

            const currentTime = Date.now();
            const deltaTime = (currentTime - lastTime) / 16.67; // Normalize to ~60fps
            lastTime = currentTime;

            // Update FPS counter every second
            frameCount++;
            if (currentTime - fpsUpdateTime >= 1000) {
                setFps(frameCount);
                frameCount = 0;
                fpsUpdateTime = currentTime;
            }

            // Update head and trail visibility based on spawn state
            head.visible = gameStateRef.current.spawned && !gameStateRef.current.gameOver;
            snakeLight.visible = gameStateRef.current.spawned && !gameStateRef.current.gameOver;
            if (gameState.snake.trailMesh) {
                gameState.snake.trailMesh.visible = gameStateRef.current.spawned && !gameStateRef.current.gameOver;
            }

            if (!gameStateRef.current.gameOver && gameStateRef.current.isRunning && gameStateRef.current.spawned) {
                // Apply upgrades to base stats
                const speedMultiplier = activeUpgrades.includes('speed_boost') ? 1.3 : 1.0;
                const turnMultiplier = activeUpgrades.includes('turn_master') ? 1.5 : 1.0;
                const boostSpeedMultiplier = activeUpgrades.includes('mega_boost') ? 2.0 : 1.0;
                const boostCostMultiplier = activeUpgrades.includes('boost_efficiency') ? 0.5 : 1.0;

                gameState.snake.baseSpeed = 0.3 * speedMultiplier;
                gameState.snake.turnSpeed = 0.05 * turnMultiplier;
                gameState.snake.boostSpeed = 0.6 * boostSpeedMultiplier;

                // Handle boosting
                const minBoostLength = 15;
                if (gameState.keys.boost && gameState.snake.length > minBoostLength) {
                    gameState.snake.boosting = true;
                    gameState.snake.speed = gameState.snake.boostSpeed;
                    setIsBoosting(true);

                    // Consume body length while boosting (with efficiency upgrade)
                    gameState.snake.boostCostTimer += deltaTime;
                    if (gameState.snake.boostCostTimer >= 2) {
                        const costAmount = 0.15 * boostCostMultiplier;
                        gameState.snake.length = Math.max(minBoostLength, gameState.snake.length - costAmount);
                        gameState.snake.boostCostTimer = 0;
                    }

                    // Boost visual: brighter emissive
                    head.traverse((child) => {
                        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                            child.material.emissiveIntensity = 1.0;
                        }
                    });
                    snakeLight.intensity = 3;
                } else {
                    gameState.snake.boosting = false;
                    gameState.snake.speed = gameState.snake.baseSpeed;
                    setIsBoosting(false);
                    head.traverse((child) => {
                        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                            child.material.emissiveIntensity = 0.5;
                        }
                    });
                    snakeLight.intensity = 2;
                }

                // Handle turning
                if (gameState.keys.left) {
                    const axis = new THREE.Vector3(0, 1, 0);
                    gameState.snake.direction.applyAxisAngle(axis, gameState.snake.turnSpeed * deltaTime);
                    gameState.snake.direction.normalize();
                }
                if (gameState.keys.right) {
                    const axis = new THREE.Vector3(0, 1, 0);
                    gameState.snake.direction.applyAxisAngle(axis, -gameState.snake.turnSpeed * deltaTime);
                    gameState.snake.direction.normalize();
                }

                // Move snake forward
                const movement = gameState.snake.direction.clone().multiplyScalar(gameState.snake.speed * deltaTime);
                gameState.snake.position.add(movement);

                // Sanitize position to prevent NaN/Infinity corruption
                if (!isFinite(gameState.snake.position.x) || !isFinite(gameState.snake.position.y) || !isFinite(gameState.snake.position.z)) {
                    console.error('Snake position became invalid, resetting:', gameState.snake.position);
                    gameState.snake.position.set(0, 0.5, 0);
                    gameState.snake.direction.set(0, 0, -1);
                }

                // Check collision
                if (checkCollision(gameState.snake.position, 10, gameState.snake.trail)) {
                    // Check if player has shield upgrade
                    if (gameStateRef.current.hasShield) {
                        console.log('[CLIENT] Shield absorbed hit!');
                        gameStateRef.current.hasShield = false; // Use up shield
                        setActiveUpgrades(prev => prev.filter(u => u !== 'thick_skin'));

                        // Teleport to safety (random position)
                        const angle = Math.random() * Math.PI * 2;
                        const radius = 50 + Math.random() * 100;
                        gameState.snake.position.set(
                            Math.cos(angle) * radius,
                            0.5,
                            Math.sin(angle) * radius
                        );
                        // Continue playing - shield saved us!
                        return;
                    }

                    console.log('[CLIENT] ===== I DIED! =====');
                    console.log('[CLIENT] My trail length:', gameState.snake.trail.length);
                    console.log('[CLIENT] My player ID:', myPlayerId);

                    setGameOver(true);
                    gameStateRef.current.gameOver = true;
                    gameStateRef.current.isRunning = false;
                    gameStateRef.current.spawned = false;
                    setSpawned(false);

                    // Save trail data before clearing
                    const trailData = gameState.snake.trail.map(p => ({ x: p.x, y: p.y, z: p.z }));
                    console.log('[CLIENT] Saved trail data:', trailData.length, 'points');

                    // Clear trail visually from MY view
                    if (gameState.snake.trailMesh) {
                        disposeTrailMesh(gameState.snake.trailMesh);
                        gameState.snake.trailMesh = null;
                    }
                    gameState.snake.trail = [];
                    console.log('[CLIENT] Cleared my trail mesh');

                    // Notify server of death and send trail data for items
                    if (socket) {
                        console.log('[CLIENT] Emitting player-died event to server with', trailData.length, 'trail points');
                        socket.emit('player-died', {
                            trail: trailData,
                        });
                        console.log('[CLIENT] player-died event sent');
                    } else {
                        console.log('[CLIENT] ERROR: No socket connection, cannot notify server of death');
                    }

                    console.log('[CLIENT] ===== DEATH HANDLING COMPLETE =====');
                    return;
                }

                // Increment spawn frame counter (used to delay trail rendering on spawn)
                if (gameState.snake.spawnFrameCount < 20) {
                    gameState.snake.spawnFrameCount++;
                }

                // Update head position and rotation
                head.position.copy(gameState.snake.position);
                head.lookAt(head.position.clone().add(gameState.snake.direction));

                // Check for item collection
                checkItemCollection(gameState.snake.position);

                // Add trail point every frame to record path (like slither.io)
                // Validate position before adding to trail
                if (gameState.snake.position &&
                    typeof gameState.snake.position.x === 'number' &&
                    isFinite(gameState.snake.position.x) &&
                    isFinite(gameState.snake.position.y) &&
                    isFinite(gameState.snake.position.z)) {

                    if (gameState.snake.trail.length === 0 ||
                        gameState.snake.trail[gameState.snake.trail.length - 1].distanceTo(gameState.snake.position) > 0.2) {
                        gameState.snake.trail.push(gameState.snake.position.clone());

                        // Remove old trail points from the front to maintain length
                        // IMPORTANT: Never drop below 4 points (minimum for smooth trail mesh)
                        while (gameState.snake.trail.length > Math.max(gameState.snake.length, 4)) {
                            gameState.snake.trail.shift();
                        }
                    }
                }

                // Create render trail that ALWAYS includes current head position to prevent visual disconnection
                // Robust validation: only include points that are valid Vector3 objects
                const renderTrail: THREE.Vector3[] = [];
                for (const p of gameState.snake.trail) {
                    if (p &&
                        typeof p.x === 'number' && typeof p.y === 'number' && typeof p.z === 'number' &&
                        isFinite(p.x) && isFinite(p.y) && isFinite(p.z)) {
                        renderTrail.push(new THREE.Vector3(p.x, p.y, p.z));
                    }
                }

                // Always ensure current head position is included for smooth connection
                if (gameState.snake.position &&
                    typeof gameState.snake.position.x === 'number' &&
                    isFinite(gameState.snake.position.x)) {
                    if (renderTrail.length === 0 ||
                        renderTrail[renderTrail.length - 1].distanceTo(gameState.snake.position) > 0.01) {
                        renderTrail.push(gameState.snake.position.clone());
                    }
                }

                // Update trail mesh every frame for smooth appearance
                // Only render after a few frames to prevent weird spawn animation
                if (renderTrail.length >= 2 && gameState.snake.spawnFrameCount > 15) {
                    // Get the actual head color for uniform appearance
                    let headColor = 0x00ffff;
                    head.traverse((child) => {
                        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                            const childColor = child.material.color.getHex();
                            if (childColor !== 0xffffff && childColor !== 0x000000) {
                                headColor = childColor;
                            }
                        }
                    });
                    gameState.snake.trailMesh = updateTrailMesh(renderTrail, gameState.snake.trailMesh, headColor);
                } else if (gameState.snake.spawnFrameCount <= 15) {
                    // Hide trail mesh during spawn animation
                    if (gameState.snake.trailMesh) {
                        disposeTrailMesh(gameState.snake.trailMesh);
                        gameState.snake.trailMesh = null;
                    }
                    // Clear accumulated trail points right before we're about to render
                    // This prevents the "huge trail blink" when transitioning to visible
                    if (gameState.snake.spawnFrameCount === 15) {
                        gameState.snake.trail = [
                            gameState.snake.position.clone(),
                            gameState.snake.position.clone().sub(gameState.snake.direction.clone().multiplyScalar(0.1)),
                        ];
                    }
                }

                // Update trail emissive intensity to match head when boosting
                if (gameState.snake.trailMesh) {
                    const targetIntensity = gameState.snake.boosting ? 1.0 : 0.5;
                    gameState.snake.trailMesh.traverse((child) => {
                        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                            child.material.emissiveIntensity = targetIntensity;
                        }
                    });
                }

                // Update snake light position
                snakeLight.position.copy(gameState.snake.position);
                snakeLight.position.y = 2;

                // Update bots with performance optimizations
                for (const bot of gameState.bots) {
                    if (!bot.alive) continue;

                    // Distance culling for performance - skip updates for very far bots
                    const toPlayer = new THREE.Vector3().subVectors(gameState.snake.position, bot.position);
                    const distanceToPlayer = toPlayer.length();

                    // Hide bots that are too far (beyond fog) for performance
                    const maxVisibleDistance = 200; // Increased so more bots are visible
                    const farDistance = 120;
                    const mediumDistance = 70;

                    if (distanceToPlayer > maxVisibleDistance) {
                        bot.head.visible = false;
                        if (bot.trailMesh) bot.trailMesh.visible = false;
                        bot.light.visible = false;
                        continue;
                    } else {
                        bot.head.visible = true;
                        if (bot.trailMesh) bot.trailMesh.visible = true;
                        bot.light.visible = true;
                    }

                    // Skip expensive AI calculations for far bots on some frames
                    const skipAIForFarBot = distanceToPlayer > farDistance && frameCount % 3 !== 0;

                    // === IMPROVED BOT AI ===

                    // 1. Obstacle and Trail Avoidance Check (look ahead) - skip for far bots on some frames
                    let dangerAhead = false;
                    let dangerLeft = false;
                    let dangerRight = false;

                    if (!skipAIForFarBot) {
                        const lookAheadDist = 8 + (bot.speed * 10); // Further lookahead when moving faster
                        const checkPositions = [
                            bot.position.clone().add(bot.direction.clone().multiplyScalar(lookAheadDist)),
                            bot.position.clone().add(bot.direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.5).multiplyScalar(lookAheadDist * 0.8)),
                            bot.position.clone().add(bot.direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.5).multiplyScalar(lookAheadDist * 0.8)),
                        ];

                        // Check for collisions ahead (only for close/medium distance bots or every 3rd frame for far bots)
                        if (checkCollision(checkPositions[0], 3, bot.trail)) dangerAhead = true;
                        if (checkCollision(checkPositions[1], 3, bot.trail)) dangerLeft = true;
                        if (checkCollision(checkPositions[2], 3, bot.trail)) dangerRight = true;
                    }

                    // 2. Determine bot behavior based on size (adjusted thresholds)
                    const isTiny = bot.length < 30;
                    const isSmall = bot.length < 50;
                    const isMedium = bot.length >= 50 && bot.length < 80;
                    const isLarge = bot.length >= 80;

                    // Track nearest item distance for boost logic
                    let nearestItemDist = Infinity;

                    // Update boost cooldown
                    if (bot.boostCooldown > 0) {
                        bot.boostCooldown -= deltaTime;
                    }

                    // Handle bot boosting (declarations first)
                    const minBoostLength = 15;
                    if (bot.boosting && bot.length > minBoostLength) {
                        bot.speed = bot.boostSpeed;
                        bot.boostCostTimer += deltaTime;

                        if (bot.boostCostTimer >= 2) {
                            bot.length = Math.max(minBoostLength, bot.length - 0.15);
                            bot.boostCostTimer = 0;
                        }

                        // Bot visual boost
                        bot.head.traverse((child) => {
                            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                                child.material.emissiveIntensity = 1.0;
                            }
                        });
                        bot.light.intensity = 2.5;

                        // Stop boosting randomly or when length is low
                        if (Math.random() < 0.01 || bot.length <= minBoostLength) {
                            bot.boosting = false;
                        }
                    } else {
                        bot.boosting = false;
                        bot.speed = bot.baseSpeed;
                        bot.head.traverse((child) => {
                            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                                child.material.emissiveIntensity = 0.5;
                            }
                        });
                        bot.light.intensity = 1.5;
                    }

                    let desiredDirection: THREE.Vector3;

                    // Priority 1: Avoid imminent danger
                    if (dangerAhead || dangerLeft || dangerRight) {
                        // Turn away from danger
                        if (dangerAhead && !dangerLeft) {
                            // Turn left
                            desiredDirection = bot.direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
                        } else if (dangerAhead && !dangerRight) {
                            // Turn right
                            desiredDirection = bot.direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
                        } else if (dangerLeft) {
                            // Turn right away from left danger
                            desiredDirection = bot.direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 3);
                        } else {
                            // Turn left away from right danger
                            desiredDirection = bot.direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 3);
                        }
                    }
                    // Priority 2: Seek items aggressively when small/medium (grow before fighting!)
                    else if (isSmall || isMedium) {
                        // Find nearest item (bots are smart about collecting!)
                        let nearestItem: Item | null = null;
                        nearestItemDist = Infinity; // Update outer scope variable

                        if (!skipAIForFarBot) {
                            for (const item of gameState.items) {
                                if (!item.mesh.visible) continue;
                                const dist = bot.position.distanceTo(item.position);

                                // Prioritize high-value items (rare/epic) when medium size
                                let priority = dist;
                                if (isMedium) {
                                    if (item.type === 'epic') priority *= 0.3; // Really want epics!
                                    if (item.type === 'rare') priority *= 0.5;
                                    if (item.type === 'uncommon') priority *= 0.7;
                                }

                                if (priority < nearestItemDist && dist < 100) { // Increased search range
                                    nearestItemDist = dist;
                                    nearestItem = item;
                                }
                            }
                        }

                        if (nearestItem && nearestItemDist < 80) {
                            // Actively chase nearest item
                            desiredDirection = new THREE.Vector3().subVectors(nearestItem.position, bot.position).normalize();
                        } else if (isTiny && distanceToPlayer < 40) {
                            // Tiny bots flee from player
                            desiredDirection = toPlayer.clone().negate().normalize();
                        } else {
                            // Wander towards center to find items
                            const centerDir = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), bot.position).normalize();
                            const randomAngle = (Math.random() - 0.5) * Math.PI * 0.4;
                            const randomDir = new THREE.Vector3(Math.sin(randomAngle), 0, Math.cos(randomAngle));
                            desiredDirection = centerDir.multiplyScalar(0.6).add(randomDir.multiplyScalar(0.4)).normalize();
                        }
                    }
                    // Priority 3: Hunt player aggressively when large
                    else if (isLarge && distanceToPlayer < 120) { // Increased hunt range
                        if (distanceToPlayer < 20) {
                            // Very close - aggressively cut off player
                            const predictionDist = 25 + (gameState.snake.boosting ? 15 : 0);
                            const predictedPlayerPos = gameState.snake.position.clone().add(
                                gameState.snake.direction.clone().multiplyScalar(predictionDist)
                            );

                            // Try to position in front of player
                            const cutoffPos = predictedPlayerPos.clone().add(
                                gameState.snake.direction.clone().multiplyScalar(10)
                            );
                            desiredDirection = new THREE.Vector3().subVectors(cutoffPos, bot.position).normalize();
                        } else if (distanceToPlayer < 50) {
                            // Medium range - intercept with prediction
                            const predictionDist = 20 + distanceToPlayer * 0.3;
                            const predictedPlayerPos = gameState.snake.position.clone().add(
                                gameState.snake.direction.clone().multiplyScalar(predictionDist)
                            );
                            desiredDirection = new THREE.Vector3().subVectors(predictedPlayerPos, bot.position).normalize();
                        } else {
                            // Approach player
                            desiredDirection = toPlayer.normalize();
                        }
                    }
                    // Priority 4: Mixed strategy at medium size
                    else if (distanceToPlayer > 120) {
                        // Far away - move towards action (center)
                        const centerDir = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), bot.position).normalize();
                        const randomAngle = (Math.random() - 0.5) * Math.PI * 0.3;
                        const randomDir = new THREE.Vector3(Math.sin(randomAngle), 0, Math.cos(randomAngle));
                        desiredDirection = centerDir.multiplyScalar(0.7).add(randomDir.multiplyScalar(0.3)).normalize();
                    } else if (distanceToPlayer > 40) {
                        // Moderate distance - approach cautiously with prediction
                        const predictedPlayerPos = gameState.snake.position.clone().add(
                            gameState.snake.direction.clone().multiplyScalar(12)
                        );
                        desiredDirection = new THREE.Vector3().subVectors(predictedPlayerPos, bot.position).normalize();
                    } else {
                        // Close - try to intercept or box in
                        const sideOffset = bot.direction.clone().cross(new THREE.Vector3(0, 1, 0)).multiplyScalar(8);
                        const interceptPos = gameState.snake.position.clone().add(
                            gameState.snake.direction.clone().multiplyScalar(18)
                        ).add(sideOffset);
                        desiredDirection = new THREE.Vector3().subVectors(interceptPos, bot.position).normalize();
                    }

                    // Apply smooth turning with faster reactions to danger
                    const cross = new THREE.Vector3().crossVectors(bot.direction, desiredDirection);
                    const turnDirection = cross.y > 0 ? 1 : -1;
                    const angleToDesired = bot.direction.angleTo(desiredDirection);

                    // Faster turning in dangerous situations
                    const turnSpeedMultiplier = (dangerAhead || dangerLeft || dangerRight) ? 2.0 : 1.0;

                    if (angleToDesired > 0.05) {
                        const turnAmount = Math.min(bot.turnSpeed * deltaTime * turnSpeedMultiplier, angleToDesired) * turnDirection;
                        const axis = new THREE.Vector3(0, 1, 0);
                        bot.direction.applyAxisAngle(axis, turnAmount);
                        bot.direction.normalize();
                    }

                    // Reduced random weaving when in pursuit mode
                    if (!isLarge || distanceToPlayer > 60) {
                        if (Math.random() < 0.015) {
                            const randomTurn = (Math.random() - 0.5) * 0.015;
                            const axis = new THREE.Vector3(0, 1, 0);
                            bot.direction.applyAxisAngle(axis, randomTurn);
                            bot.direction.normalize();
                        }
                    }

                    // Smarter bot boosting logic - boost to collect items and chase players
                    const shouldBoost = bot.length > minBoostLength && bot.boostCooldown <= 0 && (
                        // Boost when large and hunting player
                        (isLarge && distanceToPlayer < 50 && distanceToPlayer > 10 && Math.random() < 0.06) ||
                        // Boost when trying to cut off player
                        (bot.length > 60 && distanceToPlayer < 35 && Math.random() < 0.04) ||
                        // Boost to escape danger
                        ((dangerAhead || dangerLeft || dangerRight) && Math.random() < 0.08) ||
                        // Boost to collect items when close to them (smart collection!)
                        (bot.length > 20 && nearestItemDist < 25 && Math.random() < 0.05)
                    );

                    if (shouldBoost) {
                        bot.boosting = true;
                        bot.boostCooldown = 60; // Shorter cooldown for more aggressive play
                    }

                    // Move bot forward
                    const botMovement = bot.direction.clone().multiplyScalar(bot.speed * deltaTime);
                    bot.position.add(botMovement);

                    // Sanitize position to prevent NaN/Infinity corruption
                    if (!isFinite(bot.position.x) || !isFinite(bot.position.y) || !isFinite(bot.position.z)) {
                        console.error('Bot position became invalid, respawning bot');
                        // Mark for respawn
                        bot.alive = false;
                        continue;
                    }

                    // Check bot collision
                    if (checkCollision(bot.position, 10, bot.trail)) {
                        // Spawn items from bot's trail - common items
                        const trailItems: THREE.Vector3[] = [];
                        for (const p of bot.trail) {
                            trailItems.push(p.clone());
                        }
                        // Spawn common items at every 3rd trail point (using shared geometry!)
                        for (let i = 0; i < trailItems.length; i += 3) {
                            const mesh = new THREE.Mesh(itemGeometries.common, itemMaterials.common);
                            mesh.position.copy(trailItems[i]);
                            scene.add(mesh);

                            gameState.items.push({
                                position: trailItems[i].clone(),
                                mesh: mesh,
                                spawnTime: Date.now(),
                                type: 'common',
                                value: 1,
                            });
                        }

                        // Respawn bot at reasonable distance
                        const spawnRadiusMin = 40;
                        const spawnRadiusMax = 250;
                        const angle = Math.random() * Math.PI * 2;
                        const radius = spawnRadiusMin + Math.random() * (spawnRadiusMax - spawnRadiusMin);

                        bot.position.set(
                            Math.cos(angle) * radius,
                            0.5,
                            Math.sin(angle) * radius
                        );

                        // Random new direction
                        const dirAngle = Math.random() * Math.PI * 2;
                        bot.direction.set(Math.sin(dirAngle), 0, Math.cos(dirAngle)).normalize();

                        // Reset bot state with properly spaced trail
                        const botBackDir = bot.direction.clone().multiplyScalar(-1);
                        bot.trail = [
                            bot.position.clone(),
                            bot.position.clone().add(botBackDir.clone().multiplyScalar(0.8)),
                            bot.position.clone().add(botBackDir.clone().multiplyScalar(1.6)),
                            bot.position.clone().add(botBackDir.clone().multiplyScalar(2.4)),
                        ];
                        bot.length = 20;
                        bot.boosting = false;
                        bot.boostCostTimer = 0;
                        bot.boostCooldown = 0;

                        // Clear trail mesh
                        if (bot.trailMesh) {
                            disposeTrailMesh(bot.trailMesh);
                            bot.trailMesh = null;
                        }

                        console.log('Bot respawned at:', bot.position.x.toFixed(1), bot.position.z.toFixed(1));
                        continue;
                    }

                    // Update bot head
                    bot.head.position.copy(bot.position);
                    bot.head.lookAt(bot.head.position.clone().add(bot.direction));

                    // Update bot light
                    bot.light.position.copy(bot.position);
                    bot.light.position.y = 2;

                    // Bots can collect items too
                    for (let i = gameState.items.length - 1; i >= 0; i--) {
                        const item = gameState.items[i];
                        const distance = bot.position.distanceTo(item.position);

                        if (distance < 2) {
                            scene.remove(item.mesh);
                            item.mesh.geometry.dispose();
                            gameState.items.splice(i, 1);
                            bot.length += 3;
                            break;
                        }
                    }

                    // Add bot trail point every frame (like slither.io)
                    // Validate position before adding to trail
                    if (bot.position &&
                        typeof bot.position.x === 'number' &&
                        isFinite(bot.position.x) &&
                        isFinite(bot.position.y) &&
                        isFinite(bot.position.z)) {

                        if (bot.trail.length === 0 ||
                            bot.trail[bot.trail.length - 1].distanceTo(bot.position) > 0.2) {
                            bot.trail.push(bot.position.clone());

                            // Remove old trail points from the front to maintain length
                            // IMPORTANT: Never drop below 4 points (minimum for smooth trail mesh)
                            while (bot.trail.length > Math.max(bot.length, 4)) {
                                bot.trail.shift();
                            }
                        }
                    }

                    // Performance optimization for bot trail mesh updates
                    // Close/medium: every frame for smoothness, far: every 2 frames
                    let updateFrequency = 1;
                    if (distanceToPlayer > farDistance) {
                        updateFrequency = 2;
                    }

                    if (bot.trail.length >= 2 && frameCount % updateFrequency === 0) {
                        // Create render trail that ALWAYS includes current head position
                        // Robust validation: only include points that are valid Vector3 objects
                        const botRenderTrail: THREE.Vector3[] = [];
                        for (const p of bot.trail) {
                            if (p &&
                                typeof p.x === 'number' && typeof p.y === 'number' && typeof p.z === 'number' &&
                                isFinite(p.x) && isFinite(p.y) && isFinite(p.z)) {
                                botRenderTrail.push(new THREE.Vector3(p.x, p.y, p.z));
                            }
                        }

                        // Always ensure current head position is included for smooth connection
                        if (bot.position &&
                            typeof bot.position.x === 'number' &&
                            isFinite(bot.position.x)) {
                            if (botRenderTrail.length === 0 ||
                                botRenderTrail[botRenderTrail.length - 1].distanceTo(bot.position) > 0.01) {
                                botRenderTrail.push(bot.position.clone());
                            }
                        }

                        // Get bot color from the first colored mesh in the head group
                        let botColor = 0xffffff;
                        bot.head.traverse((child) => {
                            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                                const childColor = child.material.color.getHex();
                                if (childColor !== 0xffffff && childColor !== 0x000000) {
                                    botColor = childColor;
                                }
                            }
                        });

                        // Use low detail for distant bots
                        const useLowDetail = distanceToPlayer > farDistance;
                        bot.trailMesh = updateTrailMesh(botRenderTrail, bot.trailMesh, botColor, useLowDetail);

                        // Update trail emissive intensity to match head when boosting
                        if (bot.trailMesh) {
                            const targetIntensity = bot.boosting ? 1.0 : 0.5;
                            bot.trailMesh.traverse((child) => {
                                if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                                    child.material.emissiveIntensity = targetIntensity;
                                }
                            });
                        }
                    }
                }

                // Despawn items from dead snakes after 3 seconds
                const currentTime = Date.now();
                const ITEM_DESPAWN_TIME = 3000; // 3 seconds
                for (let i = gameState.items.length - 1; i >= 0; i--) {
                    const item = gameState.items[i];
                    if (item.spawnTime > 0 && currentTime - item.spawnTime > ITEM_DESPAWN_TIME) {
                        // Remove despawned item
                        scene.remove(item.mesh);
                        item.mesh.geometry.dispose();
                        gameState.items.splice(i, 1);
                    }
                }

                // Rotate and animate items - with distance culling (optimized)
                // Only update visibility every 15 frames for better performance (Safari)
                if (frameCount % 15 === 0) {
                    for (const item of gameState.items) {
                        const distanceToItem = gameState.snake.position.distanceTo(item.position);

                        // Hide items beyond fog for performance
                        if (distanceToItem > 180) {
                            item.mesh.visible = false;
                        } else {
                            item.mesh.visible = true;
                        }
                    }
                }

                // Animate visible items - optimize by animating every 2nd frame for normal items
                for (const item of gameState.items) {
                    if (!item.mesh.visible) continue;

                    // Special animation for treasure items - always smooth!
                    if (item.type === 'treasure') {
                        item.mesh.rotation.y += 0.05 * deltaTime; // Faster rotation
                        item.mesh.rotation.x = Math.sin(Date.now() * 0.002) * 0.3; // Wobble
                        item.mesh.position.y = 0.5 + Math.sin(Date.now() * 0.004) * 0.5; // Bigger bounce

                        // Pulsing scale for treasure
                        const scale = 1.0 + Math.sin(Date.now() * 0.003) * 0.2;
                        item.mesh.scale.set(scale, scale, scale);
                    } else if (frameCount % 2 === 0) {
                        // Normal items - animate every other frame for performance
                        item.mesh.rotation.y += 0.04 * deltaTime; // Compensate for half update rate
                        item.mesh.position.y = 0.5 + Math.sin(Date.now() * 0.003 + item.position.x) * 0.2;
                    }
                }

                // Update tree visibility based on distance (only every 20 frames for performance)
                if (frameCount % 20 === 0) {
                    for (const tree of gameState.trees) {
                        const distanceToTree = gameState.snake.position.distanceTo(tree.position);

                        // Hide trees beyond fog for performance
                        if (distanceToTree > 200) {
                            tree.group.visible = false;
                        } else {
                            tree.group.visible = true;
                        }
                    }
                }

                // Update obstacle visibility based on distance (only every 20 frames for performance)
                if (frameCount % 20 === 0) {
                    for (const obstacle of gameState.obstacles) {
                        const distanceToObstacle = gameState.snake.position.distanceTo(obstacle.position);

                        // Hide obstacles beyond 150 units for better performance
                        if (distanceToObstacle > 150) {
                            obstacle.mesh.visible = false;
                        } else {
                            obstacle.mesh.visible = true;
                        }
                    }
                }

                // Send player update to server (throttled)
                if (socket && frameCount % 2 === 0) {
                    socket.emit('player-update', {
                        position: {
                            x: gameState.snake.position.x,
                            y: gameState.snake.position.y,
                            z: gameState.snake.position.z,
                        },
                        direction: {
                            x: gameState.snake.direction.x,
                            y: gameState.snake.direction.y,
                            z: gameState.snake.direction.z,
                        },
                        trail: gameState.snake.trail.map(p => ({ x: p.x, y: p.y, z: p.z })),
                        length: gameState.snake.length,
                    });
                }

                // Update multiplayer players
                for (const [id, player] of gameState.multiplayerPlayers) {
                    // Smooth interpolation towards target position (reduces jitter from network updates)
                    const lerpFactor = 0.5; // Higher = faster snap, lower = smoother but more lag
                    player.position.lerp(player.targetPosition, lerpFactor);
                    player.direction.lerp(player.targetDirection, lerpFactor);
                    player.direction.normalize();

                    // Sanitize position to prevent NaN/Infinity corruption
                    if (!isFinite(player.position.x) || !isFinite(player.position.y) || !isFinite(player.position.z)) {
                        console.error('Multiplayer player position became invalid, resetting to target');
                        player.position.copy(player.targetPosition);
                    }

                    // Update player head position
                    player.head.position.copy(player.position);
                    player.head.lookAt(player.head.position.clone().add(player.direction));

                    // Update player light
                    player.light.position.copy(player.position);
                    player.light.position.y = 2;

                    // Update player trail mesh every 2 frames for balance between smoothness and performance
                    if (player.trail.length >= 2 && frameCount % 2 === 0) {
                        // Create validated render trail for multiplayer player
                        const playerRenderTrail: THREE.Vector3[] = [];
                        for (const p of player.trail) {
                            if (p &&
                                typeof p.x === 'number' && typeof p.y === 'number' && typeof p.z === 'number' &&
                                isFinite(p.x) && isFinite(p.y) && isFinite(p.z)) {
                                playerRenderTrail.push(new THREE.Vector3(p.x, p.y, p.z));
                            }
                        }

                        // Include current position for smooth connection
                        if (player.position &&
                            typeof player.position.x === 'number' &&
                            isFinite(player.position.x)) {
                            if (playerRenderTrail.length === 0 ||
                                playerRenderTrail[playerRenderTrail.length - 1].distanceTo(player.position) > 0.01) {
                                playerRenderTrail.push(player.position.clone());
                            }
                        }

                        let colorNum = 0xff00ff;
                        if (player.color.startsWith('hsl')) {
                            const hue = parseInt(player.color.match(/\d+/)?.[0] || '0');
                            colorNum = new THREE.Color().setHSL(hue / 360, 0.7, 0.5).getHex();
                        } else {
                            colorNum = parseInt(player.color.replace('#', ''), 16) || 0xff00ff;
                        }
                        player.trailMesh = updateTrailMesh(playerRenderTrail, player.trailMesh, colorNum, false);
                    }

                    // Distance culling for multiplayer players
                    const distanceToPlayer = gameState.snake.position.distanceTo(player.position);
                    if (distanceToPlayer > 180) {
                        player.head.visible = false;
                        if (player.trailMesh) player.trailMesh.visible = false;
                        player.light.visible = false;
                    } else {
                        player.head.visible = true;
                        if (player.trailMesh) player.trailMesh.visible = true;
                        player.light.visible = true;
                    }
                }

                // Camera follows snake - third person view
                const cameraOffset = gameState.snake.direction.clone().multiplyScalar(-15);
                cameraOffset.y = 8;
                const targetCameraPosition = gameState.snake.position.clone().add(cameraOffset);

                camera.position.lerp(targetCameraPosition, 0.1);

                const lookAtPoint = gameState.snake.position.clone().add(
                    gameState.snake.direction.clone().multiplyScalar(10)
                );
                camera.lookAt(lookAtPoint);
            }

            // Periodically check and adjust bot count (every 120 frames ~2 seconds)
            if (frameCount % 120 === 0) {
                manageBotCount();
            }

            // Update leaderboard every 60 frames (~1 second) for better performance
            if (frameCount % 60 === 0) {
                updateLeaderboard();
            }

            // Auto-respawn collectibles to maintain abundance (every 5 seconds)
            if (frameCount % 300 === 0) {
                const MIN_ITEMS = 450; // 3x more minimum items
                const currentItemCount = gameState.items.length;
                if (currentItemCount < MIN_ITEMS) {
                    const itemsToSpawn = Math.min(50, MIN_ITEMS - currentItemCount); // Spawn more per cycle
                    const boundary = (gridSize / 2) - 50;

                    for (let i = 0; i < itemsToSpawn; i++) {
                        const pos = new THREE.Vector3(
                            (Math.random() - 0.5) * boundary * 2,
                            0.5,
                            (Math.random() - 0.5) * boundary * 2
                        );

                        // Determine item type based on spawn chances
                        const rand = Math.random();
                        let itemType: 'common' | 'uncommon' | 'rare' | 'epic' = 'common';

                        if (rand <= 0.02) {
                            itemType = 'epic';
                        } else if (rand <= 0.10) {
                            itemType = 'rare';
                        } else if (rand <= 0.30) {
                            itemType = 'uncommon';
                        }

                        // Use shared geometry and material
                        const mesh = new THREE.Mesh(itemGeometries[itemType], itemMaterials[itemType]);
                        mesh.position.copy(pos);
                        scene.add(mesh);

                        const configs = {
                            common: { value: 1 },
                            uncommon: { value: 3 },
                            rare: { value: 5 },
                            epic: { value: 10 },
                        };

                        gameState.items.push({
                            position: pos.clone(),
                            mesh: mesh,
                            spawnTime: 0,
                            type: itemType,
                            value: configs[itemType].value,
                        });
                    }
                }
            }

            // Update minimap data every 5 frames for performance
            if (frameCount % 5 === 0 && gameStateRef.current.spawned) {
                minimapDataRef.current.playerPos = {
                    x: gameState.snake.position.x,
                    z: gameState.snake.position.z,
                };

                // Update bot positions (only visible/alive bots)
                minimapDataRef.current.bots = gameState.bots
                    .filter(b => b.alive && b.head.visible)
                    .map(b => ({ x: b.position.x, z: b.position.z }));

                // Update multiplayer player positions
                minimapDataRef.current.multiplayerPlayers = Array.from(gameState.multiplayerPlayers.values())
                    .map(p => ({ x: p.position.x, z: p.position.z }));

                // Update treasure positions
                minimapDataRef.current.treasures = gameState.items
                    .filter(item => item.type === 'treasure')
                    .map(item => ({ x: item.position.x, z: item.position.z }));
            }

            renderer.render(scene, camera);
        };

        // Manage bot count to maintain ~12 total players
        manageBotCount();

        // Shared geometries and materials for items (CRITICAL for performance!)
        const itemGeometries = {
            common: new THREE.OctahedronGeometry(0.4, 0),
            uncommon: new THREE.OctahedronGeometry(0.5, 0),
            rare: new THREE.OctahedronGeometry(0.6, 0),
            epic: new THREE.OctahedronGeometry(0.7, 0),
            treasure: new THREE.OctahedronGeometry(1.0, 1),
        };

        const itemMaterials = {
            common: new THREE.MeshStandardMaterial({
                color: 0xffff00,
                emissive: 0xffff00,
                emissiveIntensity: 0.8,
                metalness: 0.8,
                roughness: 0.2,
            }),
            uncommon: new THREE.MeshStandardMaterial({
                color: 0x00ff00,
                emissive: 0x00ff00,
                emissiveIntensity: 1.0,
                metalness: 0.8,
                roughness: 0.2,
            }),
            rare: new THREE.MeshStandardMaterial({
                color: 0x0088ff,
                emissive: 0x0088ff,
                emissiveIntensity: 1.2,
                metalness: 0.8,
                roughness: 0.2,
            }),
            epic: new THREE.MeshStandardMaterial({
                color: 0xff00ff,
                emissive: 0xff00ff,
                emissiveIntensity: 1.5,
                metalness: 0.8,
                roughness: 0.2,
            }),
            treasure: new THREE.MeshStandardMaterial({
                color: 0xffd700,
                emissive: 0xffd700,
                emissiveIntensity: 2.0,
                metalness: 1.0,
                roughness: 0.1,
            }),
        };

        // Spawn initial items - MUCH more with different rarities! (Using shared geometries)
        const spawnInitialItems = (count: number) => {
            const boundary = (gridSize / 2) - 50;
            for (let i = 0; i < count; i++) {
                const pos = new THREE.Vector3(
                    (Math.random() - 0.5) * boundary * 2,
                    0.5,
                    (Math.random() - 0.5) * boundary * 2
                );

                // Determine item type based on spawn chances
                const rand = Math.random();
                let itemType: 'common' | 'uncommon' | 'rare' | 'epic' = 'common';

                if (rand <= 0.02) {
                    itemType = 'epic';
                } else if (rand <= 0.10) {
                    itemType = 'rare';
                } else if (rand <= 0.30) {
                    itemType = 'uncommon';
                }

                // Use shared geometry and material (CRITICAL for performance!)
                const mesh = new THREE.Mesh(itemGeometries[itemType], itemMaterials[itemType]);
                mesh.position.copy(pos);
                scene.add(mesh);

                const configs = {
                    common: { value: 1 },
                    uncommon: { value: 3 },
                    rare: { value: 5 },
                    epic: { value: 10 },
                };

                gameState.items.push({
                    position: pos.clone(),
                    mesh: mesh,
                    spawnTime: 0,
                    type: itemType,
                    value: configs[itemType].value,
                });
            }
        };

        spawnInitialItems(600); // 600 items - 3x more for super abundance!

        // Add boundary walls around the map edges
        const createBoundaryWalls = () => {
            const wallHeight = 15;
            const wallThickness = 2;
            const boundary = gridSize / 2;

            const wallMaterial = new THREE.MeshStandardMaterial({
                color: 0xff0000,
                emissive: 0xff0000,
                emissiveIntensity: 0.5,
                metalness: 0.9,
                roughness: 0.1,
                transparent: true,
                opacity: 0.6,
            });

            const walls = [
                // North wall
                { size: [gridSize, wallHeight, wallThickness], pos: [0, wallHeight / 2, -boundary] },
                // South wall
                { size: [gridSize, wallHeight, wallThickness], pos: [0, wallHeight / 2, boundary] },
                // West wall
                { size: [wallThickness, wallHeight, gridSize], pos: [-boundary, wallHeight / 2, 0] },
                // East wall
                { size: [wallThickness, wallHeight, gridSize], pos: [boundary, wallHeight / 2, 0] },
            ];

            for (const wallConfig of walls) {
                const geometry = new THREE.BoxGeometry(...wallConfig.size as [number, number, number]);
                const wall = new THREE.Mesh(geometry, wallMaterial);
                wall.position.set(...wallConfig.pos as [number, number, number]);
                scene.add(wall);

                // Boundary walls are handled by the boundary check in checkCollision()
                // Don't add to obstacles array to avoid collision bugs
            }
        };

        createBoundaryWalls();

        // Maze wall type for better collision detection
        type MazeWall = {
            position: THREE.Vector3;
            width: number;
            depth: number;
            mesh: THREE.Mesh;
        };

        const allMazeWalls: MazeWall[] = [];

        // Helper function to create a single wall with proper collision
        const createMazeWall = (
            x: number, z: number,
            width: number, depth: number,
            material: THREE.MeshStandardMaterial
        ): MazeWall => {
            const wallHeight = 4;
            const geometry = new THREE.BoxGeometry(width, wallHeight, depth);
            const wall = new THREE.Mesh(geometry, material);
            wall.position.set(x, wallHeight / 2, z);
            scene.add(wall);

            const mazeWall: MazeWall = {
                position: new THREE.Vector3(x, wallHeight / 2, z),
                width: width,
                depth: depth,
                mesh: wall,
            };

            allMazeWalls.push(mazeWall);
            return mazeWall;
        };

        // Create a proper maze with corridors and multiple paths
        const createMaze = (centerPos: THREE.Vector3, size: number) => {
            const wallMaterial = new THREE.MeshStandardMaterial({
                color: 0x00ffff,
                emissive: 0x00ffff,
                emissiveIntensity: 0.4,
                metalness: 0.9,
                roughness: 0.1,
                transparent: true,
                opacity: 0.8,
            });

            const wallThickness = 1.5;
            const entranceWidth = 10; // Much wider entrances!
            const wallLength = (size - entranceWidth) / 2;

            // Create outer walls with WIDE entrances (gaps in the middle)
            // North wall (two segments with wide gap in middle)
            createMazeWall(centerPos.x - size / 4 - entranceWidth / 4, centerPos.z - size / 2, wallLength, wallThickness, wallMaterial);
            createMazeWall(centerPos.x + size / 4 + entranceWidth / 4, centerPos.z - size / 2, wallLength, wallThickness, wallMaterial);

            // South wall (two segments with wide gap in middle)
            createMazeWall(centerPos.x - size / 4 - entranceWidth / 4, centerPos.z + size / 2, wallLength, wallThickness, wallMaterial);
            createMazeWall(centerPos.x + size / 4 + entranceWidth / 4, centerPos.z + size / 2, wallLength, wallThickness, wallMaterial);

            // West wall (two segments with wide gap in middle)
            createMazeWall(centerPos.x - size / 2, centerPos.z - size / 4 - entranceWidth / 4, wallThickness, wallLength, wallMaterial);
            createMazeWall(centerPos.x - size / 2, centerPos.z + size / 4 + entranceWidth / 4, wallThickness, wallLength, wallMaterial);

            // East wall (two segments with wide gap in middle)
            createMazeWall(centerPos.x + size / 2, centerPos.z - size / 4 - entranceWidth / 4, wallThickness, wallLength, wallMaterial);
            createMazeWall(centerPos.x + size / 2, centerPos.z + size / 4 + entranceWidth / 4, wallThickness, wallLength, wallMaterial);

            // Simplified inner walls - just a few obstacles, not a complex maze
            const s4 = size / 4;
            const s3 = size / 3;

            // Just 4 short walls creating simple obstacles (not a complex maze)
            createMazeWall(centerPos.x - s4, centerPos.z, s3 / 2, wallThickness, wallMaterial); // Left side
            createMazeWall(centerPos.x + s4, centerPos.z, s3 / 2, wallThickness, wallMaterial); // Right side
            createMazeWall(centerPos.x, centerPos.z - s4, wallThickness, s3 / 2, wallMaterial); // Top side
            createMazeWall(centerPos.x, centerPos.z + s4, wallThickness, s3 / 2, wallMaterial); // Bottom side

            // Add glowing treasure at center (using shared geometry!)
            const treasureMesh = new THREE.Mesh(itemGeometries.treasure, itemMaterials.treasure);
            treasureMesh.position.copy(centerPos);
            treasureMesh.position.y = 0.5;
            scene.add(treasureMesh);

            // Add rotating light above treasure
            const treasureLight = new THREE.PointLight(0xffd700, 3, 20);
            treasureLight.position.set(centerPos.x, 5, centerPos.z);
            scene.add(treasureLight);

            // Add treasure to items
            gameState.items.push({
                position: centerPos.clone(),
                mesh: treasureMesh,
                spawnTime: 0,
                type: 'treasure',
                value: 30,
            });
        };

        // Spawn mazes randomly across the map, avoiding spawn area and each other
        const spawnRandomMazes = (count: number, mazeSize: number) => {
            const spawnedMazes: Array<{ x: number; z: number }> = [];
            const minDistanceFromCenter = 80;
            const minDistanceBetweenMazes = mazeSize * 3;
            const mapBoundary = (gridSize / 2) - mazeSize;

            for (let i = 0; i < count; i++) {
                let attempts = 0;
                let mazePos: THREE.Vector3 | null = null;

                while (attempts < 50) {
                    const x = (Math.random() - 0.5) * mapBoundary * 2;
                    const z = (Math.random() - 0.5) * mapBoundary * 2;
                    const pos = new THREE.Vector3(x, 0.5, z);

                    // Check distance from center
                    if (pos.length() < minDistanceFromCenter) {
                        attempts++;
                        continue;
                    }

                    // Check distance from other mazes
                    let tooClose = false;
                    for (const existing of spawnedMazes) {
                        const dx = x - existing.x;
                        const dz = z - existing.z;
                        const dist = Math.sqrt(dx * dx + dz * dz);
                        if (dist < minDistanceBetweenMazes) {
                            tooClose = true;
                            break;
                        }
                    }

                    if (!tooClose) {
                        mazePos = pos;
                        spawnedMazes.push({ x, z });
                        break;
                    }

                    attempts++;
                }

                if (mazePos) {
                    createMaze(mazePos, mazeSize);
                }
            }

            // Update minimap data with maze positions
            minimapDataRef.current.mazes = spawnedMazes;
        };

        spawnRandomMazes(3, 30); // 3 mazes for better performance, 30 unit size each

        // Spawn fractal trees scattered around the world (balanced for Safari)
        spawnTrees(28);

        // Spawn minimal ring obstacles (only 5 for performance)
        spawnObstacles(5);

        // Precompile shaders and warm up geometries to prevent initial lag
        console.log('Precompiling shaders...');

        // Use setTimeout to allow UI to render first, then compile shaders asynchronously
        setTimeout(() => {
            // Compile all materials and shaders by rendering the scene once before the game loop
            renderer.compile(scene, camera);

            // Force an initial render to warm up GPU
            renderer.render(scene, camera);

            console.log('Shader compilation complete');

            // Mark loading as complete
            setIsLoading(false);
        }, 100);

        // Set up multiplayer connection
        socket = io({
            path: '/socket.io',
        });

        socket.on('player-id', (id: string) => {
            myPlayerId = id;
            console.log('My player ID:', id);

            // Get our spawn data from server
            const playerData = Array.from(gameState.multiplayerPlayers.values()).find(p => p.id === id);
            // Note: We'll get the position through player-joined event for ourselves

            // Update initial player count
            updatePlayersOnlineCount();
        });

        // Listen for our own spawn data
        socket.on('player-spawn-data', (data: any) => {
            console.log('Received spawn data:', data);

            // Update player color (sent on initial connection)
            if (data.color && data.color.startsWith('hsl')) {
                const hue = parseInt(data.color.match(/\d+/)?.[0] || '0');
                const colorNum = new THREE.Color().setHSL(hue / 360, 0.7, 0.5).getHex();

                // Update all colored parts of the snake head (it's a Group now)
                head.traverse((child) => {
                    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                        // Update main head and snout, but not eyes
                        if (child.material.color.getHex() !== 0xffffff && child.material.color.getHex() !== 0x000000) {
                            child.material.color.setHex(colorNum);
                            child.material.emissive.setHex(colorNum);
                        }
                    }
                });

                snakeLight.color.setHex(colorNum);
                setMyPlayerColor('#' + colorNum.toString(16).padStart(6, '0'));
            }

            // Update position/direction when spawning
            if (data.position) {
                gameState.snake.position.set(data.position.x, data.position.y, data.position.z);
                head.position.copy(gameState.snake.position);

                // Initialize trail with just 2 close points - will build naturally as snake moves
                if (gameState.snake.trail.length < 2) {
                    gameState.snake.trail = [
                        gameState.snake.position.clone(),
                        gameState.snake.position.clone().sub(gameState.snake.direction.clone().multiplyScalar(0.1)),
                    ];
                }
                gameState.snake.spawnFrameCount = 0; // Reset spawn frame counter
            }
            if (data.direction) {
                gameState.snake.direction.set(data.direction.x, data.direction.y, data.direction.z);
            }
        });

        socket.on('current-players', (players: any[]) => {
            console.log('Current players received:', players.length, 'My ID:', myPlayerId);
            players.forEach((playerData) => {
                console.log('Processing player:', playerData.id, playerData.position);
                if (playerData.id !== myPlayerId) {
                    const player = createMultiplayerPlayer(
                        playerData.id,
                        playerData.color,
                        playerData.position,
                        playerData.direction
                    );
                    gameState.multiplayerPlayers.set(playerData.id, player);
                    console.log('Added player to scene:', playerData.id);
                }
            });

            updatePlayersOnlineCount();
        });

        socket.on('player-joined', (playerData: any) => {
            console.log('Player joined/respawned:', playerData.id, 'My ID:', myPlayerId, 'Position:', playerData.position);
            if (playerData.id !== myPlayerId) {
                // Check if player already exists (respawn case)
                let player = gameState.multiplayerPlayers.get(playerData.id);

                if (!player) {
                    // New player - create them
                    player = createMultiplayerPlayer(
                        playerData.id,
                        playerData.color,
                        playerData.position,
                        playerData.direction
                    );
                    gameState.multiplayerPlayers.set(playerData.id, player);
                    console.log('Created new multiplayer player');
                } else {
                    // Existing player respawning - update position and make visible
                    console.log('Player respawned, updating position');
                    if (playerData.position) {
                        player.position.set(playerData.position.x, playerData.position.y, playerData.position.z);
                        player.head.position.copy(player.position);
                    }
                    if (playerData.direction) {
                        player.direction.set(playerData.direction.x, playerData.direction.y, playerData.direction.z);
                    }
                    // Initialize trail with multiple points spread behind the head
                    const playerBackDir = player.direction.clone().multiplyScalar(-1);
                    player.trail = [
                        player.position.clone(),
                        player.position.clone().add(playerBackDir.clone().multiplyScalar(0.8)),
                        player.position.clone().add(playerBackDir.clone().multiplyScalar(1.6)),
                        player.position.clone().add(playerBackDir.clone().multiplyScalar(2.4)),
                    ];
                    if (player.trailMesh) {
                        disposeTrailMesh(player.trailMesh);
                        player.trailMesh = null;
                    }
                    // Make visible again
                    player.head.visible = true;
                    player.light.visible = true;
                }

                console.log('Total multiplayer players:', gameState.multiplayerPlayers.size);
            }

            updatePlayersOnlineCount();
        });

        let lastMoveLog = 0;
        socket.on('player-moved', (data: any) => {
            const player = gameState.multiplayerPlayers.get(data.id);
            if (player) {
                // Set target positions for smooth interpolation instead of snapping
                if (data.position && typeof data.position.x === 'number' && isFinite(data.position.x)) {
                    player.targetPosition.set(data.position.x, data.position.y, data.position.z);
                }
                if (data.direction && typeof data.direction.x === 'number' && isFinite(data.direction.x)) {
                    player.targetDirection.set(data.direction.x, data.direction.y, data.direction.z);
                }
                if (data.trail && Array.isArray(data.trail)) {
                    // Validate and filter trail points before creating Vector3 objects
                    const newPoints: THREE.Vector3[] = [];
                    for (const p of data.trail) {
                        if (p &&
                            typeof p.x === 'number' && typeof p.y === 'number' && typeof p.z === 'number' &&
                            isFinite(p.x) && isFinite(p.y) && isFinite(p.z)) {
                            newPoints.push(new THREE.Vector3(p.x, p.y, p.z));
                        }
                    }
                    // Only update if we have valid new data
                    if (newPoints.length >= 2) {
                        player.trail = newPoints;
                    }
                }
                player.length = data.length || 20;

                // Debug log (throttled)
                if (Date.now() - lastMoveLog > 1000) {
                    console.log('Player moved:', data.id, 'Position:', data.position, 'Trail length:', data.trail?.length);
                    lastMoveLog = Date.now();
                }
            }
        });

        socket.on('player-died', (data: { id: string; trail?: any[] }) => {
            console.log('[CLIENT] ===== PLAYER DIED EVENT =====');
            console.log('[CLIENT] Dead player ID:', data.id);
            console.log('[CLIENT] My player ID:', myPlayerId);
            console.log('[CLIENT] Trail points received:', data.trail?.length);
            console.log('[CLIENT] Is this me?', data.id === myPlayerId);

            // Spawn items from the dead player's trail for everyone (including if it's me)
            if (data.trail && data.trail.length > 0) {
                const trailPoints = data.trail.map((p: any) => new THREE.Vector3(p.x, p.y, p.z));
                const itemCount = Math.floor(trailPoints.length / 3);
                console.log(`[CLIENT] Spawning ${itemCount} items from dead player trail`);

                // Spawn common items at every 3rd trail point (using shared geometry!)
                for (let i = 0; i < trailPoints.length; i += 3) {
                    const mesh = new THREE.Mesh(itemGeometries.common, itemMaterials.common);
                    mesh.position.copy(trailPoints[i]);
                    scene.add(mesh);

                    gameState.items.push({
                        position: trailPoints[i].clone(),
                        mesh: mesh,
                        spawnTime: Date.now(),
                        type: 'common',
                        value: 1,
                    });
                }

                console.log(`[CLIENT] Total items in scene now: ${gameState.items.length}`);
            } else {
                console.log('[CLIENT] No trail data to spawn items from');
            }

            // Remove player from scene if it's another player (not me)
            if (data.id !== myPlayerId) {
                const player = gameState.multiplayerPlayers.get(data.id);
                if (player) {
                    console.log('[CLIENT] Removing OTHER dead player from my scene:', data.id);
                    scene.remove(player.head);
                    scene.remove(player.light);
                    if (player.trailMesh) {
                        disposeTrailMesh(player.trailMesh);
                    }
                    gameState.multiplayerPlayers.delete(data.id);
                } else {
                    console.log('[CLIENT] Player not found in multiplayerPlayers map:', data.id);
                }
            } else {
                console.log('[CLIENT] This is MY death event - I should already be hidden');
            }
            console.log('[CLIENT] ===== END PLAYER DIED EVENT =====');

            updatePlayersOnlineCount();
        });

        socket.on('player-left', (id: string) => {
            const player = gameState.multiplayerPlayers.get(id);
            if (player) {
                scene.remove(player.head);
                scene.remove(player.light);
                if (player.trailMesh) {
                    disposeTrailMesh(player.trailMesh);
                }
                gameState.multiplayerPlayers.delete(id);

                updatePlayersOnlineCount();
            }
        });

        // Don't auto-start - wait for player to press space
        // Player must press space to spawn

        animate();

        // Handle window resize
        const handleResize = () => {
            if (containerRef.current) {
                const width = containerRef.current.clientWidth;
                const height = containerRef.current.clientHeight;
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                renderer.setSize(width, height);
            }
        };
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('resize', handleResize);

            // Disconnect socket
            if (socket) {
                socket.disconnect();
            }

            // Clean up multiplayer players
            for (const [id, player] of gameState.multiplayerPlayers) {
                scene.remove(player.head);
                scene.remove(player.light);
                if (player.trailMesh) {
                    disposeTrailMesh(player.trailMesh);
                }
            }

            // Clean up trees
            for (const tree of gameState.trees) {
                tree.group.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.geometry.dispose();
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
            }

            if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
                containerRef.current.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, []);

    // Sync the ref with the isActive prop
    useEffect(() => {
        isFocusedRef.current = isActive ?? true; // Default to true if no prop provided
    }, [isActive]);

    // Minimap rendering
    useEffect(() => {
        if (!minimapCanvasRef.current) return;

        const canvas = minimapCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let minimapFrameCount = 0;
        const drawMinimap = () => {
            minimapFrameCount++;

            // Only render minimap every 4 frames (15fps instead of 60fps) for performance
            if (minimapFrameCount % 4 !== 0) {
                requestAnimationFrame(drawMinimap);
                return;
            }

            // Clear canvas
            ctx.fillStyle = 'rgba(10, 10, 10, 0.9)';
            ctx.fillRect(0, 0, 200, 200);

            // Draw grid
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
            ctx.lineWidth = 0.5;
            for (let i = 0; i <= 200; i += 40) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, 200);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, i);
                ctx.lineTo(200, i);
                ctx.stroke();
            }

            const worldSize = 1000;
            const scale = 200 / worldSize;

            // Helper function to convert world coordinates to minimap coordinates
            const worldToMinimap = (x: number, z: number) => ({
                x: (x + worldSize / 2) * scale,
                y: (z + worldSize / 2) * scale,
            });

            // Draw maze boundaries
            ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
            ctx.lineWidth = 1;
            for (const maze of minimapDataRef.current.mazes) {
                const pos = worldToMinimap(maze.x, maze.z);
                const size = 25 * scale; // 25 unit maze size
                ctx.fillRect(pos.x - size / 2, pos.y - size / 2, size, size);
                ctx.strokeRect(pos.x - size / 2, pos.y - size / 2, size, size);
            }

            // Draw treasures
            for (const treasure of minimapDataRef.current.treasures) {
                const pos = worldToMinimap(treasure.x, treasure.z);
                ctx.fillStyle = 'rgba(255, 215, 0, 1)';
                ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
                ctx.shadowBlur = 5;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            // Draw bots
            for (const bot of minimapDataRef.current.bots) {
                const pos = worldToMinimap(bot.x, bot.z);
                ctx.fillStyle = 'rgba(255, 68, 68, 0.8)';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw multiplayer players
            for (const player of minimapDataRef.current.multiplayerPlayers) {
                const pos = worldToMinimap(player.x, player.z);
                ctx.fillStyle = 'rgba(138, 43, 226, 0.9)'; // Purple for other players
                ctx.shadowColor = 'rgba(138, 43, 226, 0.6)';
                ctx.shadowBlur = 4;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            // Draw player
            const playerPos = worldToMinimap(
                minimapDataRef.current.playerPos.x,
                minimapDataRef.current.playerPos.z
            );
            ctx.fillStyle = 'rgba(0, 255, 255, 1)';
            ctx.shadowColor = 'rgba(0, 255, 255, 1)';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(playerPos.x, playerPos.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Draw player direction indicator
            const dirAngle = Math.atan2(0, 1); // Will be updated with actual direction
            ctx.strokeStyle = 'rgba(0, 255, 255, 1)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(playerPos.x, playerPos.y);
            ctx.lineTo(playerPos.x + Math.cos(dirAngle) * 8, playerPos.y + Math.sin(dirAngle) * 8);
            ctx.stroke();

            requestAnimationFrame(drawMinimap);
        };

        drawMinimap();
    }, [spawned]);

    const isFocused = isActive ?? true; // Use prop or default to true

    return (
        <div className="relative w-full h-full overflow-hidden">
            <div
                ref={containerRef}
                className={`w-full h-full cursor-pointer transition-all ${isFocused ? '' : 'opacity-70'
                    }`}
            />

            {/* Loading Indicator */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90 pointer-events-none z-50">
                    <div className="text-center">
                        <div className="text-4xl font-bold text-cyan-400 tracking-wider mb-4 animate-pulse drop-shadow-[0_0_20px_rgba(0,255,255,0.8)]">
                            LOADING...
                        </div>
                        <div className="text-sm text-cyan-300 tracking-widest uppercase">
                            Compiling Shaders
                        </div>
                    </div>
                </div>
            )}

            {/* Focus Indicator */}
            {!isFocused && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-xl font-bold text-white bg-black bg-opacity-70 px-6 py-3 rounded-lg animate-pulse">
                        HOVER TO CONTROL
                    </div>
                </div>
            )}

            {/* HUD - only show when spawned */}
            {spawned && (
                <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-center pointer-events-none">
                    <div className="flex items-baseline gap-6 justify-center">
                        <div>
                            <div className="text-3xl font-bold text-cyan-400 tracking-wider drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]">
                                {score}
                            </div>
                            <div className="text-xs text-cyan-300 mt-1 tracking-widest uppercase">
                                Score
                            </div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-yellow-400 tracking-wider drop-shadow-[0_0_10px_rgba(255,255,0,0.8)]">
                                {itemsCollected}
                            </div>
                            <div className="text-xs text-yellow-300 mt-1 tracking-widest uppercase">
                                Items
                            </div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-purple-400 tracking-wider drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]">
                                {level}
                            </div>
                            <div className="text-xs text-purple-300 mt-1 tracking-widest uppercase">
                                Level
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Players Online Counter & Leaderboard */}
            <div className="absolute top-8 right-8 text-right pointer-events-none">
                <div className="text-2xl font-bold text-pink-400 tracking-wider drop-shadow-[0_0_10px_rgba(255,0,136,0.8)]">
                    {playersOnline}
                </div>
                <div className="text-xs text-pink-300 mt-1 tracking-widest uppercase">
                    Players Online
                </div>

                {/* Leaderboard */}
                {spawned && leaderboard.length > 0 && (
                    <div className="mt-6">
                        <div className="text-sm font-bold text-purple-400 tracking-wider mb-2 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)] uppercase">
                            Leaderboard
                        </div>
                        <div className="space-y-1">
                            {leaderboard.map((entry, index) => (
                                <div
                                    key={index}
                                    className={`flex items-center gap-2 ${entry.isMe ? 'text-cyan-400' : 'text-purple-300'
                                        } text-sm`}
                                >
                                    <div className={`w-5 text-right font-bold ${index === 0 ? 'text-yellow-400' : ''
                                        }`}>
                                        {index + 1}.
                                    </div>
                                    <div
                                        className="w-3 h-3 rounded-full border border-white/30"
                                        style={{
                                            backgroundColor: entry.color,
                                            boxShadow: `0 0 8px ${entry.color}80`
                                        }}
                                    />
                                    <div className={`flex-1 ${entry.isMe ? 'font-bold' : ''}`}>
                                        {entry.name}
                                    </div>
                                    <div className="font-bold tabular-nums">
                                        {Math.floor(entry.length)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Boost Indicator */}
            {isBoosting && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <div className="text-6xl font-bold text-yellow-400 tracking-wider animate-pulse drop-shadow-[0_0_20px_rgba(255,255,0,1)]">
                        BOOST!
                    </div>
                </div>
            )}

            {/* Controls - only show when spawned */}
            {spawned && (
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center pointer-events-none">
                    <div className="text-cyan-300 text-sm tracking-wider">
                        <div className="flex gap-6 mb-2 justify-center items-center">
                            <div>← / →</div>
                            <div className="text-yellow-400">↑ / W</div>
                        </div>
                        <div className="text-xs opacity-70">STEER: A/D or Arrows • BOOST: W or Up</div>
                    </div>
                </div>
            )}

            {/* Not Spawned - Press Space to Start */}
            {!spawned && !gameOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 pointer-events-none">
                    <div className="text-center">
                        <div className="text-6xl font-bold text-cyan-400 mb-8 drop-shadow-[0_0_20px_rgba(0,255,255,0.8)]">
                            SNAKE ATTACK
                        </div>
                        <div className="text-3xl text-white mb-4">
                            Press SPACE to Start
                        </div>
                        <div className="flex items-center justify-center gap-4 mt-6">
                            <div
                                className="w-12 h-12 rounded-full border-4 border-white shadow-lg"
                                style={{ backgroundColor: myPlayerColor }}
                            />
                            <div className="text-lg text-cyan-300">Your Color</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Game Over */}
            {gameOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 pointer-events-none">
                    <div className="text-center">
                        <div className="text-8xl font-bold text-red-500 mb-4 drop-shadow-[0_0_20px_rgba(255,0,0,0.8)]">
                            CRASH!
                        </div>
                        <div className="text-4xl text-cyan-400 mb-8">
                            Final Score: {score}
                        </div>
                        <div className="flex items-center justify-center gap-4 mb-6">
                            <div
                                className="w-12 h-12 rounded-full border-4 border-white shadow-lg"
                                style={{ backgroundColor: myPlayerColor }}
                            />
                            <div className="text-lg text-cyan-300">Your Color</div>
                        </div>
                        <div className="text-xl text-cyan-300 animate-pulse">
                            Press SPACE or ENTER to respawn
                        </div>
                    </div>
                </div>
            )}

            {/* Upgrade Selection - Bottom Left Panel (doesn't pause game!) */}
            {showUpgradeChoice && (
                <div className="absolute bottom-8 left-8 z-40">
                    <div className="bg-black/90 border-2 border-purple-500 rounded-xl p-4 shadow-2xl backdrop-blur-md pointer-events-auto w-80">
                        <div className="text-center mb-3">
                            <div className="text-3xl font-bold text-purple-400 animate-pulse drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]">
                                ⬆️ LEVEL {level}!
                            </div>
                            <div className="text-sm text-cyan-300 mt-1">
                                Choose Your Upgrade
                            </div>
                        </div>

                        <div className="space-y-2">
                            {upgradeOptions.map((upgrade, index) => (
                                <button
                                    key={upgrade.id}
                                    onClick={() => selectUpgrade(index)}
                                    className="w-full bg-gradient-to-r from-purple-600/90 to-cyan-600/90 hover:from-purple-500 hover:to-cyan-500 text-white px-4 py-3 rounded-lg font-bold text-sm tracking-wider transform hover:scale-[1.02] transition-all shadow-lg border border-purple-400 hover:border-cyan-400 flex items-center gap-3"
                                >
                                    <div className="text-2xl">{upgrade.icon}</div>
                                    <div className="flex-1 text-left">
                                        <div className="text-base">{upgrade.name}</div>
                                        <div className="text-xs text-cyan-200 font-normal opacity-90">{upgrade.description}</div>
                                    </div>
                                    <div className="text-lg font-bold bg-black/30 px-2 py-1 rounded">{index + 1}</div>
                                </button>
                            ))}
                        </div>

                        <div className="mt-3 text-xs text-center text-cyan-300/70">
                            Press 1, 2, or 3 to choose (game keeps running!)
                        </div>
                    </div>
                </div>
            )}

            {/* Active Upgrades Indicator */}
            {spawned && activeUpgrades.length > 0 && !showUpgradeChoice && (
                <div className="absolute bottom-8 left-8 pointer-events-none">
                    <div className="bg-black/70 border-2 border-purple-400/50 rounded-lg p-3 shadow-2xl backdrop-blur-sm">
                        <div className="text-xs text-purple-300 mb-2 tracking-widest uppercase font-bold">
                            Active Upgrades
                        </div>
                        <div className="flex flex-wrap gap-2 max-w-[200px]">
                            {activeUpgrades.map((upgradeId, index) => {
                                const upgrade = AVAILABLE_UPGRADES.find(u => u.id === upgradeId);
                                // Count how many times this upgrade appears before this index
                                const countBefore = activeUpgrades.slice(0, index).filter(id => id === upgradeId).length;
                                const displayName = countBefore > 0 ? `${upgrade?.name} x${countBefore + 1}` : upgrade?.name;

                                return (
                                    <div
                                        key={`${upgradeId}-${index}`}
                                        className="bg-purple-600/50 px-2 py-1 rounded text-xs flex items-center gap-1"
                                        title={upgrade?.description}
                                    >
                                        <span>{upgrade?.icon}</span>
                                        <span className="text-purple-200">{displayName}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Title */}
            <div className="absolute top-8 left-8 pointer-events-none">
                <h1 className="text-2xl font-bold text-cyan-400 tracking-wider drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]">
                    SNAKE ATTACK
                </h1>
                {/* Player Color Indicator */}
                <div className="mt-2">
                    <div
                        className="w-6 h-6 rounded-full border-2 border-white shadow-lg"
                        style={{ backgroundColor: myPlayerColor }}
                    />
                    <div className="text-xs text-cyan-300 mt-1">YOU</div>
                </div>
                {/* FPS Counter */}
                <div className="mt-3 text-sm">
                    <div className={`font-mono ${fps >= 50 ? 'text-green-400' : fps >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {fps} FPS
                    </div>
                </div>
            </div>

            {/* Minimap - Bottom Right */}
            {spawned && (
                <div className="absolute bottom-8 right-8 pointer-events-none">
                    <div className="bg-black/70 border-2 border-cyan-400/50 rounded-lg p-2 shadow-2xl backdrop-blur-sm">
                        <div className="text-xs text-cyan-300 mb-1 text-center tracking-widest uppercase font-bold">
                            Map
                        </div>
                        <canvas
                            ref={minimapCanvasRef}
                            width={200}
                            height={200}
                            className="rounded border border-cyan-500/30"
                        />
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2 text-xs">
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-glow-cyan"></div>
                                <span className="text-cyan-300">You</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                                <span className="text-red-300">Bots</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                                <span className="text-purple-300">Players</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-yellow-400 rounded-full shadow-glow-yellow"></div>
                                <span className="text-yellow-300">Treasure</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

