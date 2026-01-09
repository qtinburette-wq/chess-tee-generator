import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getRecentGames } from './services/chesscom';
import { analyzeGame } from './services/analysis';
import { generateDesign } from './services/render';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve Widget
import path from 'path';
// Assuming running from backend/dist/
const widgetPath = path.join(__dirname, '../../widget/dist/assets');
app.use('/widget', express.static(widgetPath));
// Also serve the entry point wrapper if needed, or just let user point to assets/index.js
// Ideally, we want a stable URL like /widget.js
app.get('/widget.js', (req, res) => {
    // Find the JS file in widget/dist/assets
    const fs = require('fs');
    try {
        const files = fs.readdirSync(widgetPath);
        const jsFile = files.find((f: string) => f.endsWith('.js') && f.startsWith('index')); // or main
        if (jsFile) {
            res.sendFile(path.join(widgetPath, jsFile));
        } else {
            res.status(404).send('Widget build not found');
        }
    } catch (e) {
        res.status(500).send('Widget build missing');
    }
});

app.get('/health', (req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.get('/api/chesscom/games', async (req, res) => {
    try {
        const username = req.query.username as string;
        if (!username) {
            return res.status(400).json({ error: 'Username required' });
        }
        const games = await getRecentGames(username);
        res.json({ games });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/analyze', async (req, res) => {
    try {
        const { pgn, focusColor } = req.body;
        if (!pgn) return res.status(400).json({ error: 'PGN required' });

        // Timeout protection for Stockfish?
        // Promise.race or similar can be added.
        const puzzles = await analyzeGame(pgn, focusColor);
        res.json({ puzzles });
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/render', async (req, res) => {
    try {
        const { puzzles, meta } = req.body;
        if (!puzzles || !Array.isArray(puzzles)) return res.status(400).json({ error: 'Puzzles array required' });

        const result = await generateDesign(puzzles, meta || {});
        res.json(result);
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
