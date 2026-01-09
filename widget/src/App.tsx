import { useState, useEffect } from 'preact/hooks';
import './index.css';

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

interface RenderResult {
    designId: string;
    printFileUrl: string;
    previewUrl: string;
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
    const [step, setStep] = useState(1);
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [games, setGames] = useState<Game[]>([]);
    const [selectedGame, setSelectedGame] = useState<Game | null>(null);
    const [renderResult, setRenderResult] = useState<RenderResult | null>(null);
    const [error, setError] = useState('');

    const config = window.CHESS_TEE || { apiBase: 'http://localhost:3000', variantId: 0 };

    const loadGames = async () => {
        if (!username) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${config.apiBase}/api/chesscom/games?username=${username}`);
            if (!res.ok) throw new Error('Failed to fetch games');
            const data = await res.json();
            setGames(data.games);
            setStep(2);
        } catch (e: any) {
            setError(e.message || 'Error loading games');
        } finally {
            setLoading(false);
        }
    };

    const processGame = async (game: Game) => {
        setSelectedGame(game);
        setStep(3);
        setLoading(true);
        setError('');

        try {
            // 1. Analyze
            const analyzeRes = await fetch(`${config.apiBase}/api/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pgn: game.pgn })
            });
            if (!analyzeRes.ok) throw new Error('Analysis failed');
            const analyzeData = await analyzeRes.json();

            // 2. Render
            const renderRes = await fetch(`${config.apiBase}/api/render`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    puzzles: analyzeData.puzzles,
                    meta: { username, gameUrl: game.url }
                })
            });
            if (!renderRes.ok) throw new Error('Rendering failed');
            const renderData = await renderRes.json();

            setRenderResult(renderData);
        } catch (e: any) {
            setError(e.message || 'Processing failed');
            setStep(2); // Go back
        } finally {
            setLoading(false);
        }
    };

    const addToCart = async () => {
        if (!renderResult || !selectedGame) return;
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('id', String(config.variantId));
            formData.append('quantity', '1');
            formData.append('properties[DesignId]', renderResult.designId);
            formData.append('properties[PreviewUrl]', renderResult.previewUrl);
            formData.append('properties[PrintFileUrl]', renderResult.printFileUrl);
            formData.append('properties[ChessUsername]', username);
            formData.append('properties[GameUrl]', selectedGame.url);

            const res = await fetch('/cart/add.js', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) throw new Error('Failed to add to cart');

            // Redirect to cart or show success
            window.location.href = '/cart';
        } catch (e: any) {
            setError('Could not add to cart (Simulated in local dev?)');
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div class="chess-tee-container">
            {error && <div class="error">{error}</div>}

            {step === 1 && (
                <div class="step-1">
                    <h2>Enter Chess.com Username</h2>
                    <div class="input-group">
                        <input
                            type="text"
                            value={username}
                            onInput={(e) => setUsername(e.currentTarget.value)}
                            placeholder="e.g. hikaru"
                        />
                        <button disabled={loading || !username} onClick={loadGames}>
                            {loading ? 'Loading...' : 'Find Games'}
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div class="step-2">
                    <button class="back-btn" onClick={() => setStep(1)}>← Back</button>
                    <h2>Select a Game</h2>
                    <div class="game-list">
                        {games.map(game => {
                            const isWhite = game.white.username.toLowerCase() === username.toLowerCase();
                            const opponent = isWhite ? game.black : game.white;
                            const userResult = isWhite ? game.white.result : game.black.result;
                            const colorClass = userResult === 'win' ? 'win' : userResult === 'checkmated' ? 'loss' : 'draw';

                            return (
                                <div class="game-card" onClick={() => processGame(game)}>
                                    <div class={`result-indicator ${colorClass}`}></div>
                                    <div class="game-info">
                                        <div class="opponent">vs {opponent.username} ({opponent.rating})</div>
                                        <div class="meta">{game.timeClass} • {new Date(game.date).toLocaleDateString()}</div>
                                    </div>
                                    <div class="select-btn">Select</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {step === 3 && (
                <div class="step-3">
                    <button class="back-btn" onClick={() => setStep(2)}>← Back to Games</button>
                    <h2>Your Custom Tee</h2>

                    {loading ? (
                        <div class="loading-state">
                            <div class="spinner"></div>
                            <p>Analyzing game and generating design...</p>
                            <p class="sub-text">(This takes about 10-15 seconds)</p>
                        </div>
                    ) : (
                        <div class="preview-container">
                            {renderResult && (
                                <img src={renderResult.previewUrl} alt="Design Preview" class="design-preview" />
                            )}
                            <div class="actions">
                                <button class="add-to-cart-btn" onClick={addToCart}>
                                    Add to Cart - $29.99
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
