import { Chess } from "chess.js";

export type Puzzle = {
  title?: string;
  fen?: string;
  bestMove?: string;
  description?: string;
};

type FocusColor = "white" | "black" | undefined;

function pickFocusColorFromPgn(pgn: string, focusColor?: FocusColor): "w" | "b" {
  if (focusColor === "white") return "w";
  if (focusColor === "black") return "b";

  // fallback: if PGN contains [White "..."] use white by default
  return "w";
}

function safeSan(move: any): string {
  // chess.js move object often has san property
  if (move && typeof move.san === "string") return move.san;
  return "";
}

/**
 * MVP analysis without Stockfish:
 * - parses the game
 * - selects 5 moves from the chosen side (roughly spread through the game)
 * - returns them as "puzzles" with FEN before the move + SAN move
 *
 * This keeps the service deployable. We'll reintroduce real Stockfish later
 * using a compatible engine/WASM.
 */
export async function analyzeGame(pgn: string, focusColor?: FocusColor): Promise<Puzzle[]> {
  const chess = new Chess();

  const ok = chess.load_pgn(pgn, { sloppy: true });
  if (!ok) {
    throw new Error("Invalid PGN");
  }

  const focus = pickFocusColorFromPgn(pgn, focusColor);

  // Replay game while capturing positions before each move
  const chess2 = new Chess();
  const history = chess.history({ verbose: true }) as any[];

  // Indices of moves played by focus side
  const focusMoveIdx: number[] = [];
  for (let i = 0; i < history.length; i++) {
    const isWhiteMove = i % 2 === 0;
    if ((focus === "w" && isWhiteMove) || (focus === "b" && !isWhiteMove)) {
      focusMoveIdx.push(i);
    }
  }

  if (!focusMoveIdx.length) return [];

  // Choose up to 5 moves spread across the game
  const picks: number[] = [];
  const n = Math.min(5, focusMoveIdx.length);
  for (let k = 0; k < n; k++) {
    const pos = Math.floor((k * (focusMoveIdx.length - 1)) / Math.max(1, n - 1));
    picks.push(focusMoveIdx[pos]);
  }

  const puzzles: Puzzle[] = [];
  for (let p = 0; p < picks.length; p++) {
    const targetIdx = picks[p];

    chess2.reset();
    for (let i = 0; i < targetIdx; i++) {
      chess2.move(history[i]);
    }

    const fenBefore = chess2.fen();
    const moveObj = history[targetIdx];
    const san = safeSan(moveObj);

    puzzles.push({
      title: `Best moment #${p + 1}`,
      fen: fenBefore,
      bestMove: san || (moveObj?.from && moveObj?.to ? `${moveObj.from}-${moveObj.to}` : ""),
      description: "MVP selection (Stockfish will be added next)."
    });
  }

  return puzzles;
}

    }

    return selected;
}
