import express from "express";
import pg from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { Pool } = pg;
const app = express();
const port = process.env.PORT || 10000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let appState = null;
let pool = null;
let useMemoryStorage = !process.env.DATABASE_URL;

if (!useMemoryStorage) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      family: 4,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    });
    await pool.query(`CREATE TABLE IF NOT EXISTS app_state (id integer PRIMARY KEY, data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`);
    console.log("✓ PostgreSQL connected");
  } catch (error) {
    await pool?.end().catch(() => {});
    pool = null;
    useMemoryStorage = true;
    console.error(`⚠ PostgreSQL unavailable (${error.code || error.message}). Running with in-memory storage; configure an IPv4-compatible Pooler DATABASE_URL for persistent shared data.`);
  }
} else {
  console.log("⚠ Running with in-memory storage (not persistent). To enable persistent shared state, set DATABASE_URL environment variable with a PostgreSQL connection string.");
}

app.use(express.json({ limit: "12mb" }));

app.get("/api/state", async (_request, response) => {
  try {
    if (useMemoryStorage) {
      return response.json(appState);
    }
    const result = await pool.query("SELECT data FROM app_state WHERE id = 1");
    response.json(result.rows[0]?.data ?? null);
  } catch (error) {
    console.error("GET /api/state failed:", error.message);
    response.status(500).json({ error: "Failed to fetch state" });
  }
});

app.put("/api/state", async (request, response) => {
  const state = request.body;
  if (!state || !Array.isArray(state.courses) || !Array.isArray(state.users) || !Array.isArray(state.questions)) {
    return response.status(400).json({ error: "Invalid application state" });
  }
  try {
    if (useMemoryStorage) {
      appState = state;
      return response.status(204).end();
    }
    await pool.query(
      `INSERT INTO app_state (id, data) VALUES (1, $1::jsonb)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
      [JSON.stringify(state)],
    );
    response.status(204).end();
  } catch (error) {
    console.error("PUT /api/state failed:", error.message);
    response.status(500).json({ error: "Failed to save state" });
  }
});

app.use(express.static(path.join(__dirname, "dist")));
app.get("/{*splat}", (_request, response) => response.sendFile(path.join(__dirname, "dist", "index.html")));

app.listen(port, () => console.log(`Askroom server listening on ${port}`));
