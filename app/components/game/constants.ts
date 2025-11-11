export const GRID_SIZE = 2000;
export const GRID_DIVISIONS = 200;

export const TARGET_BOT_COUNT = 25;

export const BOT_SPAWN_RADIUS_MIN = 30;
export const BOT_SPAWN_RADIUS_MAX = 300;

export const BOT_RESPAWN_RADIUS_MIN = 40;
export const BOT_RESPAWN_RADIUS_MAX = 250;

export const MAX_VISIBLE_DISTANCE = 200;
export const FAR_DISTANCE = 120;
export const MEDIUM_DISTANCE = 70;

export const ITEM_DESPAWN_TIME = 3000; // 3 seconds

// Item types and their properties
export const ITEM_TYPES = {
    common: {
        color: 0xffff00,      // Yellow
        value: 1,
        growthAmount: 3,
        spawnChance: 0.70,    // 70% chance
        size: 0.4,
        emissiveIntensity: 0.8,
    },
    uncommon: {
        color: 0x00ff00,      // Green
        value: 3,
        growthAmount: 5,
        spawnChance: 0.20,    // 20% chance
        size: 0.5,
        emissiveIntensity: 1.0,
    },
    rare: {
        color: 0x0088ff,      // Blue
        value: 5,
        growthAmount: 8,
        spawnChance: 0.08,    // 8% chance
        size: 0.6,
        emissiveIntensity: 1.2,
    },
    epic: {
        color: 0xff00ff,      // Magenta
        value: 10,
        growthAmount: 15,
        spawnChance: 0.02,    // 2% chance
        size: 0.7,
        emissiveIntensity: 1.5,
    },
} as const;

export const BOT_COLORS = [
    0xff0088, 0xff8800, 0x88ff00, 0xff00ff,
    0x00ffff, 0xff0000, 0x0088ff, 0x88ff88
];

export const TREE_COLORS = [
    0xff00ff, // Magenta
    0x00ffff, // Cyan
    0xff0088, // Pink
    0x88ff00, // Lime
    0xff8800, // Orange
    0x0088ff, // Blue
    0x8800ff, // Purple
    0xffff00, // Yellow
];

export const ACCENT_LIGHTS = [
    { color: 0xff00ff, pos: [400, 20, 0] as [number, number, number] },
    { color: 0x00ffff, pos: [-400, 20, 0] as [number, number, number] },
];

