import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL;

interface Joke {
  setup: string;
  delivery: string;
  pinned: boolean;
}

const JOKES_KEY = "jokes:local";

export default function App() {
  const [jokes, setJokes] = useState<Joke[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem(JOKES_KEY);
    if (stored) {
      const parsed: Joke[] = JSON.parse(stored);
      const hasPinned = parsed.some((j) => j.pinned);
      if (hasPinned) {
        fetchAndMergePinned(parsed);
      } else {
        localStorage.removeItem(JOKES_KEY);
        setGenerated(false);
      }
    }
  }, []);

  const saveLocal = (jokes: Joke[]) => {
    const hasPinned = jokes.some((j) => j.pinned);
    if (hasPinned) {
      localStorage.setItem(JOKES_KEY, JSON.stringify(jokes));
    } else {
      localStorage.removeItem(JOKES_KEY);
    }
  };

  const clearAll = () => {
    localStorage.clear();
    setJokes([]);
    setGenerated(false);
    setCanUndo(false);
    setCanRedo(false);
  };

  const fetchAndMergePinned = async (stored: Joke[]) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/jokes`);
      const data = await res.json();
      const freshJokes = data.jokes || [];
      const merged = stored.map((joke, i) =>
        joke.pinned
          ? joke
          : freshJokes[i]
            ? { ...freshJokes[i], pinned: false }
            : joke,
      );
      setJokes(merged);
      saveLocal(merged);
      setFromCache(data.fromCache);
      setGenerated(true);
    } catch (error) {
      setJokes(stored);
      setGenerated(true);
    }
    setLoading(false);
  };

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/jokes`);
      const data = await res.json();
      console.log(` Generate jokes`, data);
      const newJokes = data.jokes.map((j: Joke) => ({ ...j, pinned: false }));
      setJokes(newJokes);
      saveLocal(newJokes);
      setFromCache(data.fromCache);
      setGenerated(true);
      setCanUndo(false);
      setCanRedo(false);
    } catch (error) {
      alert("Failed to generate jokes");
    }
    setLoading(false);
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/jokes/refresh`);
      const data = await res.json();
      setJokes((prev) => {
        const updated = prev.map((joke, i) =>
          joke.pinned ? joke : { ...data.jokes[i], pinned: false },
        );
        saveLocal(updated);
        return updated;
      });
      setFromCache(data.fromCache);
      setCanUndo(true);
      setCanRedo(false);
    } catch (error) {
      alert("Failed to refresh jokes");
    }
    setLoading(false);
  };

  const undo = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/jokes/undo`);
      if (res.status === 404) {
        alert("Nothing left to undo!");
        setCanUndo(false);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setJokes((prev) => {
        const updated = prev.map((joke, i) =>
          joke.pinned ? joke : { ...data.jokes[i], pinned: false },
        );
        saveLocal(updated);
        return updated;
      });
      setCanUndo(false);
      setCanRedo(true);
    } catch (error) {
      alert("Undo failed");
    }
    setLoading(false);
  };

  const redo = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/jokes/redo`);
      if (res.status === 404) {
        alert("Nothing left to redo!");
        setCanRedo(false);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setJokes((prev) => {
        const updated = prev.map((joke, i) =>
          joke.pinned ? joke : { ...data.jokes[i], pinned: false },
        );
        saveLocal(updated);
        return updated;
      });
      setCanRedo(false);
      setCanUndo(true);
    } catch (error) {
      alert("Redo failed");
    }
    setLoading(false);
  };

  const flushRedisCache = async () => {
    await fetch(`${API_URL}/api/jokes/flush`, { method: "DELETE" });
  };

  const togglePin = (index: number) => {
    setJokes((prev) => {
      const updated = prev.map((joke, i) =>
        i === index ? { ...joke, pinned: !joke.pinned } : joke,
      );
      saveLocal(updated);
      const allPinned = updated.every((j) => j.pinned);
      if (allPinned) {
        flushRedisCache();
        setCanUndo(false);
        setCanRedo(false);
      }

      return updated;
    });
  };

  const hasPinned = jokes.some((j) => j.pinned);
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-2">Joke Cards</h1>
          {generated && (
            <p className="text-gray-400 text-sm">
              {fromCache ? "⚡ Served from Redis cache" : "🔄 Fresh from API"}
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-4 justify-center mb-10 flex-wrap">
          {!generated ? (
            <button
              onClick={generate}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-8 py-3 rounded-lg font-semibold text-lg transition"
            >
              {loading ? "Generating..." : "Generate"}
            </button>
          ) : (
            <>
              <button
                onClick={refresh}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-2 rounded-lg font-medium transition"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
              {hasPinned && canUndo && (
                <button
                  onClick={undo}
                  disabled={loading}
                  className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 px-6 py-2 rounded-lg font-medium transition"
                >
                  ↩ Undo
                </button>
              )}
              {hasPinned && canRedo && (
                <button
                  onClick={redo}
                  disabled={loading}
                  className="bg-green-800 hover:bg-green-700 disabled:opacity-50 px-6 py-2 rounded-lg font-medium transition"
                >
                  Redo ↪
                </button>
              )}
              <button
                onClick={clearAll}
                className="bg-red-900 hover:bg-red-800 px-6 py-2 rounded-lg font-medium transition"
              >
                Clear All
              </button>
            </>
          )}
        </div>

        {/* Cards */}
        {jokes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {jokes.map((joke, index) => (
              <div
                key={index}
                className={`rounded-xl p-6 border transition-all ${
                  joke.pinned
                    ? "bg-blue-950 border-blue-500 shadow-lg shadow-blue-900"
                    : "bg-gray-900 border-gray-700 hover:border-gray-500"
                }`}
              >
                {joke.pinned && (
                  <span className="text-xs bg-blue-600 px-2 py-1 rounded-full mb-3 inline-block">
                    📌 Pinned
                  </span>
                )}
                <p className="font-semibold text-lg mb-4 leading-snug">
                  {joke.setup}
                </p>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {joke.delivery}
                </p>
                <button
                  onClick={() => togglePin(index)}
                  className={`mt-4 text-xs px-3 py-1 rounded-full border transition ${
                    joke.pinned
                      ? "border-blue-400 text-blue-400 hover:bg-blue-900"
                      : "border-gray-600 text-gray-400 hover:border-gray-400"
                  }`}
                >
                  {joke.pinned ? "Unpin" : "📌 Pin"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {generated && (
          <p className="text-center text-gray-600 text-xs mt-12">
            Pinned cards persist locally — unpinned cards pull from Redis cache
            on refresh
          </p>
        )}
      </div>
    </div>
  );
}
