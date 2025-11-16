import * as THREE from 'three';

// Upgrade types
export type UpgradeType =
    | 'speed_boost'
    | 'turn_master'
    | 'boost_efficiency'
    | 'item_magnet'
    | 'vampire'
    | 'thick_skin'
    | 'double_points'
    | 'mega_boost'
    | 'regeneration'
    | 'lucky_collector'
    | 'tail_whip'
    | 'ghost_mode';

export type Upgrade = {
    id: UpgradeType;
    name: string;
    description: string;
    icon: string;
};

// Multiplayer player type
export type MultiplayerPlayer = {
    id: string;
    position: THREE.Vector3;
    targetPosition: THREE.Vector3;
    direction: THREE.Vector3;
    targetDirection: THREE.Vector3;
    head: THREE.Group;
    tail: THREE.Vector3[]; // Server-authoritative tail segments
    tailMesh: THREE.Mesh | THREE.Group | null; // Client-side rendering mesh (Group contains tube + cap)
    light: THREE.PointLight;
    length: number;
    color: string;
    velocity?: THREE.Vector3; // For prediction
    lastUpdateTime?: number; // For extrapolation timing
};

// Item type with rarity and value support
export type Item = {
    id?: string; // Server item ID (for maze treasures)
    position: THREE.Vector3;
    mesh: THREE.Mesh;
    spawnTime: number;
    type: 'common' | 'uncommon' | 'rare' | 'epic' | 'treasure';
    value: number;
};

export type ItemConfig = {
    spawnChance: number;
    value: number;
    growthAmount: number;
    color: number;
    emissive: number;
    emissiveIntensity: number;
    size: number;
};

// Tree type
export type Tree = {
    position: THREE.Vector3;
    group: THREE.Group;
};

// Obstacle type
export type Obstacle = {
    position: THREE.Vector3;
    mesh: THREE.Mesh | THREE.Group;
    radius: number;
};

// Maze type
export type Maze = {
    position: THREE.Vector3;
    walls: THREE.Mesh[];
    treasure?: Item;
};

// Snake type (player's snake)
export type Snake = {
    position: THREE.Vector3;
    direction: THREE.Vector3;
    speed: number;
    baseSpeed: number;
    boostSpeed: number;
    turnSpeed: number;
    head: THREE.Group;
    tail: THREE.Vector3[]; // Server-authoritative tail segments
    tailMesh: THREE.Mesh | THREE.Group | null; // Client-side rendering mesh (Group contains tube + cap)
    light: THREE.PointLight;
    alive: boolean;
    length: number;
    boosting: boolean;
    boostCostTimer: number;
    boostCooldown: number;
    spawnFrameCount: number;
};

// Game state type
export type GameState = {
    isRunning: boolean;
    score: number;
    gameOver: boolean;
    spawned: boolean;
    lastLevelUp: number;
    hasShield: boolean;
    snake: Snake;
    items: Item[];
    trees: Tree[];
    obstacles: Obstacle[];
    mazes: Maze[];
    multiplayerPlayers: Map<string, MultiplayerPlayer>;
};

// Minimap data type
export type MinimapData = {
    playerPos: { x: number; z: number };
    playerDirection: { x: number; z: number };
    multiplayerPlayers: Array<{ x: number; z: number }>;
    treasures: Array<{ x: number; z: number }>;
    mazes: Array<{ x: number; z: number }>;
};

// Leaderboard entry type
export type LeaderboardEntry = {
    name: string;
    length: number;
    isMe: boolean;
    color: string;
};

