export interface ChessPlayer {
    username: string;
    rating: number;
    result: string;
}

export interface ChessGame {
    id: string;
    url: string;
    pgn: string;
    timeClass: string;
    white: ChessPlayer;
    black: ChessPlayer;
    date: string;
}

export interface Puzzle {
    fen: string;
    turn: 'w' | 'b';
    bestMoveUci: string;
    playedUci: string;
    ply: number;
    evalCp?: number;
    mate?: number;
}
