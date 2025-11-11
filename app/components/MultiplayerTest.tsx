'use client';

import { useState } from 'react';
import SnakeGame from './SnakeGame';

export default function MultiplayerTest() {
    const [splitScreen, setSplitScreen] = useState(true);
    const [activePlayer, setActivePlayer] = useState<1 | 2>(1);

    if (splitScreen) {
        return (
            <div className="relative w-full h-screen">
                {/* Toggle Button */}
                <button
                    onClick={() => setSplitScreen(false)}
                    className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold text-sm tracking-wider pointer-events-auto"
                >
                    SWITCH TO SINGLE PLAYER
                </button>

                {/* Split Screen Layout */}
                <div className="flex w-full h-full">
                    {/* Player 1 - Left Side */}
                    <div
                        className="w-1/2 h-full relative border-r-2 border-purple-500"
                        onClick={() => setActivePlayer(1)}
                        onMouseEnter={() => setActivePlayer(1)}
                    >
                        <div className="absolute top-2 left-2 z-10 bg-black bg-opacity-50 px-3 py-1 rounded text-purple-400 font-bold text-xs pointer-events-none">
                            PLAYER 1 {activePlayer === 1 && '● ACTIVE'}
                        </div>
                        <SnakeGame isActive={activePlayer === 1} />
                    </div>

                    {/* Player 2 - Right Side */}
                    <div
                        className="w-1/2 h-full relative"
                        onClick={() => setActivePlayer(2)}
                        onMouseEnter={() => setActivePlayer(2)}
                    >
                        <div className="absolute top-2 left-2 z-10 bg-black bg-opacity-50 px-3 py-1 rounded text-green-400 font-bold text-xs pointer-events-none">
                            PLAYER 2 {activePlayer === 2 && '● ACTIVE'}
                        </div>
                        <SnakeGame isActive={activePlayer === 2} />
                    </div>
                </div>

                {/* Instructions */}
                <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-50 bg-black bg-opacity-70 px-6 py-3 rounded-lg pointer-events-none">
                    <div className="text-cyan-300 text-sm text-center">
                        <div className="font-bold mb-2">SPLIT SCREEN TEST MODE</div>
                        <div className="text-xs opacity-80">
                            Click or hover over a window to control that player
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return <SnakeGame />;
}

