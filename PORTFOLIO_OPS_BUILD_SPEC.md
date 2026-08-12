# Portfolio Ops — Build & Deployment Spec

Hand this whole document to Claude Code in VS Code. It's self-contained: requirements,
architecture, every file's full content, and a sequence of copy-paste prompts to execute
in order. Each prompt assumes the previous one finished successfully.

**Before you start:** replace `hrushi23` below with your actual GitHub username if it's
different, and replace `YOUR_EMAIL_HERE` with the email tied to your GitHub account (used
for git commits). Also have your GitHub repo URL ready before Prompt 1.

---

## 1. What this is

A shared web dashboard for two people jointly tracking a stock portfolio. It replaces a
daily 15–30 min phone call with:

- A **Holdings** table — auto-researches a new ticker (price, 20/50/200-day MA, RSI, buy
  zone, short/long-term signal) via live web search, no manual data entry
- An **Events** calendar — auto-fetches the current month's US market-moving events (FOMC,
  CPI, PPI, jobs report) with real dates
- A **Daily Brief** — one button, generates a fresh AI-researched summary of news, price
  moves, and event outcomes for every holding, with explicit buy/sell/hold action flags
- A **Goal Tracker** — tracks progress toward a 20% annual return target

Both people see the same data because it's stored in a shared database, not per-device
storage.

## 2. Requirements

**Functional**
- Add/remove holdings; adding one auto-fills all fields from live research
- Fetch and merge monthly US market events without duplicating existing ones
- Generate a daily brief on demand, stored in a running history
- Track and persist a portfolio start/current value and show % toward the 20% goal
- All data shared across anyone who opens the deployed URL

**Non-functional**
- API key must never be exposed to the browser — all model calls go through a backend
- Free-tier hosting and database (cost is only the pay-per-use OpenAI API usage)
- Should run locally for testing before every deploy

## 3. Architecture

```
Browser  ->  middleware.js (shared-password gate)  ->  React/Vite frontend
                                                    ->  Vercel serverless functions (/api/*)  ->  OpenAI API (server-side key)
                                                                    |
                                                              Vercel KV (shared data store)
```

- **Frontend**: React + Vite, single dashboard component, plain CSS-in-JS (no external UI
  framework, no external fonts — keeps the free tier simple and avoids extra dependencies)
- **Backend**: Vercel serverless functions under `/api`. Each one is a small Node.js
  handler. The OpenAI API key lives only in Vercel's environment variables, read via
  `process.env.OPENAI_API_KEY`.
- **Storage**: Vercel KV (a hosted Redis). Four keys: `holdings`, `events`, `briefs`,
  `portfolio`. Every reader/writer shares the same keys — no per-user auth, by design,
  since this is a two-person private tool.
- **Access control**: `middleware.js` (Vercel Routing Middleware, runs on every request
  including `/api/*`) gates the entire site behind a single shared password, read from
  `process.env.APP_PASSWORD`. Unauthenticated requests get a self-contained login page;
  a correct password sets an HttpOnly cookie (holding a SHA-256 hash of the password, not
  the password itself) valid for 30 days. If `APP_PASSWORD` is unset, the gate is disabled
  entirely (fail-open) rather than locking everyone out. Note: `vercel dev` does not execute
  Routing Middleware locally for non-Next.js projects (a known Vercel CLI limitation) — it
  only takes effect once actually deployed to Vercel, so test the gate on a real deployment,
  not `vercel dev`.

## 4. Prerequisites checklist

- [ ] Node.js 18+ and npm installed
- [ ] Git installed
- [ ] GitHub account (username: `hrushi23`)
- [ ] Vercel account (sign up with GitHub — faster and links automatically)
- [ ] OpenAI API key from platform.openai.com, with billing enabled (must have access to a
      model that supports the `web_search` tool in the Responses API, e.g. `gpt-4.1`)
- [ ] A shared password picked out for `APP_PASSWORD`, to gate the deployed URL
- [ ] An empty GitHub repo created (e.g. `portfolio-ops`) — don't initialize it with a
      README or .gitignore, this project already has both

---

## 5. Prompts for Claude Code — run these in order

Paste each block as its own message to Claude Code in VS Code, inside this project folder.

### Prompt 1 — Git identity, repo init, branch strategy

```
Configure git for this repo and set up the branch strategy:

1. Set the local git identity for this repository only (not global):
   git config user.name "hrushi23"
   git config user.email "YOUR_EMAIL_HERE"
   (replace YOUR_EMAIL_HERE with my actual GitHub account email before running)

2. Initialize the repo if it isn't already: git init

3. Confirm .gitignore exists and covers: node_modules, dist, .env, .env.local, .vercel,
   .DS_Store — create or fix it if not.

4. Stage and make the initial commit on the default branch, then rename it to "main":
   git add .
   git commit -m "Initial commit: portfolio ops dashboard"
   git branch -M main

5. Create a "dev" branch off main for ongoing work, and switch to it:
   git checkout -b dev

6. Add the GitHub remote (ask me for the repo URL if I haven't given it to you) and push
   both branches:
   git remote add origin <REPO_URL>
   git push -u origin main
   git push -u origin dev

7. Show me the final branch list and remote config to confirm (git branch -a, git remote -v).

Going forward, all feature work happens on branches cut from dev (e.g. dev/add-holding-ui),
gets merged into dev via PR, and only tested, working dev code gets merged into main —
main is what's connected to the production Vercel deployment.
```

### Prompt 2 — Verify/scaffold the project structure

```
Verify this project matches the required structure below. If any file is missing or its
content doesn't match, create/fix it using the exact content from the "Full file contents"
appendix at the end of this spec document.

Required structure:

portfolio-ops/
├── api/
│   ├── _store.js
│   ├── analyze-holding.js
│   ├── briefs.js
│   ├── daily-brief.js
│   ├── events.js
│   ├── fetch-events.js
│   ├── holdings.js
│   └── portfolio.js
├── src/
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── vercel.json
└── vite.config.js

After confirming/fixing the structure, run `npm install` and report any errors.
```

### Prompt 3 — Local environment setup

```
Help me set up local environment variables so I can test the /api routes locally, not just
the frontend:

1. Check if the Vercel CLI is installed globally (vercel --version). If not, install it:
   npm i -g vercel

2. Run `vercel link` and walk me through connecting this folder to a Vercel project (I'll
   need to have already created the project on vercel.com and connected a KV database to
   it — tell me clearly if I need to do that first before this step will work).

3. Once linked, run `vercel env pull .env.local` to pull down the real KV_REST_API_URL and
   KV_REST_API_TOKEN values Vercel generated.

4. Open .env.local and confirm it has KV_REST_API_URL, KV_REST_API_TOKEN, and remind me to
   manually add OPENAI_API_KEY=<my key> to that same file for local testing.

5. Start the dev server with `vercel dev` (not `npm run dev`, since I need the /api routes
   to actually work locally) and tell me what URL to open.
```

### Prompt 4 — Smoke test before deploying

```
Before I deploy, walk me through manually testing each feature locally against the running
`vercel dev` server:

1. Open the app and confirm the Holdings tab loads the seed data (11 positions including
   NVIDIA, Tesla, SpaceX, etc.)
2. Click "Add holding", enter a real ticker like "AMD", and confirm it comes back with
   real-looking price/RSI/MA data within roughly 15-20 seconds (this hits live web search,
   so it's not instant)
3. Go to Events, click "Fetch this month's US market events", confirm real dated events
   appear (not placeholders)
4. Go to Daily Brief, click "Generate today's brief", confirm it returns a multi-section
   brief referencing actual current news
5. Go to Goal Tracker, enter a start and current value, confirm the percentage and progress
   bar update correctly

If any step fails, check the browser console and the terminal running `vercel dev` for the
actual error message from the failing /api route, and help me debug it before moving to
deployment.
```

### Prompt 5 — Deploy to production

```
Deploy this project to Vercel production:

1. Confirm the OPENAI_API_KEY environment variable is set in the Vercel project
   dashboard (Settings -> Environment Variables) — remind me to add it there if I haven't,
   since .env.local only works locally and won't carry over.
2. Confirm the KV database is connected to the project (Storage tab).
3. Merge dev into main (only after the smoke test in Prompt 4 passed):
   git checkout main
   git merge dev
   git push origin main
4. Since main is connected to the Vercel project, pushing to main should trigger an
   automatic production deployment. Confirm this happened by checking the Vercel dashboard
   or running `vercel ls`.
5. Give me the final production URL and confirm it loads correctly.
```

### Prompt 6 — Ongoing workflow (reuse for any future change)

