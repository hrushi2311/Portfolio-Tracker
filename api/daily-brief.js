import { requireAuth } from "./_auth.js";

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

const MAX_LIST_ITEMS = 100;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!requireAuth(req, res)) return;

  const holdings = Array.isArray(req.body?.holdings) ? req.body.holdings.slice(0, MAX_LIST_ITEMS) : [];
  const events = Array.isArray(req.body?.events) ? req.body.events.slice(0, MAX_LIST_ITEMS) : [];
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
