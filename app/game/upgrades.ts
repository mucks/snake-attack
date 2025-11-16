import type { Upgrade, UpgradeType } from './types';

export const AVAILABLE_UPGRADES: Upgrade[] = [
    { id: 'speed_boost', name: 'Speed Demon', description: '+15% Base Speed', icon: '⚡' },
    { id: 'turn_master', name: 'Turn Master', description: '+20% Turn Speed', icon: '🌀' },
    { id: 'boost_efficiency', name: 'Efficient Boost', description: 'Boost costs 10% less', icon: '💨' },
    { id: 'item_magnet', name: 'Item Magnet', description: '2x Collection Range', icon: '🧲' },
    { id: 'vampire', name: 'Vampire', description: 'Gain 20% of killed snake length', icon: '🧛' },
    { id: 'thick_skin', name: 'Thick Skin', description: '1 Free Death (Shield)', icon: '🛡️' },
    { id: 'double_points', name: 'Double Points', description: '2x Score from items', icon: '💰' },
    { id: 'mega_boost', name: 'Mega Boost', description: '+10% Boost Speed', icon: '🚀' },
    { id: 'regeneration', name: 'Regeneration', description: 'Slowly gain length over time', icon: '💚' },
    { id: 'lucky_collector', name: 'Lucky Collector', description: 'Higher chance for rare items', icon: '🍀' },
    { id: 'tail_whip', name: 'Tail Whip', description: '50% longer tail safe zone', icon: '🦂' },
    { id: 'ghost_mode', name: 'Ghost Mode', description: 'Can pass through own tail', icon: '👻' },
];

export function getRandomUpgrades(count: number, exclude: UpgradeType[]): Upgrade[] {
    const available = AVAILABLE_UPGRADES.filter(u => !exclude.includes(u.id));
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function applyUpgradeToStats(
    upgrade: UpgradeType,
    stats: {
        baseSpeed: number;
        boostSpeed: number;
        turnSpeed: number;
        boostCostRate: number;
        collectionRadius: number;
    },
    activeUpgrades: UpgradeType[]
): typeof stats {
    const newStats = { ...stats };

    switch (upgrade) {
        case 'speed_boost':
            // Count how many times speed_boost has been applied
            const speedBoostCount = activeUpgrades.filter(u => u === 'speed_boost').length;
            if (speedBoostCount === 0) {
                newStats.baseSpeed *= 1.3;
            }
            break;
        case 'turn_master':
            newStats.turnSpeed *= 1.5;
            break;
        case 'boost_efficiency':
            newStats.boostCostRate *= 0.5;
            break;
        case 'item_magnet':
            newStats.collectionRadius *= 2;
            break;
        case 'mega_boost':
            newStats.boostSpeed *= 2;
            break;
    }

    return newStats;
}