```
I want to make a change: [describe the change here].

Follow this workflow:
1. Make sure I'm on the dev branch and it's up to date with origin/dev
2. Create a new branch off dev named dev/<short-description>
3. Make the change
4. Test it locally with `vercel dev`
5. Commit with a clear message, push the branch, and tell me the exact command to open a
   PR into dev on GitHub
6. Once I confirm the PR is merged, pull the latest dev, and ask me whether I want to
   promote it to main (production) now or batch it with other changes first
```

---

## 6. Environment variables reference

| Variable | Where it's set | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | Vercel project settings + local `.env.local` | Server-side calls to the OpenAI API from `/api` routes |
| `KV_REST_API_URL` | Auto-added by Vercel when you connect a KV database | Vercel KV connection |
| `KV_REST_API_TOKEN` | Auto-added by Vercel when you connect a KV database | Vercel KV connection |
| `APP_PASSWORD` | Vercel project settings + local `.env.local` | Shared password checked by `middleware.js` to gate the whole site. If unset, the site is NOT password-protected. |

Never commit `.env` or `.env.local` — the `.gitignore` already excludes them.

## 7. Not financial advice

The daily brief and holding analysis are generated by an AI model using web search —
useful for surfacing information quickly, but not a substitute for your own judgment or a
licensed financial advisor. Treat the buy zones, signals, and decisions as a starting point
for discussion, not instructions.

---

## 8. Appendix — full file contents

Claude Code: create every file below exactly as shown if it doesn't already exist in the
project (e.g. if working from this spec alone without the pre-built zip).
#### `package.json`

```json
{
  "name": "portfolio-ops",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@vercel/functions": "^1.5.0",
    "@vercel/kv": "^2.0.0",
    "lucide-react": "^0.383.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.0"
  }
}
```

#### `vite.config.js`

```javascript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});

```

#### `vercel.json`

```json
{
  "buildCommand": "vite build",
  "outputDirectory": "dist",
  "framework": "vite"
}

```

#### `.gitignore`

```text
node_modules
dist
.env
.env.local
.vercel
.DS_Store

```

#### `.env.example`

```bash
# Copy this file to .env.local for local development.
# In production, set these as Environment Variables in your Vercel project settings instead.

# Get this from https://platform.openai.com (Settings -> API Keys). Requires billing to be set up.
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# These two are added automatically when you create/link a Vercel KV database to this project
# (Vercel dashboard -> Storage -> Create Database -> KV -> Connect to Project). You normally
# don't need to set these by hand.
KV_REST_API_URL=
KV_REST_API_TOKEN=

# Shared password gate (middleware.js) protecting the whole site, including the /api routes.
# Pick your own password. If this is left unset, the site is NOT password-protected.
APP_PASSWORD=
```

#### `middleware.js`

