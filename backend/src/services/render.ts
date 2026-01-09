import satori from 'satori';
// import { Resvg } from '@resvg/resvg-js'; 
// Note: Imports might be tricky with some versions, using require pattern if needed or import
import { Resvg } from '@resvg/resvg-js';
import { html } from 'satori-html';
import { Puzzle } from '../types';
import { uploadFile } from './upload';
import fs from 'fs';
import path from 'path';

// Load a font
const fontPath = path.join(process.cwd(), 'assets', 'Inter-Regular.ttf');
let fontData: Buffer;
try {
    // Ensure assets folder exists or read from somewhere
    // For MVP we might need to download a font or rely on system (Satori needs font data)
    // We will mock this or require a font file to be present
    // fontData = fs.readFileSync(fontPath);
} catch (e) {
    console.warn("Font not found, using empty buffer (will fail text render)");
    fontData = Buffer.alloc(0);
}

// Helper to generate SVG for a single board
// We need a way to render a chessboard.
// Option A: Use a library. Option B: Draw rects.
// Satori supports HTML/CSS. We can draw the board with CSS Grid.
// We need piece images (SVGs/PNGs). 
// For MVP, simple CSS board.

const PIECE_URLS: Record<string, string> = {
    'p': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
    'r': 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
    'n': 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
    'b': 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
    'q': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
    'k': 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
    'P': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
    'R': 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
    'N': 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
    'B': 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
    'Q': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
    'K': 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
};

function fenToBoard(fen: string) {
    const rows = fen.split(' ')[0].split('/');
    const board: (string | null)[][] = [];
    for (const rowVal of rows) {
        const row: (string | null)[] = [];
        for (const char of rowVal) {
            if (/\d/.test(char)) {
                for (let i = 0; i < parseInt(char); i++) row.push(null);
            } else {
                row.push(char);
            }
        }
        board.push(row);
    }
    return board;
}

async function renderPuzzleCard(puzzle: Puzzle) {
    const board = fenToBoard(puzzle.fen);

    // HTML Template for Satori
    // Needs to return a React-element-like object. satori-html helps parsing strings.
    // Simplifying logic: Just creating a big string of HTML

    let squares = '';
    board.forEach((row, r) => {
        row.forEach((piece, c) => {
            const isDark = (r + c) % 2 === 1;
            const bg = isDark ? '#B58863' : '#F0D9B5';
            let pieceImg = '';
            if (piece) {
                pieceImg = `<img src="${PIECE_URLS[piece]}" style="width: 100%; height: 100%;" />`;
            }
            squares += `<div style="display: flex; width: 40px; height: 40px; background-color: ${bg}; align-items: center; justify-content: center;">${pieceImg}</div>`;
        });
    });

    const markup = `
    <div style="display: flex; flex-direction: column; align-items: center; width: 340px; height: 400px; background: white; border: 1px solid #333; padding: 10px;">
        <div style="display: flex; flex-wrap: wrap; width: 320px; height: 320px; border: 2px solid #555;">
            ${squares}
        </div>
        <div style="margin-top: 10px; font-size: 16px; font-family: sans-serif;">
            ${puzzle.turn === 'w' ? 'White' : 'Black'} to play
        </div>
    </div>
    `;

    // @ts-ignore
    const svg = await satori(html(markup), {
        width: 340,
        height: 400,
        fonts: [
            // Minimal font config or default
            {
                name: 'Inter',
                data: await loadFont(), // Need to implement
                weight: 400,
                style: 'normal',
             {
                name: 'Inter',
                data: font,
                weight: 400,
                style: 'normal',
            },
        ],
    });

    // Convert to PNG for preview
    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 800 } });
    const pngBuffer = resvg.render().asPng();
    const svgBuffer = Buffer.from(svg);

    const id = Date.now().toString();
    const svgUrl = await uploadFile(svgBuffer, `designs/${id}.svg`, 'image/svg+xml');
    const previewUrl = await uploadFile(pngBuffer, `previews/${id}.png`, 'image/png');

    return { designId: id, printFileUrl: svgUrl, previewUrl };
}
