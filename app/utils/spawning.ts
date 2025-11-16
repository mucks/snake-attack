import * as THREE from 'three';
import type { Item, Tree, Obstacle, Maze } from '../game/types';
import {
    WORLD_BOUNDARY,
    ITEM_CONFIGS,
    MAZE_SIZE,
    MAZE_WALL_HEIGHT,
    MAZE_WALL_WIDTH,
} from '../game/constants';

export function spawnItem(
    scene: THREE.Scene,
    itemGeometries: Record<string, THREE.BufferGeometry>,
    existingItems: Item[],
    obstacles: Obstacle[],
    mazes: Maze[]
): Item | null {
    // Determine item type based on spawn chances
    const rand = Math.random();
    let type: 'common' | 'uncommon' | 'rare' | 'epic' = 'common';

    if (rand < ITEM_CONFIGS.epic.spawnChance) {
        type = 'epic';
    } else if (rand < ITEM_CONFIGS.epic.spawnChance + ITEM_CONFIGS.rare.spawnChance) {
        type = 'rare';
    } else if (rand < ITEM_CONFIGS.epic.spawnChance + ITEM_CONFIGS.rare.spawnChance + ITEM_CONFIGS.uncommon.spawnChance) {
        type = 'uncommon';
    }

    const config = ITEM_CONFIGS[type];
    const position = getRandomPosition(existingItems.map(i => i.position), obstacles, mazes);
    if (!position) return null;

    const material = new THREE.MeshStandardMaterial({
        color: config.color,
        emissive: config.emissive,
        emissiveIntensity: config.emissiveIntensity,
        roughness: 0.3,
        metalness: 0.7,
    });

    const mesh = new THREE.Mesh(itemGeometries[type], material);
    mesh.position.copy(position);
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    scene.add(mesh);

    return {
        position,
        mesh,
        spawnTime: Date.now(),
        type,
        value: config.value,
        growthAmount: config.growthAmount,
    };
}

export function spawnTree(scene: THREE.Scene, obstacles: Obstacle[], mazes: Maze[]): Tree | null {
    const position = getRandomPosition([], obstacles, mazes, 5);
    if (!position) return null;

    // Trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 3, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3520 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.copy(position);
    trunk.position.y = 1;
    scene.add(trunk);

    // Foliage
    const foliageGeometry = new THREE.SphereGeometry(1.5, 8, 8);
    const foliageMaterial = new THREE.MeshStandardMaterial({
        color: 0x2d5016,
        roughness: 0.9,
    });
    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
    foliage.position.copy(position);
    foliage.position.y = 3;
    scene.add(foliage);

    return { position, trunk, foliage };
}

export function spawnObstacle(scene: THREE.Scene, obstacles: Obstacle[], mazes: Maze[]): Obstacle | null {
    const position = getRandomPosition([], obstacles, mazes, 4);
    if (!position) return null;

    const radius = 1.5 + Math.random() * 1.5;
    const geometry = new THREE.SphereGeometry(radius, 12, 12);
    const material = new THREE.MeshStandardMaterial({
        color: 0x555555,
        roughness: 0.7,
        metalness: 0.3,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    scene.add(mesh);

    return { position, mesh, radius };
}

export function spawnMaze(
    scene: THREE.Scene,
    itemGeometries: Record<string, THREE.BufferGeometry>,
    existingMazes: Maze[],
    obstacles: Obstacle[]
): Maze | null {
    const position = getRandomPosition([], obstacles, existingMazes, 20);
    if (!position) return null;

    const walls: THREE.Mesh[] = [];
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x666666,
        roughness: 0.8,
        emissive: 0x222222,
        emissiveIntensity: 0.2,
    });

    // Create a simple maze pattern with entrance
    const wallPattern = [
        // Outer walls with entrance at front
        { x: -MAZE_SIZE / 2, z: -MAZE_SIZE / 2, width: MAZE_SIZE, depth: MAZE_WALL_WIDTH }, // Back
        { x: -MAZE_SIZE / 2, z: MAZE_SIZE / 2 - MAZE_WALL_WIDTH, width: MAZE_SIZE / 3, depth: MAZE_WALL_WIDTH }, // Front left
        { x: MAZE_SIZE / 6, z: MAZE_SIZE / 2 - MAZE_WALL_WIDTH, width: MAZE_SIZE / 3, depth: MAZE_WALL_WIDTH }, // Front right
        { x: -MAZE_SIZE / 2, z: -MAZE_SIZE / 2, width: MAZE_WALL_WIDTH, depth: MAZE_SIZE }, // Left
        { x: MAZE_SIZE / 2 - MAZE_WALL_WIDTH, z: -MAZE_SIZE / 2, width: MAZE_WALL_WIDTH, depth: MAZE_SIZE }, // Right

        // Interior walls with bigger gaps
        { x: -MAZE_SIZE / 4, z: -MAZE_SIZE / 4, width: MAZE_WALL_WIDTH, depth: MAZE_SIZE / 2.5 },
        { x: MAZE_SIZE / 4, z: MAZE_SIZE / 6, width: MAZE_WALL_WIDTH, depth: MAZE_SIZE / 2.5 },
    ];

    wallPattern.forEach(pattern => {
        const wallGeometry = new THREE.BoxGeometry(pattern.width, MAZE_WALL_HEIGHT, pattern.depth);
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(
            position.x + pattern.x,
            MAZE_WALL_HEIGHT / 2,
            position.z + pattern.z
        );
        scene.add(wall);
        walls.push(wall);
    });

    // Add treasure in center
    const treasureConfig = ITEM_CONFIGS.treasure;
    const treasureMaterial = new THREE.MeshStandardMaterial({
        color: treasureConfig.color,
        emissive: treasureConfig.emissive,
        emissiveIntensity: treasureConfig.emissiveIntensity,
        roughness: 0.2,
        metalness: 0.9,
    });

    const treasureMesh = new THREE.Mesh(itemGeometries.epic, treasureMaterial);
    treasureMesh.position.set(position.x, 0, position.z);
    scene.add(treasureMesh);

    const treasure: Item = {
        position: new THREE.Vector3(position.x, 0, position.z),
        mesh: treasureMesh,
        spawnTime: Date.now(),
        type: 'treasure',
        value: treasureConfig.value,
        growthAmount: treasureConfig.growthAmount,
    };

    return { position, walls, treasure };
}

function getRandomPosition(
    existingPositions: THREE.Vector3[],
    obstacles: Obstacle[],
    mazes: Maze[],
    minDistance = 3
): THREE.Vector3 | null {
    for (let attempts = 0; attempts < 50; attempts++) {
        const x = (Math.random() - 0.5) * (WORLD_BOUNDARY * 2 - 10);
        const z = (Math.random() - 0.5) * (WORLD_BOUNDARY * 2 - 10);
        const position = new THREE.Vector3(x, 0, z);

        // Check distance from existing positions
        const tooClose = existingPositions.some(pos => pos.distanceTo(position) < minDistance);
        if (tooClose) continue;

        // Check distance from obstacles
        const nearObstacle = obstacles.some(obs =>
            obs.position.distanceTo(position) < obs.radius + minDistance
        );
        if (nearObstacle) continue;

        // Check distance from mazes
        const nearMaze = mazes.some(maze =>
            Math.abs(maze.position.x - x) < MAZE_SIZE / 2 + minDistance &&
            Math.abs(maze.position.z - z) < MAZE_SIZE / 2 + minDistance
        );
        if (nearMaze) continue;

        return position;
    }

    return null;
}




