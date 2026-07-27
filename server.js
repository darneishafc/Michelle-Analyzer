// CommonJS (project is no longer "type":"module") so the host's require()-based
// launcher can load its preload helper without an ERR_REQUIRE_ESM crash.
require("dotenv").config(); // loads .env locally if present; no-op in production (Hostinger sets the env vars directly)
const express = require("express");
const path = require("path");
const cookieSession = require("cookie-session");
const mysql = require("mysql2/promise");

const app = express();
app.set("trust proxy", 1); // behind Hostinger's reverse proxy
app.use(express.json({ limit: "2mb" }));

/* ------------------------------------------------------------------ *
 * Optional persistence + private login.
 * Everything degrades gracefully: if the DB env vars aren't set the
 * app still works exactly like the single-session analyzer, and if
 * APP_PASSWORD isn't set the login gate is simply off. This keeps every
 * deploy safe — a missing setting can never take the site down.
 * ------------------------------------------------------------------ */
const AUTH_REQUIRED = !!process.env.APP_PASSWORD;

app.use(
  cookieSession({
    name: "michelle_sess",
    secret: process.env.SESSION_SECRET || "dev-insecure-secret-change-me",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  })
);

/* --- MySQL pool (lazy + graceful) --- */
let pool = null;
let schemaReady = false;
function getPool() {
  if (pool) return pool;
  if (!process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_USER) return null;
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
    charset: "utf8mb4",
  });
  return pool;
}

async function ensureSchema() {
  const p = getPool();
  if (!p) return false;
  await p.query(
    `CREATE TABLE IF NOT EXISTS sessions (
       id INT AUTO_INCREMENT PRIMARY KEY,
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
       file_name VARCHAR(255),
       trade_count INT,
       summary LONGTEXT,
       trades LONGTEXT
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );
  schemaReady = true;
  return true;
}

async function dbReady() {
  if (schemaReady) return true;
  try {
    return await ensureSchema();
  } catch (e) {
    console.error("DB not ready:", e.code || e.message);
    return false;
  }
}

/* --- auth helpers --- */
function isAuthed(req) {
  return !AUTH_REQUIRED || !!(req.session && req.session.authed);
}
function requireAuth(req, res, next) {
  if (isAuthed(req)) return next();
  return res.status(401).json({ error: "Please log in." });
}

/* --- tiny in-memory rate limit so a leaked URL can't drain your key --- */
const HITS = new Map(); // ip -> [timestamps]
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
function limited(ip) {
  const now = Date.now();
  const arr = (HITS.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  HITS.set(ip, arr);
  return arr.length > MAX_PER_WINDOW;
}

/* --- auth endpoints --- */
app.get("/api/me", (req, res) => {
  res.json({ authRequired: AUTH_REQUIRED, authed: isAuthed(req), storage: !!getPool() });
});

app.post("/api/login", (req, res) => {
  if (!AUTH_REQUIRED) return res.json({ ok: true, authed: true });
  const { password } = req.body || {};
  if (typeof password === "string" && password === process.env.APP_PASSWORD) {
    req.session.authed = true;
    return res.json({ ok: true, authed: true });
  }
  return res.status(401).json({ error: "Incorrect password." });
});

app.post("/api/logout", (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

/* --- session history (persisted trade sessions) --- */
app.post("/api/sessions", requireAuth, async (req, res) => {
  const p = getPool();
  if (!p || !(await dbReady())) return res.status(503).json({ error: "History storage isn't configured yet." });
  const { file_name, trade_count, summary, trades } = req.body || {};
  try {
    const [r] = await p.query(
      "INSERT INTO sessions (file_name, trade_count, summary, trades) VALUES (?, ?, ?, ?)",
      [
        String(file_name || "session").slice(0, 255),
        Number(trade_count) || 0,
        JSON.stringify(summary || {}),
        JSON.stringify(Array.isArray(trades) ? trades : []),
      ]
    );
    res.json({ id: r.insertId });
  } catch (e) {
    console.error("save session failed:", e.code || e.message);
    res.status(500).json({ error: "Couldn't save this session." });
  }
});

app.get("/api/sessions", requireAuth, async (req, res) => {
  const p = getPool();
  if (!p || !(await dbReady())) return res.json({ sessions: [] });
  try {
    const [rows] = await p.query(
      "SELECT id, created_at, file_name, trade_count, summary FROM sessions ORDER BY created_at ASC LIMIT 1000"
    );
    const sessions = rows.map((r) => ({
      id: r.id,
      created_at: r.created_at,
      file_name: r.file_name,
      trade_count: r.trade_count,
      summary: safeParse(r.summary),
    }));
    res.json({ sessions });
  } catch (e) {
    console.error("list sessions failed:", e.code || e.message);
    res.status(500).json({ error: "Couldn't load history." });
  }
});

app.delete("/api/sessions/:id", requireAuth, async (req, res) => {
  const p = getPool();
  if (!p || !(await dbReady())) return res.status(503).json({ error: "History storage isn't configured yet." });
  try {
    await p.query("DELETE FROM sessions WHERE id = ?", [Number(req.params.id) || 0]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Couldn't delete that session." });
  }
});

function safeParse(s) {
  try {
    return typeof s === "string" ? JSON.parse(s) : s || {};
  } catch {
    return {};
  }
}

/* --- chat proxy: the browser calls THIS, never Anthropic directly --- */
app.post("/api/chat", requireAuth, async (req, res) => {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "unknown";
  if (limited(ip)) return res.status(429).json({ error: "Too many requests, slow down." });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY." });

  // Only forward the fields the app sends; ignore anything else.
  const { model, max_tokens, system, messages } = req.body || {};
  if (!Array.isArray(messages)) return res.status(400).json({ error: "messages required" });

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model || "claude-sonnet-4-6",
        max_tokens: max_tokens || 1000,
        system,
        messages,
      }),
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (e) {
    res.status(502).json({ error: "Upstream request to the model failed." });
  }
});

/* --- serve the built React app (Vite outputs to /dist) --- */
const dist = path.join(__dirname, "dist");
app.use(express.static(dist));
app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", async () => {
  console.log(`Michelle Analyzer server listening on 0.0.0.0:${port}`);
  console.log(`  auth: ${AUTH_REQUIRED ? "on" : "off"} · storage: ${getPool() ? "configured" : "not configured"}`);
  await dbReady(); // create the table on boot if the DB is configured (non-fatal)
});
