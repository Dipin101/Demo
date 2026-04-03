# Joke Cards — Redis Caching Demo

A full-stack demo exploring smart caching architecture, built to mirror real-world patterns found in content-heavy applications.

Users generate AI-curated joke cards, compare options by refreshing, pin their favourites, and lock in a final itinerary — all backed by a Redis caching layer with undo/redo history.

## Live Demo

🔗 Coming soon

---

## What This Demonstrates

- **Lazy caching** — Redis only activates after the user shows intent by pinning. No unnecessary cache writes on first load
- **Cache-on-demand** — unpinned slots pull from Redis on refresh, pinned slots persist locally until confirmed
- **Undo/Redo via Redis** — current and previous snapshots stored in Redis enabling one-step history
- **Intentional TTL** — all Redis keys expire after 24 hours, preventing memory bloat at scale and surfacing fresh options for returning users
- **Progressive confirmation** — user locks in their itinerary explicitly, triggering a flush and reset
- **Fault tolerant flush** — `saveAndReset` awaits Redis flush before resetting UI, preventing stale cache on immediate re-generate

---

## Tech Stack

| Layer          | Technology                                       |
| -------------- | ------------------------------------------------ |
| Frontend       | React, TypeScript, Vite, Tailwind CSS            |
| Backend        | Node.js, Express, TypeScript                     |
| Cache          | Redis (ioredis)                                  |
| Infrastructure | Docker Compose                                   |
| Deployment     | Render (backend + Redis), Static Site (frontend) |

---

## Architecture

```
User generates → Redis caches jokes (TTL 24hrs)
User pins a joke → saved to localStorage (demo) / MongoDB (production)
User refreshes → unpinned slots fetch from Redis cache
All pinned → user confirms itinerary → Redis flushed → UI resets
Returning after 24hrs → Redis expired → fresh jokes generated, pins preserved
```

---

## Production Considerations

This demo uses localStorage to simulate what would be a database in production. The architectural patterns are intentionally production-ready:

| Demo                   | Production                                        |
| ---------------------- | ------------------------------------------------- |
| localStorage for pins  | MongoDB (persistent pin storage per user)         |
| Global Redis keys      | `jokes:${sessionId}` (per-user session isolation) |
| Single Redis instance  | Redis Sentinel with replicas (high availability)  |
| No authentication      | Redis password + TLS (security layer)             |
| No rate limiting       | express-rate-limit per IP (DoS protection)        |
| localStorage itinerary | Permanent DB write on confirmation                |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Docker Desktop

### Setup

**1. Clone the repo**

```bash
git clone https://github.com/Dipin101/demo
cd demo
```

**2. Configure environment variables**

Backend `.env`:

```
REDIS_URL=redis://localhost:6380
JOKE_API_URL=https://v2.jokeapi.dev/joke/Programming?type=twopart
PORT=5000
```

Frontend `.env`:

```
VITE_API_URL=http://localhost:5000
```

**3. Start Redis via Docker**

```bash
docker-compose up -d
```

**4. Start the backend**

```bash
cd backend
npm install
npm run dev
```

**5. Start the frontend**

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`

---

## How It Works

1. **Generate** — fetches 3 jokes from JokeAPI, stores in Redis with 24hr TTL
2. **Pin** — mark jokes you like, saved to localStorage immediately
3. **Refresh** — unpinned slots fetch fresh jokes, Redis stores previous snapshot for undo
4. **Undo/Redo** — swap between current and previous Redis snapshots
5. **Get All Jokes** — confirms itinerary is final, flushes Redis, resets to Generate
6. **Returning users** — saved itinerary persists locally, Generate starts a fresh session

---

## Folder Structure

```
demo/
├── frontend/               # React + TypeScript + Vite
│   ├── src/
│   │   ├── App.tsx         # Main application logic
│   │   └── List.tsx        # Saved itinerary component
│   └── .env
├── backend/                # Node.js + Express + TypeScript
│   ├── server.ts           # API routes + Redis logic
│   └── .env
└── docker-compose.yml
```

---

## API Reference

| Method | Endpoint             | Description                                      |
| ------ | -------------------- | ------------------------------------------------ |
| GET    | `/api/jokes`         | Fetch jokes, serve from Redis cache if available |
| GET    | `/api/jokes/refresh` | Force fresh fetch, store previous in Redis       |
| GET    | `/api/jokes/undo`    | Restore previous Redis snapshot                  |
| GET    | `/api/jokes/redo`    | Restore next Redis snapshot                      |
| DELETE | `/api/jokes/flush`   | Clear all Redis keys for this session            |

---

## Author

Built by [Dipin](https://github.com/Dipin101)
