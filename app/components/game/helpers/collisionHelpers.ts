import * as THREE from 'three';
import { GameState } from '../types';

export function checkCollision(
    position: THREE.Vector3,
    skipTrailCount: number = 10,
    ownTrail: THREE.Vector3[] | undefined,
    gameState: GameState,
    gridSize: number
): boolean {
    // Check boundaries
    const boundary = gridSize / 2 - 2;
    if (
        Math.abs(position.x) > boundary ||
        Math.abs(position.z) > boundary
    ) {
        return true;
    }

    const collisionDistance = 1.2;
    const collisionDistanceSq = collisionDistance * collisionDistance;

    // Check tree collisions
    const treeCollisionDistance = 3;
    const treeCollisionDistanceSq = treeCollisionDistance * treeCollisionDistance;

    for (const tree of gameState.trees) {
        if (!tree.group.visible) continue;
        const distanceSq = position.distanceToSquared(tree.position);
        if (distanceSq < treeCollisionDistanceSq) {
            return true;
        }
    }

    // Check obstacle collisions
    for (const obstacle of gameState.obstacles) {
        if (!obstacle.mesh.visible) continue;
        const distanceSq = position.distanceToSquared(obstacle.position);
        const collisionRadiusSq = obstacle.radius * obstacle.radius;
        if (distanceSq < collisionRadiusSq) {
            return true;
        }
    }

    // Check player trail collision
    const playerTrailToCheck = ownTrail === gameState.snake.trail
        ? gameState.snake.trail.slice(0, -skipTrailCount)
        : gameState.snake.trail;

    for (let i = 0; i < playerTrailToCheck.length; i += 3) {
        const segment = playerTrailToCheck[i];
        const distanceSq = position.distanceToSquared(segment);
        if (distanceSq < collisionDistanceSq) {
            return true;
        }
    }

    // Check bot trails
    for (const bot of gameState.bots) {
        if (!bot.alive || !bot.head.visible) continue;

        const botTrailToCheck = ownTrail === bot.trail
            ? bot.trail.slice(0, -skipTrailCount)
            : bot.trail;

        for (let i = 0; i < botTrailToCheck.length; i += 3) {
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
}

