import type { ItemConfig } from './types';

// World boundaries
export const WORLD_SIZE = 500; // Grid size will be WORLD_SIZE * 2 = 1000
export const WORLD_BOUNDARY = WORLD_SIZE;

// Game configuration
export const BASE_SPEED = 0.3; // Doubled from 0.15
export const BASE_BOOST_SPEED = 0.6; // Doubled from 0.3
export const BASE_TURN_SPEED = 0.06; // Slower turn speed
export const BOOST_COST_RATE = 1 / 30; // Length cost per frame while boosting
export const BOOST_COOLDOWN = 10; // Frames

// Item spawning
export const MAX_ITEMS = 200; // Abundant collectibles!
export const ITEM_SPAWN_INTERVAL = 60; // Frames between spawn checks
export const ITEM_AUTO_RESPAWN_INTERVAL = 300; // Every 5 seconds (60fps * 5)

// Level and upgrade
export const UPGRADE_LEVEL_INTERVAL = 50; // Upgrade every 50 levels

// Camera and rendering
export const CAMERA_DISTANCE = 25;
export const CAMERA_HEIGHT = 18;
export const FOG_NEAR = 30;
export const FOG_FAR = 400;
export const CAMERA_FAR_PLANE = 500;

// Collision detection
export const ITEM_COLLECTION_RADIUS = 2.0;
export const HEAD_COLLISION_DISTANCE = 1.0;

// Minimap
export const MINIMAP_SIZE = 180;
export const MINIMAP_PADDING = 20;
export const MINIMAP_SCALE = MINIMAP_SIZE / (WORLD_SIZE * 2);

// Trees and obstacles
export const MAX_TREES = 40;
export const MAX_OBSTACLES = 25;

// Mazes
export const MAZE_COUNT = 5;
export const MAZE_SIZE = 12;
export const MAZE_WALL_HEIGHT = 3;
export const MAZE_WALL_WIDTH = 0.8;

// Item configurations by rarity
export const ITEM_CONFIGS: Record<string, ItemConfig> = {
    common: {
        spawnChance: 0.70,
        value: 1,
        growthAmount: 1,
        color: 0xffff00,
        emissive: 0xffaa00,
        emissiveIntensity: 0.8,
        size: 0.4,
    },
    uncommon: {
        spawnChance: 0.20,
        value: 3,
        growthAmount: 3,
        color: 0x00ff00,
        emissive: 0x00aa00,
        emissiveIntensity: 1.0,
        size: 0.5,
    },
    rare: {
        spawnChance: 0.08,
        value: 5,
        growthAmount: 5,
        color: 0x0088ff,
        emissive: 0x0055ff,
        emissiveIntensity: 1.2,
        size: 0.6,
    },
    epic: {
        spawnChance: 0.02,
        value: 10,
        growthAmount: 8,
        color: 0xff00ff,
        emissive: 0xaa00aa,
        emissiveIntensity: 1.5,
        size: 0.7,
    },
    treasure: {
        spawnChance: 0,
        value: 50,
        growthAmount: 15,
        color: 0xff6600,
        emissive: 0xff3300,
        emissiveIntensity: 2.0,
        size: 0.8,
    },
};

// Colors
export const FLOOR_COLOR = 0x0a2a2a;
export const GRID_COLOR = 0x0d4d4d;

