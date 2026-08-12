import { kv } from "@vercel/kv";
import { requireAuth } from "./_auth.js";

const MAX_PAYLOAD_CHARS = 500_000;

// Shared helper: GET returns the stored value (or a default), POST overwrites it.
// Every route using this shares one KV database, so both people see the same data.
export function makeStoreHandler(key, defaultValue) {
  return async function handler(req, res) {
    if (!requireAuth(req, res)) return;
    try {
      if (req.method === "GET") {
        const value = await kv.get(key);
        return res.status(200).json(value ?? defaultValue);
      }
      if (req.method === "POST") {
        const { value } = req.body || {};
        if (JSON.stringify(value ?? null).length > MAX_PAYLOAD_CHARS) {
          return res.status(413).json({ error: "Payload too large" });
        }
        await kv.set(key, value);
        return res.status(200).json({ ok: true });
      }
      return res.status(405).json({ error: "Method not allowed" });
    } catch (err) {
      return res.status(500).json({ error: err.message || "Storage error" });
    }
  };
}
