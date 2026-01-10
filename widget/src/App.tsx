import { useState } from "preact/hooks";
import "./index.css";

type Puzzle = {
  title?: string;
  fen: string;
  bestMove?: string;
  description?: string;
};

type BestMomentsResponse = {
  username: string;
  sourceGame?: { url?: string; end_time?: number; time_class?: string };
  puzzles: Puzzle[];
};

declare global {
  interface Window {
    CHESS_TEE?: {
      apiBase?: string;
      variantId?: number;
    };
  }
}

export function App() {
  const config = window.CHESS_TEE || { apiBase: "http://localhost:3000", variantId: 0 };
  const apiBase = config.apiBase || "http://localhost:3000";

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [moments, setMoments] = useState<BestMomentsResponse | null>(null);
  const [selectedPuzzle, setSelectedPuzzle] = useState<Puzzle | null>(null);

  const [previewPng, setPreviewPng] = useState<string | null>(null);

  async function loadBestMoments() {
    if (!username.trim()) return;

    setLoading(true);
    setError("");
    setPreviewPng(null);
    setSelectedPuzzle(null);

    try {
      const res = await fetch(`${apiBase}/api/best-moments?username=${encodeURIComponent(username.trim())}`);
      if (!res.ok) throw new Error("Could not load best moments");
      const data: BestMomentsResponse = await res.json();

      if (!data.puzzles || data.puzzles.length === 0) {
        throw new Error("No moments found");
      }

      setMoments(data);
      setStep(2);
    } catch (e: any) {
      setError(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  async function chooseMoment(p: Puzzle) {
    setSelectedPuzzle(p);
    setStep(3);
    setLoading(true);
    setError("");
    setPreviewPng(null);

    try {
      const res = await fetch(`${apiBase}/api/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          puzzle: p,
          meta: { username: username.trim(), tagline: "Your custom tee preview" },
        }),
      });

      if (!res.ok) throw new Error("Rendering failed");
      const data = await res.json();

      // backend returns { svg, png }
      setPreviewPng(data.png || null);
    } catch (e: any) {
      setError(e?.message || "Error rendering");
      setStep(2);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div class="chess-tee-container" style="max-width: 820px; margin: 0 auto; padding: 24px;">
      <h1 style="margin: 0 0 12px;">Widget test</h1>

      {error && (
        <div style="padding: 12px; background: #ffe4e6; border: 1px solid #fecdd3; margin: 12px 0;">
          {error}
        </div>
      )}

      {step === 1 && (
        <div>
          <h2 style="margin: 18px 0 12px;">Enter your Chess.com username</h2>

          <div style="display: flex; gap: 10px; align-items: center;">
            <input
              value={username}
              onInput={(e) => setUsername(e.currentTarget.value)}
              placeholder="e.g. hikaru"
              style="padding: 10px; font-size: 16px; width: 260px;"
            />
            <button
              disabled={loading || !username.trim()}
              onClick={loadBestMoments}
              style="padding: 10px 14px; font-size: 16px; cursor: 'pointer';"
            >
              {loading ? "Loading..." : "Find my best moments"}
            </button>
          </div>

          <p style="margin-top: 12px;">
            We’ll look at your recent games and propose <b>5 moments</b>. You choose <b>1</b>.
          </p>
        </div>
      )}

      {step === 2 && moments && (
        <div>
          <button onClick={() => setStep(1)} style="padding: 8px 12px; margin: "0 0 16px";">
            ← Back
          </button>

          <h2 style="margin: 0 0 10px;">Choose the moment to print</h2>

          <div style="display: grid; gap: 12px;">
            {moments.puzzles.slice(0, 5).map((p, idx) => (
              <div
                key={idx}
                style="border: 1px solid #e5e7eb; padding: 14px; display: flex; justify-content: space-between; gap: 12px; align-items: center;"
              >
                <div>
                  <div style="font-weight: 800; font-size: 18px;">
                    {p.title || `Best moment #${idx + 1}`}
                  </div>
                  {p.bestMove && <div style="margin-top: 4px;">Best move: <b>{p.bestMove}</b></div>}
                  {p.description && <div style="margin-top: 6px; color: #555;">{p.description}</div>}
                </div>

                <button
                  onClick={() => chooseMoment(p)}
                  style="padding: 10px 12px; font-weight: 700;"
                >
                  Choose this moment
                </button>
              </div>
            ))}
          </div>

          {moments.sourceGame?.url && (
            <p style="margin-top: 16px;">
              Source game:{" "}
              <a href={moments.sourceGame.url} target="_blank" rel="noreferrer">
                open on chess.com
              </a>
            </p>
          )}
        </div>
      )}

      {step === 3 && (
        <div>
          <button onClick={() => setStep(2)} style="padding: 8px 12px; margin: "0 0 16px";">
            ← Back
          </button>

          <h2 style="margin: 0 0 12px;">Your Custom Tee Preview</h2>

          {loading && <p>Generating preview...</p>}

          {!loading && previewPng && (
            <div>
              <img src={previewPng} alt="Preview" style="max-width: 100%; border: 1px solid #e5e7eb;" />
              <p style="margin-top: 10px; color: "#555";">
                Next: we’ll place this design on a T-shirt mockup, then connect Shopify.
              </p>
            </div>
          )}

          {!loading && !previewPng && <p>No preview yet.</p>}
        </div>
      )}
    </div>
  );
}

