import React, { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, Minus, RadioTower, CalendarClock, Wallet, RefreshCw, Plus, X, Loader2, ChevronDown, ChevronUp } from "lucide-react";

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

const RULES = `Portfolio rules: keep 30–40% cash at all times. On short-term positions, exit at 15–20% profit if markets are volatile. On long-term positions, take a partial exit (sell ~50–75%) at 15–20% profit and let the rest ride. Annual target: 20% portfolio return.`;

const signalColor = (level) => {
  const l = (level || "").toLowerCase();
  if (l.includes("excellent") || l.includes("good")) return "#5FD98A";
  if (l.includes("average") || l.includes("wait")) return "#E8B94A";
  if (l.includes("weak")) return "#E86A5C";
  return "#6B7280";
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
    const ticker = newTicker.trim();
    if (!ticker) return;
    setHoldingLoading(true);
    setHoldingError(null);
    try {
      const result = await apiPost("/api/analyze-holding", { ticker });
      const next = [...holdings.filter((h) => h.ticker.toLowerCase() !== ticker.toLowerCase()), result];
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
      const { text } = await apiPost("/api/daily-brief", { holdings, events });
      const entry = { date: new Date().toISOString(), text };
      const next = [entry, ...briefs].slice(0, 30);
      setBriefs(next);
      persist("/api/briefs", next);
    } catch (e) {
      setBriefError(e.message || "Something went wrong generating the brief.");
    } finally {
      setLoadingBrief(false);
    }
  };

  const goalPct = (() => {
    const s = parseFloat(portfolio.startValue);
    const c = parseFloat(portfolio.currentValue);
    if (!s || !c) return null;
    return ((c - s) / s) * 100;
  })();

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
              <span>{holdings.length} positions</span>
              <span style={styles.mutedSmall}>Tap a row for the thesis</span>
            </div>

            {!addingHolding ? (
              <button onClick={() => setAddingHolding(true)} style={{ ...styles.addBtn, marginBottom: 14 }}>
                <Plus size={14} /> Add holding
              </button>
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
                    {["Ticker", "Price", "RSI", "Short-Term", "Long-Term", "Decision", "Buy Zone"].map((h) => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h) => (
                    <React.Fragment key={h.ticker}>
                      <tr style={styles.tr} onClick={() => setExpanded(expanded === h.ticker ? null : h.ticker)}>
                        <td style={{ ...styles.td, fontWeight: 600, color: "#F0F2F6" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {expanded === h.ticker ? <ChevronUp size={13} color="#6B7280" /> : <ChevronDown size={13} color="#6B7280" />}
                            {h.ticker}
                          </span>
                        </td>
                        <td style={styles.tdMono}>{h.price != null ? `$${h.price}` : "—"}</td>
                        <td style={styles.tdMono}>{h.rsi ?? "—"}</td>
                        <td style={styles.td}><Dot color={signalColor(h.short)} label={h.short} /></td>
                        <td style={styles.td}><Dot color={signalColor(h.long)} label={h.long} /></td>
                        <td style={{ ...styles.td, color: "#C7CCD6" }}>{h.decision}</td>
                        <td style={styles.tdMono}>{h.buyZone}</td>
                      </tr>
                      {expanded === h.ticker && (
                        <tr>
                          <td colSpan={7} style={styles.expandCell}>
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
            <div style={styles.sectionHead}>
              <span>Replaces the daily call — generates from live web data</span>
            </div>
            <button onClick={generateBrief} disabled={loadingBrief} style={styles.generateBtn}>
              {loadingBrief ? <Loader2 size={15} className="spin" /> : <RefreshCw size={15} />}
              {loadingBrief ? "Researching holdings & events…" : "Generate today's brief"}
            </button>
            {briefError && <div style={styles.errorBox}>{briefError}</div>}
            {!ready ? null : briefs.length === 0 && !loadingBrief ? (
              <div style={styles.emptyState}>No brief generated yet today. Tap the button above — it checks live prices, news, and your event watchlist.</div>
            ) : (
              <div style={styles.briefList}>
                {briefs.map((b, i) => (
                  <div key={i} style={styles.briefCard}>
                    <div style={styles.briefDate}>{new Date(b.date).toLocaleString()}</div>
                    <div style={styles.briefText}>{b.text}</div>
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
            <div style={styles.rulesBox}>
              <div style={styles.expandLabel}>Standing rules</div>
              <div style={styles.expandVal}>{RULES}</div>
            </div>
          </div>
        )}
      </main>
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
  generateBtn: { display: "flex", alignItems: "center", gap: 8, background: "#E8B94A", color: "#0B0E14", border: "none", padding: "11px 18px", borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: "pointer", marginBottom: 16 },
  errorBox: { color: "#E86A5C", fontSize: 12.5, marginBottom: 14, padding: "10px 12px", border: "1px solid #3A2323", borderRadius: 8, background: "#1A1113" },
  emptyState: { fontSize: 13, color: "#5B6272", padding: "30px 10px", textAlign: "center", border: "1px dashed #1B2028", borderRadius: 10 },
  briefList: { display: "flex", flexDirection: "column", gap: 14 },
  briefCard: { border: "1px solid #1B2028", borderRadius: 10, padding: "16px 18px", background: "#0E1219" },
  briefDate: { fontSize: 10.5, color: "#5B6272", marginBottom: 10, letterSpacing: "0.04em" },
  briefText: { fontSize: 13, color: "#C7CCD6", lineHeight: 1.7, whiteSpace: "pre-wrap" },
  goalForm: { display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 },
  formLabel: { display: "flex", flexDirection: "column", gap: 6, fontSize: 11.5, color: "#8B93A7", flex: 1, minWidth: 200 },
  input: { background: "#0E1219", border: "1px solid #2A3140", color: "#E8EAED", padding: "9px 12px", borderRadius: 8, fontSize: 13, outline: "none" },
  goalSummary: { border: "1px solid #1B2028", borderRadius: 10, padding: "20px", marginBottom: 20, background: "#0E1219" },
  rulesBox: { border: "1px solid #1B2028", borderRadius: 10, padding: "16px 18px", background: "#0E1219" },
};
