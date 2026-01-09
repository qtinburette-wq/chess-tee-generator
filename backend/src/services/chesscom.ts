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

async function fetchJson<T>(url: string): Promise<T> {
  // Node 20 a fetch natif
  const res = await fetch(url, {
    headers: { "User-Agent": "chess-tee-generator/1.0" }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Chess.com API error ${res.status}: ${text || url}`);
  }

  return (await res.json()) as T;
}

export async function getRecentGames(username: string): Promise<ChessComGame[]> {
  const u = (username || "").trim();
  if (!u) throw new Error("Username required");

  const archivesUrl = `https://api.chess.com/pub/player/${encodeURIComponent(u)}/games/archives`;
  const archivesData = await fetchJson<{ archives: string[] }>(archivesUrl);
  const archives = archivesData?.archives || [];
  if (!archives.length) return [];

  const latestArchiveUrl = archives[archives.length - 1];
  const gamesData = await fetchJson<{ games: ChessComGame[] }>(latestArchiveUrl);
  const games = gamesData?.games || [];

  games.sort((a, b) => (b.end_time || 0) - (a.end_time || 0));
  return games;
}
