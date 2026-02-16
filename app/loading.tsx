/**
 * Root Loading Page
 * Suspense fallback with centered spinner
 */

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e] flex items-center justify-center">
      <div className="text-center">
        <div
          className="w-10 h-10 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"
          role="status"
          aria-label="Loading"
        />
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}
