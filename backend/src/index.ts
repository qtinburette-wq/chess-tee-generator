import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { getRecentGames } from "./services/chesscom";
import { analyzeGame } from "./services/analysis";
import { generateDesign } from "./services/render";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --------------------
// Serve Widget (ESM-safe)
// --------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Assuming running from backend/dist/
const widgetPath = path.join(__dirname, "../../widget/dist/assets");

app.use("/widget", express.static(widgetPath));

// Stable URL like /widget.js
app.get("/widget.js", (_req, res) => {
  try {
    const files = fs.readdirSync(widgetPath);

    // Try to find a likely entry file first
    const jsFile =
      files.find((f) => f.endsWith(".js") && f.includes("index")) ||
      files.find((f) => f.endsWith(".js"));

    if (jsFile) {
      return res.sendFile(path.join(widgetPath, jsFile));
    }
    return res.status(404).send("Widget build not found");
  } catch (e) {
    return res.status(500).send("Widget build missing");
  }
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
    const username = req.query.username as string;
    if (!username) {
      return res.status(400).json({ error: "Username required" });
    }
    const games = await getRecentGames(username);
    res.json({ games });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Unknown error" });
  }
});

// --------------------
// Analyze (Stockfish best moments)
// --------------------
app.post("/api/analyze", async (req, res) => {
  try {
    const { pgn, focusColor } = req.body;
    if (!pgn) return res.status(400).json({ error: "PGN required" });

    const puzzles = await analyzeGame(pgn, focusColor);
    res.json({ puzzles });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e?.message || "Unknown error" });
  }
});

// --------------------
// Render (generate PNG/SVG)
// --------------------
app.post("/api/render", async (req, res) => {
  try {
    const { puzzles, meta } = req.body;
    if (!puzzles || !Array.isArray(puzzles)) {
      return res.status(400).json({ error: "Puzzles array required" });
    }

    const result = await generateDesign(puzzles, meta || {});
    res.json(result);
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e?.message || "Unknown error" });
  }
});

// --------------------
// Start server
// --------------------
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
