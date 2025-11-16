import * as THREE from 'three';
import {
    WORLD_SIZE,
    FLOOR_COLOR,
    GRID_COLOR,
    CAMERA_DISTANCE,
    CAMERA_HEIGHT,
    FOG_NEAR,
    FOG_FAR,
    CAMERA_FAR_PLANE,
} from '../game/constants';

export function createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x001a1a);
    scene.fog = new THREE.Fog(0x001a1a, FOG_NEAR, FOG_FAR);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    return scene;
}

export function createCamera(aspect: number): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, CAMERA_FAR_PLANE);
    camera.position.set(0, CAMERA_HEIGHT, CAMERA_DISTANCE);
    return camera;
}

export function createRenderer(container: HTMLDivElement): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    return renderer;
}

export function createFloor(scene: THREE.Scene): void {
    const floorGeometry = new THREE.PlaneGeometry(WORLD_SIZE * 2, WORLD_SIZE * 2, 50, 50);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: FLOOR_COLOR,
        roughness: 0.8,
        metalness: 0.2,
        transparent: true,
        opacity: 0.9,
        emissive: 0x001a1a,
        emissiveIntensity: 0.2,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.51;
    scene.add(floor);

    // Grid lines
    const gridHelper = new THREE.GridHelper(WORLD_SIZE * 2, 50, GRID_COLOR, GRID_COLOR);
    gridHelper.position.y = -0.5;
    gridHelper.material = new THREE.LineBasicMaterial({
        transparent: true,
        opacity: 0.3,
    });
    scene.add(gridHelper);
}

export function createBoundaryWalls(scene: THREE.Scene): void {
    const wallHeight = 5;
    const wallThickness = 1;
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.3,
    });

    const boundaries = [
        // North wall
        {
            width: WORLD_SIZE * 2,
            height: wallHeight,
            depth: wallThickness,
            x: 0,
            y: wallHeight / 2,
            z: -WORLD_SIZE,
        },
        // South wall
        {
            width: WORLD_SIZE * 2,
            height: wallHeight,
            depth: wallThickness,
            x: 0,
            y: wallHeight / 2,
            z: WORLD_SIZE,
        },
        // East wall
        {
            width: wallThickness,
            height: wallHeight,
            depth: WORLD_SIZE * 2,
            x: WORLD_SIZE,
            y: wallHeight / 2,
            z: 0,
        },
        // West wall
        {
            width: wallThickness,
            height: wallHeight,
            depth: WORLD_SIZE * 2,
            x: -WORLD_SIZE,
            y: wallHeight / 2,
            z: 0,
        },
    ];

    boundaries.forEach(wall => {
        const geometry = new THREE.BoxGeometry(wall.width, wall.height, wall.depth);
        const mesh = new THREE.Mesh(geometry, wallMaterial);
        mesh.position.set(wall.x, wall.y, wall.z);
        scene.add(mesh);
    });
}

export function createSnakeHead(): THREE.Group {
    const head = new THREE.Group();

    // Head sphere
    const headGeometry = new THREE.SphereGeometry(0.6, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 0.5,
    });
    const headMesh = new THREE.Mesh(headGeometry, headMaterial);
    head.add(headMesh);

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.25, 0.2, 0.4);
    head.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.25, 0.2, 0.4);
    head.add(rightEye);

    // Pupils
    const pupilGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    leftPupil.position.set(-0.25, 0.2, 0.5);
    head.add(leftPupil);

    const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    rightPupil.position.set(0.25, 0.2, 0.5);
    head.add(rightPupil);

    return head;
}

export function createMultiplayerHead(color: string): THREE.Group {
    const head = new THREE.Group();

    let colorNum = 0xff00ff;
    if (color.startsWith('hsl')) {
        const hue = parseInt(color.match(/\d+/)?.[0] || '0');
        colorNum = new THREE.Color().setHSL(hue / 360, 0.7, 0.5).getHex();
    } else {
        colorNum = parseInt(color.replace('#', ''), 16) || 0xff00ff;
    }

    const headGeometry = new THREE.SphereGeometry(0.6, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({
        color: colorNum,
        emissive: colorNum,
        emissiveIntensity: 0.5,
    });
    const headMesh = new THREE.Mesh(headGeometry, headMaterial);
    head.add(headMesh);

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.25, 0.2, 0.4);
    head.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.25, 0.2, 0.4);
    head.add(rightEye);

    return head;
}




