# Refactoring Guide - How to Use the New Modules

## ✅ What's Been Created

### Helper Modules
1. **`game/types.ts`** - All TypeScript types
2. **`game/constants.ts`** - Game configuration
3. **`game/helpers/geometryHelpers.ts`** - Snake & trail rendering
4. **`game/helpers/collisionHelpers.ts`** - Collision detection
5. **`game/helpers/itemHelpers.ts`** - Item management
6. **`game/helpers/treeHelpers.ts`** - Trees & obstacles
7. **`game/systems/botManagement.ts`** - Bot spawning & management

## 🔧 How to Update SnakeGame.tsx

### Step 1: Add Imports (Top of File)

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { io, Socket } from 'socket.io-client';

// Import new modules
import { GameState, BotSnake, Item, Tree, Obstacle, MultiplayerPlayer } from './game/types';
import { GRID_SIZE, GRID_DIVISIONS, MAX_VISIBLE_DISTANCE, FAR_DISTANCE, MEDIUM_DISTANCE, ITEM_DESPAWN_TIME, TARGET_BOT_COUNT, ACCENT_LIGHTS } from './game/constants';
import { createSnakeHead, updateTrailMesh, disposeTrailMesh } from './game/helpers/geometryHelpers';
import { checkCollision } from './game/helpers/collisionHelpers';
import { createItemGeometry, createItemMaterial, createItem, spawnItemsFromTrail, spawnRandomItems, checkItemCollection } from './game/helpers/itemHelpers';
import { createFractalTree, spawnTrees, spawnObstacles } from './game/helpers/treeHelpers';
import { createBot, spawnSingleBot, manageBotCount } from './game/systems/botManagement';
```

### Step 2: Replace Type Definitions

**REMOVE** lines 110-191 (all type definitions)  
**They're now imported** from `game/types.ts`

### Step 3: Replace Constants

**FIND:**
```typescript
const gridSize = 2000;
const gridDivisions = 200;
const TARGET_BOT_COUNT = 25;
```

**REPLACE WITH:**
```typescript
const gridSize = GRID_SIZE;
const gridDivisions = GRID_DIVISIONS;
```

### Step 4: Replace Function Calls

**FIND:** `const head = createSnakeHead(0x00ffff);`  
**ALREADY WORKS** - imported function

**FIND:** `createBot(startPos, color)`  
**REPLACE WITH:** `createBot(startPos, color, scene)`

**FIND:** `checkCollision(position, 10, trail)`  
**REPLACE WITH:** `checkCollision(position, 10, trail, gameState, gridSize)`

**FIND:** `spawnTrees(38)`  
**REPLACE WITH:** `spawnTrees(28, gridSize, scene, gameState)`

**FIND:** `spawnObstacles(5)`  
**REPLACE WITH:** `spawnObstacles(5, gridSize, scene, gameState)`

**FIND:** `disposeTrailMesh(mesh)`  
**REPLACE WITH:** `disposeTrailMesh(mesh, scene)`

**FIND:** `updateTrailMesh(trail, currentMesh, color, lowDetail)`  
**REPLACE WITH:** `updateTrailMesh(trail, currentMesh, color, scene, lowDetail)`

### Step 5: Remove Redundant Functions

**DELETE** these functions (now in helpers):
- Lines 197-267: `createSnakeHead()` 
- Lines 349-377: `disposeTrailMesh()`
- Lines 379-522: `updateTrailMesh()`
- Lines 524-562: `createBot()`
- Lines 564-582: `spawnSingleBot()`
- Lines 604-621: `manageBotCount()`
- Lines 689-707: `createItem()`
- Lines 709-955: Tree functions
- Lines 988-1068: `checkCollision()`

### Step 6: Update Item Creation

**FIND:** Near top of useEffect:
```typescript
const sharedItemGeometry = new THREE.OctahedronGeometry(0.4, 0);
const sharedItemMaterial = new THREE.MeshStandardMaterial({...});
```

**REPLACE WITH:**
```typescript
const sharedItemGeometry = createItemGeometry();
const sharedItemMaterial = createItemMaterial();
```

### Step 7: Update Item Collection

**FIND:**
```typescript
checkItemCollection(gameState.snake.position);
```

**REPLACE WITH:**
```typescript
checkItemCollection(gameState.snake.position, gameState, scene, () => {
    gameState.snake.length += 3;
    setScore(prev => prev + 10);
    setItemsCollected(prev => prev + 1);
});
```

## 📊 Expected Results

**Before Refactor:**
- SnakeGame.tsx: 2,358 lines
- Single massive file
- Hard to navigate

**After Refactor:**
- SnakeGame.tsx: ~800-1000 lines (imports + game loop + Socket.IO)
- 7 helper modules: ~800 lines
- Much easier to maintain!

## 🧪 Testing

After making changes:
1. Run `pnpm dev`
2. Test basic gameplay (movement, items, collisions)
3. Test bot spawning (should see 25 bots)
4. Test death/respawn
5. Check console for errors

## 💡 Benefits

- **Findability**: "Where's collision code?" → `collision Helpers.ts`
- **Testability**: Each helper can be unit tested
- **Reusability**: Use helpers in other game modes
- **Readability**: Main file focuses on game loop
- **Team Work**: Multiple people can work on different modules

## 🚀 Next Phase (Optional)

If you want to go further:
1. Extract bot AI to `systems/botAI.ts` (~200 lines)
2. Extract Socket.IO handlers to `helpers/networkHelpers.ts` (~150 lines)
3. Extract HUD to `ui/HUD.tsx` (~100 lines)
4. Extract game loop to `systems/gameLoop.ts` (~300 lines)

This would reduce main component to ~200-300 lines!

