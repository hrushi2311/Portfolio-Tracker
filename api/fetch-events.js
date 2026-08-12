import { requireAuth } from "./_auth.js";

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
  if (!requireAuth(req, res)) return;

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
