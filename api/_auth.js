import crypto from "node:crypto";

const COOKIE_NAME = "portfolio_auth";

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

// Defense-in-depth: middleware.js already gates every request before it reaches
// these functions, but each route re-checks the auth cookie itself so a future
// change to the middleware matcher can't silently leave the API open.
export function requireAuth(req, res) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return true; // gate disabled — matches middleware.js's fail-open behavior

  const expectedHash = crypto.createHash("sha256").update(expected).digest("hex");
  const cookies = parseCookies(req.headers.cookie);
  const provided = cookies[COOKIE_NAME] || "";

  const a = Buffer.from(provided);
  const b = Buffer.from(expectedHash);
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!valid) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}
