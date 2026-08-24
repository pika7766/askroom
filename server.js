import express from "express";
import pg from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { Pool } = pg;
const app = express();
const port = process.env.PORT || 10000;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false });
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json({ limit: "12mb" }));

await pool.query(`CREATE TABLE IF NOT EXISTS app_state (id integer PRIMARY KEY, data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`);

app.get("/api/state", async (_request, response) => {
  const result = await pool.query("SELECT data FROM app_state WHERE id = 1");
  response.json(result.rows[0]?.data ?? null);
});

app.put("/api/state", async (request, response) => {
  const state = request.body;
  if (!state || !Array.isArray(state.courses) || !Array.isArray(state.users) || !Array.isArray(state.questions)) {
    return response.status(400).json({ error: "Invalid application state" });
  }
  await pool.query(
    `INSERT INTO app_state (id, data) VALUES (1, $1::jsonb)
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [JSON.stringify(state)],
  );
  response.status(204).end();
});

app.use(express.static(path.join(__dirname, "dist")));
app.get("/{*splat}", (_request, response) => response.sendFile(path.join(__dirname, "dist", "index.html")));

app.listen(port, () => console.log(`Askroom server listening on ${port}`));
