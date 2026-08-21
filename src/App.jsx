import React, { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, Minus, RadioTower, CalendarClock, Wallet, RefreshCw, Plus, X, Loader2, ChevronDown, ChevronUp, BookOpen, CheckSquare, Square, Github } from "lucide-react";

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

const TRADING_RULES = [
  {
    category: "Monitor the Recent Trade Buy",
    items: [
      { label: "Short-term positions", detail: "Exit at **15–20% profit** if markets are volatile." },
      { label: "Long-term positions", detail: "Take a partial exit at **15–20% profit**, selling approximately **50–75%** of the holding." },
    ],
  },
  {
    category: "Monitor All Holdings in the Portfolio",
    items: [
      { detail: "Review all current holdings daily." },
      { detail: "Check whether any action is needed based on price movement, news, or market conditions." },
    ],
  },
  {
    category: "Maintain Cash Position",
    items: [{ detail: "Keep **30–40% cash** available at any point in time." }],
  },
  {
    category: "Set Stop-Losses",
    items: [{ detail: "Ensure **all holdings have a stop-loss** in place." }],
  },
  {
    category: "Daily Monitoring",
    items: [
      { detail: "Track market movements and portfolio performance regularly." },
      { detail: "Watch for important news, earnings, corporate actions, and major events affecting holdings." },
    ],
  },
];

const DAILY_QUESTIONS = [
  "Any new stocks bought today?",
  "Did any stock reach the 15–20% profit target?",
  "Were any partial exits taken?",
  "Is the cash position still between 30–40%?",
  "Are stop-losses set for all holdings?",
  "Any stock requiring action due to news or events?",
  "Any upcoming earnings, results, dividends, or announcements?",
];

const signalColor = (level) => {
  const l = (level || "").toLowerCase();
  if (l.includes("excellent") || l.includes("good")) return "#5FD98A";
  if (l.includes("average") || l.includes("wait")) return "#E8B94A";
  if (l.includes("weak")) return "#E86A5C";
  return "#6B7280";
};

const formatBuyZone = (zone) => {
  if (!zone) return "—";
  return zone.replace(/(?<!\$)(\d+(\.\d+)?)/g, "$$$1");
};

const formatPct = (pctNum) => (Number.isFinite(pctNum) ? `${pctNum >= 0 ? "+" : "-"}${Math.abs(pctNum)}%` : "—");

