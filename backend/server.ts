import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Redis from "ioredis";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6380");

app.use(cors());
app.use(express.json());

//GET JOKES
app.get("/api/jokes", async (req, res) => {
  try {
    // Check cache first
    const cached = await redis.get("jokes:current");
    if (cached) {
      return res.json({ jokes: JSON.parse(cached), fromCache: true });
    }

    // Cache miss — fetch from API
    const response = await fetch(
      `${process.env.JOKE_API_URL}&amount=3` ||
        "https://v2.jokeapi.dev/joke/Programming?type=twopart&amount=3",
    );
    const data = (await response.json()) as {
      jokes: Array<{ setup: string; delivery: string }>;
    };
    console.log("JokeAPI raw response: ", data);
    console.log("Jokes array: ", data.jokes);
    const jokes = data.jokes;

    // Store current as previous before setting new
    await redis.set("jokes:previous", JSON.stringify(jokes));
    await redis.set("jokes:current", JSON.stringify(jokes), "EX", 3600);

    return res.json({ jokes, fromCache: false });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch jokes" });
  }
});

// REFRESH JOKES
app.get("/api/jokes/refresh", async (req, res) => {
  try {
    // Save current as previous before refreshing
    const current = await redis.get("jokes:current");
    if (current) {
      await redis.set("jokes:previous", current);
    }

    // Force fresh fetch
    const response = await fetch(
      "https://v2.jokeapi.dev/joke/Programming?type=twopart&amount=3",
    );
    const data = (await response.json()) as {
      jokes: Array<{ setup: string; delivery: string }>;
    };
    const jokes = data.jokes;

    await redis.set("jokes:current", JSON.stringify(jokes), "EX", 3600);

    return res.json({ jokes, fromCache: false });
  } catch (error) {
    return res.status(500).json({ error: "Failed to refresh jokes" });
  }
});

//UNDO
app.get("/api/jokes/undo", async (req, res) => {
  try {
    const previous = await redis.get("jokes:previous");
    if (!previous) {
      return res.status(404).json({ error: "Nothing to undo" });
    }

    //save current as redo before swapping
    const current = await redis.get("jokes:current");
    if (current) {
      await redis.set("jokes:redo", current);
    }
    // Swap previous back to current
    await redis.set("jokes:current", previous);
    await redis.del("jokes:previous");

    return res.json({ jokes: JSON.parse(previous), fromCache: true });
  } catch (error) {
    return res.status(500).json({ error: "Failed to undo" });
  }
});

//REDO
app.get("/api/jokes/redo", async (req, res) => {
  try {
    const redo = await redis.get("jokes:redo");
    if (!redo) {
      return res.status(404).json({ error: "Nothing to redo" });
    }
    const current = await redis.get("jokes:current");
    if (current) {
      await redis.set("jokes:redo", current);
      await redis.set("jokes:previous", current);
    }

    // swap redo to current
    await redis.set("jokes:current", redo);

    // Save as current and clear redo
    // await redis.set("jokes:current", redo);
    // await redis.del("jokes:redo");

    return res.json({ jokes: JSON.parse(redo), fromCache: true });
  } catch (error) {
    return res.status(500).json({ error: "Failed to redo" });
  }
});

//FLUSH
app.delete("/api/jokes/flush", async (req, res) => {
  try {
    await redis.del("jokes:current");
    await redis.del("jokes:previous");
    await redis.del("jokes:redo");
    return res.json({ success: true, message: "Cache cleared" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to flush cache" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Redis connected at ${process.env.REDIS_URL}`);
});
