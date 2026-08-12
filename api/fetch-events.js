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

  const monthLabel = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
  const prompt = `Using web search, find the key US stock market events for ${monthLabel}: FOMC/Fed rate decisions, CPI and PPI inflation reports, nonfarm payrolls / jobs report, GDP releases, and any other major scheduled macro data releases from the Federal Reserve, BLS, or Commerce Department. Use real, current dates for this month — search for the actual release calendar.

Respond with ONLY a JSON array, no other text, no markdown fences, in exactly this shape:
[{"name":"FOMC Rate Decision","detail":"Fed interest rate decision — high market impact","tag":"Key","date":"2026-08-27"}]

Include 5-10 events. Use tag "Key" for high-impact events (Fed decisions, CPI) and "Monthly" for routine scheduled releases.`;

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
