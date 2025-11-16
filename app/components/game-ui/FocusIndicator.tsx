export default function FocusIndicator() {
    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-xl font-bold text-white bg-black bg-opacity-70 px-6 py-3 rounded-lg animate-pulse">
                HOVER TO CONTROL
            </div>
        </div>
    );
}




