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
