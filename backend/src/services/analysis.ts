import { Chess } from "chess.js";

export type Puzzle = {
  title?: string;
  fen?: string;
  bestMove?: string;
  description?: string;
};

type FocusColor = "white" | "black" | undefined;

function pickFocus(focusColor?: FocusColor): "w" | "b" {
  if (focusColor === "black") return "b";
  return "w";
}

function moveToLabel(move: any): string {
  if (move && typeof move.san === "string" && move.san.trim()) return move.san;
  if (move && move.from && move.to) return `${move.from}-${move.to}`;
  return "";
}

/**
 * MVP (no Stockfish):
 * - parse PGN
 * - pick up to 5 moves for chosen side (spread across game)
 * - return puzzles with FEN before the move + SAN label
 */
export async function analyzeGame(
  pgn: string,
  focusColor?: FocusColor
): Promise<Puzzle[]> {
  const chess = new Chess();
  const ok = chess.load_pgn(pgn, { sloppy: true });

  if (!ok) {
    throw new Error("Invalid PGN");
  }

  const focus = pickFocus(focusColor);

  // Get verbose history from chess.js
  const history = chess.history({ verbose: true }) as any[];

  // Indices of moves made by focus side
  const focusMoveIdx: number[] = [];
  for (let i = 0; i < history.length; i++) {
    const isWhiteMove = i % 2 === 0;
    if ((focus === "w" && isWhiteMove) || (focus === "b" && !isWhiteMove)) {
      focusMoveIdx.push(i);
    }
  }

  if (focusMoveIdx.length === 0) return [];

  // Choose up to 5 moves spread across the available focus moves
  const count = Math.min(5, focusMoveIdx.length);
  const chosen: number[] = [];
  for (let k = 0; k < count; k++) {
    const pos =
      count === 1
        ? 0
        : Math.floor((k * (focusMoveIdx.length - 1)) / (count - 1));
    chosen.push(focusMoveIdx[pos]);
  }

  const replay = new Chess();
  const puzzles: Puzzle[] = [];

  for (let p = 0; p < chosen.length; p++) {
    const idx = chosen[p];

    replay.reset();
    for (let i = 0; i < idx; i++) {
      replay.move(history[i]);
    }

    const fenBefore = replay.fen();
    const moveObj = history[idx];

    puzzles.push({
      title: `Best moment #${p + 1}`,
      fen: fenBefore,
      bestMove: moveToLabel(moveObj),
      description: "MVP selection (Stockfish will be added next)."
    });
  }

  return puzzles;
}
