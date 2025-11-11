import * as THREE from 'three';

export function createSnakeHead(color: number | THREE.Color): THREE.Group {
    const headGroup = new THREE.Group();
    const colorObj = typeof color === 'number' ? new THREE.Color(color) : color;

    // Main head - elongated ellipsoid shape
    const headGeometry = new THREE.CapsuleGeometry(0.35, 1.2, 7, 14);
    const headMaterial = new THREE.MeshStandardMaterial({
        color: colorObj,
        emissive: colorObj,
        emissiveIntensity: 0.5,
        metalness: 0.8,
        roughness: 0.2,
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.rotation.x = Math.PI / 2;
    headGroup.add(head);

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.15, 7, 7);
    const eyeMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.8,
        metalness: 0.3,
        roughness: 0.1,
    });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.25, 0.15, 0.5);
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.25, 0.15, 0.5);
    headGroup.add(rightEye);

    // Pupils
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

    // Snout
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
}

export function disposeTrailMesh(trailMesh: any, scene: THREE.Scene) {
    if (!trailMesh) return;

    try {
        scene.remove(trailMesh);

        if (trailMesh.traverse && typeof trailMesh.traverse === 'function') {
            trailMesh.traverse((child: any) => {
                if (!child) return;

                if (child instanceof THREE.Mesh) {
                    if (child.geometry) child.geometry.dispose();
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
}

export function updateTrailMesh(
    trail: THREE.Vector3[],
    currentMesh: THREE.Mesh | null,
    color: number,
    scene: THREE.Scene,
    lowDetail: boolean = false
): THREE.Mesh | null {
    if (trail.length < 2) return currentMesh;

    // Validate and filter trail points
    const validTrail = trail.filter(p => {
        if (!p) return false;
        if (typeof p.x !== 'number' || typeof p.y !== 'number' || typeof p.z !== 'number') return false;
        if (isNaN(p.x) || isNaN(p.y) || isNaN(p.z)) return false;
        if (!isFinite(p.x) || !isFinite(p.y) || !isFinite(p.z)) return false;
        return true;
    });

    // Remove duplicate consecutive points
    const uniqueTrail: THREE.Vector3[] = [];
    for (let i = 0; i < validTrail.length; i++) {
        if (i === 0 || i === validTrail.length - 1 || validTrail[i].distanceTo(validTrail[i - 1]) > 0.01) {
            uniqueTrail.push(validTrail[i]);
        }
    }

    if (uniqueTrail.length < 2) return currentMesh;

    try {
        // Final validation
        for (let i = 0; i < uniqueTrail.length; i++) {
            const point = uniqueTrail[i];
            if (!point || !(point instanceof THREE.Vector3) ||
                typeof point.x !== 'number' || typeof point.y !== 'number' || typeof point.z !== 'number' ||
                !isFinite(point.x) || !isFinite(point.y) || !isFinite(point.z)) {
                console.error('Invalid point in uniqueTrail at index', i, point);
                return currentMesh;
            }
        }

        // Create curve
        let curve;
        if (uniqueTrail.length === 2) {
            curve = new THREE.LineCurve3(uniqueTrail[0], uniqueTrail[1]);
        } else if (uniqueTrail.length === 3) {
            curve = new THREE.QuadraticBezierCurve3(uniqueTrail[0], uniqueTrail[1], uniqueTrail[2]);
        } else {
            curve = new THREE.CatmullRomCurve3(uniqueTrail, false, 'catmullrom', 0.3);
        }

        if (!curve || !curve.getPoint) {
            console.error('Failed to create valid curve');
            return currentMesh;
        }

        // Test curve validity
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

        const tubularSegments = Math.max(
            lowDetail ? Math.max(uniqueTrail.length, 20) : Math.max(uniqueTrail.length * 1.5, 30),
            3
        );
        const radialSegments = lowDetail ? 5 : 7;

        if (!isFinite(tubularSegments) || !isFinite(radialSegments) || tubularSegments < 3 || radialSegments < 3) {
            console.error('Invalid geometry segments:', tubularSegments, radialSegments);
            return currentMesh;
        }

        let tubeGeometry;
        try {
            tubeGeometry = new THREE.TubeGeometry(curve, Math.floor(tubularSegments), 0.4, Math.floor(radialSegments), false);

            if (!tubeGeometry || !tubeGeometry.attributes || !tubeGeometry.attributes.position) {
                console.error('TubeGeometry created but has invalid attributes');
                return currentMesh;
            }
        } catch (geometryError) {
            console.error('TubeGeometry creation failed:', geometryError, 'Trail points:', uniqueTrail.length);
            return currentMesh;
        }

        const trailMaterial = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.5,
            metalness: 0.8,
            roughness: 0.2,
        });

        const trailGroup = new THREE.Group();
        const tubeMesh = new THREE.Mesh(tubeGeometry, trailMaterial);
        trailGroup.add(tubeMesh);

        // Add spherical caps
        const capGeometry = new THREE.SphereGeometry(0.4, radialSegments, radialSegments);

        const startCap = new THREE.Mesh(capGeometry, trailMaterial);
        startCap.position.copy(uniqueTrail[uniqueTrail.length - 1]);
        trailGroup.add(startCap);

        const endCap = new THREE.Mesh(capGeometry, trailMaterial);
        endCap.position.copy(uniqueTrail[0]);
        trailGroup.add(endCap);

        scene.add(trailGroup);

        if (currentMesh) {
            disposeTrailMesh(currentMesh, scene);
        }

        return trailGroup as any;
    } catch (error) {
        console.error('Error creating trail mesh:', error, 'Trail length:', uniqueTrail.length);
        return currentMesh;
    }
}

