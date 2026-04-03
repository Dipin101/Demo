export default function List() {
  const saved = JSON.parse(localStorage.getItem("jokes:saved") || "[]");

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold mb-6">📋 Your Joke Itinerary</h2>
      {saved.length === 0 ? (
        <p className="text-gray-500 text-sm">No saved jokes yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {saved.map(
            (joke: { setup: string; delivery: string }, index: number) => (
              <div
                key={index}
                className="rounded-xl p-6 border bg-blue-950 border-blue-500 shadow-lg shadow-blue-900"
              >
                <p className="font-semibold text-lg mb-4 leading-snug">
                  {joke.setup}
                </p>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {joke.delivery}
                </p>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
