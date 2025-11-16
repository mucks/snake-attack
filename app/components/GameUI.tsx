import type { LeaderboardEntry, Upgrade, UpgradeType } from '../game/types';

type GameUIProps = {
    score: number;
    itemsCollected: number;
    level: number;
    fps: number;
    playersOnline: number;
    isBoosting: boolean;
    gameOver: boolean;
    spawned: boolean;
    leaderboard: LeaderboardEntry[];
    showUpgradeChoice: boolean;
    upgradeOptions: Upgrade[];
    activeUpgrades: UpgradeType[];
    onSelectUpgrade: (index: number) => void;
    onRestart: () => void;
};

export default function GameUI({
    score,
    itemsCollected,
    level,
    fps,
    playersOnline,
    isBoosting,
    gameOver,
    spawned,
    leaderboard,
    showUpgradeChoice,
    upgradeOptions,
    activeUpgrades,
    onSelectUpgrade,
    onRestart,
}: GameUIProps) {
    return (
        <>
            {/* Top Stats Bar */}
            <div
                style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    color: 'white',
                    fontFamily: 'monospace',
                    fontSize: '18px',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    padding: '15px 20px',
                    borderRadius: '10px',
                    zIndex: 10,
                }}
            >
                <div>🏆 Score: {score.toFixed(0)}</div>
                <div>⭐ Level: {level}</div>
                <div>👥 Online: {playersOnline}</div>
                <div style={{ fontSize: '14px', opacity: 0.7 }}>FPS: {fps}</div>
            </div>

            {/* Boost Indicator */}
            {isBoosting && spawned && !gameOver && (
                <div
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        color: '#ffaa00',
                        fontFamily: 'monospace',
                        fontSize: '24px',
                        fontWeight: 'bold',
                        backgroundColor: 'rgba(255, 170, 0, 0.2)',
                        padding: '10px 20px',
                        borderRadius: '10px',
                        border: '2px solid #ffaa00',
                        animation: 'pulse 0.5s ease-in-out infinite',
                        zIndex: 10,
                    }}
                >
                    🚀 BOOST!
                </div>
            )}

            {/* Leaderboard */}
            {spawned && !gameOver && (
                <div
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        color: 'white',
                        fontFamily: 'monospace',
                        fontSize: '14px',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        padding: '15px',
                        borderRadius: '10px',
                        minWidth: '200px',
                        zIndex: 10,
                    }}
                >
                    <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>
                        🏆 Leaderboard
                    </div>
                    {leaderboard.map((entry, index) => (
                        <div
                            key={index}
                            style={{
                                padding: '5px',
                                backgroundColor: entry.isMe ? 'rgba(0, 255, 255, 0.2)' : 'transparent',
                                borderRadius: '5px',
                                marginBottom: '3px',
                            }}
                        >
                            <span style={{ color: entry.color }}>
                                {index + 1}. {entry.name}: {entry.length}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Active Upgrades Display */}
            {activeUpgrades.length > 0 && spawned && !gameOver && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: '20px',
                        left: '20px',
                        color: 'white',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        padding: '10px',
                        borderRadius: '8px',
                        maxWidth: '200px',
                        zIndex: 10,
                    }}
                >
                    <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>
                        💎 Active Upgrades
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {Array.from(new Set(activeUpgrades)).map((upgradeId, index) => {
                            const upgrade = upgradeOptions.find(u => u.id === upgradeId);
                            return (
                                <span
                                    key={index}
                                    style={{
                                        fontSize: '18px',
                                        padding: '2px 5px',
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                        borderRadius: '4px',
                                    }}
                                    title={upgrade?.name}
                                >
                                    {upgrade?.icon}
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Upgrade Selection Panel */}
            {showUpgradeChoice && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: '20px',
                        left: '20px',
                        backgroundColor: 'rgba(0, 0, 0, 0.95)',
                        padding: '20px',
                        borderRadius: '12px',
                        border: '3px solid #00ffff',
                        boxShadow: '0 0 30px rgba(0, 255, 255, 0.5)',
                        zIndex: 1000,
                        maxWidth: '500px',
                    }}
                >
                    <div
                        style={{
                            color: '#00ffff',
                            fontSize: '20px',
                            fontWeight: 'bold',
                            marginBottom: '15px',
                            fontFamily: 'monospace',
                        }}
                    >
                        🎯 Choose Upgrade
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                        {upgradeOptions.map((upgrade, index) => (
                            <button
                                key={upgrade.id}
                                onClick={() => onSelectUpgrade(index)}
                                style={{
                                    padding: '12px 15px',
                                    backgroundColor: 'rgba(0, 255, 255, 0.1)',
                                    border: '2px solid rgba(0, 255, 255, 0.4)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontFamily: 'monospace',
                                    fontSize: '14px',
                                    textAlign: 'left',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(0, 255, 255, 0.3)';
                                    e.currentTarget.style.borderColor = '#00ffff';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(0, 255, 255, 0.1)';
                                    e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.4)';
                                }}
                            >
                                <span style={{ fontSize: '24px' }}>{upgrade.icon}</span>
                                <div>
                                    <div style={{ fontWeight: 'bold', color: '#00ffff' }}>
                                        [{index + 1}] {upgrade.name}
                                    </div>
                                    <div style={{ fontSize: '12px', opacity: 0.8 }}>
                                        {upgrade.description}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                    <div style={{ marginTop: '10px', fontSize: '12px', color: '#888', fontFamily: 'monospace' }}>
                        Press 1, 2, or 3 to select
                    </div>
                </div>
            )}

            {/* Game Over Screen */}
            {gameOver && (
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                        color: 'white',
                        fontFamily: 'monospace',
                        zIndex: 100,
                    }}
                >
                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>💀 Game Over</div>
                    <div style={{ fontSize: '24px', marginBottom: '10px' }}>Score: {score}</div>
                    <div style={{ fontSize: '18px', marginBottom: '30px' }}>Items: {itemsCollected}</div>
                    <button
                        onClick={onRestart}
                        style={{
                            padding: '15px 30px',
                            fontSize: '20px',
                            backgroundColor: '#00ffff',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontFamily: 'monospace',
                            fontWeight: 'bold',
                        }}
                    >
                        Restart (Space)
                    </button>
                </div>
            )}

            {/* Start Screen */}
            {!spawned && !gameOver && (
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                        color: 'white',
                        fontFamily: 'monospace',
                        zIndex: 100,
                    }}
                >
                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>🐍 Snake Attack</div>
                    <div style={{ fontSize: '18px', marginBottom: '30px' }}>
                        Press SPACE to start
                        <br />
                        <br />
                        WASD/Arrow Keys to move
                        <br />
                        SHIFT to boost
                    </div>
                </div>
            )}
        </>
    );
}




