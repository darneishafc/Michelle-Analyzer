# Liftfolio — Trade Analyzer

Replay trade analyzer (entries vs exits, in R) with a built-in Claude coach.
React frontend + small Express backend that holds your Anthropic API key so it
never reaches the browser.

## Run locally

```bash
npm install
# terminal 1 — backend (holds the key)
ANTHROPIC_API_KEY=sk-ant-... npm start
# terminal 2 — frontend dev server (proxies /api to :3000)
npm run dev
```

Open the dev URL Vite prints. For a production-style run: `npm run build` then
`ANTHROPIC_API_KEY=sk-ant-... npm start` and open http://localhost:3000.

## Deploy on Hostinger (Business or Cloud plan)

1. hPanel → **Websites** → **Add Website** → **Node.js Apps**.
2. Choose **Import Git Repository** (recommended — auto-redeploys on every push)
   or **Upload your website files** (upload this folder zipped).
3. In **Build settings**:
   - Framework: **Express.js** (or **Other** if not detected).
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
   - **Entry file:** `server.js`
   - Node version: 18, 20, 22, or 24.
4. Open the app's **Environment Variables** and add:
   - `ANTHROPIC_API_KEY` = your key from console.anthropic.com
5. **Deploy.** When it finishes, open the temporary URL and test the chat.
6. Connect your domain (e.g. liftfolio.com) to this website in hPanel.

The app must run as a **server-side** app so `/api/chat` works. If Hostinger
treats it as a static React site, the chat won't respond — re-check that the
entry file is `server.js` and the framework is Express/Other, then redeploy.

## How the key stays safe

The browser calls `/api/chat` on your own server. `server.js` adds the
`x-api-key` header and forwards to Anthropic. The key lives only in the server's
environment variable — it is never sent to or visible in the browser.
