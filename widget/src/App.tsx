import { useState } from "preact/hooks";
import "./index.css";

// Types
interface Puzzle {
  title?: string;
  fen?: string;
  bestMove?: string;
  description?: string;
}

interface PuzzlesResponse {
  username: string;
  sourceGame?: {
    url?: string;
    end_time?: number;
    time_class?: string;
  };
  puzzles: Puzzle[];
}

interface RenderResponse {
  svg: string;
  png: string; // data:image/png;base64,...
}

declare global {
  interface Window {
    CHESS_TEE: {
      apiBase: string;
      variantId: number;
    };
  }
}

export function App() {
  // Steps:
  // 1 = enter username
  // 2 = choose puzzle (among 5)
  // 3 = preview + add to cart
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [selectedPuzzle, setSelectedPuzzle] = useState<Puzzle | null>(null);

  const [sourceGameUrl, setSourceGameUrl] = useState<string>("");
  const [previewPng, setPreviewPng] = useState<string>(""); // data url
  const [error, setError] = useState("");

  // Config (Shopify will inject this)
  const config = window.CHESS_TEE || {
    apiBase: "https://chess-tee-generator.onrender.com",
    variantId: 0
  };

  // --------------------
  // Step 1 -> load 5 puzzles
  // --------------------
  const loadPuzzles = async () => {
    if (!username.trim()) return;

    setLoading(true);
    setError("");
    setPuzzles([]);
    setSelectedPuzzle(null);
    setPreviewPng("");
    setSourceGameUrl("");

    try {
      const res = await fetch(
        `${config.apiBase}/api/puzzles?username=${encodeURIComponent(
          username.trim()
        )}`
      );
      if (!res.ok) throw new Error("Could not load puzzles");

      const data: PuzzlesResponse = await res.json();

      setPuzzles(data.puzzles || []);
      setSourceGameUrl(data?.sourceGame?.url || "");
      setStep(2);
    } catch (e: any) {
      setError(e?.message || "Error loading puzzles");
    } finally {
      setLoading(false);
    }
  };

  // --------------------
  // Step 2 -> choose 1 puzzle -> render
  // --------------------
  const choosePuzzleAndRender = async (puzzle: Puzzle) => {
    setSelectedPuzzle(puzzle);
    setLoading(true);
    setError("");
    setPreviewPng("");
    setStep(3);

    try {
      const res = await fetch(`${config.apiBase}/api/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // IMPORTANT: send ONE puzzle (inside an array of 1 because backend expects puzzles[])
        body: JSON.stringify({
          puzzles: [puzzle],
          meta: {
            username: username.trim(),
            tagline: "Choose your best moment",
            gameUrl: sourceGameUrl
          }
        })
      });

      if (!res.ok) throw new Error("Rendering failed");
      const data: RenderResponse = await res.json();

      // png is a data URL already
      setPreviewPng(data.png || "");
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Rendering failed");
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  // --------------------
  // Add to cart (Shopify)
  // --------------------
  const addToCart = async () => {
    if (!previewPng || !selectedPuzzle) return;

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("id", String(config.variantId));
      formData.append("quantity", "1");

      // Store useful info for the order
      formData.append("properties[ChessUsername]", username.trim());
      if (sourceGameUrl) formData.append("properties[GameUrl]", sourceGameUrl);

      formData.append("properties[PuzzleTitle]", selectedPuzzle.title || "");
      formData.append("properties[FEN]", selectedPuzzle.fen || "");
      formData.append("properties[BestMove]", selectedPuzzle.bestMove || "");

      // This is the preview image (data url) — later we’ll upload it to S3/Cloudinary
      formData.append("properties[PreviewPNG]", previewPng);

      const res = await fetch("/cart/add.js", {
        method: "POST",
        body: formData
      });

      if (!res.ok) throw new Error("Failed to add to cart");
      window.location.href = "/cart";
    } catch (e: any) {
      console.error(e);
      setError(
        e?.message ||
          "Could not add to cart (if you're testing locally, Shopify cart might not exist)"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="chess-tee-container">
      {error && <div class="error">{error}</div>}

      {/* STEP 1 */}
      {step === 1 && (
        <div class="step-1">
          <h2>Enter your Chess.com username</h2>

          <div class="input-group">
            <input
              type="text"
              value={username}
              onInput={(e) => setUsername(e.currentTarget.value)}
              placeholder="e.g. PatesAuxLardons"
            />

            <button disabled={loading || !username.trim()} onClick={loadPuzzles}>
              {loading ? "Loading..." : "Find my best moments"}
            </button>
          </div>

          <p class="sub-text">
            We’ll look at your recent games and propose 5 moments. You choose 1.
          </p>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div class="step-2">
          <button class="back-btn" onClick={() => setStep(1)}>
            ← Back
          </button>

          <h2>Choose the moment to print</h2>

          {puzzles.length === 0 ? (
            <div class="loading-state">
              <p>No puzzles found. Try another username.</p>
            </div>
          ) : (
            <div class="game-list">
              {puzzles.map((p, idx) => (
                <div
                  class="game-card"
                  onClick={() => choosePuzzleAndRender(p)}
                >
                  <div class="game-info">
                    <div class="opponent">
                      {p.title || `Moment #${idx + 1}`}
                    </div>

                    <div class="meta">
                      {p.bestMove ? (
                        <span>Best move: {p.bestMove}</span>
                      ) : (
                        <span>Best move: ?</span>
                      )}
                    </div>

                    {p.description && (
                      <div class="meta">{p.description}</div>
                    )}
                  </div>

                  <div class="select-btn">Choose</div>
                </div>
              ))}
            </div>
          )}

          {sourceGameUrl && (
            <p class="sub-text">
              Source game:{" "}
              <a href={sourceGameUrl} target="_blank" rel="noreferrer">
                open on chess.com
              </a>
            </p>
          )}
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div class="step-3">
          <button class="back-btn" onClick={() => setStep(2)}>
            ← Back to choices
          </button>

          <h2>Your Custom Tee Preview</h2>

          {loading ? (
            <div class="loading-state">
              <div class="spinner"></div>
              <p>Generating your design...</p>
            </div>
          ) : (
            <div class="preview-container">
              {previewPng ? (
                <img
                  src={previewPng}
                  alt="Design Preview"
                  class="design-preview"
                />
              ) : (
                <div class="loading-state">
                  <p>No preview yet.</p>
                </div>
              )}

              <div class="actions">
                <button
                  class="add-to-cart-btn"
                  disabled={!previewPng || loading}
                  onClick={addToCart}
                >
                  Add to Cart
                </button>
              </div>

              {selectedPuzzle?.title && (
                <p class="sub-text">Selected: {selectedPuzzle.title}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
