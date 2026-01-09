// backend/src/services/chesscom.ts

export type ChessComGame = {
  url?: string;
  pgn?: string;
  end_time?: number;
  time_control?: string;
  rated?: boolean;
  rules?: string;
  white?: { username?: string; rating?: number; result?: string };
  black?: { username?: string; rating?: number; result?: string };
};

function assertUsername(username: string) {
  const u = (username || "").trim();
  if (!u) throw new Error("Username required");
  // chess.com usernames: letters/numbers/underscore/hyphen (en pratique)
  if (!/^[a-zA-Z0-9_-]{2,30}$/.test(u)) {
    throw new Error("Invalid username format");
  }
  return u;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": "chess-tee-generator/1.0" },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Chess.com API error ${res.status}: ${text || url}`);
  }

  return (await res.json()) as T;
}

/**
 * Returns recent games from the latest available archive (usually current/last month)
 */
export async function getRecentGames(username: string): Promise<ChessComGame[]> {
  const u = assertUsername(username);

  // 1) Get archives list
  const archivesUrl = `https://api.chess.com/pub/player/${encodeURIComponent(u)}/games/archives`;
  const archivesData = await fetchJson<{ archives: string[] }>(archivesUrl);

  const archives = archivesData?.archives || [];
  if (!archives.length) return [];

  // 2) Take the latest archive
  const latestArchiveUrl = archives[archives.length - 1];

  // 3) Fetch games from that archive
  const gamesData = await fetchJson<{ games: ChessComGame[] }>(latestArchiveUrl);
  const games = gamesData?.games || [];

  // 4) Sort newest first
  games.sort((a, b) => (b.end_time || 0) - (a.end_time || 0));

  return games;
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
