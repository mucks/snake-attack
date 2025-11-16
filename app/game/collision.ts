import * as THREE from 'three';
import type { Snake, Item, Obstacle, Maze, MultiplayerPlayer } from './types';
import { WORLD_BOUNDARY, ITEM_COLLECTION_RADIUS, MAZE_SIZE, MAZE_WALL_HEIGHT } from './constants';

export function checkBoundaryCollision(position: THREE.Vector3): boolean {
    return (
        position.x < -WORLD_BOUNDARY ||
        position.x > WORLD_BOUNDARY ||
        position.z < -WORLD_BOUNDARY ||
        position.z > WORLD_BOUNDARY
    );
}

export function checkItemCollection(
    snakePos: THREE.Vector3,
    items: Item[],
    collectionRadius: number = ITEM_COLLECTION_RADIUS
): Item | null {
    for (const item of items) {
        const distance = snakePos.distanceTo(item.position);
        if (distance < collectionRadius) {
            return item;
        }
    }
    return null;
}

export function checkObstacleCollision(snakePos: THREE.Vector3, obstacles: Obstacle[]): boolean {
    for (const obstacle of obstacles) {
        const distance = snakePos.distanceTo(obstacle.position);
        if (distance < obstacle.radius + 0.5) {
            return true;
        }
    }
    return false;
}

export function checkMazeCollision(snakePos: THREE.Vector3, mazes: Maze[]): boolean {
    for (const maze of mazes) {
        // Simple AABB collision for maze walls
        const mazeLeft = maze.position.x - MAZE_SIZE / 2;
        const mazeRight = maze.position.x + MAZE_SIZE / 2;
        const mazeTop = maze.position.z - MAZE_SIZE / 2;
        const mazeBottom = maze.position.z + MAZE_SIZE / 2;

        // Check if inside maze bounds
        if (
            snakePos.x >= mazeLeft &&
            snakePos.x <= mazeRight &&
            snakePos.z >= mazeTop &&
            snakePos.z <= mazeBottom
        ) {
            // Check collision with each wall
            for (const wall of maze.walls) {
                const wallBox = new THREE.Box3().setFromObject(wall);
                const snakeBox = new THREE.Box3().setFromCenterAndSize(
                    snakePos,
                    new THREE.Vector3(1, MAZE_WALL_HEIGHT, 1)
                );

                if (wallBox.intersectsBox(snakeBox)) {
                    return true;
                }
            }
        }
    }
    return false;
}

export function checkSelfCollision(snake: Snake): boolean {
    if (snake.trail.length < 20) return false;

    const headPos = snake.position;
    for (let i = 10; i < snake.trail.length - 1; i++) {
        const distance = headPos.distanceTo(snake.trail[i]);
        if (distance < 0.5) {
            return true;
        }
    }
    return false;
}

export function checkMultiplayerCollision(
    snakePos: THREE.Vector3,
    multiplayerPlayers: Map<string, MultiplayerPlayer>
): boolean {
    for (const [_, player] of multiplayerPlayers) {
        if (player.trail.length < 2) continue;

        // Check head-to-head collision
        const headDistance = snakePos.distanceTo(player.trail[0] || player.head?.position || new THREE.Vector3());
        if (headDistance < 1.0) {
            return true;
        }

        // Check trail collision
        for (let i = 5; i < player.trail.length; i++) {
            const distance = snakePos.distanceTo(player.trail[i]);
            if (distance < 0.8) {
                return true;
            }
        }
    }
    return false;
}




