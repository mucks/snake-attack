import * as THREE from 'three';
import type { Snake, MultiplayerPlayer } from '../game/types';

export function updateSnakeTrailMesh(snake: Snake, scene: THREE.Scene): void {
    if (snake.trail.length < 2) return;

    // Dispose old mesh
    if (snake.trailMesh) {
        scene.remove(snake.trailMesh);
        snake.trailMesh.geometry.dispose();
        if (Array.isArray(snake.trailMesh.material)) {
            snake.trailMesh.material.forEach(m => m.dispose());
        } else {
            snake.trailMesh.material.dispose();
        }
    }

    // Create new tube mesh
    const curve = new THREE.CatmullRomCurve3(snake.trail);
    const tubeGeometry = new THREE.TubeGeometry(curve, snake.trail.length * 2, 0.4, 8, false);
    const tubeMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 0.3,
    });

    snake.trailMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
    scene.add(snake.trailMesh);
}

export function updateMultiplayerTrailMesh(player: MultiplayerPlayer, scene: THREE.Scene): void {
    if (player.trail.length < 2) return;

    const now = Date.now();
    const timeSinceUpdate = now - (player.lastMeshUpdateTime || 0);

    // Update every 33ms (~30Hz) for smooth trails regardless of FPS
    const shouldUpdateMesh = !player.trailSegments || timeSinceUpdate >= 33;

    if (shouldUpdateMesh) {
        player.lastMeshUpdateTime = now;

        let colorNum = 0xff00ff;
        if (player.color.startsWith('hsl')) {
            const hue = parseInt(player.color.match(/\d+/)?.[0] || '0');
            colorNum = new THREE.Color().setHSL(hue / 360, 0.7, 0.5).getHex();
        } else {
            colorNum = parseInt(player.color.replace('#', ''), 16) || 0xff00ff;
        }

        // Create sphere-based trail if it doesn't exist
        if (!player.trailSegments) {
            player.trailSegments = new THREE.Group();
            scene.add(player.trailSegments);

            // Create reusable sphere geometry and material
            const segmentGeometry = new THREE.SphereGeometry(0.4, 8, 8);
            const segmentMaterial = new THREE.MeshStandardMaterial({
                color: colorNum,
                emissive: colorNum,
                emissiveIntensity: 0.5,
            });

            // Create spheres for each segment
            for (let i = 0; i < player.trail.length; i++) {
                const sphere = new THREE.Mesh(segmentGeometry, segmentMaterial);
                sphere.position.copy(player.trail[i]);
                player.trailSegments.add(sphere);
            }
        } else {
            // Update existing spheres
            const spheres = player.trailSegments.children as THREE.Mesh[];

            // Add/remove spheres if trail length changed
            while (spheres.length < player.trail.length) {
                const sphere = spheres[0].clone();
                player.trailSegments.add(sphere);
            }
            while (spheres.length > player.trail.length) {
                const removed = player.trailSegments.children.pop();
                if (removed) {
                    player.trailSegments.remove(removed);
                    (removed as THREE.Mesh).geometry.dispose();
                    ((removed as THREE.Mesh).material as THREE.Material).dispose();
                }
            }

            // Update positions
            for (let i = 0; i < player.trail.length; i++) {
                if (spheres[i] && player.trail[i]) {
                    spheres[i].position.copy(player.trail[i]);
                }
            }
        }
    }
}

export function disposeMultiplayerPlayer(player: MultiplayerPlayer, scene: THREE.Scene): void {
    if (player.head) {
        scene.remove(player.head);
        player.head.traverse((child) => {
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

    if (player.trailSegments) {
        scene.remove(player.trailSegments);
        player.trailSegments.traverse((child) => {
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

    if (player.light) {
        scene.remove(player.light);
    }
}

export function rotateHeadTowardsDirection(
    head: THREE.Group,
    direction: THREE.Vector3
): void {
    if (direction.length() > 0.001) {
        const lookAtPoint = head.position.clone().add(direction);
        head.lookAt(lookAtPoint);
    }
}




