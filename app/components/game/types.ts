import * as THREE from 'three';

export type BotSnake = {
    position: THREE.Vector3;
    direction: THREE.Vector3;
    speed: number;
    baseSpeed: number;
    boostSpeed: number;
    turnSpeed: number;
    head: THREE.Group;
    trail: THREE.Vector3[];
    trailMesh: THREE.Mesh | null;
    light: THREE.PointLight;
    alive: boolean;
    length: number;
    boosting: boolean;
    boostCostTimer: number;
    boostCooldown: number;
};

export type ItemType = 'common' | 'uncommon' | 'rare' | 'epic';

export type Item = {
    position: THREE.Vector3;
    mesh: THREE.Mesh;
    spawnTime: number; // Timestamp for despawn logic
    type: ItemType;
    value: number; // Points given when collected
};

export type Tree = {
    position: THREE.Vector3;
    group: THREE.Group;
};

export type Obstacle = {
    position: THREE.Vector3;
    mesh: THREE.Mesh | THREE.Group;
    radius: number;
};

export type MultiplayerPlayer = {
    id: string;
    position: THREE.Vector3;
    targetPosition: THREE.Vector3; // For smooth interpolation
    direction: THREE.Vector3;
    targetDirection: THREE.Vector3; // For smooth interpolation
    head: THREE.Group;
    trail: THREE.Vector3[];
    trailMesh: THREE.Mesh | null;
    light: THREE.PointLight;
    length: number;
    color: string;
};

export type GameState = {
    snake: {
        position: THREE.Vector3;
        direction: THREE.Vector3;
        speed: number;
        baseSpeed: number;
        boostSpeed: number;
        turnSpeed: number;
        segments: (THREE.Mesh | THREE.Group)[];
        trail: THREE.Vector3[];
        trailMesh: THREE.Mesh | null;
        length: number;
        boosting: boolean;
        boostCostTimer: number;
        spawnFrameCount: number;
    };
    bots: BotSnake[];
    items: Item[];
    trees: Tree[];
    obstacles: Obstacle[];
    multiplayerPlayers: Map<string, MultiplayerPlayer>;
    keys: {
        left: boolean;
        right: boolean;
        boost: boolean;
    };
};

