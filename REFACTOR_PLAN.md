# Snake Game Refactor Plan

## New File Structure

```
app/components/
├── game/
│   ├── types.ts                    ✅ Type definitions
│   ├── constants.ts                ✅ Game constants
│   ├── helpers/
│   │   ├── geometryHelpers.ts      - Snake head, trail mesh creation
│   │   ├── collisionHelpers.ts     - Collision detection logic
│   │   ├── itemHelpers.ts          - Item spawning and collection
│   │   ├── treeHelpers.ts          - Tree creation
│   │   └── networkHelpers.ts       - Socket.IO handlers
│   ├── systems/
│   │   ├── botAI.ts                - Bot AI behavior
│   │   ├── botManagement.ts        - Bot spawning/management
│   │   └── cameraSystem.ts         - Camera follow logic
│   └── ui/
│       ├── HUD.tsx                 - Game HUD components
│       └── LoadingScreen.tsx       - Loading screen
├── SnakeGame.tsx                   - Main game component (simplified)
└── MultiplayerTest.tsx

## Benefits

1. **Maintainability**: Each file has a single responsibility
2. **Reusability**: Helpers can be used across different game modes
3. **Testability**: Individual functions can be unit tested
4. **Readability**: Much easier to find and understand code
5. **Performance**: No impact - same runtime code

## Migration Strategy

1. Create all helper files ✅ Types, Constants
2. Extract pure functions (geometry, collision, etc.)
3. Extract bot AI system
4. Extract UI components
5. Simplify main SnakeGame.tsx
6. Test and verify everything works

