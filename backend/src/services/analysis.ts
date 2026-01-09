import { Chess } from 'chess.js';
// @ts-ignore
import stockfish from 'stockfish';
import { Puzzle } from '../types';

const DEPTH = 15;
const NUM_PUZZLES = 5;

// Helper to wrap Stockfish in a promise for a single position analysis
function analyzePosition(fen: string, depth: number): Promise<{ bestMove: string; evalCp?: number; mate?: number }> {
    return new Promise((resolve) => {
        // @ts-ignore
        const engine = stockfish();
        let bestMove = '';
        let evalCp: number | undefined;
        let mate: number | undefined;

        engine.onmessage = (line: string) => {
            if (line.startsWith(`info depth ${depth}`)) {
                const parts = line.split(' ');
                const scoreIndex = parts.indexOf('score');
                if (scoreIndex !== -1) {
                    const type = parts[scoreIndex + 1];
                    const val = parseInt(parts[scoreIndex + 2]);
                    if (type === 'cp') evalCp = val;
                    if (type === 'mate') mate = val;
                }
            }
            if (line.startsWith('bestmove')) {
                bestMove = line.split(' ')[1];
                engine.postMessage('quit');
                resolve({ bestMove, evalCp, mate });
            }
        };

        engine.postMessage(`position fen ${fen}`);
        engine.postMessage(`go depth ${depth}`);
    });
}

export async function analyzeGame(pgn: string, playerUsername?: string): Promise<Puzzle[]> {
    const chess = new Chess();
    try {
        chess.loadPgn(pgn);
    } catch (e) {
        throw new Error('Invalid PGN');
    }

    const history = chess.history({ verbose: true });
    const puzzles: (Puzzle & { score: number })[] = [];

    // Replay the game to get FENs and analyze
    const tempChess = new Chess();

    // Naive approach: Analyze every move? Too slow.
    // Better: Analyze moves where major piece capture happened, or checkmate, or just sample?
    // MVP: Let's analyze every 2nd move or just focused on the player's moves if provided.

    // Optimization: Only analyze mid-game?

    for (const move of history) {
        tempChess.move(move);
        const fen = tempChess.fen();
        const turn = tempChess.turn();

        // Skip opening (first 10 plies)
        if (tempChess.moveNumber() < 5) continue;

        // Skip end of game if drawn?

        // Analyze
        // We want to find positions where the *current* player (to move) has a great move.
        // Or where the *previous* move was a blunder?
        // Let's define "Puzzle": A position where there is a clear best move.

        const analysis = await analyzePosition(fen, 12); // Reduced depth for speed in loop

        // Heuristic for "Good Puzzle":
        // 1. Forced mate (mate found)
        // 2. High CP advantage (> 200) and previous move was not winning?
        // 3. The "bestMove" matches what was played? (User played the best move) -> "Celebration"
        // 4. Or User missed the best move? -> "Improvement"

        // Let's stick to "Best moments" -> Where user played the best move and it was good.

        let score = 0;

        // Example scoring
        if (analysis.mate) score += 1000 - Math.abs(analysis.mate);
        if (analysis.evalCp && Math.abs(analysis.evalCp) > 200) score += Math.abs(analysis.evalCp);

        // Check if move played matches best move
        // We need to look ahead to see what was played?
        // 'move' is the move that JUST happened. 'fen' is resulting position.
        // So we are analyzing the resulting position. "What should the opponent do?"

        // Wait, 'move' created 'fen'.
        // If we want to capture "User playing a great move", we need to analyze the position BEFORE 'move'.
        // Let's adjust loop.
    }

    // Better Loop
    const replayChess = new Chess();
    const candidates: (Puzzle & { score: number })[] = [];

    for (let i = 0; i < history.length; i++) {
        const move = history[i];
        const fenBefore = replayChess.fen();
        const ply = i + 1;

        // Make move to advance state for next iter
        replayChess.move(move);

        // If we focus on a user, only look at their turns
        // if (playerUsername && ... logic to check color ...) 

        // Analyze position BEFORE the move
        if (ply > 10) { // Skip opening
            const analysis = await analyzePosition(fenBefore, 10); // Fast scan

            // Did user play best move?
            const playedUci = move.from + move.to + (move.promotion || '');
            const isBestMove = analysis.bestMove === playedUci;

            if (isBestMove) {
                // Calculate score
                let score = 0;
                if (analysis.mate) score = 10000;
                else if (analysis.evalCp) score = Math.abs(analysis.evalCp);

                candidates.push({
                    fen: fenBefore,
                    turn: replayChess.turn() === 'b' ? 'w' : 'b', // Wait, replayChess already moved? No, fenBefore is before move.
                    bestMoveUci: analysis.bestMove,
                    playedUci: playedUci,
                    ply: ply,
                    evalCp: analysis.evalCp,
                    mate: analysis.mate,
                    score
                });
            }
        }
    }

    // Sort by score
    candidates.sort((a, b) => b.score - a.score);

    // Filter for spacing (don't pick moves from same sequence)
    const selected: Puzzle[] = [];
    for (const cand of candidates) {
        if (selected.length >= NUM_PUZZLES) break;
        if (!selected.some(s => Math.abs(s.ply - cand.ply) < 6)) {
            selected.push(cand);
        }
    }

    return selected;
}
