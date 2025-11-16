export default function LoadingIndicator() {
    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90 pointer-events-none z-50">
            <div className="text-center">
                <div className="text-4xl font-bold text-cyan-400 tracking-wider mb-4 animate-pulse drop-shadow-[0_0_20px_rgba(0,255,255,0.8)]">
                    LOADING...
                </div>
                <div className="text-sm text-cyan-300 tracking-widest uppercase">
                    Compiling Shaders
                </div>
            </div>
        </div>
    );
}




