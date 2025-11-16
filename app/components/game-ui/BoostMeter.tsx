'use client';

const MIN_BOOST_LENGTH = 25; // Must have at least 25 length to boost

type BoostMeterProps = {
    isBoosting: boolean;
    playerLength: number;
};

export default function BoostMeter({ isBoosting, playerLength }: BoostMeterProps) {
    // Slither.io style: boost as long as you have mass, no duration limit or cooldown
    const canBoost = playerLength >= MIN_BOOST_LENGTH;

    return (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 pointer-events-none z-50">
            <div className="bg-black bg-opacity-70 rounded-lg px-6 py-3 border-2 border-cyan-500/50">
                <div className="flex items-center gap-4">
                    {/* Boost Icon */}
                    <div className="text-2xl">⚡</div>
                    
                    {/* Boost Meter */}
                    <div className="flex flex-col gap-1 min-w-[200px]">
                        <div className="text-xs text-cyan-300 uppercase tracking-wider font-bold">
                            Boost
                        </div>
                        
                        {/* Meter Bar - Slither.io style: shows if you can boost */}
                        <div className="relative h-6 bg-gray-800 rounded-full overflow-hidden border border-gray-600">
                            {isBoosting ? (
                                // Currently boosting (pulsing yellow/orange)
                                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                                </div>
                            ) : canBoost ? (
                                // Ready to boost (cyan/blue)
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                                </div>
                            ) : (
                                // Not enough length (red)
                                <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-500" />
                            )}
                            
                            {/* Text Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-lg">
                                {isBoosting ? (
                                    <span className="text-yellow-200">BOOSTING</span>
                                ) : canBoost ? (
                                    <span className="text-cyan-200">HOLD W TO BOOST</span>
                                ) : (
                                    <span className="text-red-200">TOO SHORT</span>
                                )}
                            </div>
                        </div>
                        
                        {/* Status Text */}
                        <div className="text-xs text-center">
                            {isBoosting ? (
                                <span className="text-orange-400 font-bold animate-pulse">
                                    ⚠️ MASS BURNING! Length: {playerLength.toFixed(0)} ⚠️
                                </span>
                            ) : canBoost ? (
                                <span className="text-cyan-400">Hold W or ↑ to boost (burns mass)</span>
                            ) : (
                                <span className="text-red-400 font-bold">
                                    ❌ TOO SHORT! Need {MIN_BOOST_LENGTH} length (Current: {playerLength.toFixed(0)})
                                </span>
                            )}
                        </div>
                        
                        {/* Mass indicator when boosting */}
                        {isBoosting && (
                            <div className="text-xs text-center mt-1">
                                <span className="text-orange-300 font-bold animate-pulse">
                                    🔥 MASS BURNING! 🔥 Your tail is shrinking!
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

