'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function SnakeGame() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [score, setScore] = useState(0);
    const [itemsCollected, setItemsCollected] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [botsAlive, setBotsAlive] = useState(3);
    const [isBoosting, setIsBoosting] = useState(false);
    const gameStateRef = useRef({
        isRunning: false,
        score: 0,
        gameOver: false,
    });

    useEffect(() => {
        if (!containerRef.current) return;

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0a0a);
        scene.fog = new THREE.Fog(0x0a0a0a, 50, 200);

        // Camera setup - third person view
        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );

        // Renderer setup
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        containerRef.current.appendChild(renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        scene.add(directionalLight);

        // Add point light that follows the snake
        const snakeLight = new THREE.PointLight(0x00ffff, 2, 30);
        scene.add(snakeLight);

        // Create grid floor
        const gridSize = 200;
        const gridDivisions = 100;
        const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x00ffff, 0x003333);
        gridHelper.position.y = -0.5;
        scene.add(gridHelper);

        // Add glowing floor plane
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
            head: THREE.Mesh;
            trail: THREE.Vector3[];
            trailMesh: THREE.Mesh | null;
            light: THREE.PointLight;
            alive: boolean;
            length: number;
            boosting: boolean;
            boostCostTimer: number;
            boostCooldown: number;
        };

        // Item type
        type Item = {
            position: THREE.Vector3;
            mesh: THREE.Mesh;
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
                segments: [] as THREE.Mesh[],
                trail: [] as THREE.Vector3[],
                trailMesh: null as THREE.Mesh | null,
                length: 20, // Current trail length - start with visible body
                boosting: false,
                boostCostTimer: 0,
            },
            bots: [] as BotSnake[],
            items: [] as Item[],
            keys: {
                left: false,
                right: false,
                boost: false,
            },
        };

        // Create snake head
        const headGeometry = new THREE.BoxGeometry(1, 1, 2);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 0.5,
            metalness: 0.8,
            roughness: 0.2,
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.copy(gameState.snake.position);
        scene.add(head);
        gameState.snake.segments.push(head);

        // Input handling
        const handleKeyDown = (e: KeyboardEvent) => {
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
            if ((e.key === ' ' || e.key === 'Enter') && gameStateRef.current.gameOver) {
                restartGame();
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
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

        // Create trail mesh function
        const updateTrailMesh = (trail: THREE.Vector3[], currentMesh: THREE.Mesh | null, color: number): THREE.Mesh | null => {
            if (trail.length < 2) return currentMesh;

            // Remove old mesh
            if (currentMesh) {
                scene.remove(currentMesh);
                currentMesh.geometry.dispose();
            }

            // Create a tube geometry along the trail path
            const curve = new THREE.CatmullRomCurve3(trail);
            const tubeGeometry = new THREE.TubeGeometry(curve, trail.length * 2, 0.4, 8, false);

            const trailMaterial = new THREE.MeshStandardMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.3,
                metalness: 0.6,
                roughness: 0.3,
            });

            const newMesh = new THREE.Mesh(tubeGeometry, trailMaterial);
            scene.add(newMesh);
            return newMesh;
        };

        // Create bot snake
        const createBot = (startPos: THREE.Vector3, color: number): BotSnake => {
            const headGeometry = new THREE.BoxGeometry(0.9, 0.9, 1.8);
            const headMaterial = new THREE.MeshStandardMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.5,
                metalness: 0.8,
                roughness: 0.2,
            });
            const head = new THREE.Mesh(headGeometry, headMaterial);
            head.position.copy(startPos);
            scene.add(head);

            const light = new THREE.PointLight(color, 1.5, 25);
            scene.add(light);

            // Random initial direction
            const angle = Math.random() * Math.PI * 2;
            const direction = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).normalize();

            return {
                position: startPos.clone(),
                direction: direction,
                speed: 0.25,
                baseSpeed: 0.25,
                boostSpeed: 0.5,
                turnSpeed: 0.04,
                head: head,
                trail: [],
                trailMesh: null,
                light: light,
                alive: true,
                length: 20, // Bots start with visible body
                boosting: false,
                boostCostTimer: 0,
                boostCooldown: 0,
            };
        };

        // Spawn initial bots
        const spawnBots = (count: number) => {
            gameState.bots = [];
            const colors = [0xff0088, 0xff8800, 0x88ff00, 0xff00ff];
            const spawnRadius = 30;

            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                const spawnPos = new THREE.Vector3(
                    Math.cos(angle) * spawnRadius,
                    0.5,
                    Math.sin(angle) * spawnRadius
                );
                const bot = createBot(spawnPos, colors[i % colors.length]);
                gameState.bots.push(bot);
            }
        };

        // Create item
        const createItem = (position: THREE.Vector3): Item => {
            const geometry = new THREE.OctahedronGeometry(0.4);
            const material = new THREE.MeshStandardMaterial({
                color: 0xffff00,
                emissive: 0xffff00,
                emissiveIntensity: 0.8,
                metalness: 0.8,
                roughness: 0.2,
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.copy(position);
            scene.add(mesh);

            return {
                position: position.clone(),
                mesh: mesh,
            };
        };

        // Spawn random items
        const spawnRandomItems = (count: number) => {
            const boundary = (gridSize / 2) - 10;
            for (let i = 0; i < count; i++) {
                const pos = new THREE.Vector3(
                    (Math.random() - 0.5) * boundary * 2,
                    0.5,
                    (Math.random() - 0.5) * boundary * 2
                );
                const item = createItem(pos);
                gameState.items.push(item);
            }
        };

        // Spawn items from trail (when snake dies)
        const spawnItemsFromTrail = (trail: THREE.Vector3[]) => {
            // Spawn an item every 3rd trail point
            for (let i = 0; i < trail.length; i += 3) {
                const item = createItem(trail[i]);
                gameState.items.push(item);
            }
        };

        // Check and collect items
        const checkItemCollection = (position: THREE.Vector3) => {
            for (let i = gameState.items.length - 1; i >= 0; i--) {
                const item = gameState.items[i];
                const distance = position.distanceTo(item.position);

                if (distance < 2) {
                    // Collect item
                    scene.remove(item.mesh);
                    item.mesh.geometry.dispose();
                    gameState.items.splice(i, 1);

                    // Grow snake (each item adds to body length)
                    gameState.snake.length += 3;

                    // Update score and items collected
                    gameStateRef.current.score += 10;
                    setScore(gameStateRef.current.score);
                    setItemsCollected(prev => prev + 1);

                    return true;
                }
            }
            return false;
        };

        // Check collision with trail (slither.io style)
        const checkCollision = (position: THREE.Vector3, skipTrailCount: number = 10, ownTrail?: THREE.Vector3[]) => {
            // Check boundaries
            const boundary = gridSize / 2 - 2;
            if (
                Math.abs(position.x) > boundary ||
                Math.abs(position.z) > boundary
            ) {
                return true;
            }

            // Check player trail collision
            const playerTrailToCheck = ownTrail === gameState.snake.trail
                ? gameState.snake.trail.slice(0, -skipTrailCount)
                : gameState.snake.trail;

            for (const segment of playerTrailToCheck) {
                const distance = position.distanceTo(segment);
                if (distance < 1.2) {
                    return true;
                }
            }

            // Check all bot trails
            for (const bot of gameState.bots) {
                if (!bot.alive) continue;

                const botTrailToCheck = ownTrail === bot.trail
                    ? bot.trail.slice(0, -skipTrailCount)
                    : bot.trail;

                for (const segment of botTrailToCheck) {
                    const distance = position.distanceTo(segment);
                    if (distance < 1.2) {
                        return true;
                    }
                }
            }

            return false;
        };

        const restartGame = () => {
            // Clear player trail
            if (gameState.snake.trailMesh) {
                scene.remove(gameState.snake.trailMesh);
                gameState.snake.trailMesh.geometry.dispose();
                gameState.snake.trailMesh = null;
            }
            gameState.snake.trail = [];
            gameState.snake.length = 20; // Start with visible body
            gameState.snake.boosting = false;
            gameState.snake.boostCostTimer = 0;
            gameState.snake.speed = gameState.snake.baseSpeed;

            // Clear all bots
            for (const bot of gameState.bots) {
                scene.remove(bot.head);
                scene.remove(bot.light);
                if (bot.trailMesh) {
                    scene.remove(bot.trailMesh);
                    bot.trailMesh.geometry.dispose();
                }
            }

            // Clear all items
            for (const item of gameState.items) {
                scene.remove(item.mesh);
                item.mesh.geometry.dispose();
            }
            gameState.items = [];

            // Reset position and direction
            gameState.snake.position.set(0, 0.5, 0);
            gameState.snake.direction.set(0, 0, -1);
            head.position.copy(gameState.snake.position);

            // Respawn bots
            spawnBots(3);
            setBotsAlive(3);

            // Spawn initial items
            spawnRandomItems(15);

            // Reset game state
            setGameOver(false);
            gameStateRef.current.gameOver = false;
            setScore(0);
            gameStateRef.current.score = 0;
            setItemsCollected(0);
            gameStateRef.current.isRunning = true;
        };

        // Animation loop
        let lastTime = Date.now();
        const animate = () => {
            requestAnimationFrame(animate);

            const currentTime = Date.now();
            const deltaTime = (currentTime - lastTime) / 16.67; // Normalize to ~60fps
            lastTime = currentTime;

            if (!gameStateRef.current.gameOver && gameStateRef.current.isRunning) {
                // Handle boosting
                const minBoostLength = 15;
                if (gameState.keys.boost && gameState.snake.length > minBoostLength) {
                    gameState.snake.boosting = true;
                    gameState.snake.speed = gameState.snake.boostSpeed;
                    setIsBoosting(true);

                    // Consume body length while boosting (like slither.io)
                    gameState.snake.boostCostTimer += deltaTime;
                    if (gameState.snake.boostCostTimer >= 2) { // Every ~2 frames at 60fps
                        gameState.snake.length = Math.max(minBoostLength, gameState.snake.length - 0.15);
                        gameState.snake.boostCostTimer = 0;
                    }

                    // Boost visual: brighter emissive
                    (head.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.0;
                    snakeLight.intensity = 3;
                } else {
                    gameState.snake.boosting = false;
                    gameState.snake.speed = gameState.snake.baseSpeed;
                    setIsBoosting(false);
                    (head.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
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

                // Check collision
                if (checkCollision(gameState.snake.position, 10, gameState.snake.trail)) {
                    setGameOver(true);
                    gameStateRef.current.gameOver = true;
                    gameStateRef.current.isRunning = false;
                    return;
                }

                // Update head position and rotation
                head.position.copy(gameState.snake.position);
                head.lookAt(head.position.clone().add(gameState.snake.direction));

                // Check for item collection
                checkItemCollection(gameState.snake.position);

                // Add trail point every frame to record path (like slither.io)
                if (gameState.snake.trail.length === 0 ||
                    gameState.snake.position.distanceTo(gameState.snake.trail[gameState.snake.trail.length - 1]) > 0.5) {
                    gameState.snake.trail.push(gameState.snake.position.clone());

                    // Remove old trail points from the front to maintain length
                    while (gameState.snake.trail.length > gameState.snake.length) {
                        gameState.snake.trail.shift();
                    }
                }

                // Always update trail mesh to show the body
                if (gameState.snake.trail.length >= 2) {
                    // Brighter trail color when boosting
                    const trailColor = gameState.snake.boosting ? 0x00ddff : 0x0088ff;
                    gameState.snake.trailMesh = updateTrailMesh(gameState.snake.trail, gameState.snake.trailMesh, trailColor);
                }

                // Update snake light position
                snakeLight.position.copy(gameState.snake.position);
                snakeLight.position.y = 2;

                // Update bots
                for (const bot of gameState.bots) {
                    if (!bot.alive) continue;

                    // Update boost cooldown
                    if (bot.boostCooldown > 0) {
                        bot.boostCooldown -= deltaTime;
                    }

                    // AI: Chase the player
                    const toPlayer = new THREE.Vector3().subVectors(gameState.snake.position, bot.position);
                    const distanceToPlayer = toPlayer.length();

                    // Bots boost when close to player and not on cooldown
                    const minBoostLength = 15;
                    if (distanceToPlayer < 30 && distanceToPlayer > 10 &&
                        bot.length > minBoostLength &&
                        bot.boostCooldown <= 0 &&
                        Math.random() < 0.02) {
                        bot.boosting = true;
                        bot.boostCooldown = 100; // Cooldown ~100 frames
                    }

                    // Handle bot boosting
                    if (bot.boosting && bot.length > minBoostLength) {
                        bot.speed = bot.boostSpeed;
                        bot.boostCostTimer += deltaTime;

                        if (bot.boostCostTimer >= 2) {
                            bot.length = Math.max(minBoostLength, bot.length - 0.15);
                            bot.boostCostTimer = 0;
                        }

                        // Bot visual boost
                        (bot.head.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.0;
                        bot.light.intensity = 2.5;

                        // Stop boosting randomly or when length is low
                        if (Math.random() < 0.01 || bot.length <= minBoostLength) {
                            bot.boosting = false;
                        }
                    } else {
                        bot.boosting = false;
                        bot.speed = bot.baseSpeed;
                        (bot.head.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
                        bot.light.intensity = 1.5;
                    }

                    // Calculate desired direction
                    let desiredDirection: THREE.Vector3;

                    if (distanceToPlayer > 50) {
                        // Too far, move towards player
                        desiredDirection = toPlayer.normalize();
                    } else if (distanceToPlayer < 15) {
                        // Too close, try to cut off the player by predicting their movement
                        const predictedPlayerPos = gameState.snake.position.clone().add(
                            gameState.snake.direction.clone().multiplyScalar(20)
                        );
                        desiredDirection = new THREE.Vector3().subVectors(predictedPlayerPos, bot.position).normalize();
                    } else {
                        // At good range, try to intercept
                        const predictedPlayerPos = gameState.snake.position.clone().add(
                            gameState.snake.direction.clone().multiplyScalar(15)
                        );
                        desiredDirection = new THREE.Vector3().subVectors(predictedPlayerPos, bot.position).normalize();
                    }

                    // Calculate turn angle
                    const cross = new THREE.Vector3().crossVectors(bot.direction, desiredDirection);
                    const turnDirection = cross.y > 0 ? 1 : -1;
                    const angleToDesired = bot.direction.angleTo(desiredDirection);

                    // Apply turning with some randomness for more natural movement
                    if (angleToDesired > 0.1) {
                        const turnAmount = Math.min(bot.turnSpeed * deltaTime, angleToDesired) * turnDirection;
                        const axis = new THREE.Vector3(0, 1, 0);
                        bot.direction.applyAxisAngle(axis, turnAmount);
                        bot.direction.normalize();
                    }

                    // Add slight random weaving
                    if (Math.random() < 0.02) {
                        const randomTurn = (Math.random() - 0.5) * 0.02;
                        const axis = new THREE.Vector3(0, 1, 0);
                        bot.direction.applyAxisAngle(axis, randomTurn);
                        bot.direction.normalize();
                    }

                    // Move bot forward
                    const botMovement = bot.direction.clone().multiplyScalar(bot.speed * deltaTime);
                    bot.position.add(botMovement);

                    // Check bot collision
                    if (checkCollision(bot.position, 10, bot.trail)) {
                        bot.alive = false;

                        // Spawn items from bot's trail
                        spawnItemsFromTrail(bot.trail);

                        // Remove bot visuals
                        scene.remove(bot.head);
                        scene.remove(bot.light);
                        if (bot.trailMesh) {
                            scene.remove(bot.trailMesh);
                            bot.trailMesh.geometry.dispose();
                        }

                        // Update alive count
                        const aliveCount = gameState.bots.filter(b => b.alive).length;
                        setBotsAlive(aliveCount);
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
                    if (bot.trail.length === 0 ||
                        bot.position.distanceTo(bot.trail[bot.trail.length - 1]) > 0.5) {
                        bot.trail.push(bot.position.clone());

                        // Remove old trail points from the front to maintain length
                        while (bot.trail.length > bot.length) {
                            bot.trail.shift();
                        }
                    }

                    // Always update bot trail mesh to show the body
                    if (bot.trail.length >= 2) {
                        let botColor = (bot.head.material as THREE.MeshStandardMaterial).color.getHex();
                        // Brighten trail color when boosting
                        if (bot.boosting) {
                            // Make color brighter by adding to RGB values
                            const r = Math.min(255, ((botColor >> 16) & 0xFF) + 40);
                            const g = Math.min(255, ((botColor >> 8) & 0xFF) + 40);
                            const b = Math.min(255, (botColor & 0xFF) + 40);
                            botColor = (r << 16) | (g << 8) | b;
                        }
                        bot.trailMesh = updateTrailMesh(bot.trail, bot.trailMesh, botColor);
                    }
                }

                // Rotate and animate items
                for (const item of gameState.items) {
                    item.mesh.rotation.y += 0.02 * deltaTime;
                    item.mesh.position.y = 0.5 + Math.sin(Date.now() * 0.003 + item.position.x) * 0.2;
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

            renderer.render(scene, camera);
        };

        // Spawn initial bots
        spawnBots(3);

        // Spawn initial items
        spawnRandomItems(15);

        // Start game after a brief delay
        setTimeout(() => {
            gameStateRef.current.isRunning = true;
        }, 500);

        animate();

        // Handle window resize
        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('resize', handleResize);
            containerRef.current?.removeChild(renderer.domElement);
            renderer.dispose();
        };
    }, []);

    return (
        <div className="relative w-full h-screen">
            <div ref={containerRef} className="w-full h-full" />

            {/* HUD */}
            <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-center">
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
                </div>
            </div>

            {/* Bots Counter */}
            <div className="absolute top-8 right-8 text-right">
                <div className="text-2xl font-bold text-pink-400 tracking-wider drop-shadow-[0_0_10px_rgba(255,0,136,0.8)]">
                    {botsAlive} / 3
                </div>
                <div className="text-xs text-pink-300 mt-1 tracking-widest uppercase">
                    Enemies Alive
                </div>
            </div>

            {/* Boost Indicator */}
            {isBoosting && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <div className="text-6xl font-bold text-yellow-400 tracking-wider animate-pulse drop-shadow-[0_0_20px_rgba(255,255,0,1)]">
                        BOOST!
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center">
                <div className="text-cyan-300 text-sm tracking-wider">
                    <div className="flex gap-6 mb-2 justify-center items-center">
                        <div>← / →</div>
                        <div className="text-yellow-400">↑ / W</div>
                    </div>
                    <div className="text-xs opacity-70">STEER: A/D or Arrows • BOOST: W or Up</div>
                </div>
            </div>

            {/* Game Over */}
            {gameOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80">
                    <div className="text-center">
                        <div className="text-8xl font-bold text-red-500 mb-4 drop-shadow-[0_0_20px_rgba(255,0,0,0.8)]">
                            CRASH!
                        </div>
                        <div className="text-4xl text-cyan-400 mb-8">
                            Final Score: {score}
                        </div>
                        <div className="text-xl text-cyan-300 animate-pulse">
                            Press SPACE or ENTER to restart
                        </div>
                    </div>
                </div>
            )}

            {/* Title */}
            <div className="absolute top-8 left-8">
                <h1 className="text-3xl font-bold text-cyan-400 tracking-wider drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]">
                    SNAKE ATTACK
                </h1>
            </div>
        </div>
    );
}