```javascript
import { next } from "@vercel/functions";

const COOKIE_NAME = "portfolio_auth";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  header.split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    cookies[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  return cookies;
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function loginPage(error) {
  return new Response(
    `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Portfolio Ops — Sign in</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0B0E14; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }
  form { width: 100%; max-width: 320px; padding: 28px; border: 1px solid #1B2028; border-radius: 12px; background: #0E1219; }
  h1 { font-size: 15px; font-weight: 700; color: #E8EAED; letter-spacing: 0.08em; margin: 0 0 4px; }
  p { font-size: 11.5px; color: #6B7280; margin: 0 0 18px; }
  input { width: 100%; background: #0E1219; border: 1px solid #2A3140; color: #E8EAED; padding: 10px 12px; border-radius: 8px; font-size: 13px; outline: none; margin-bottom: 12px; }
  button { width: 100%; background: #E8B94A; color: #0B0E14; border: none; padding: 11px 18px; border-radius: 9px; font-weight: 600; font-size: 13px; cursor: pointer; }
  .error { color: #E86A5C; font-size: 12.5px; margin: -6px 0 12px; }
</style>
</head>
<body>
  <form method="POST" action="/api/login">
    <h1>PORTFOLIO OPS</h1>
    <p>Enter the shared password to continue.</p>
    ${error ? `<div class="error">${error}</div>` : ""}
    <input type="password" name="password" placeholder="Password" autofocus required />
    <button type="submit">Sign in</button>
  </form>
</body>
</html>`,
    { status: 401, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

export const config = {
  matcher: ["/((?!favicon.ico).*)"],
};

export default async function middleware(request) {
  const expected = process.env.APP_PASSWORD;

  // No password configured — don't lock anyone out.
  if (!expected) return next();

  const url = new URL(request.url);
  const expectedHash = await sha256Hex(expected);

  if (request.method === "POST" && url.pathname === "/api/login") {
    const form = await request.formData();
    const password = form.get("password") || "";
    if (password === expected) {
      const res = new Response(null, { status: 303, headers: { Location: "/" } });
      res.headers.append(
        "Set-Cookie",
        `${COOKIE_NAME}=${expectedHash}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`
      );
      return res;
    }
    return loginPage("Wrong password — try again.");
  }

  const cookies = parseCookies(request.headers.get("cookie"));
  if (cookies[COOKIE_NAME] === expectedHash) {
    return next();
  }

  return loginPage(null);
}
```

#### `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Portfolio Ops</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>

```

#### `src/main.jsx`

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

```

#### `src/index.css`

```css
* {
  box-sizing: border-box;
}
html, body, #root {
  margin: 0;
  padding: 0;
  min-height: 100vh;
}
body {
  background: #0B0E14;
}

```

#### `api/_store.js`

```javascript
import { kv } from "@vercel/kv";

// Shared helper: GET returns the stored value (or a default), POST overwrites it.
// Every route using this shares one KV database, so both people see the same data.
export function makeStoreHandler(key, defaultValue) {
  return async function handler(req, res) {
    try {
      if (req.method === "GET") {
        const value = await kv.get(key);
        return res.status(200).json(value ?? defaultValue);
      }
      if (req.method === "POST") {
        const { value } = req.body || {};
        await kv.set(key, value);
        return res.status(200).json({ ok: true });
      }
      return res.status(405).json({ error: "Method not allowed" });
    } catch (err) {
      return res.status(500).json({ error: err.message || "Storage error" });
    }
  };
}

```

#### `api/holdings.js`

```javascript
import { makeStoreHandler } from "./_store.js";
export default makeStoreHandler("holdings", null);

```

#### `api/events.js`

```javascript
import { makeStoreHandler } from "./_store.js";
export default makeStoreHandler("events", null);

```

#### `api/briefs.js`

```javascript
import { makeStoreHandler } from "./_store.js";
export default makeStoreHandler("briefs", []);

```

#### `api/portfolio.js`

```javascript
import { makeStoreHandler } from "./_store.js";
export default makeStoreHandler("portfolio", { startValue: "", currentValue: "" });

```

#### `api/analyze-holding.js`

```javascript
function extractJSON(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.search(/[[{]/);
  if (start === -1) throw new Error("No JSON found in model response");
  const openChar = cleaned[start];
  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === openChar) depth++;
    if (cleaned[i] === closeChar) depth--;
    if (depth === 0) return JSON.parse(cleaned.slice(start, i + 1));
  }
  throw new Error("Unbalanced JSON in model response");
}

function extractText(data) {
  return (data.output || [])
    .filter((item) => item.type === "message")
    .flatMap((item) => (item.content || []).filter((c) => c.type === "output_text").map((c) => c.text))
    .join("\n\n");
}

const INVISIBLE_CHARS_RE = new RegExp(
  "[\\u2060\\u200B\\u200C\\u200D\\u200E\\u200F\\uFEFF\\u{E000}-\\u{F8FF}\\u{F0000}-\\u{FFFFD}\\u{100000}-\\u{10FFFD}]",
  "gu"
);

function stripCitations(text) {
  return text
    .replace(INVISIBLE_CHARS_RE, "")
    .replace(/\s?cite\w*turn\d+\w*\d*/gi, "")
    .replace(/\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\(\s*(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\.[a-z]{2,})?\s*\)/gi, "")
    .replace(/\(\s*\)/g, "");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { ticker } = req.body || {};
  if (!ticker || typeof ticker !== "string") {
    return res.status(400).json({ error: "Missing ticker" });
  }

  const prompt = `The user typed "${ticker}" to add a holding — it may be a company name, fund name, or a ticker symbol already. First, using web search if needed, resolve it to the correct, real stock/ETF ticker symbol (e.g. "Intel" -> "INTC", "Apple" -> "AAPL", "Alphabet" -> "GOOGL"). Use that resolved ticker symbol — never the raw input text — as the "ticker" field in your response.

Then research that stock/ETF using web search. Find its CURRENT price, 20-day moving average, 50-day moving average, 200-day moving average, and RSI (14-day). If a moving average or RSI isn't available (e.g. for some ETFs or newly listed names), use null.

Then do the analysis: figure out the sector, a one-line description of what the company/fund does, what tends to move the price up, what tends to move it down, and what upcoming events/catalysts to watch (earnings dates, product events, etc — use web search for the real upcoming date if you can find one).

Then apply this trading framework to decide the short-term outlook, long-term outlook, decision, and a buy zone (a realistic price range near-ish current price where it would be attractive to add):
- short/long term outlook should be one of: "excellent", "good", "average", "weak"
- base outlook partly on where price sits relative to its moving averages and RSI (RSI under 30 = oversold/attractive, RSI over 70 = overbought/caution; price above rising MAs = bullish structure)
- decision should be one of: "Buy", "Buy Small", "Accumulate", "Wait / Buy Small", "Wait for Pullback", "SIP / Accumulate"

Respond with ONLY a single JSON object, no other text, no markdown fences, in exactly this shape (the "ticker" value below is just an example format, use the real resolved symbol):
{"ticker":"INTC","sector":"...","what":"...","up":"...","down":"...","events":"...","price":123.45,"ma20":123.45,"ma50":123.45,"ma200":123.45,"rsi":45.6,"short":"good","long":"excellent","decision":"Buy Small","buyZone":"120-125"}

Do not include any citations, footnote markers, source references, or links in any of the text fields — plain prose only.`;

  try {
    const apiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        max_output_tokens: 1500,
        input: prompt,
        tools: [{ type: "web_search" }],
      }),
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return res.status(502).json({ error: `OpenAI API error: ${apiRes.status}`, detail: errText });
    }

    const data = await apiRes.json();
    const text = stripCitations(extractText(data));
    const parsed = extractJSON(text);
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
```

#### `api/fetch-events.js`

```javascript
function extractJSON(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.search(/[[{]/);
  if (start === -1) throw new Error("No JSON found in model response");
  const openChar = cleaned[start];
  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === openChar) depth++;
    if (cleaned[i] === closeChar) depth--;
    if (depth === 0) return JSON.parse(cleaned.slice(start, i + 1));
  }
  throw new Error("Unbalanced JSON in model response");
}

function extractText(data) {
  return (data.output || [])
    .filter((item) => item.type === "message")
    .flatMap((item) => (item.content || []).filter((c) => c.type === "output_text").map((c) => c.text))
    .join("\n\n");
}

const INVISIBLE_CHARS_RE = new RegExp(
  "[\\u2060\\u200B\\u200C\\u200D\\u200E\\u200F\\uFEFF\\u{E000}-\\u{F8FF}\\u{F0000}-\\u{FFFFD}\\u{100000}-\\u{10FFFD}]",
  "gu"
);

function stripCitations(text) {
  return text
    .replace(INVISIBLE_CHARS_RE, "")
    .replace(/\s?cite\w*turn\d+\w*\d*/gi, "")
    .replace(/\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\(\s*(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\.[a-z]{2,})?\s*\)/gi, "")
    .replace(/\(\s*\)/g, "");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const monthLabel = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
  const prompt = `Using web search, find the key US stock market events for ${monthLabel}: FOMC/Fed rate decisions, CPI and PPI inflation reports, nonfarm payrolls / jobs report, GDP releases, and any other major scheduled macro data releases from the Federal Reserve, BLS, or Commerce Department. Use real, current dates for this month — search for the actual release calendar.

Respond with ONLY a JSON array, no other text, no markdown fences, in exactly this shape:
[{"name":"FOMC Rate Decision","detail":"Fed interest rate decision — high market impact","tag":"Key","date":"2026-08-27"}]

Include 5-10 events. Use tag "Key" for high-impact events (Fed decisions, CPI) and "Monthly" for routine scheduled releases. Do not include any citations, footnote markers, source references, or links in the "detail" field — plain prose only.`;

  try {
    const apiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        max_output_tokens: 1500,
        input: prompt,
        tools: [{ type: "web_search" }],
      }),
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return res.status(502).json({ error: `OpenAI API error: ${apiRes.status}`, detail: errText });
    }

    const data = await apiRes.json();
    const text = stripCitations(extractText(data));
    const parsed = extractJSON(text);
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
```

#### `api/daily-brief.js`

```javascript
const RULES = `Portfolio rules: keep 30–40% cash at all times. On short-term positions, exit at 15–20% profit if markets are volatile. On long-term positions, take a partial exit (sell ~50–75%) at 15–20% profit and let the rest ride. Annual target: 20% portfolio return.`;

function extractJSON(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.search(/[[{]/);
  if (start === -1) throw new Error("No JSON found in model response");
  const openChar = cleaned[start];
  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === openChar) depth++;
    if (cleaned[i] === closeChar) depth--;
    if (depth === 0) return JSON.parse(cleaned.slice(start, i + 1));
  }
  throw new Error("Unbalanced JSON in model response");
}

function extractText(data) {
  return (data.output || [])
    .filter((item) => item.type === "message")
    .flatMap((item) => (item.content || []).filter((c) => c.type === "output_text").map((c) => c.text))
    .join("\n\n");
}

const INVISIBLE_CHARS_RE = new RegExp(
  "[\\u2060\\u200B\\u200C\\u200D\\u200E\\u200F\\uFEFF\\u{E000}-\\u{F8FF}\\u{F0000}-\\u{FFFFD}\\u{100000}-\\u{10FFFD}]",
  "gu"
);

function stripCitations(text) {
  return text
    .replace(INVISIBLE_CHARS_RE, "")
    .replace(/\s?cite\w*turn\d+\w*\d*/gi, "")
    .replace(/\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\(\s*(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\.[a-z]{2,})?\s*\)/gi, "")
    .replace(/\(\s*\)/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+([.,;:])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { holdings = [], events = [] } = req.body || {};
  const tickerList = holdings.map((h) => h.ticker).join(", ");
  const upcoming = events.map((e) => `${e.name}${e.date ? ` (${e.date})` : ""} — ${e.tag}`).join("; ");

  const prompt = `You are helping two people (a portfolio held jointly) with their daily 15-30 min portfolio check-in. Use web search extensively to find TODAY's actual current prices, % move, and — most importantly — any fresh news, headlines, analyst actions, or announcements from the last 24-48 hours for each of these holdings: ${tickerList}. Search each ticker individually if needed to surface real news, not just price data.

${RULES}

Also use web search to check for any macro events happening today or in the next 7 days from this watchlist: ${upcoming}. If any of these events already happened recently, briefly note the actual outcome (e.g. "CPI came in at X vs Y expected") and whether it affected the holdings above.

Respond with ONLY a single JSON object, no other text, no markdown fences, in exactly this shape:
{
  "marketSnapshot": "one or two sentences on how markets/sector are behaving today",
  "news": [
    {"ticker":"NVDA","name":"NVIDIA","price":222.79,"pct":2.43,"news":"one or two sentences of real news, or \\"No material news in the past 24-48 hours.\\" if there's none","hasNews":true}
  ],
  "events": [
    {"when":"Today (Aug 12)","detail":"CPI release — expected to influence Fed policy outlook, no figures yet"}
  ],
  "actionFlags": ["MRVL: up ~1.8% today, FMS conference could bring product news — no action yet unless the 15% threshold is hit"]
}

Include exactly one "news" entry for every ticker in this holdings list, in this order: ${tickerList}. Set "hasNews" to true only when there's genuine fresh news or headlines (not just a routine price move); set it to false and use a "No material news" style message otherwise. "events" should cover anything from the watchlist happening today or in the next 7 days, including a brief read-through for anything that already happened. "actionFlags" should only include holdings where something actually warrants a decision per the rules above (approaching a buy zone, hit a profit-take threshold, or a thesis-breaking event) — use an empty array if nothing warrants action, don't pad it.

Keep it tight — this replaces a 15-30 min call, not a research report. Prioritize genuinely new information over restating known facts. Do not include any citations, footnote markers, source references, or links of any kind in any field — no bracketed numbers, no "citeturn" style tokens, no markdown links, no parenthetical domain names. Write in plain prose only, as if summarizing what you found from memory.`;

  try {
    const apiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        max_output_tokens: 2500,
        input: prompt,
        tools: [{ type: "web_search" }],
      }),
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return res.status(502).json({ error: `OpenAI API error: ${apiRes.status}`, detail: errText });
    }

    const data = await apiRes.json();
    const text = stripCitations(extractText(data));
    const parsed = extractJSON(text);
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
```

#### `src/App.jsx`

```jsx
import React, { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, Minus, RadioTower, CalendarClock, Wallet, RefreshCw, Plus, X, Loader2, ChevronDown, ChevronUp, BookOpen, CheckSquare, Square } from "lucide-react";

const SEED_HOLDINGS = [
  { ticker: "NVIDIA", sector: "AI & Semiconductors", what: "AI GPUs and data center chips", up: "AI demand, cloud spending, earnings beats", down: "China restrictions, lower AI spending", events: "Earnings, AI conferences, major customer spending", price: 196.93, ma20: 201.92, ma50: 209.6, ma200: 191.26, rsi: 43.5, short: "good", long: "excellent", decision: "Accumulate", buyZone: "195–197 / 191–193" },
  { ticker: "Marvell", sector: "Semiconductors", what: "Networking and data-center chips", up: "AI infrastructure spending", down: "Weak data-center demand", events: "Earnings, hyperscaler spending updates", price: 230.7, ma20: 277.05, ma50: 226.77, ma200: 124.33, rsi: 43.54, short: "average", long: "excellent", decision: "Accumulate", buyZone: "226–230" },
  { ticker: "Tesla", sector: "EV & Autonomous Driving", what: "Electric vehicles, energy, FSD", up: "Delivery growth, Robotaxi, FSD progress", down: "Delivery misses, margin pressure", events: "Quarterly deliveries, earnings, Robotaxi updates", price: 402.9, ma20: 399.82, ma50: 407.65, ma200: 418.48, rsi: 49.6, short: "average", long: "good", decision: "Buy Small", buyZone: "400–403" },
  { ticker: "Alphabet", sector: "Mega Cap Tech", what: "Search, ads, cloud, AI", up: "AI products, cloud growth, ad revenue", down: "Regulatory actions, ad slowdown", events: "Earnings, AI announcements", price: 367.03, ma20: 358.18, ma50: 372.08, ma200: 317.32, rsi: 54.0, short: "good", long: "excellent", decision: "Buy", buyZone: "360–365" },
  { ticker: "Nokia", sector: "Telecom Infrastructure", what: "5G equipment and network solutions", up: "Telecom contracts, 5G rollout", down: "Lower carrier spending", events: "Earnings, major telecom deals", price: 10.38, ma20: 11.72, ma50: 11.88, ma200: 7.38, rsi: 38.21, short: "average", long: "good", decision: "Buy Small", buyZone: "10.20–10.40" },
  { ticker: "SanDisk", sector: "Memory & Storage", what: "SSDs, flash storage, NAND products", up: "Rising storage demand, NAND price recovery", down: "NAND oversupply, weak PC demand", events: "Earnings, storage market reports", price: 1617.7, ma20: 1953.87, ma50: 1639.47, ma200: 719.24, rsi: 43.77, short: "weak", long: "good", decision: "Wait / Buy Small", buyZone: "1600–1620" },
  { ticker: "Micron", sector: "Memory & Storage", what: "DRAM and NAND memory chips", up: "Rising memory prices, AI servers", down: "Falling memory prices, PC slowdown", events: "Earnings, memory market reports", price: 938.38, ma20: 1046.43, ma50: 871.16, ma200: 452.37, rsi: 46.26, short: "good", long: "excellent", decision: "Buy Small", buyZone: "930–940" },
  { ticker: "SpaceX", sector: "Space & Aerospace", what: "Rockets, Starlink, launches", up: "Successful launches, Starlink growth", down: "Launch failures, regulatory issues", events: "Launch schedules, Starlink updates", price: 149.47, ma20: null, ma50: null, ma200: null, rsi: 45.7, short: "average", long: "good", decision: "Buy Small", buyZone: "145–150" },
  { ticker: "Redwire", sector: "Space Infrastructure", what: "Space manufacturing and technology", up: "NASA/Defense contracts", down: "Contract delays, funding cuts", events: "Contract awards, earnings", price: 10.21, ma20: 13.28, ma50: 14.06, ma200: 10.04, rsi: 36.66, short: "good", long: "good", decision: "Buy Small", buyZone: "10.00–10.20" },
  { ticker: "UFO ETF", sector: "Space ETF", what: "Basket of space companies", up: "Positive space sector sentiment", down: "Weak aerospace sector", events: "Major launch events, defense budgets", price: 48.49, ma20: 50.49, ma50: 54.21, ma200: 44.7, rsi: 41.21, short: "weak", long: "good", decision: "Buy Small / SIP", buyZone: "48–49" },
  { ticker: "NASA ETF", sector: "Space ETF", what: "Space and aerospace exposure", up: "Growth in space economy", down: "Reduced government/space spending", events: "NASA budget, launch programs", price: 26.91, ma20: 30.17, ma50: 32.55, ma200: null, rsi: 37.7, short: "weak", long: "good", decision: "SIP / Accumulate", buyZone: "26.5–27" },
];

const SEED_EVENTS = [
  { name: "US Weekly Jobless Claims", detail: "Initial & Continuing Claims — Dept of Labor, every Thursday 8:30 AM ET", tag: "Weekly" },
  { name: "US Nonfarm Payrolls", detail: "Monthly jobs report", tag: "Monthly" },
  { name: "CPI Inflation Data", detail: "Consumer inflation report", tag: "Monthly" },
  { name: "FOMC Meeting / Rate Decision", detail: "Fed rate decision — high impact", tag: "Key" },
  { name: "PPI (Producer Inflation)", detail: "Wholesale inflation report", tag: "Monthly" },
];

const TRADING_RULES = [
  {
    category: "Monitor the Recent Trade Buy",
    items: [
      { label: "Short-term positions", detail: "Exit at **15–20% profit** if markets are volatile." },
      { label: "Long-term positions", detail: "Take a partial exit at **15–20% profit**, selling approximately **50–75%** of the holding." },
    ],
  },
  {
    category: "Monitor All Holdings in the Portfolio",
    items: [
      { detail: "Review all current holdings daily." },
      { detail: "Check whether any action is needed based on price movement, news, or market conditions." },
    ],
  },
  {
    category: "Maintain Cash Position",
    items: [{ detail: "Keep **30–40% cash** available at any point in time." }],
  },
  {
    category: "Set Stop-Losses",
    items: [{ detail: "Ensure **all holdings have a stop-loss** in place." }],
  },
  {
    category: "Daily Monitoring",
    items: [
      { detail: "Track market movements and portfolio performance regularly." },
      { detail: "Watch for important news, earnings, corporate actions, and major events affecting holdings." },
    ],
  },
];

const DAILY_QUESTIONS = [
  "Any new stocks bought today?",
  "Did any stock reach the 15–20% profit target?",
  "Were any partial exits taken?",
  "Is the cash position still between 30–40%?",
  "Are stop-losses set for all holdings?",
  "Any stock requiring action due to news or events?",
  "Any upcoming earnings, results, dividends, or announcements?",
];

const signalColor = (level) => {
  const l = (level || "").toLowerCase();
  if (l.includes("excellent") || l.includes("good")) return "#5FD98A";
  if (l.includes("average") || l.includes("wait")) return "#E8B94A";
  if (l.includes("weak")) return "#E86A5C";
  return "#6B7280";
};

const formatBuyZone = (zone) => {
  if (!zone) return "—";
  return zone.replace(/(?<!\$)(\d+(\.\d+)?)/g, "$$$1");
};

const formatPct = (pctNum) => (Number.isFinite(pctNum) ? `${pctNum >= 0 ? "+" : "-"}${Math.abs(pctNum)}%` : "—");

const trendIcon = (h) => {
  if (h.price == null || h.ma50 == null) return <Minus size={13} color="#6B7280" />;
  if (h.price > h.ma50) return <TrendingUp size={13} color="#5FD98A" />;
  if (h.price < h.ma50) return <TrendingDown size={13} color="#E86A5C" />;
  return <Minus size={13} color="#6B7280" />;
};

async function apiGet(path, fallback) {
  try {
    const res = await fetch(path);
    if (!res.ok) return fallback;
    return await res.json();
  } catch {
    return fallback;
  }
}

async function apiPost(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export default function App() {
  const [tab, setTab] = useState("holdings");
  const [holdings, setHoldings] = useState(SEED_HOLDINGS);
  const [events, setEvents] = useState(SEED_EVENTS);
  const [briefs, setBriefs] = useState([]);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [briefError, setBriefError] = useState(null);
  const [portfolio, setPortfolio] = useState({ startValue: "", currentValue: "" });
  const [expanded, setExpanded] = useState(null);
  const [ready, setReady] = useState(false);
  const [addingHolding, setAddingHolding] = useState(false);
  const [newTicker, setNewTicker] = useState("");
  const [holdingLoading, setHoldingLoading] = useState(false);
  const [holdingError, setHoldingError] = useState(null);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState(null);
  const [sectorFilter, setSectorFilter] = useState("All");
  const [refreshingTicker, setRefreshingTicker] = useState(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [refreshAllProgress, setRefreshAllProgress] = useState({ done: 0, total: 0 });
  const [checkedQuestions, setCheckedQuestions] = useState([]);

  const toggleQuestion = (i) => {
    setCheckedQuestions((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  };

  useEffect(() => {
    (async () => {
      const [h, ev, b, p] = await Promise.all([
        apiGet("/api/holdings", null),
        apiGet("/api/events", null),
        apiGet("/api/briefs", []),
        apiGet("/api/portfolio", { startValue: "", currentValue: "" }),
      ]);
      if (h) setHoldings(h);
      else await apiPost("/api/holdings", { value: SEED_HOLDINGS }).catch(() => {});
      if (ev) setEvents(ev);
      else await apiPost("/api/events", { value: SEED_EVENTS }).catch(() => {});
      setBriefs(b || []);
      setPortfolio(p || { startValue: "", currentValue: "" });
      setReady(true);
    })();
  }, []);

  const persist = useCallback((path, value) => {
    apiPost(path, { value }).catch((e) => console.error("save failed", e));
  }, []);

  const savePortfolio = (next) => {
    setPortfolio(next);
    persist("/api/portfolio", next);
  };

  const handleAddHolding = async () => {
    const query = newTicker.trim();
    if (!query) return;
    setHoldingLoading(true);
    setHoldingError(null);
    try {
      const result = await apiPost("/api/analyze-holding", { ticker: query });
      const next = [...holdings.filter((h) => h.ticker.toLowerCase() !== result.ticker.toLowerCase()), result];
      setHoldings(next);
      persist("/api/holdings", next);
      setNewTicker("");
      setAddingHolding(false);
    } catch (e) {
      setHoldingError(e.message || "Couldn't research that ticker — try again.");
    } finally {
      setHoldingLoading(false);
    }
  };

  const refreshHolding = async (ticker) => {
    setRefreshingTicker(ticker);
    try {
      const result = await apiPost("/api/analyze-holding", { ticker });
      const next = holdings.map((h) => (h.ticker === ticker ? result : h));
      setHoldings(next);
      persist("/api/holdings", next);
    } catch (e) {
      console.error("refresh failed", e);
    } finally {
      setRefreshingTicker(null);
    }
  };

  const refreshAllHoldings = async () => {
    if (refreshingAll || holdings.length === 0) return;
    setRefreshingAll(true);
    setRefreshAllProgress({ done: 0, total: holdings.length });
    const tickers = holdings.map((h) => h.ticker);
    const results = new Map();
    const concurrency = 3;
    let nextIndex = 0;
    const worker = async () => {
      while (nextIndex < tickers.length) {
        const ticker = tickers[nextIndex++];
        try {
          results.set(ticker, await apiPost("/api/analyze-holding", { ticker }));
        } catch (e) {
          console.error(`refresh failed for ${ticker}`, e);
        } finally {
          setRefreshAllProgress((p) => ({ ...p, done: p.done + 1 }));
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, tickers.length) }, worker));
    const next = holdings.map((h) => results.get(h.ticker) || h);
    setHoldings(next);
    persist("/api/holdings", next);
    setRefreshingAll(false);
  };

  const removeHolding = (ticker) => {
    const next = holdings.filter((h) => h.ticker !== ticker);
    setHoldings(next);
    persist("/api/holdings", next);
  };

  const handleFetchEvents = async () => {
    setEventsLoading(true);
    setEventsError(null);
    try {
      const found = await apiPost("/api/fetch-events", {});
      const existingNames = new Set(events.map((e) => e.name.toLowerCase()));
      const merged = [...events, ...found.filter((e) => !existingNames.has((e.name || "").toLowerCase()))];
      merged.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      setEvents(merged);
      persist("/api/events", merged);
    } catch (e) {
      setEventsError(e.message || "Couldn't fetch events — try again.");
    } finally {
      setEventsLoading(false);
    }
  };

  const generateBrief = async () => {
    setLoadingBrief(true);
    setBriefError(null);
    try {
      const brief = await apiPost("/api/daily-brief", { holdings, events });
      const entry = { date: new Date().toISOString(), ...brief };
      const next = [entry, ...briefs].slice(0, 30);
      setBriefs(next);
      persist("/api/briefs", next);
    } catch (e) {
      setBriefError(e.message || "Something went wrong generating the brief.");
    } finally {
      setLoadingBrief(false);
    }
  };

  const removeBrief = (index) => {
    const next = briefs.filter((_, idx) => idx !== index);
    setBriefs(next);
    persist("/api/briefs", next);
  };

  const clearBriefs = () => {
    if (briefs.length && !window.confirm("Clear all brief history? This can't be undone.")) return;
    setBriefs([]);
    persist("/api/briefs", []);
  };

  const goalPct = (() => {
    const s = parseFloat(portfolio.startValue);
    const c = parseFloat(portfolio.currentValue);
    if (!s || !c) return null;
    return ((c - s) / s) * 100;
  })();

  const sectors = ["All", ...Array.from(new Set(holdings.map((h) => h.sector))).sort()];
  const filteredHoldings = sectorFilter === "All" ? holdings : holdings.filter((h) => h.sector === sectorFilter);

  return (
    <div style={styles.app}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: #2A3140; border-radius: 4px; }
      `}</style>

      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <RadioTower size={20} color="#E8B94A" strokeWidth={1.75} />
          <div>
            <div style={styles.headerTitle}>PORTFOLIO OPS</div>
            <div style={styles.headerSub}>Daily monitoring · joint holdings</div>
          </div>
        </div>
        <div style={styles.goalWrap}>
          <div style={styles.goalLabel}>ANNUAL TARGET · 20%</div>
          <div style={styles.goalBarTrack}>
            <div
              style={{
                ...styles.goalBarFill,
                width: `${Math.max(0, Math.min(100, ((goalPct ?? 0) / 20) * 100))}%`,
                background: goalPct == null ? "#3A4152" : goalPct >= 0 ? "#5FD98A" : "#E86A5C",
              }}
            />
          </div>
          <div style={{ ...styles.goalPct, color: goalPct == null ? "#6B7280" : goalPct >= 0 ? "#5FD98A" : "#E86A5C" }}>
            {goalPct == null ? "— set values below" : `${goalPct >= 0 ? "+" : ""}${goalPct.toFixed(1)}%`}
          </div>
        </div>
      </header>

      <nav style={styles.tabs}>
        {[
          ["holdings", "Holdings", TrendingUp],
          ["events", "Events", CalendarClock],
          ["brief", "Daily Brief", RadioTower],
          ["goal", "Goal Tracker", Wallet],
          ["playbook", "Playbook", BookOpen],
        ].map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)} style={{ ...styles.tab, ...(tab === key ? styles.tabActive : {}) }}>
            <Icon size={14} strokeWidth={2} />
            {label}
          </button>
        ))}
      </nav>

      <main style={styles.main}>
        {tab === "holdings" && (
          <div>
            <div style={styles.sectionHead}>
              <span>{filteredHoldings.length} position{filteredHoldings.length === 1 ? "" : "s"}{sectorFilter !== "All" ? ` · ${sectorFilter}` : ""}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={styles.mutedSmall}>Tap a row for the thesis</span>
                <select value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)} style={styles.sectorSelect}>
                  {sectors.map((s) => (
                    <option key={s} value={s}>{s === "All" ? "All sectors" : s}</option>
                  ))}
                </select>
              </div>
            </div>

            {!addingHolding ? (
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <button onClick={() => setAddingHolding(true)} disabled={refreshingAll} style={{ ...styles.addBtn, flex: 1 }}>
                  <Plus size={14} /> Add holding
                </button>
                <button onClick={refreshAllHoldings} disabled={refreshingAll} style={styles.refreshAllBtn}>
                  {refreshingAll ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
                  {refreshingAll ? `Refreshing ${refreshAllProgress.done}/${refreshAllProgress.total}…` : "Refresh all"}
                </button>
              </div>
            ) : (
              <div style={{ ...styles.eventCard, marginBottom: 14, alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                  <div style={styles.mutedSmall}>Enter a ticker — price, MAs, RSI, and the buy/sell analysis auto-fill from live data.</div>
                  <input
                    placeholder="e.g. AMD, Palantir, IONQ"
                    value={newTicker}
                    onChange={(e) => setNewTicker(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !holdingLoading && handleAddHolding()}
                    style={styles.input}
                    autoFocus
                  />
                  {holdingError && <div style={{ ...styles.errorBox, marginBottom: 0 }}>{holdingError}</div>}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={handleAddHolding} disabled={holdingLoading} style={{ ...styles.generateBtn, flex: 1, marginBottom: 0 }}>
                      {holdingLoading ? <Loader2 size={15} className="spin" /> : <RefreshCw size={15} />}
                      {holdingLoading ? "Researching…" : "Research & add"}
                    </button>
                    <button onClick={() => { setAddingHolding(false); setHoldingError(null); setNewTicker(""); }} style={{ ...styles.iconBtn, border: "1px solid #2A3140", padding: "8px 14px", borderRadius: 8 }}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {["Ticker", "Price", "RSI", "Short-Term", "Long-Term", "Decision", "Buy Zone", ""].map((h, i) => (
                      <th key={i} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredHoldings.map((h) => (
                    <React.Fragment key={h.ticker}>
                      <tr style={styles.tr} onClick={() => setExpanded(expanded === h.ticker ? null : h.ticker)}>
                        <td style={{ ...styles.td, fontWeight: 600, color: "#F0F2F6" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {expanded === h.ticker ? <ChevronUp size={13} color="#6B7280" /> : <ChevronDown size={13} color="#6B7280" />}
                            {h.ticker}
                          </span>
                        </td>
                        <td style={styles.tdMono}>
                          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            {trendIcon(h)}
                            {h.price != null ? `$${h.price}` : "—"}
                          </span>
                        </td>
                        <td style={styles.tdMono}>{h.rsi ?? "—"}</td>
                        <td style={styles.td}><Dot color={signalColor(h.short)} label={h.short} /></td>
                        <td style={styles.td}><Dot color={signalColor(h.long)} label={h.long} /></td>
                        <td style={{ ...styles.td, color: "#C7CCD6" }}>{h.decision}</td>
                        <td style={styles.tdMono}>{formatBuyZone(h.buyZone)}</td>
                        <td style={styles.td} onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => refreshHolding(h.ticker)}
                            disabled={refreshingTicker === h.ticker || refreshingAll}
                            style={styles.rowRefreshBtn}
                            title={`Refresh ${h.ticker}`}
                          >
                            {refreshingTicker === h.ticker ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />}
                          </button>
                        </td>
                      </tr>
                      {expanded === h.ticker && (
                        <tr>
                          <td colSpan={8} style={styles.expandCell}>
                            <div style={styles.expandGrid}>
                              <div><div style={styles.expandLabel}>Sector</div><div style={styles.expandVal}>{h.sector}</div></div>
                              <div><div style={styles.expandLabel}>What it does</div><div style={styles.expandVal}>{h.what}</div></div>
                              <div><div style={styles.expandLabel}>Moves it up</div><div style={{ ...styles.expandVal, color: "#5FD98A" }}>{h.up}</div></div>
                              <div><div style={styles.expandLabel}>Moves it down</div><div style={{ ...styles.expandVal, color: "#E86A5C" }}>{h.down}</div></div>
                              <div style={{ gridColumn: "1 / -1" }}><div style={styles.expandLabel}>Watch for</div><div style={styles.expandVal}>{h.events}</div></div>
                              <div><div style={styles.expandLabel}>MA20 / MA50 / MA200</div><div style={styles.expandVal}>{[h.ma20, h.ma50, h.ma200].map((v) => v ?? "—").join(" / ")}</div></div>
                            </div>
                            <button
                              onClick={(ev) => { ev.stopPropagation(); removeHolding(h.ticker); setExpanded(null); }}
                              style={{ ...styles.iconBtn, marginTop: 12, fontSize: 11.5, color: "#E86A5C", display: "flex", alignItems: "center", gap: 5 }}
                            >
                              <X size={12} /> Remove holding
                            </button>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "events" && (
          <div>
            <div style={styles.sectionHead}><span>Watchlist — macro events that can move the portfolio</span></div>

            <button onClick={handleFetchEvents} disabled={eventsLoading} style={styles.generateBtn}>
              {eventsLoading ? <Loader2 size={15} className="spin" /> : <RefreshCw size={15} />}
              {eventsLoading ? "Checking this month's calendar…" : "Fetch this month's US market events"}
            </button>
            {eventsError && <div style={styles.errorBox}>{eventsError}</div>}

            <div style={styles.eventList}>
              {events.map((e, i) => (
                <div key={i} style={styles.eventCard}>
                  <div style={styles.eventTag}>{e.tag}</div>
                  <div style={{ flex: 1 }}>
                    <div style={styles.eventName}>{e.name}{e.date ? <span style={styles.eventDate}> · {e.date}</span> : null}</div>
                    <div style={styles.eventDetail}>{e.detail}</div>
                  </div>
                  <button onClick={() => { const next = events.filter((_, idx) => idx !== i); setEvents(next); persist("/api/events", next); }} style={styles.iconBtn}>
                    <X size={14} color="#6B7280" />
                  </button>
                </div>
              ))}
            </div>
            <AddEvent onAdd={(ev) => { const next = [...events, ev]; setEvents(next); persist("/api/events", next); }} />
          </div>
        )}

        {tab === "brief" && (
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: briefError ? 14 : 0 }}>
              <button onClick={generateBrief} disabled={loadingBrief} style={{ ...styles.generateBtn, marginBottom: 0 }}>
                {loadingBrief ? <Loader2 size={15} className="spin" /> : <RefreshCw size={15} />}
                {loadingBrief ? "Researching holdings & events…" : "Generate today's brief"}
              </button>
              {briefs.length > 0 && (
                <button onClick={clearBriefs} style={styles.clearHistoryBtn}>
                  Clear history
                </button>
              )}
            </div>
            {briefError && <div style={styles.errorBox}>{briefError}</div>}
            {!ready ? null : briefs.length === 0 && !loadingBrief ? (
              <div style={{ ...styles.emptyState, marginTop: 16 }}>No brief generated yet today. Tap the button above — it checks live prices, news, and your event watchlist.</div>
            ) : (
              <div style={{ ...styles.briefList, marginTop: 16 }}>
                {briefs.map((b, i) => (
                  <div key={i} style={styles.briefCard}>
                    <div style={styles.briefCardHead}>
                      <div style={styles.briefDate}>{new Date(b.date).toLocaleString()}</div>
                      <button onClick={() => removeBrief(i)} style={styles.iconBtn} title="Delete this brief">
                        <X size={14} color="#6B7280" />
                      </button>
                    </div>
                    {b.text ? <BriefContent text={b.text} /> : <StructuredBrief brief={b} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "goal" && (
          <div>
            <div style={styles.sectionHead}><span>Track progress toward the 20% annual target</span></div>
            <div style={styles.goalForm}>
              <label style={styles.formLabel}>
                Portfolio value at year start
                <input
                  type="number"
                  value={portfolio.startValue}
                  onChange={(e) => savePortfolio({ ...portfolio, startValue: e.target.value })}
                  placeholder="e.g. 100000"
                  style={styles.input}
                />
              </label>
              <label style={styles.formLabel}>
                Current portfolio value
                <input
                  type="number"
                  value={portfolio.currentValue}
                  onChange={(e) => savePortfolio({ ...portfolio, currentValue: e.target.value })}
                  placeholder="e.g. 108000"
                  style={styles.input}
                />
              </label>
            </div>
            {goalPct != null && (
              <div style={styles.goalSummary}>
                <div style={{ fontSize: 32, fontWeight: 700, color: goalPct >= 0 ? "#5FD98A" : "#E86A5C", fontFamily: "ui-monospace, monospace" }}>
                  {goalPct >= 0 ? "+" : ""}{goalPct.toFixed(2)}%
                </div>
                <div style={styles.mutedSmall}>{goalPct >= 20 ? "Target reached." : `${(20 - goalPct).toFixed(1)} points to go to hit the 20% target.`}</div>
              </div>
            )}
          </div>
        )}

        {tab === "playbook" && (
          <div>
            <div style={styles.sectionHead}><span>Standing trading rules &amp; daily check-in checklist</span></div>

            <div style={styles.rulesGrid}>
              {TRADING_RULES.map((group, gi) => (
                <div key={gi} style={styles.ruleCard}>
                  <div style={styles.ruleCardTitle}>{group.category}</div>
                  {group.items.map((item, ii) => (
                    <div key={ii} style={styles.ruleItem}>
                      {item.label && <div style={styles.ruleItemLabel}>{item.label}</div>}
                      <div style={styles.ruleItemDetail}>{renderInline(item.detail, `r${gi}-${ii}`)}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div style={{ ...styles.sectionHead, marginTop: 28 }}><span>Daily check-in questions</span></div>
            <div style={styles.checklistBox}>
              {DAILY_QUESTIONS.map((q, i) => {
                const checked = checkedQuestions.includes(i);
                return (
                  <button key={i} onClick={() => toggleQuestion(i)} style={styles.checklistItem}>
                    {checked ? <CheckSquare size={16} color="#5FD98A" /> : <Square size={16} color="#5B6272" />}
                    <span style={{ ...styles.checklistText, color: checked ? "#5B6272" : "#C7CCD6", textDecoration: checked ? "line-through" : "none" }}>
                      {q}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const INVISIBLE_CHARS_RE = new RegExp(
  "[\\u2060\\u200B\\u200C\\u200D\\u200E\\u200F\\uFEFF\\u{E000}-\\u{F8FF}\\u{F0000}-\\u{FFFFD}\\u{100000}-\\u{10FFFD}]",
  "gu"
);

function cleanBriefLine(line) {
  return line
    .replace(INVISIBLE_CHARS_RE, "")
    .replace(/\s?cite\w*turn\d+\w*\d*/gi, "")
    .replace(/\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\(\s*(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\.[a-z]{2,})?\s*\)/gi, "")
    .replace(/\(\s*\)/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+([.,;:])/g, "$1")
    .trim();
}

function renderInline(line, keyPrefix) {
  const re = /\*\*([^*]+)\*\*/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  let i = 0;
  while ((match = re.exec(line)) !== null) {
    if (match.index > lastIndex) parts.push(line.slice(lastIndex, match.index));
    parts.push(<strong key={`${keyPrefix}-${i++}`} style={styles.briefBold}>{match[1]}</strong>);
    lastIndex = re.lastIndex;
  }
  if (lastIndex < line.length) parts.push(line.slice(lastIndex));
  return parts;
}

function BriefContent({ text }) {
  const lines = text.split("\n");
  return (
    <div>
      {lines.map((rawLine, i) => {
        const trimmed = cleanBriefLine(rawLine);
        if (!trimmed) return null;
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) return null;

        const boldHeader = trimmed.match(/^\*\*\s*(?:\d+\.\s*)?(.+?)\s*\*\*:?$/);
        const plainHeader = trimmed.match(/^(?:\d+\.\s*)?([A-Z][A-Z0-9 &']{3,})\s*:?$/);
        if (boldHeader) {
          return <div key={i} style={styles.briefSectionHead}>{boldHeader[1].replace(/^\d+\.\s*/, "")}</div>;
        }
        if (plainHeader) {
          return <div key={i} style={styles.briefSectionHead}>{plainHeader[1]}</div>;
        }

        const tickerPrice = trimmed.match(/^\*\*([A-Z][A-Z0-9.]{0,6})\*\*\s*[–—-]?\s*\$?([\d,]+\.?\d*)\s*\(([+-]?[\d.]+)%\)\.?\s*(.*)$/);
        if (tickerPrice) {
          const [, ticker, price, pct, rest] = tickerPrice;
          const pctNum = parseFloat(pct);
          const color = pctNum >= 0 ? "#5FD98A" : "#E86A5C";
          return (
            <div key={i} style={styles.briefTickerBlock}>
              <div style={styles.briefTickerHead}>
                <span style={styles.briefTickerSymbol}>{ticker}</span>
                <span style={styles.briefTickerPrice}>${price}</span>
                <span style={{ ...styles.briefTickerPct, color }}>{formatPct(pctNum)}</span>
              </div>
              {rest && <div style={styles.briefLine}>{renderInline(rest, `t${i}`)}</div>}
            </div>
          );
        }

        const tickerHeader = trimmed.match(/^([A-Z][A-Z0-9.]{1,5})\s*[–—-]\s*(.+)$/);
        if (tickerHeader) {
          return (
            <div key={i} style={styles.briefTickerBlock}>
              <div style={styles.briefTickerHead}>
                <span style={styles.briefTickerSymbol}>{tickerHeader[1]}</span>
                <span style={styles.briefTickerName}>{tickerHeader[2]}</span>
              </div>
            </div>
          );
        }

        const labelMatch = trimmed.match(/^(Price|News|Detail|Update|Events?)\s*:\s*(.*)$/i);
        if (labelMatch) {
          const [, label, value] = labelMatch;
          const pctInline = value.match(/^(.*?)\(([+-]?[\d.]+)%\)\s*$/);
          if (/^price$/i.test(label) && pctInline) {
            const pctNum = parseFloat(pctInline[2]);
            const color = pctNum >= 0 ? "#5FD98A" : "#E86A5C";
            return (
              <div key={i} style={styles.briefLabelLine}>
                <span style={styles.briefLabel}>{label}</span>
                <span>
                  {renderInline(pctInline[1].trim(), `p${i}`)}{" "}
                  <span style={{ color, fontWeight: 600 }}>({formatPct(pctNum)})</span>
                </span>
              </div>
            );
          }
          return (
            <div key={i} style={styles.briefLabelLine}>
              <span style={styles.briefLabel}>{label}</span>
              <span>{renderInline(value, `v${i}`)}</span>
            </div>
          );
        }

        const bulletMatch = trimmed.match(/^[-•*]\s+(.*)/);
        if (bulletMatch) {
          return (
            <div key={i} style={styles.briefBullet}>
              <span style={styles.briefBulletDot}>•</span>
              <span>{renderInline(bulletMatch[1], `l${i}`)}</span>
            </div>
          );
        }

        return <div key={i} style={styles.briefLine}>{renderInline(trimmed, `l${i}`)}</div>;
      })}
    </div>
  );
}

function StructuredBrief({ brief }) {
  const news = brief.news || [];
  const withNews = news.filter((n) => n.hasNews).map((n) => n.ticker);
  const withoutNews = news.filter((n) => !n.hasNews).map((n) => n.ticker);

  return (
    <div>
      {brief.marketSnapshot && (
        <>
          <div style={styles.briefSectionHead}>Market Snapshot</div>
          <div style={styles.briefLine}>{brief.marketSnapshot}</div>
        </>
      )}

      {news.length > 0 && (
        <>
          <div style={styles.briefSectionHead}>News &amp; Updates</div>
          {news.map((n, i) => {
            const pctNum = typeof n.pct === "number" ? n.pct : parseFloat(n.pct);
            const color = Number.isFinite(pctNum) ? (pctNum >= 0 ? "#5FD98A" : "#E86A5C") : "#6B7280";
            return (
              <div key={i} style={styles.briefTickerBlock}>
                <div style={styles.briefTickerHead}>
                  <span style={styles.briefTickerSymbol}>{n.ticker}</span>
                  {n.name && <span style={styles.briefTickerName}>{n.name}</span>}
                </div>
                <div style={styles.briefLabelLine}>
                  <span style={styles.briefLabel}>Price</span>
                  <span>
                    {n.price != null ? `$${n.price}` : "—"}{" "}
                    <span style={{ color, fontWeight: 600 }}>({formatPct(pctNum)})</span>
                  </span>
                </div>
                {n.news && (
                  <div style={styles.briefLabelLine}>
                    <span style={styles.briefLabel}>News</span>
                    <span>{n.news}</span>
                  </div>
                )}
              </div>
            );
          })}

          {(withNews.length > 0 || withoutNews.length > 0) && (
            <div style={{ marginTop: 14 }}>
              <div style={styles.briefSectionHead}>Summary of News &amp; Price Moves</div>
              {withNews.length > 0 && (
                <div style={styles.briefBullet}>
                  <span style={styles.briefBulletDot}>•</span>
                  <span>Fresh news: {withNews.join(", ")}</span>
                </div>
              )}
              {withoutNews.length > 0 && (
                <div style={styles.briefBullet}>
                  <span style={styles.briefBulletDot}>•</span>
                  <span>Price moves only, no material news: {withoutNews.join(", ")}</span>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {brief.events && brief.events.length > 0 && (
        <>
          <div style={styles.briefSectionHead}>This Week's Events</div>
          {brief.events.map((e, i) => (
            <div key={i} style={styles.briefBullet}>
              <span style={styles.briefBulletDot}>•</span>
              <span><strong style={styles.briefBold}>{e.when}:</strong> {e.detail}</span>
            </div>
          ))}
        </>
      )}

      <div style={styles.briefSectionHead}>Action Flags</div>
      {brief.actionFlags && brief.actionFlags.length > 0 ? (
        brief.actionFlags.map((flag, i) => (
          <div key={i} style={styles.briefBullet}>
            <span style={styles.briefBulletDot}>•</span>
            <span>{flag}</span>
          </div>
        ))
      ) : (
        <div style={styles.briefLine}>No action flagged today.</div>
      )}
    </div>
  );
}

function Dot({ color, label }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#C7CCD6" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
      {label}
    </span>
  );
}

function AddEvent({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [detail, setDetail] = useState("");
  const [tag, setTag] = useState("Key");
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={styles.addBtn}>
        <Plus size={14} /> Add event to watchlist
      </button>
    );
  }
  return (
    <div style={styles.eventCard}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        <input placeholder="Event name" value={name} onChange={(e) => setName(e.target.value)} style={styles.input} />
        <input placeholder="Detail (when / why it matters)" value={detail} onChange={(e) => setDetail(e.target.value)} style={styles.input} />
        <select value={tag} onChange={(e) => setTag(e.target.value)} style={styles.input}>
          <option>Key</option>
          <option>Weekly</option>
          <option>Monthly</option>
          <option>One-off</option>
        </select>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => { if (name.trim()) { onAdd({ name, detail, tag }); setName(""); setDetail(""); setOpen(false); } }}
            style={{ ...styles.generateBtn, flex: 1 }}
          >
            Save
          </button>
          <button onClick={() => setOpen(false)} style={{ ...styles.iconBtn, border: "1px solid #2A3140", padding: "8px 14px", borderRadius: 8 }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  app: { minHeight: "100vh", background: "#0B0E14", color: "#E8EAED", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", padding: "0 0 40px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, padding: "22px 24px 18px", borderBottom: "1px solid #1B2028" },
  headerLeft: { display: "flex", alignItems: "center", gap: 10 },
  headerTitle: { fontSize: 15, fontWeight: 700, letterSpacing: "0.08em" },
  headerSub: { fontSize: 11.5, color: "#6B7280", marginTop: 2 },
  goalWrap: { minWidth: 220 },
  goalLabel: { fontSize: 10.5, color: "#6B7280", letterSpacing: "0.06em", marginBottom: 6 },
  goalBarTrack: { width: "100%", height: 5, background: "#1B2028", borderRadius: 3, overflow: "hidden" },
  goalBarFill: { height: "100%", borderRadius: 3, transition: "width 0.4s ease" },
  goalPct: { fontSize: 12.5, fontFamily: "ui-monospace, monospace", marginTop: 5, textAlign: "right" },
  tabs: { display: "flex", gap: 4, padding: "14px 20px 0", borderBottom: "1px solid #1B2028", overflowX: "auto" },
  tab: { display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: "#6B7280", padding: "9px 14px", fontSize: 12.5, fontWeight: 500, cursor: "pointer", borderBottom: "2px solid transparent", whiteSpace: "nowrap" },
  tabActive: { color: "#E8B94A", borderBottom: "2px solid #E8B94A" },
  main: { padding: "20px 24px", maxWidth: 980, margin: "0 auto" },
  sectionHead: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#8B93A7", marginBottom: 12 },
  mutedSmall: { fontSize: 11, color: "#5B6272" },
  sectorSelect: { background: "#0E1219", border: "1px solid #2A3140", color: "#C7CCD6", padding: "6px 10px", borderRadius: 7, fontSize: 11.5, outline: "none", cursor: "pointer" },
  rowRefreshBtn: { background: "transparent", border: "none", cursor: "pointer", color: "#6B7280", display: "flex", alignItems: "center", padding: 4 },
  tableWrap: { overflowX: "auto", border: "1px solid #1B2028", borderRadius: 10 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "10px 14px", fontSize: 10.5, color: "#6B7280", letterSpacing: "0.05em", borderBottom: "1px solid #1B2028", background: "#0E1219", whiteSpace: "nowrap" },
  tr: { cursor: "pointer" },
  td: { padding: "11px 14px", borderBottom: "1px solid #151A22", color: "#C7CCD6" },
  tdMono: { padding: "11px 14px", borderBottom: "1px solid #151A22", fontFamily: "ui-monospace, monospace", color: "#C7CCD6", whiteSpace: "nowrap" },
  expandCell: { background: "#0E1219", padding: "16px 20px", borderBottom: "1px solid #1B2028" },
  expandGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 },
  expandLabel: { fontSize: 10, color: "#5B6272", letterSpacing: "0.05em", marginBottom: 4 },
  expandVal: { fontSize: 12.5, color: "#C7CCD6", lineHeight: 1.5 },
  eventList: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 },
  eventCard: { display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", border: "1px solid #1B2028", borderRadius: 10, background: "#0E1219" },
  eventTag: { fontSize: 10, fontWeight: 600, color: "#E8B94A", border: "1px solid #3A3323", background: "#1D1A10", padding: "3px 8px", borderRadius: 5, flexShrink: 0 },
  eventName: { fontSize: 13, fontWeight: 600, color: "#F0F2F6" },
  eventDate: { fontSize: 11, fontWeight: 500, color: "#E8B94A" },
  eventDetail: { fontSize: 11.5, color: "#7A8194", marginTop: 2, lineHeight: 1.4 },
  iconBtn: { background: "transparent", border: "none", cursor: "pointer", flexShrink: 0 },
  addBtn: { display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px dashed #2A3140", color: "#8B93A7", padding: "10px 14px", borderRadius: 10, cursor: "pointer", fontSize: 12.5, width: "100%", justifyContent: "center" },
  refreshAllBtn: { display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid #2A3140", color: "#8B93A7", padding: "10px 14px", borderRadius: 10, cursor: "pointer", fontSize: 12.5, whiteSpace: "nowrap" },
  generateBtn: { display: "flex", alignItems: "center", gap: 8, background: "#E8B94A", color: "#0B0E14", border: "none", padding: "11px 18px", borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: "pointer", marginBottom: 16 },
  errorBox: { color: "#E86A5C", fontSize: 12.5, marginBottom: 14, padding: "10px 12px", border: "1px solid #3A2323", borderRadius: 8, background: "#1A1113" },
  emptyState: { fontSize: 13, color: "#5B6272", padding: "30px 10px", textAlign: "center", border: "1px dashed #1B2028", borderRadius: 10 },
  briefList: { display: "flex", flexDirection: "column", gap: 14 },
  briefCard: { border: "1px solid #1B2028", borderRadius: 10, padding: "16px 18px", background: "#0E1219" },
  briefCardHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  briefDate: { fontSize: 10.5, color: "#5B6272", letterSpacing: "0.04em" },
  clearHistoryBtn: { background: "transparent", border: "1px solid #2A3140", color: "#8B93A7", padding: "10px 14px", borderRadius: 9, fontSize: 12.5, cursor: "pointer" },
  briefSectionHead: { fontSize: 11, fontWeight: 700, color: "#E8B94A", letterSpacing: "0.06em", marginTop: 18, marginBottom: 8, paddingBottom: 6, borderBottom: "1px solid #1B2028" },
  briefLine: { fontSize: 13, color: "#C7CCD6", lineHeight: 1.7, marginBottom: 6 },
  briefBullet: { display: "flex", gap: 8, fontSize: 13, color: "#C7CCD6", lineHeight: 1.6, marginBottom: 5 },
  briefBulletDot: { color: "#5B6272", flexShrink: 0 },
  briefBold: { color: "#F0F2F6", fontWeight: 700 },
  briefTickerBlock: { marginTop: 14, paddingTop: 10, borderTop: "1px solid #151A22" },
  briefTickerHead: { display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 },
  briefTickerSymbol: { fontSize: 12.5, fontWeight: 700, color: "#F0F2F6", fontFamily: "ui-monospace, monospace" },
  briefTickerPrice: { fontSize: 12, color: "#8B93A7", fontFamily: "ui-monospace, monospace" },
  briefTickerPct: { fontSize: 11.5, fontWeight: 700, fontFamily: "ui-monospace, monospace" },
  briefTickerName: { fontSize: 11.5, color: "#6B7280" },
  briefLabelLine: { display: "flex", gap: 8, fontSize: 13, color: "#C7CCD6", lineHeight: 1.6, marginBottom: 4 },
  briefLabel: { fontSize: 10, fontWeight: 700, color: "#5B6272", letterSpacing: "0.05em", textTransform: "uppercase", flexShrink: 0, minWidth: 42, paddingTop: 2 },
  goalForm: { display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 },
  formLabel: { display: "flex", flexDirection: "column", gap: 6, fontSize: 11.5, color: "#8B93A7", flex: 1, minWidth: 200 },
  input: { background: "#0E1219", border: "1px solid #2A3140", color: "#E8EAED", padding: "9px 12px", borderRadius: 8, fontSize: 13, outline: "none" },
  goalSummary: { border: "1px solid #1B2028", borderRadius: 10, padding: "20px", marginBottom: 20, background: "#0E1219" },
  rulesGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 },
  ruleCard: { border: "1px solid #1B2028", borderRadius: 10, padding: "16px 18px", background: "#0E1219" },
  ruleCardTitle: { fontSize: 12.5, fontWeight: 700, color: "#E8B94A", marginBottom: 10, letterSpacing: "0.03em" },
  ruleItem: { marginBottom: 10 },
  ruleItemLabel: { fontSize: 11, fontWeight: 600, color: "#8B93A7", marginBottom: 2, letterSpacing: "0.03em" },
  ruleItemDetail: { fontSize: 13, color: "#C7CCD6", lineHeight: 1.55 },
  checklistBox: { display: "flex", flexDirection: "column", gap: 2, border: "1px solid #1B2028", borderRadius: 10, background: "#0E1219", padding: "6px 8px" },
  checklistItem: { display: "flex", alignItems: "center", gap: 10, background: "transparent", border: "none", cursor: "pointer", padding: "10px 8px", borderRadius: 8, textAlign: "left", width: "100%" },
  checklistText: { fontSize: 13, lineHeight: 1.4 },
};
```
