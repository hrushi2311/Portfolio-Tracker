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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { ticker } = req.body || {};
  if (!ticker || typeof ticker !== "string") {
    return res.status(400).json({ error: "Missing ticker" });
  }

  const prompt = `Research the stock/ETF "${ticker}" using web search. Find its CURRENT price, 20-day moving average, 50-day moving average, 200-day moving average, and RSI (14-day). If a moving average or RSI isn't available (e.g. for some ETFs or newly listed names), use null.

Then do the analysis: figure out the sector, a one-line description of what the company/fund does, what tends to move the price up, what tends to move it down, and what upcoming events/catalysts to watch (earnings dates, product events, etc — use web search for the real upcoming date if you can find one).

Then apply this trading framework to decide the short-term outlook, long-term outlook, decision, and a buy zone (a realistic price range near-ish current price where it would be attractive to add):
- short/long term outlook should be one of: "excellent", "good", "average", "weak"
- base outlook partly on where price sits relative to its moving averages and RSI (RSI under 30 = oversold/attractive, RSI over 70 = overbought/caution; price above rising MAs = bullish structure)
- decision should be one of: "Buy", "Buy Small", "Accumulate", "Wait / Buy Small", "Wait for Pullback", "SIP / Accumulate"

Respond with ONLY a single JSON object, no other text, no markdown fences, in exactly this shape:
{"ticker":"${ticker}","sector":"...","what":"...","up":"...","down":"...","events":"...","price":123.45,"ma20":123.45,"ma50":123.45,"ma200":123.45,"rsi":45.6,"short":"good","long":"excellent","decision":"Buy Small","buyZone":"120-125"}`;

  try {
    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
      }),
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return res.status(502).json({ error: `Anthropic API error: ${apiRes.status}`, detail: errText });
    }

    const data = await apiRes.json();
    const text = data.content.filter((b) => b.type === "text").map((b) => b.text).join("\n\n");
    const parsed = extractJSON(text);
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
