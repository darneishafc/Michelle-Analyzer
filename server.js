// CommonJS (project is no longer "type":"module") so the host's require()-based
// launcher can load its preload helper without an ERR_REQUIRE_ESM crash.
require("dotenv").config(); // loads .env locally if present; no-op in production (Hostinger sets the env var directly)
const express = require("express");
const path = require("path");

const app = express();
app.use(express.json({ limit: "1mb" }));

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

/* --- chat proxy: the browser calls THIS, never Anthropic directly --- */
app.post("/api/chat", async (req, res) => {
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
app.listen(port, "0.0.0.0", () => console.log(`Michelle Analyzer server listening on 0.0.0.0:${port}`));
