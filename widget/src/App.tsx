import { useState } from "preact/hooks";
import "./index.css";

// Types
interface Game {
  id: string;
  white: { username: string; rating: number; result: string };
  black: { username: string; rating: number; result: string };
  date: string;
  url: string;
  pgn: string;
  timeClass: string;
}

interface Puzzle {
  title: string;
  bestMove: string;
  description?: string;
}

interface RenderResult {
  svg: string;
  png: string;
}

declare global {
  interface Window {
    CHESS_TEE: {
      apiBase: string;
    };
  }
}

export function App() {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [games, setGames] = useState<Game[]>([]);
  const [moments, setMoments] = useState<Puzzle[]>([]);
  const [selectedMoment, setSelectedMoment] = useState<Puzzle | null>(null);
  const [renderResult, setRenderResult] = useState<RenderResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const apiBase =
    window.CHESS_TEE?.apiBase || "https://chess-tee-generator.onrender.com";

  // STEP 1 — Load games
  const loadGames = async () => {
    if (!username) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `${apiBase}/api/chesscom/games?username=${username}`
      );
      if (!res.ok) throw new Error("Failed to load games");
      const data = await res.json();
      setGames(data.games);
      setStep(2);
    } catch (e: any) {
      setError(e.message || "Error loading games");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2 — Analyze one game → get 5 moments
  const analyzeGame = async (game: Game) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${apiBase}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pgn: game.pgn }),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      setMoments(data.puzzles);
      setStep(3);
    } catch (e: any) {
      setError(e.message || "Analysis error");
    } finally {
      setLoading(false);
    }
  };

  // STEP 3 — Choose 1 moment → render tee
  const chooseMoment = async (moment: Puzzle) => {
    setSelectedMoment(moment);
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${apiBase}/api/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          puzzles: [moment], // ⚠️ ONE PUZZLE ONLY
          meta: { username },
        }),
      });
      if (!res.ok) throw new Error("Render failed");
      const data = await res.json();
      setRenderResult(data);
      setStep(4);
    } catch (e: any) {
      setError(e.message || "Render error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="chess-tee-container">
      {error && <div class="error">{error}</div>}

      {/* STEP 1 */}
      {step === 1 && (
        <div>
          <h2>Enter your Chess.com username</h2>
          <input
            value={username}
            onInput={(e) => setUsername(e.currentTarget.value)}
            placeholder="PatesAuxLardons"
          />
          <button disabled={loading} onClick={loadGames}>
            {loading ? "Loading..." : "Find my best moments"}
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div>
          <button
            onClick={() => setStep(1)}
            style={{ padding: "8px 12px", margin: "0 0 16px 0" }}
          >
            ← Back
          </button>

          <h2>Select a game</h2>

          {games.map((game) => (
            <div
              key={game.id}
              class="game-card"
              onClick={() => analyzeGame(game)}
            >
              <strong>
                {game.white.username} vs {game.black.username}
              </strong>
              <div>
                {game.timeClass} •{" "}
                {new Date(game.date).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && moments && (
        <div>
          <button
            onClick={() => setStep(2)}
            style={{ padding: "8px 12px", margin: "0 0 16px 0" }}
          >
            ← Back
          </button>

          <h2>Choose the moment to print</h2>

          {moments.map((m, i) => (
            <div key={i} class="moment-card">
              <strong>{m.title}</strong>
              <div>Best move: {m.bestMove}</div>
              {m.description && <div>{m.description}</div>}
              <button onClick={() => chooseMoment(m)}>Choose</button>
            </div>
          ))}
        </div>
      )}

      {/* STEP 4 */}
      {step === 4 && renderResult && (
        <div>
          <button
            onClick={() => setStep(3)}
            style={{ padding: "8px 12px", margin: "0 0 16px 0" }}
          >
            ← Back
          </button>

          <h2>Your Custom Tee Preview</h2>
          <img src={renderResult.png} style={{ maxWidth: "100%" }} />
        </div>
      )}
    </div>
  );
}

