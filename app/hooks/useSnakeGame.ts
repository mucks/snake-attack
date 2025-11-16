import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Client, Room } from 'colyseus.js';
import type { GameState as ColyseusGameState, Player } from '../../colyseus-server/schema/GameState';
import type { Snake, MultiplayerPlayer, Item, Tree, Obstacle, Maze, MinimapData, LeaderboardEntry, UpgradeType, Upgrade } from '../game/types';
import {
    BASE_SPEED,
    BASE_BOOST_SPEED,
    BASE_TURN_SPEED,
    BOOST_COST_RATE,
    BOOST_COOLDOWN,
    WORLD_BOUNDARY,
    ITEM_COLLECTION_RADIUS,
    MAX_ITEMS,
    ITEM_SPAWN_INTERVAL,
    MAX_TREES,
    MAX_OBSTACLES,
    MAZE_COUNT,
    CAMERA_DISTANCE,
    CAMERA_HEIGHT,
    UPGRADE_LEVEL_INTERVAL,
} from '../game/constants';
import { getRandomUpgrades, applyUpgradeToStats, AVAILABLE_UPGRADES } from '../game/upgrades';
import {
    createScene,
    createCamera,
    createRenderer,
    createFloor,
    createBoundaryWalls,
    createSnakeHead,
    createMultiplayerHead,
} from '../three/sceneSetup';
import {
    updateSnakeTrailMesh,
    updateMultiplayerTrailMesh,
    disposeMultiplayerPlayer,
    rotateHeadTowardsDirection,
} from '../three/renderingUtils';
import { spawnItem, spawnTree, spawnObstacle, spawnMaze } from '../utils/spawning';

export function useSnakeGame(containerRef: React.RefObject<HTMLDivElement>, isActive?: boolean) {
    // State
    const [score, setScore] = useState(0);
    const [itemsCollected, setItemsCollected] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [playersOnline, setPlayersOnline] = useState(1);
    const [isBoosting, setIsBoosting] = useState(false);
    const [fps, setFps] = useState(60);
    const [spawned, setSpawned] = useState(false);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [level, setLevel] = useState(0);
    const [showUpgradeChoice, setShowUpgradeChoice] = useState(false);
    const [upgradeOptions, setUpgradeOptions] = useState<Upgrade[]>([]);
    const [activeUpgrades, setActiveUpgrades] = useState<UpgradeType[]>([]);

    // Refs
    const isFocusedRef = useRef(false);
    const showUpgradeChoiceRef = useRef(false);
    const upgradeOptionsRef = useRef<Upgrade[]>([]);
    const minimapDataRef = useRef<MinimapData>({
        playerPos: { x: 0, z: 0 },
        playerDirection: { x: 0, z: -1 },
        multiplayerPlayers: [],
        treasures: [],
        mazes: [],
    });

    const gameStateRef = useRef({
        isRunning: false,
        score: 0,
        gameOver: false,
        spawned: false,
        lastLevelUp: 0,
        hasShield: false,
    });

    // Three.js and Colyseus refs
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const roomRef = useRef<Room<ColyseusGameState> | null>(null);
    const myPlayerIdRef = useRef<string | null>(null);

    // Game object refs
    const snakeRef = useRef<Snake | null>(null);
    const itemsRef = useRef<Item[]>([]);
    const treesRef = useRef<Tree[]>([]);
    const obstaclesRef = useRef<Obstacle[]>([]);
    const mazesRef = useRef<Maze[]>([]);
    const multiplayerPlayersRef = useRef<Map<string, MultiplayerPlayer>>(new Map());

    // Sync refs with state
    useEffect(() => {
        showUpgradeChoiceRef.current = showUpgradeChoice;
        upgradeOptionsRef.current = upgradeOptions;
    }, [showUpgradeChoice, upgradeOptions]);

    useEffect(() => {
        const shouldBeFocused = isActive ?? true;
        isFocusedRef.current = shouldBeFocused;
    }, [isActive]);

    // Upgrade selection handler
    const selectUpgrade = (index: number) => {
        if (index >= 0 && index < upgradeOptionsRef.current.length) {
            const upgrade = upgradeOptionsRef.current[index];
            setActiveUpgrades(prev => [...prev, upgrade.id]);
            if (upgrade.id === 'thick_skin') {
                gameStateRef.current.hasShield = true;
            }
            setShowUpgradeChoice(false);
            showUpgradeChoiceRef.current = false;

            // Apply upgrade to snake stats
            if (snakeRef.current) {
                const newStats = applyUpgradeToStats(
                    upgrade.id,
                    {
                        baseSpeed: snakeRef.current.baseSpeed,
                        boostSpeed: snakeRef.current.boostSpeed,
                        turnSpeed: snakeRef.current.turnSpeed,
                        boostCostRate: BOOST_COST_RATE,
                        collectionRadius: ITEM_COLLECTION_RADIUS,
                    },
                    activeUpgrades
                );

                snakeRef.current.baseSpeed = newStats.baseSpeed;
                snakeRef.current.boostSpeed = newStats.boostSpeed;
                snakeRef.current.turnSpeed = newStats.turnSpeed;
            }
        }
    };

    const restart = () => {
        setGameOver(false);
        gameStateRef.current.gameOver = false;
        setScore(0);
        setItemsCollected(0);
        setLevel(0);
        setActiveUpgrades([]);
        gameStateRef.current.hasShield = false;
        gameStateRef.current.lastLevelUp = 0;

        // Send spawn message to server
        if (roomRef.current) {
            roomRef.current.send('spawn');
        }

        if (snakeRef.current) {
            snakeRef.current.alive = true;
            snakeRef.current.trail = [];
            snakeRef.current.length = 5;
        }

        setSpawned(true);
        gameStateRef.current.spawned = true;
        gameStateRef.current.isRunning = true;
    };

    return {
        // State
        score,
        itemsCollected,
        gameOver,
        playersOnline,
        isBoosting,
        fps,
        spawned,
        leaderboard,
        isLoading,
        level,
        showUpgradeChoice,
        upgradeOptions,
        activeUpgrades,
        minimapData: minimapDataRef.current,

        // Actions
        selectUpgrade,
        restart,

        // Refs (for game loop)
        gameStateRef,
        sceneRef,
        cameraRef,
        rendererRef,
        roomRef,
        myPlayerIdRef,
        snakeRef,
        itemsRef,
        treesRef,
        obstaclesRef,
        mazesRef,
        multiplayerPlayersRef,
        isFocusedRef,
    };
}




