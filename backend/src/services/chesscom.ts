import { ChessGame } from '../types';

interface ChessComGame {
    url: string;
    pgn: string;
    time_control: string;
    end_time: number;
    rated: boolean;
    tcn: string;
    uuid: string;
    initial_setup: string;
    fen: string;
    time_class: string;
    rules: string;
    white: { rating: number; result: string; @id: string; username: string; uuid: string };
black: { rating: number; result: string; @id: string; username: string; uuid: string };
}

interface ArchivesResponse {
    archives: string[];
}

interface GamesResponse {
    games: ChessComGame[];
}

export async function getRecentGames(username: string, limit: number = 20): Promise<ChessGame[]> {
    const archivesUrl = `https://api.chess.com/pub/player/${username}/games/archives`;

    try {
        const archivesRes = await fetch(archivesUrl);
        if (!archivesRes.ok) throw new Error(`Failed to fetch archives: ${archivesRes.statusText}`);
        const archivesData = (await archivesRes.json()) as ArchivesResponse;

        if (archivesData.archives.length === 0) return [];

        // Get the last archive (most recent month)
        const lastArchiveUrl = archivesData.archives[archivesData.archives.length - 1];
        const gamesRes = await fetch(lastArchiveUrl);
        if (!gamesRes.ok) throw new Error(`Failed to fetch games: ${gamesRes.statusText}`);
        const gamesData = (await gamesRes.json()) as GamesResponse;

        // Filter and map
        const games = gamesData.games
            .reverse() // Newest first
            .slice(0, limit)
            .map(game => ({
                id: game.url.split('/').pop() || game.uuid, // Use URL ID or UUID
                url: game.url,
                pgn: game.pgn,
                timeClass: game.time_class,
                white: { username: game.white.username, rating: game.white.rating, result: game.white.result },
                black: { username: game.black.username, rating: game.black.rating, result: game.black.result },
                date: new Date(game.end_time * 1000).toISOString(),
            }));

        return games;
    } catch (error) {
        console.error('Error fetching Chess.com games:', error);
        throw error;
    }
}
