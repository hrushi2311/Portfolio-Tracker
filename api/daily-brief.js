const RULES = `Portfolio rules: keep 30–40% cash at all times. On short-term positions, exit at 15–20% profit if markets are volatile. On long-term positions, take a partial exit (sell ~50–75%) at 15–20% profit and let the rest ride. Annual target: 20% portfolio return.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { holdings = [], events = [] } = req.body || {};
  const tickerList = holdings.map((h) => h.ticker).join(", ");
  const upcoming = events.map((e) => `${e.name}${e.date ? ` (${e.date})` : ""} — ${e.tag}`).join("; ");

  const prompt = `You are helping two people (a portfolio held jointly) with their daily 15-30 min portfolio check-in. Use web search extensively to find TODAY's actual current prices, % move, and — most importantly — any fresh news, headlines, analyst actions, or announcements from the last 24-48 hours for each of these holdings: ${tickerList}. Search each ticker individually if needed to surface real news, not just price data.

${RULES}

Also use web search to check for any macro events happening today or in the next 7 days from this watchlist: ${upcoming}. If any of these events already happened recently, briefly note the actual outcome (e.g. "CPI came in at X vs Y expected") and whether it affected the holdings above.

Write a concise daily brief with these sections:
1. MARKET SNAPSHOT — one or two lines on how markets/sector are behaving today.
2. NEWS & UPDATES — for each ticker with real news in the last day or two: what happened, in one or two lines, and whether it changes the thesis. Skip tickers with no material news rather than padding — just list their price move in one line at the end of this section.
3. THIS WEEK'S EVENTS — flag anything from the watchlist happening today or in the next 7 days, what's expected, and for any that already happened, what the actual result was and its read-through to the holdings.
4. ACTION FLAGS — only list holdings where something actually warrants a decision (approaching a buy zone, hit a profit-take threshold per the rules, or a thesis-breaking event). If nothing warrants action, say so plainly.

Keep it tight — this replaces a 15-30 min call, not a research report. Prioritize genuinely new information over restating known facts. No generic disclaimers beyond one short line at the end reminding this is informational, not financial advice.`;

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
        max_tokens: 1800,
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
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
