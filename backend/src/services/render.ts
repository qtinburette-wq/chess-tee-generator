import { Resvg } from "@resvg/resvg-js";

export type Puzzle = {
  title?: string;
  bestMove?: string;
  description?: string;

  // NEW: we will render real chessboards from this
  fen?: string;
};

export type RenderMeta = {
  username?: string;
  tagline?: string;
};

function escapeHtml(text: string): string {
  return (text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// -----------------------------
// Chessboard from FEN (simple + correct)
// -----------------------------
type Theme = {
  light: string;
  dark: string;
  border: string;
};

const DEFAULT_THEME: Theme = {
  light: "#F3F4F6",
  dark: "#111827",
  border: "#111827"
};

const PIECE_UNICODE: Record<string, string> = {
  K: "♔",
  Q: "♕",
  R: "♖",
  B: "♗",
  N: "♘",
  P: "♙",
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟"
};

function parseFenBoard(fen: string): (string | null)[][] {
  const placement = (fen || "").split(" ")[0] || "";
  const ranks = placement.split("/");
  if (ranks.length !== 8) throw new Error("Invalid FEN (ranks)");

  return ranks.map((rankStr) => {
    const row: (string | null)[] = [];
    for (const ch of rankStr) {
      if (/\d/.test(ch)) {
        const n = Number(ch);
        for (let i = 0; i < n; i++) row.push(null);
      } else {
        row.push(ch);
      }
    }
    if (row.length !== 8) throw new Error("Invalid FEN (files)");
    return row;
  });
}

/**
 * Returns the INNER SVG content (no outer <svg>...</svg> wrapper)
 * so we can embed it in a parent SVG with <g transform="...">.
 */
function boardSvgInnerFromFen(opts: {
  fen: string;
  size: number; // px
  theme?: Partial<Theme>;
  whiteAtBottom?: boolean;
}): string {
  const size = opts.size;
  const theme: Theme = { ...DEFAULT_THEME, ...(opts.theme || {}) };
  const sq = size / 8;

  const board = parseFenBoard(opts.fen);
  const whiteAtBottom = opts.whiteAtBottom ?? true;

  const getPieceAt = (r: number, f: number) => {
    if (whiteAtBottom) return board[r][f];
    return board[7 - r][7 - f];
  };

  let squares = "";
  let pieces = "";

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const isDark = (r + f) % 2 === 1;
      const x = f * sq;
      const y = r * sq;

      squares += `<rect x="${x}" y="${y}" width="${sq}" height="${sq}" fill="${
        isDark ? theme.dark : theme.light
      }" />`;

      const p = getPieceAt(r, f);
      if (p) {
        const glyph = PIECE_UNICODE[p] ?? "";
        // Works well for MVP; later we can switch to custom SVG piece set.
        pieces += `
<text x="${x + sq / 2}" y="${y + sq / 2}"
  text-anchor="middle" dominant-baseline="central"
  font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, system-ui"
  font-size="${sq * 0.78}">
  ${escapeHtml(glyph)}
</text>`;
      }
    }
  }

  // border last so it sits on top
  const border = `<rect x="0" y="0" width="${size}" height="${size}" fill="none" stroke="${theme.border}" stroke-width="2" />`;

  return `${squares}\n${pieces}\n${border}`;
}

// -----------------------------
// Main render
// -----------------------------
export async function generateDesign(puzzles: Puzzle[], meta: RenderMeta = {}) {
  const width = 1200;
  const height = 1600;

  const username = meta.username ? `@${meta.username}` : "@chess-tee";
  const tagline = meta.tagline || "Your best chess moments";

  const topPuzzles = puzzles.slice(0, 5);

  let y = 160;
  const lines: string[] = [];

  lines.push(
    `<text x="80" y="100" font-size="56" font-family="Arial" font-weight="700" fill="#111">
      ${escapeHtml(username)}
    </text>`
  );

  lines.push(
    `<text x="80" y="140" font-size="26" font-family="Arial" fill="#444">
      ${escapeHtml(tagline)}
    </text>`
  );

  lines.push(
    `<line x1="80" y1="180" x2="${width - 80}" y2="180" stroke="#ddd" stroke-width="2" />`
  );

  for (let i = 0; i < topPuzzles.length; i++) {
    const p = topPuzzles[i];

    lines.push(
      `<text x="80" y="${y}" font-size="30" font-family="Arial" font-weight="700" fill="#111">
        ${escapeHtml(p.title || `Puzzle ${i + 1}`)}
      </text>`
    );
    y += 40;

    if (p.bestMove) {
      lines.push(
        `<text x="80" y="${y}" font-size="24" font-family="Arial" fill="#222">
          Best move: ${escapeHtml(p.bestMove)}
        </text>`
      );
      y += 34;
    }

    if (p.description) {
      lines.push(
        `<text x="80" y="${y}" font-size="22" font-family="Arial" fill="#555">
          ${escapeHtml(p.description)}
        </text>`
      );
      y += 32;
    }

    y += 18;

    // NEW: draw chessboard if we have a FEN
    if (p.fen) {
      const boardSize = 320; // tweak later
      const inner = boardSvgInnerFromFen({
        fen: p.fen,
        size: boardSize,
        theme: { light: "#F3F4F6", dark: "#111827", border: "#111827" }
      });

      // Embed board under the text
      lines.push(`<g transform="translate(80, ${y})">${inner}</g>`);
      y += boardSize + 26;
    } else {
      // If no FEN, keep spacing consistent
      y += 20;
    }

    lines.push(
      `<line x1="80" y1="${y}" x2="${width - 80}" y2="${y}" stroke="#eee" stroke-width="1" />`
    );
    y += 50;
  }

  lines.push(
    `<text x="80" y="${height - 80}" font-size="20" font-family="Arial" fill="#777">
      Generated by chess-tee-generator
    </text>`
  );

  const svg = `
<svg
  width="${width}"
  height="${height}"
  viewBox="0 0 ${width} ${height}"
  xmlns="http://www.w3.org/2000/svg"
>
  <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />
  ${lines.join("\n")}
</svg>
`.trim();

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    background: "#ffffff" // ensures PNG is never transparent/blank
  });

  const pngBuffer = resvg.render().asPng();
  const pngBase64 = Buffer.from(pngBuffer).toString("base64");

  return {
    svg,
    png: `data:image/png;base64,${pngBase64}`
  };
}
