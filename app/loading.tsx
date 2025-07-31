//the loading screen. do not rename this file.

export default function Loading() {
    return (
        <div className="flex items-center justify-center h-screen">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
            <p className="ml-4 text-calmRed">Loading...</p>
        </div>
    );
}