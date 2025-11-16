type HUDProps = {
    score: number;
    level: number;
};

export default function HUD({ score, level }: HUDProps) {
    return (
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-center pointer-events-none">
            <div className="flex items-baseline gap-6 justify-center">
                <div>
                    <div className="text-3xl font-bold text-cyan-400 tracking-wider drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]">
                        {score.toFixed(0)}
                    </div>
                    <div className="text-xs text-cyan-300 mt-1 tracking-widest uppercase">
                        Score
                    </div>
                </div>
                <div>
                    <div className="text-3xl font-bold text-purple-400 tracking-wider drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]">
                        {level}
                    </div>
                    <div className="text-xs text-purple-300 mt-1 tracking-widest uppercase">
                        Level
                    </div>
                </div>
            </div>
        </div>
    );
}




