// Holdings live entirely in localStorage — no server, no DB.

export type Holding = {
  coin: string; // "AAPL"
  avgPrice: number; // acquisition price (USD)
  quantity: number; // shares held
};

const KEY = "ledger.holdings.v1";

// No seeded holdings — the user tracks positions themselves. Coins use the
// full Hyperliquid id ("xyz:AAPL" / "BTC") so they match mids keys directly.
const DEFAULTS: Holding[] = [];

export function loadHoldings(): Holding[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULTS;
    return parsed.filter(
      (h): h is Holding =>
        typeof h?.coin === "string" &&
        typeof h?.avgPrice === "number" &&
        typeof h?.quantity === "number",
    );
  } catch {
    return DEFAULTS;
  }
}

export function saveHoldings(holdings: Holding[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(holdings));
}

// Trades are the source of truth; current positions + realized P&L are derived
// by replaying them (see lib/portfolio.ts). A buy adds to a position at a
// price; a sell removes from it, realizing P&L against the average cost.
export type Trade = {
  id: string;
  time: number; // ms epoch
  coin: string; // full id, e.g. "BTC" / "xyz:AAPL"
  side: "buy" | "sell";
  quantity: number;
  price: number; // execution price (USD)
};

const TRADES_KEY = "ledger.trades.v1";

export function loadTrades(): Trade[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TRADES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t): t is Trade =>
        typeof t?.id === "string" &&
        typeof t?.time === "number" &&
        typeof t?.coin === "string" &&
        (t?.side === "buy" || t?.side === "sell") &&
        typeof t?.quantity === "number" &&
        typeof t?.price === "number",
    );
  } catch {
    return [];
  }
}

export function saveTrades(trades: Trade[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TRADES_KEY, JSON.stringify(trades));
}

// Watchlist: starred coin ids, most-recent first.
const WATCH_KEY = "ledger.watchlist.v1";

export function loadWatchlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(WATCH_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((c) => typeof c === "string") : [];
  } catch {
    return [];
  }
}

export function saveWatchlist(list: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WATCH_KEY, JSON.stringify(list));
}
