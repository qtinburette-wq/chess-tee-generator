import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

import { getRecentGames } from "./services/chesscom";
import { analyzeGame } from "./services/analysis";
import { generateDesign } from "./services/render";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --------------------
// Serve Widget (CommonJS-safe)
// --------------------
// When compiled to dist/, __dirname will be backend/dist
const widgetPath = path.join(__dirname, "../../widget/dist/assets");

app.use("/widget", express.static(widgetPath));

app.get("/widget.js", (_req, res) => {
  try {
    const files = fs.readdirSync(widgetPath);

    const jsFile =
      files.find((f) => f.endsWith(".js") && f.includes("index")) ||
      files.find((f) => f.endsWith(".js"));

    if (jsFile) return res.sendFile(path.join(widgetPath, jsFile));
    return res.status(404).send("Widget build not found");
  } catch {
    return res.status(500).send("Widget build missing");
  }
});

// --------------------
// Basic root route (helps Render)
// --------------------
app.get("/", (_req, res) => {
  res.type("text").send("Chess Tee Generator API is running ✅");
});

// --------------------
// Health
// --------------------
app.get("/health", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// --------------------
// Chess.com games
// --------------------
app.get("/api/chesscom/games", async (req, res) => {
  try {
    const username = (req.query.username as string) || "";
    if (!username.trim()) return res.status(400).json({ error: "Username required" });

    const games = await getRecentGames(username.trim());
    return res.json({ games });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
});

// --------------------
// NEW: Best moments for a username (simple version)
// - takes the most recent game
// - returns 5 puzzles + source game
// --------------------
app.get("/api/best-moments", async (req, res) => {
  try {
    const username = (req.query.username as string) || "";
    if (!username.trim()) return res.status(400).json({ error: "Username required" });

    const games = await getRecentGames(username.trim());
    if (!games || games.length === 0) {
      return res.status(404).json({ error: "No recent games found" });
    }

    // Pick the most recent game (games are usually already sorted, but we’ll be safe)
    const sorted = [...games].sort((a: any, b: any) => (b.end_time || 0) - (a.end_time || 0));
    const sourceGame = sorted[0];

    if (!sourceGame?.pgn) {
      return res.status(500).json({ error: "Game PGN missing" });
    }

    const puzzles = (await analyzeGame(sourceGame.pgn, "white"))?.slice(0, 5) || [];

    return res.json({
      username: username.trim(),
      sourceGame: {
        url: sourceGame.url,
        end_time: sourceGame.end_time,
        time_class: sourceGame.timeClass || sourceGame.time_class,
      },
      puzzles,
    });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
});

// --------------------
// Analyze (POST only)
// --------------------
app.post("/api/analyze", async (req, res) => {
  try {
    const { pgn, focusColor } = req.body || {};
    if (!pgn) return res.status(400).json({ error: "PGN required" });

    const puzzles = await analyzeGame(pgn, focusColor);
    return res.json({ puzzles });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
});

// --------------------
// Render (generate PNG/SVG)
// - accepts: { puzzle, meta }  ✅
// - or legacy: { puzzles:[...], meta } (uses puzzles[0])
// --------------------
app.post("/api/render", async (req, res) => {
  try {
    const body = req.body || {};
    const meta = body.meta || {};

    const puzzle = body.puzzle || (Array.isArray(body.puzzles) ? body.puzzles[0] : null);
    if (!puzzle) return res.status(400).json({ error: "Puzzle required" });

    const result = await generateDesign(puzzle, meta);
    return res.json(result);
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
