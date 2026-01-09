# Chess Tee Generator

A strict MVP for generating custom Chess T-shirts based on Chess.com games, integrated with Shopify.

## Features
- Fetches recent games from Chess.com
- Analyzes games with Stockfish to find "Best Moments"
- Generates SVG Design and PNG Preview
- Adds to Shopify Cart with Print/Preview URLs property

## Architecture
- **Backend**: Node.js, Express, Stockfish (WASM), Satori (SVG), Resvg (PNG).
- **Widget**: Preact, Vite.
- **Storage**: AWS S3 / Cloudflare R2.

## Local Setup

1. **Install Dependencies**
   ```bash
   cd backend && npm install
   cd ../widget && npm install
   ```
   *(Note: Ensure you have Node.js 20+ installed)*

2. **Environment Variables**
   Create `backend/.env` based on `.env.example`:
   ```
   R2_ACCESS_KEY_ID=xxx
   R2_SECRET_ACCESS_KEY=xxx
   R2_BUCKET_NAME=chess-tee-assets
   R2_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
   R2_PUBLIC_URL=https://pub-xxx.r2.dev
   SHOPIFY_DOMAIN=your-shop.myshopify.com
   ```

3. **Run Locally**
   You can run backend and widget separately for dev:
   - Backend: `cd backend && npm run dev`
   - Widget: `cd widget && npm run dev`

   Or via Docker:
   ```bash
   docker-compose up --build
   ```

## Deployment
Deploy the `Dockerfile` to any provider (Render, Fly.io, Railway).
Ensure environment variables are set.

## Shopify Integration

### 1. Create Product
1. Create a "Custom Chess Tee" product in Shopify.
2. Note the **Variant ID** (URL ends in `/variants/123456789`).

### 2. Add Snippet
Create a page in Shopify (e.g. `/pages/create`) and add a **Custom Liquid** section (or edit HTML) with:

```html
<div id="chess-tee-generator"></div>

<script>
  window.CHESS_TEE = {
    apiBase: "https://your-deployed-backend.com", // REPLACE THIS
    variantId: 123456789 // REPLACE THIS
  };
</script>

<script src="https://your-deployed-backend.com/widget.js" async></script>
<link rel="stylesheet" href="https://your-deployed-backend.com/widget/index.css">
```
*(Note: You might need to adjust the CSS link depending on how the build output is served - currently served at `/widget/index.css` via backend static)*

### 3. Fulfillment
When an order comes in:
1. Check the Line Item Properties.
2. "PrintFileUrl" is the link to the SVG.
3. Send this SVG to Printful/Printify manually.

## Verification
- Open the Widget page.
- Enter a username (e.g. `hikaru`).
- Select a game.
- Wait for analysis & preview.
- Click "Add to Cart".
- Check Cart for line item properties.