const trendIcon = (h) => {
  if (h.price == null || h.ma50 == null) return <Minus size={13} color="#6B7280" />;
  if (h.price > h.ma50) return <TrendingUp size={13} color="#5FD98A" />;
  if (h.price < h.ma50) return <TrendingDown size={13} color="#E86A5C" />;
  return <Minus size={13} color="#6B7280" />;
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
  const [sectorFilter, setSectorFilter] = useState("All");
  const [refreshingTicker, setRefreshingTicker] = useState(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [refreshAllProgress, setRefreshAllProgress] = useState({ done: 0, total: 0 });
  const [checkedQuestions, setCheckedQuestions] = useState([]);

  const toggleQuestion = (i) => {
    setCheckedQuestions((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  };

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
    const query = newTicker.trim();
    if (!query) return;
    setHoldingLoading(true);
    setHoldingError(null);
    try {
      const result = await apiPost("/api/analyze-holding", { ticker: query });
      const next = [...holdings.filter((h) => h.ticker.toLowerCase() !== result.ticker.toLowerCase()), result];
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

  const refreshHolding = async (ticker) => {
    setRefreshingTicker(ticker);
    try {
      const result = await apiPost("/api/analyze-holding", { ticker });
      const next = holdings.map((h) => (h.ticker === ticker ? result : h));
      setHoldings(next);
      persist("/api/holdings", next);
    } catch (e) {
      console.error("refresh failed", e);
    } finally {
      setRefreshingTicker(null);
    }
  };

  const refreshAllHoldings = async () => {
    if (refreshingAll || holdings.length === 0) return;
    setRefreshingAll(true);
    setRefreshAllProgress({ done: 0, total: holdings.length });
    const tickers = holdings.map((h) => h.ticker);
    const results = new Map();
    const concurrency = 3;
    let nextIndex = 0;
    const worker = async () => {
      while (nextIndex < tickers.length) {
        const ticker = tickers[nextIndex++];
        try {
          results.set(ticker, await apiPost("/api/analyze-holding", { ticker }));
        } catch (e) {
          console.error(`refresh failed for ${ticker}`, e);
        } finally {
          setRefreshAllProgress((p) => ({ ...p, done: p.done + 1 }));
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, tickers.length) }, worker));
    const next = holdings.map((h) => results.get(h.ticker) || h);
    setHoldings(next);
    persist("/api/holdings", next);
    setRefreshingAll(false);
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
      const brief = await apiPost("/api/daily-brief", { holdings, events });
      const entry = { date: new Date().toISOString(), ...brief };
      const next = [entry, ...briefs].slice(0, 30);
      setBriefs(next);
      persist("/api/briefs", next);
    } catch (e) {
      setBriefError(e.message || "Something went wrong generating the brief.");
    } finally {
      setLoadingBrief(false);
    }
  };

  const removeBrief = (index) => {
    const next = briefs.filter((_, idx) => idx !== index);
    setBriefs(next);
    persist("/api/briefs", next);
  };

  const clearBriefs = () => {
    if (briefs.length && !window.confirm("Clear all brief history? This can't be undone.")) return;
    setBriefs([]);
    persist("/api/briefs", []);
  };

  const goalPct = (() => {
    const s = parseFloat(portfolio.startValue);
    const c = parseFloat(portfolio.currentValue);
    if (!s || !c) return null;
    return ((c - s) / s) * 100;
  })();

  const sectors = ["All", ...Array.from(new Set(holdings.map((h) => h.sector))).sort()];
  const filteredHoldings = sectorFilter === "All" ? holdings : holdings.filter((h) => h.sector === sectorFilter);

  return (
    <div style={styles.app}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: #2A3140; border-radius: 4px; }
        @media (max-width: 480px) {
          .app-header { padding: 16px 14px 14px !important; }
          .app-main { padding: 14px 12px !important; }
          .app-tabs { padding: 10px 12px 0 !important; }
        }
      `}</style>

      <header className="app-header" style={styles.header}>
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
        <a
          href="https://github.com/hrushi2311/Portfolio-Tracker"
          target="_blank"
          rel="noopener noreferrer"
          style={styles.githubLink}
        >
          <Github size={14} />
          Source on GitHub
        </a>
      </header>

      <nav className="app-tabs" style={styles.tabs}>
        {[
          ["holdings", "Holdings", TrendingUp],
          ["events", "Events", CalendarClock],
          ["brief", "Daily Brief", RadioTower],
          ["goal", "Goal Tracker", Wallet],
          ["playbook", "Playbook", BookOpen],
        ].map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)} style={{ ...styles.tab, ...(tab === key ? styles.tabActive : {}) }}>
            <Icon size={14} strokeWidth={2} />
            {label}
          </button>
        ))}
      </nav>

      <main className="app-main" style={styles.main}>
        {tab === "holdings" && (
          <div>
            <div style={styles.sectionHead}>
              <span>{filteredHoldings.length} position{filteredHoldings.length === 1 ? "" : "s"}{sectorFilter !== "All" ? ` · ${sectorFilter}` : ""}</span>
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <span style={styles.mutedSmall}>Tap a row for the thesis</span>
                <select value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)} style={styles.sectorSelect}>
                  {sectors.map((s) => (
                    <option key={s} value={s}>{s === "All" ? "All sectors" : s}</option>
                  ))}
                </select>
              </div>
            </div>

            {!addingHolding ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                <button onClick={() => setAddingHolding(true)} disabled={refreshingAll} style={{ ...styles.addBtn, flex: 1, minWidth: 160 }}>
                  <Plus size={14} /> Add holding
                </button>
                <button onClick={refreshAllHoldings} disabled={refreshingAll} style={styles.refreshAllBtn}>
                  {refreshingAll ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
                  {refreshingAll ? `Refreshing ${refreshAllProgress.done}/${refreshAllProgress.total}…` : "Refresh all"}
                </button>
              </div>
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
                    {["Ticker", "Price", "RSI", "Short-Term", "Long-Term", "Decision", "Buy Zone", ""].map((h, i) => (
                      <th key={i} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredHoldings.map((h) => (
                    <React.Fragment key={h.ticker}>
                      <tr style={styles.tr} onClick={() => setExpanded(expanded === h.ticker ? null : h.ticker)}>
                        <td style={{ ...styles.td, fontWeight: 600, color: "#F0F2F6" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {expanded === h.ticker ? <ChevronUp size={13} color="#6B7280" /> : <ChevronDown size={13} color="#6B7280" />}
                            {h.ticker}
                          </span>
                        </td>
                        <td style={styles.tdMono}>
                          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            {trendIcon(h)}
                            {h.price != null ? `$${h.price}` : "—"}
                          </span>
                        </td>
                        <td style={styles.tdMono}>{h.rsi ?? "—"}</td>
                        <td style={styles.td}><Dot color={signalColor(h.short)} label={h.short} /></td>
                        <td style={styles.td}><Dot color={signalColor(h.long)} label={h.long} /></td>
                        <td style={{ ...styles.td, color: "#C7CCD6" }}>{h.decision}</td>
                        <td style={styles.tdMono}>{formatBuyZone(h.buyZone)}</td>
                        <td style={styles.td} onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => refreshHolding(h.ticker)}
                            disabled={refreshingTicker === h.ticker || refreshingAll}
                            style={styles.rowRefreshBtn}
                            title={`Refresh ${h.ticker}`}
                          >
                            {refreshingTicker === h.ticker ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />}
                          </button>
                        </td>
                      </tr>
                      {expanded === h.ticker && (
                        <tr>
                          <td colSpan={8} style={styles.expandCell}>
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
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: briefError ? 14 : 0 }}>
              <button onClick={generateBrief} disabled={loadingBrief} style={{ ...styles.generateBtn, marginBottom: 0 }}>
                {loadingBrief ? <Loader2 size={15} className="spin" /> : <RefreshCw size={15} />}
                {loadingBrief ? "Researching holdings & events…" : "Generate today's brief"}
              </button>
              {briefs.length > 0 && (
                <button onClick={clearBriefs} style={styles.clearHistoryBtn}>
                  Clear history
                </button>
              )}
            </div>
            {briefError && <div style={styles.errorBox}>{briefError}</div>}
            {!ready ? null : briefs.length === 0 && !loadingBrief ? (
              <div style={{ ...styles.emptyState, marginTop: 16 }}>No brief generated yet today. Tap the button above — it checks live prices, news, and your event watchlist.</div>
            ) : (
              <div style={{ ...styles.briefList, marginTop: 16 }}>
                {briefs.map((b, i) => (
                  <div key={i} style={styles.briefCard}>
                    <div style={styles.briefCardHead}>
                      <div style={styles.briefDate}>{new Date(b.date).toLocaleString()}</div>
                      <button onClick={() => removeBrief(i)} style={styles.iconBtn} title="Delete this brief">
                        <X size={14} color="#6B7280" />
                      </button>
                    </div>
                    {b.text ? <BriefContent text={b.text} /> : <StructuredBrief brief={b} />}
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
          </div>
        )}

        {tab === "playbook" && (
          <div>
            <div style={styles.sectionHead}><span>Standing trading rules &amp; daily check-in checklist</span></div>

            <div style={styles.rulesGrid}>
              {TRADING_RULES.map((group, gi) => (
                <div key={gi} style={styles.ruleCard}>
                  <div style={styles.ruleCardTitle}>{group.category}</div>
                  {group.items.map((item, ii) => (
                    <div key={ii} style={styles.ruleItem}>
                      {item.label && <div style={styles.ruleItemLabel}>{item.label}</div>}
                      <div style={styles.ruleItemDetail}>{renderInline(item.detail, `r${gi}-${ii}`)}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div style={{ ...styles.sectionHead, marginTop: 28 }}><span>Daily check-in questions</span></div>
            <div style={styles.checklistBox}>
              {DAILY_QUESTIONS.map((q, i) => {
                const checked = checkedQuestions.includes(i);
                return (
                  <button key={i} onClick={() => toggleQuestion(i)} style={styles.checklistItem}>
                    {checked ? <CheckSquare size={16} color="#5FD98A" /> : <Square size={16} color="#5B6272" />}
                    <span style={{ ...styles.checklistText, color: checked ? "#5B6272" : "#C7CCD6", textDecoration: checked ? "line-through" : "none" }}>
                      {q}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const INVISIBLE_CHARS_RE = new RegExp(
  "[\\u2060\\u200B\\u200C\\u200D\\u200E\\u200F\\uFEFF\\u{E000}-\\u{F8FF}\\u{F0000}-\\u{FFFFD}\\u{100000}-\\u{10FFFD}]",
  "gu"
);

function cleanBriefLine(line) {
  return line
    .replace(INVISIBLE_CHARS_RE, "")
    .replace(/\s?cite\w*turn\d+\w*\d*/gi, "")
    .replace(/\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\(\s*(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\.[a-z]{2,})?\s*\)/gi, "")
    .replace(/\(\s*\)/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+([.,;:])/g, "$1")
    .trim();
}

function renderInline(line, keyPrefix) {
  const re = /\*\*([^*]+)\*\*/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  let i = 0;
  while ((match = re.exec(line)) !== null) {
    if (match.index > lastIndex) parts.push(line.slice(lastIndex, match.index));
    parts.push(<strong key={`${keyPrefix}-${i++}`} style={styles.briefBold}>{match[1]}</strong>);
    lastIndex = re.lastIndex;
  }
  if (lastIndex < line.length) parts.push(line.slice(lastIndex));
  return parts;
}

function BriefContent({ text }) {
  const lines = text.split("\n");
  return (
    <div>
      {lines.map((rawLine, i) => {
        const trimmed = cleanBriefLine(rawLine);
        if (!trimmed) return null;
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) return null;

        const boldHeader = trimmed.match(/^\*\*\s*(?:\d+\.\s*)?(.+?)\s*\*\*:?$/);
        const plainHeader = trimmed.match(/^(?:\d+\.\s*)?([A-Z][A-Z0-9 &']{3,})\s*:?$/);
        if (boldHeader) {
          return <div key={i} style={styles.briefSectionHead}>{boldHeader[1].replace(/^\d+\.\s*/, "")}</div>;
        }
        if (plainHeader) {
          return <div key={i} style={styles.briefSectionHead}>{plainHeader[1]}</div>;
        }

        const tickerPrice = trimmed.match(/^\*\*([A-Z][A-Z0-9.]{0,6})\*\*\s*[–—-]?\s*\$?([\d,]+\.?\d*)\s*\(([+-]?[\d.]+)%\)\.?\s*(.*)$/);
        if (tickerPrice) {
          const [, ticker, price, pct, rest] = tickerPrice;
          const pctNum = parseFloat(pct);
          const color = pctNum >= 0 ? "#5FD98A" : "#E86A5C";
          return (
            <div key={i} style={styles.briefTickerBlock}>
              <div style={styles.briefTickerHead}>
                <span style={styles.briefTickerSymbol}>{ticker}</span>
                <span style={styles.briefTickerPrice}>${price}</span>
                <span style={{ ...styles.briefTickerPct, color }}>{formatPct(pctNum)}</span>
              </div>
              {rest && <div style={styles.briefLine}>{renderInline(rest, `t${i}`)}</div>}
            </div>
          );
        }

        const tickerHeader = trimmed.match(/^([A-Z][A-Z0-9.]{1,5})\s*[–—-]\s*(.+)$/);
        if (tickerHeader) {
          return (
            <div key={i} style={styles.briefTickerBlock}>
              <div style={styles.briefTickerHead}>
                <span style={styles.briefTickerSymbol}>{tickerHeader[1]}</span>
                <span style={styles.briefTickerName}>{tickerHeader[2]}</span>
              </div>
            </div>
          );
        }

        const labelMatch = trimmed.match(/^(Price|News|Detail|Update|Events?)\s*:\s*(.*)$/i);
        if (labelMatch) {
          const [, label, value] = labelMatch;
          const pctInline = value.match(/^(.*?)\(([+-]?[\d.]+)%\)\s*$/);
          if (/^price$/i.test(label) && pctInline) {
            const pctNum = parseFloat(pctInline[2]);
            const color = pctNum >= 0 ? "#5FD98A" : "#E86A5C";
            return (
              <div key={i} style={styles.briefLabelLine}>
                <span style={styles.briefLabel}>{label}</span>
                <span>
                  {renderInline(pctInline[1].trim(), `p${i}`)}{" "}
                  <span style={{ color, fontWeight: 600 }}>({formatPct(pctNum)})</span>
                </span>
              </div>
            );
          }
          return (
            <div key={i} style={styles.briefLabelLine}>
              <span style={styles.briefLabel}>{label}</span>
              <span>{renderInline(value, `v${i}`)}</span>
            </div>
          );
        }

        const bulletMatch = trimmed.match(/^[-•*]\s+(.*)/);
        if (bulletMatch) {
          return (
            <div key={i} style={styles.briefBullet}>
              <span style={styles.briefBulletDot}>•</span>
              <span>{renderInline(bulletMatch[1], `l${i}`)}</span>
            </div>
          );
        }

        return <div key={i} style={styles.briefLine}>{renderInline(trimmed, `l${i}`)}</div>;
      })}
    </div>
  );
}

function StructuredBrief({ brief }) {
  const news = brief.news || [];
  const withNews = news.filter((n) => n.hasNews).map((n) => n.ticker);
  const withoutNews = news.filter((n) => !n.hasNews).map((n) => n.ticker);

  return (
    <div>
      {brief.marketSnapshot && (
        <>
          <div style={styles.briefSectionHead}>Market Snapshot</div>
          <div style={styles.briefLine}>{brief.marketSnapshot}</div>
        </>
      )}

      {news.length > 0 && (
        <>
          <div style={styles.briefSectionHead}>News &amp; Updates</div>
          {news.map((n, i) => {
            const pctNum = typeof n.pct === "number" ? n.pct : parseFloat(n.pct);
            const color = Number.isFinite(pctNum) ? (pctNum >= 0 ? "#5FD98A" : "#E86A5C") : "#6B7280";
            return (
              <div key={i} style={styles.briefTickerBlock}>
                <div style={styles.briefTickerHead}>
                  <span style={styles.briefTickerSymbol}>{n.ticker}</span>
                  {n.name && <span style={styles.briefTickerName}>{n.name}</span>}
                </div>
                <div style={styles.briefLabelLine}>
                  <span style={styles.briefLabel}>Price</span>
                  <span>
                    {n.price != null ? `$${n.price}` : "—"}{" "}
                    <span style={{ color, fontWeight: 600 }}>({formatPct(pctNum)})</span>
                  </span>
                </div>
                {n.news && (
                  <div style={styles.briefLabelLine}>
                    <span style={styles.briefLabel}>News</span>
                    <span>{n.news}</span>
                  </div>
                )}
              </div>
            );
          })}

          {(withNews.length > 0 || withoutNews.length > 0) && (
            <div style={{ marginTop: 14 }}>
              <div style={styles.briefSectionHead}>Summary of News &amp; Price Moves</div>
              {withNews.length > 0 && (
                <div style={styles.briefBullet}>
                  <span style={styles.briefBulletDot}>•</span>
                  <span>Fresh news: {withNews.join(", ")}</span>
                </div>
              )}
              {withoutNews.length > 0 && (
                <div style={styles.briefBullet}>
                  <span style={styles.briefBulletDot}>•</span>
                  <span>Price moves only, no material news: {withoutNews.join(", ")}</span>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {brief.events && brief.events.length > 0 && (
        <>
          <div style={styles.briefSectionHead}>This Week's Events</div>
          {brief.events.map((e, i) => (
            <div key={i} style={styles.briefBullet}>
              <span style={styles.briefBulletDot}>•</span>
              <span><strong style={styles.briefBold}>{e.when}:</strong> {e.detail}</span>
            </div>
          ))}
        </>
      )}

      <div style={styles.briefSectionHead}>Action Flags</div>
      {brief.actionFlags && brief.actionFlags.length > 0 ? (
        brief.actionFlags.map((flag, i) => (
          <div key={i} style={styles.briefBullet}>
            <span style={styles.briefBulletDot}>•</span>
            <span>{flag}</span>
          </div>
        ))
      ) : (
        <div style={styles.briefLine}>No action flagged today.</div>
      )}
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
  githubLink: { display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#6B7280", textDecoration: "none", border: "1px solid #1B2028", borderRadius: 8, padding: "6px 10px", alignSelf: "center" },
  goalWrap: { minWidth: 220 },
  goalLabel: { fontSize: 10.5, color: "#6B7280", letterSpacing: "0.06em", marginBottom: 6 },
  goalBarTrack: { width: "100%", height: 5, background: "#1B2028", borderRadius: 3, overflow: "hidden" },
  goalBarFill: { height: "100%", borderRadius: 3, transition: "width 0.4s ease" },
  goalPct: { fontSize: 12.5, fontFamily: "ui-monospace, monospace", marginTop: 5, textAlign: "right" },
  tabs: { display: "flex", gap: 4, padding: "14px 20px 0", borderBottom: "1px solid #1B2028", overflowX: "auto" },
  tab: { display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: "#6B7280", padding: "9px 14px", fontSize: 12.5, fontWeight: 500, cursor: "pointer", borderBottom: "2px solid transparent", whiteSpace: "nowrap" },
  tabActive: { color: "#E8B94A", borderBottom: "2px solid #E8B94A" },
  main: { padding: "20px 24px", maxWidth: 980, margin: "0 auto" },
  sectionHead: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, fontSize: 12, color: "#8B93A7", marginBottom: 12 },
  mutedSmall: { fontSize: 11, color: "#5B6272" },
  sectorSelect: { background: "#0E1219", border: "1px solid #2A3140", color: "#C7CCD6", padding: "6px 10px", borderRadius: 7, fontSize: 11.5, outline: "none", cursor: "pointer" },
  rowRefreshBtn: { background: "transparent", border: "none", cursor: "pointer", color: "#6B7280", display: "flex", alignItems: "center", padding: 4 },
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
  refreshAllBtn: { display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid #2A3140", color: "#8B93A7", padding: "10px 14px", borderRadius: 10, cursor: "pointer", fontSize: 12.5, whiteSpace: "nowrap" },
  generateBtn: { display: "flex", alignItems: "center", gap: 8, background: "#E8B94A", color: "#0B0E14", border: "none", padding: "11px 18px", borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: "pointer", marginBottom: 16 },
  errorBox: { color: "#E86A5C", fontSize: 12.5, marginBottom: 14, padding: "10px 12px", border: "1px solid #3A2323", borderRadius: 8, background: "#1A1113" },
  emptyState: { fontSize: 13, color: "#5B6272", padding: "30px 10px", textAlign: "center", border: "1px dashed #1B2028", borderRadius: 10 },
  briefList: { display: "flex", flexDirection: "column", gap: 14 },
  briefCard: { border: "1px solid #1B2028", borderRadius: 10, padding: "16px 18px", background: "#0E1219" },
  briefCardHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  briefDate: { fontSize: 10.5, color: "#5B6272", letterSpacing: "0.04em" },
  clearHistoryBtn: { background: "transparent", border: "1px solid #2A3140", color: "#8B93A7", padding: "10px 14px", borderRadius: 9, fontSize: 12.5, cursor: "pointer" },
  briefSectionHead: { fontSize: 11, fontWeight: 700, color: "#E8B94A", letterSpacing: "0.06em", marginTop: 18, marginBottom: 8, paddingBottom: 6, borderBottom: "1px solid #1B2028" },
  briefLine: { fontSize: 13, color: "#C7CCD6", lineHeight: 1.7, marginBottom: 6 },
  briefBullet: { display: "flex", gap: 8, fontSize: 13, color: "#C7CCD6", lineHeight: 1.6, marginBottom: 5 },
  briefBulletDot: { color: "#5B6272", flexShrink: 0 },
  briefBold: { color: "#F0F2F6", fontWeight: 700 },
  briefTickerBlock: { marginTop: 14, paddingTop: 10, borderTop: "1px solid #151A22" },
  briefTickerHead: { display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 },
  briefTickerSymbol: { fontSize: 12.5, fontWeight: 700, color: "#F0F2F6", fontFamily: "ui-monospace, monospace" },
  briefTickerPrice: { fontSize: 12, color: "#8B93A7", fontFamily: "ui-monospace, monospace" },
  briefTickerPct: { fontSize: 11.5, fontWeight: 700, fontFamily: "ui-monospace, monospace" },
  briefTickerName: { fontSize: 11.5, color: "#6B7280" },
  briefLabelLine: { display: "flex", gap: 8, fontSize: 13, color: "#C7CCD6", lineHeight: 1.6, marginBottom: 4 },
  briefLabel: { fontSize: 10, fontWeight: 700, color: "#5B6272", letterSpacing: "0.05em", textTransform: "uppercase", flexShrink: 0, minWidth: 42, paddingTop: 2 },
  goalForm: { display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 },
  formLabel: { display: "flex", flexDirection: "column", gap: 6, fontSize: 11.5, color: "#8B93A7", flex: 1, minWidth: 200 },
  input: { background: "#0E1219", border: "1px solid #2A3140", color: "#E8EAED", padding: "9px 12px", borderRadius: 8, fontSize: 13, outline: "none" },
  goalSummary: { border: "1px solid #1B2028", borderRadius: 10, padding: "20px", marginBottom: 20, background: "#0E1219" },
  rulesGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 },
  ruleCard: { border: "1px solid #1B2028", borderRadius: 10, padding: "16px 18px", background: "#0E1219" },
  ruleCardTitle: { fontSize: 12.5, fontWeight: 700, color: "#E8B94A", marginBottom: 10, letterSpacing: "0.03em" },
  ruleItem: { marginBottom: 10 },
  ruleItemLabel: { fontSize: 11, fontWeight: 600, color: "#8B93A7", marginBottom: 2, letterSpacing: "0.03em" },
  ruleItemDetail: { fontSize: 13, color: "#C7CCD6", lineHeight: 1.55 },
  checklistBox: { display: "flex", flexDirection: "column", gap: 2, border: "1px solid #1B2028", borderRadius: 10, background: "#0E1219", padding: "6px 8px" },
  checklistItem: { display: "flex", alignItems: "center", gap: 10, background: "transparent", border: "none", cursor: "pointer", padding: "10px 8px", borderRadius: 8, textAlign: "left", width: "100%" },
  checklistText: { fontSize: 13, lineHeight: 1.4 },
};
