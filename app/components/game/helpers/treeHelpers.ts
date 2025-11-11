import * as THREE from 'three';
import { Tree, Obstacle, GameState } from '../types';
import { TREE_COLORS } from '../constants';

// Shared geometries for tree branches (cache for reuse)
const treeBranchGeometryCache = new Map<string, THREE.CylinderGeometry>();

function getTreeBranchGeometry(length: number, thickness: number): THREE.CylinderGeometry {
    const key = `${Math.round(length * 10)}_${Math.round(thickness * 100)}`;
    if (!treeBranchGeometryCache.has(key)) {
        treeBranchGeometryCache.set(key, new THREE.CylinderGeometry(thickness, thickness * 0.7, length, 4));
    }
    return treeBranchGeometryCache.get(key)!;
}

function createFractalBranch(
    startPos: THREE.Vector3,
    direction: THREE.Vector3,
    length: number,
    thickness: number,
    depth: number,
    color: THREE.Color,
    group: THREE.Group
) {
    if (depth <= 0 || length < 0.5) return;

    const endPos = startPos.clone().add(direction.clone().multiplyScalar(length));

    const geometry = getTreeBranchGeometry(length, thickness);
    const material = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.3,
        metalness: 0.7,
        roughness: 0.3,
    });

    const branch = new THREE.Mesh(geometry, material);
    branch.position.copy(startPos).add(direction.clone().multiplyScalar(length / 2));
    branch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());

    group.add(branch);

    if (depth > 1) {
        const numBranches = 2 + Math.floor(Math.random() * 2);
        const angleSpread = Math.PI / 3;

        for (let i = 0; i < numBranches; i++) {
            const angle = (i / numBranches) * Math.PI * 2;
            const tiltAngle = angleSpread * (0.5 + Math.random() * 0.5);

            const axis = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle));
            const newDirection = direction.clone()
                .applyAxisAngle(axis, tiltAngle)
                .normalize();

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
    }
}

export function createFractalTree(position: THREE.Vector3, scene: THREE.Scene): Tree {
    const group = new THREE.Group();

    const color = TREE_COLORS[Math.floor(Math.random() * TREE_COLORS.length)];
    const colorObj = new THREE.Color(color);
    const height = 6 + Math.random() * 4;
    const initialDirection = new THREE.Vector3(0, 1, 0);

    createFractalBranch(
        new THREE.Vector3(0, 0, 0),
        initialDirection,
        height,
        0.5,
        4,
        colorObj,
        group
    );

    group.position.set(position.x, 0, position.z);
    scene.add(group);

    return {
        position: position.clone(),
        group: group,
    };
}

export function spawnTrees(count: number, gridSize: number, scene: THREE.Scene, gameState: GameState) {
    const boundary = (gridSize / 2) - 100;
    const minDistance = 80;

    for (let i = 0; i < count; i++) {
        let pos: THREE.Vector3;
        let attempts = 0;

        do {
            pos = new THREE.Vector3(
                (Math.random() - 0.5) * boundary * 2,
                0,
                (Math.random() - 0.5) * boundary * 2
            );
            attempts++;
        } while (pos.length() < minDistance && attempts < 10);

        const tree = createFractalTree(pos, scene);
        gameState.trees.push(tree);
    }
}

export function spawnObstacles(count: number, gridSize: number, scene: THREE.Scene, gameState: GameState) {
    const sharedTorusGeometry = new THREE.TorusGeometry(8, 1.5, 4, 8);
    const sharedTorusMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 0.4,
        metalness: 0.9,
        roughness: 0.1,
        transparent: true,
        opacity: 0.8,
    });

    const boundary = (gridSize / 2) - 150;
    const minDistance = 100;

    for (let i = 0; i < count; i++) {
        let pos: THREE.Vector3;
        let attempts = 0;

        do {
            pos = new THREE.Vector3(
                (Math.random() - 0.5) * boundary * 2,
                0,
                (Math.random() - 0.5) * boundary * 2
            );
            attempts++;
        } while (pos.length() < minDistance && attempts < 10);

        const mesh = new THREE.Mesh(sharedTorusGeometry, sharedTorusMaterial);
        mesh.position.set(pos.x, 5, pos.z);
        mesh.rotation.x = Math.PI / 2;
        scene.add(mesh);

        gameState.obstacles.push({
            position: new THREE.Vector3(pos.x, 5, pos.z),
            mesh: mesh,
            radius: 9,
        });
    }
}

