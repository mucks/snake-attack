# New Collectible System 🎁

## Overview

The game now features **4 different collectible types** with varying rarities, sizes, colors, and values!

## Collectible Types

### 1. **Common (Yellow)** ⭐
- **Color**: Bright Yellow (#FFFF00)
- **Size**: 0.4 units
- **Spawn Chance**: 70%
- **Point Value**: 1 (×10 = 10 points)
- **Growth**: +3 length
- **Most common** - you'll see these everywhere!

### 2. **Uncommon (Green)** ⭐⭐
- **Color**: Bright Green (#00FF00)
- **Size**: 0.5 units (25% bigger)
- **Spawn Chance**: 20%
- **Point Value**: 3 (×10 = 30 points)
- **Growth**: +5 length
- **Noticeably larger** - worth chasing!

### 3. **Rare (Blue)** ⭐⭐⭐
- **Color**: Bright Blue (#0088FF)
- **Size**: 0.6 units (50% bigger)
- **Spawn Chance**: 8%
- **Point Value**: 5 (×10 = 50 points)
- **Growth**: +8 length
- **Significantly larger** - definitely chase these!

### 4. **Epic (Magenta)** ⭐⭐⭐⭐
- **Color**: Bright Magenta (#FF00FF)
- **Size**: 0.7 units (75% bigger!)
- **Spawn Chance**: 2%
- **Point Value**: 10 (×10 = 100 points!)
- **Growth**: +15 length
- **Huge and glowing** - extremely rare, game-changing!

## Spawn Distribution

### Initial Spawn: **80 collectibles** (was 30)
- ~56 Common (Yellow)
- ~16 Uncommon (Green)
- ~6 Rare (Blue)
- ~2 Epic (Magenta)

### From Dead Snakes
- All items from dead players/bots are **Common (Yellow)**
- Still despawn after 3 seconds
- Creates feeding frenzy opportunities!

## Visual Differences

Each type has:
- **Different size** - easier to spot rare items
- **Different color** - instant recognition
- **Different glow intensity** - epic items glow brightest

## Strategic Gameplay

### Early Game (Small Snake)
- Focus on **common items** (safe, consistent growth)
- Avoid rare items if dangerous (not worth the risk when small)

### Mid Game (Medium Snake)
- Start chasing **uncommon/rare** items
- Better risk/reward ratio

### Late Game (Large Snake)
- Hunt for **epic items** aggressively!
- 100 points + 15 length can be game-changing
- Use boost to secure rare spawns

## Technical Implementation

### Files Modified:
1. **`game/types.ts`** - Added ItemType, value prop
2. **`game/constants.ts`** - ITEM_TYPES config
3. **`game/helpers/itemHelpers.ts`** - Multi-type spawning
4. **`SnakeGame.tsx`** - Updated collection logic, 80 item spawns

### Spawn Algorithm:
```typescript
Random 0.0-1.0:
  0.00-0.02 → Epic (2%)
  0.02-0.10 → Rare (8%)
  0.10-0.30 → Uncommon (20%)
  0.30-1.00 → Common (70%)
```

## Balance Notes

- **Total spawn increased**: 30 → 80 items (167% more!)
- **Map feels alive** with collectibles everywhere
- **Rarity creates excitement** when spotting blue/magenta
- **Strategic choices** - risk vs reward
- **Fair progression** - still 70% common for consistent growth

## Future Ideas

- **Super Rare** (0.5% chance, 1000 points)
- **Temporary power-ups** (speed boost, invincibility)
- **Collectible trails** showing recent pickups
- **Sound effects** for rare item collection
- **Particle effects** on epic items

Enjoy the hunt! 🎮✨

