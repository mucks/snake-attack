import * as THREE from 'three';
import { BotSnake, GameState } from '../types';
import { BOT_COLORS, BOT_SPAWN_RADIUS_MIN, BOT_SPAWN_RADIUS_MAX, TARGET_BOT_COUNT } from '../constants';
import { createSnakeHead } from '../helpers/geometryHelpers';

export function createBot(startPos: THREE.Vector3, color: number, scene: THREE.Scene): BotSnake {
    const head = createSnakeHead(color);
    head.position.copy(startPos);
    head.scale.set(0.9, 0.9, 0.9);
    scene.add(head);

    const light = new THREE.PointLight(color, 1.5, 25);
    scene.add(light);

    const angle = Math.random() * Math.PI * 2;
    const direction = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).normalize();

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
        length: 20,
        boosting: false,
        boostCostTimer: 0,
        boostCooldown: 0,
    };
}

export function spawnSingleBot(gameState: GameState, scene: THREE.Scene): BotSnake {
    const angle = Math.random() * Math.PI * 2;
    const radius = BOT_SPAWN_RADIUS_MIN + Math.random() * (BOT_SPAWN_RADIUS_MAX - BOT_SPAWN_RADIUS_MIN);
    const spawnPos = new THREE.Vector3(
        Math.cos(angle) * radius,
        0.5,
        Math.sin(angle) * radius
    );
    const color = BOT_COLORS[gameState.bots.length % BOT_COLORS.length];
    const bot = createBot(spawnPos, color, scene);
    gameState.bots.push(bot);
    return bot;
}

export function removeSingleBot(gameState: GameState, scene: THREE.Scene, disposeTrailMesh: (mesh: any, scene: THREE.Scene) => void) {
    if (gameState.bots.length === 0) return;

    let botIndex = gameState.bots.findIndex(b => !b.alive);
    if (botIndex === -1) {
        botIndex = gameState.bots.length - 1;
    }

    const bot = gameState.bots[botIndex];
    if (bot) {
        scene.remove(bot.head);
        scene.remove(bot.light);
        if (bot.trailMesh) {
            disposeTrailMesh(bot.trailMesh, scene);
        }
        gameState.bots.splice(botIndex, 1);
    }
}

export function manageBotCount(
    gameState: GameState,
    scene: THREE.Scene,
    setBotsAlive: (count: number) => void
) {
    const currentBotCount = gameState.bots.length;

    if (currentBotCount < TARGET_BOT_COUNT) {
        const botsToAdd = TARGET_BOT_COUNT - currentBotCount;
        for (let i = 0; i < botsToAdd; i++) {
            spawnSingleBot(gameState, scene);
        }
        console.log(`Added ${botsToAdd} bots. Total bots: ${TARGET_BOT_COUNT}`);
    }

    const aliveCount = gameState.bots.filter(b => b.alive).length;
    setBotsAlive(aliveCount);
}

