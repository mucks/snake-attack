import * as THREE from 'three';
import { Item, GameState, ItemType } from '../types';
import { ITEM_TYPES } from '../constants';

// Determine item type based on spawn chances
function getRandomItemType(): ItemType {
    const rand = Math.random();
    let cumulative = 0;

    for (const [type, config] of Object.entries(ITEM_TYPES)) {
        cumulative += config.spawnChance;
        if (rand <= cumulative) {
            return type as ItemType;
        }
    }
    return 'common';
}

export function createItemGeometry(size: number): THREE.OctahedronGeometry {
    return new THREE.OctahedronGeometry(size, 0);
}

export function createItemMaterial(color: number, emissiveIntensity: number): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: emissiveIntensity,
        metalness: 0.8,
        roughness: 0.2,
    });
}

export function createItem(
    position: THREE.Vector3,
    scene: THREE.Scene,
    isFromDeadSnake = false,
    forceType?: ItemType
): Item {
    const itemType = forceType || getRandomItemType();
    const config = ITEM_TYPES[itemType];

    const geometry = createItemGeometry(config.size);
    const material = createItemMaterial(config.color, config.emissiveIntensity);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    scene.add(mesh);

    return {
        position: position.clone(),
        mesh: mesh,
        spawnTime: isFromDeadSnake ? Date.now() : 0,
        type: itemType,
        value: config.value,
    };
}

export function spawnItemsFromTrail(
    trail: THREE.Vector3[],
    scene: THREE.Scene,
    gameState: GameState
) {
    // Dead snakes drop common items
    for (let i = 0; i < trail.length; i += 3) {
        const item = createItem(trail[i], scene, true, 'common');
        gameState.items.push(item);
    }
}

export function spawnRandomItems(
    count: number,
    gridSize: number,
    scene: THREE.Scene,
    gameState: GameState
) {
    const boundary = (gridSize / 2) - 50;
    for (let i = 0; i < count; i++) {
        const pos = new THREE.Vector3(
            (Math.random() - 0.5) * boundary * 2,
            0.5,
            (Math.random() - 0.5) * boundary * 2
        );
        const item = createItem(pos, scene, false);
        gameState.items.push(item);
    }
}

export function checkItemCollection(
    position: THREE.Vector3,
    gameState: GameState,
    scene: THREE.Scene,
    onCollect: (item: Item) => void
): boolean {
    for (let i = gameState.items.length - 1; i >= 0; i--) {
        const item = gameState.items[i];
        const distance = position.distanceTo(item.position);

        if (distance < 2) {
            scene.remove(item.mesh);
            item.mesh.geometry.dispose();
            if (item.mesh.material) {
                if (Array.isArray(item.mesh.material)) {
                    item.mesh.material.forEach(m => m.dispose());
                } else {
                    item.mesh.material.dispose();
                }
            }
            gameState.items.splice(i, 1);
            onCollect(item);
            return true;
        }
    }
    return false;
}

