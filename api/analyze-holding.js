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
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      error: "AI features are disabled in this demo — clone the repo and add your own OpenAI API key to enable them.",
    });
  }

  const raw = req.body?.ticker;
  const ticker = typeof raw === "string" ? raw.trim() : "";
  if (!ticker || ticker.length > 40) {
    return res.status(400).json({ error: "Missing or invalid ticker" });
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
