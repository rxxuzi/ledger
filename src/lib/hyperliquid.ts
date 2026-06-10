// Hyperliquid public API: WebSocket (live) + /info REST (history).
// No auth, no cost. Docs: https://hyperliquid.gitbook.io/hyperliquid-docs/

export const WS_URL = "wss://api.hyperliquid.xyz/ws";
export const INFO_URL = "https://api.hyperliquid.xyz/info";

// Stock perps live on Hyperliquid's "xyz" builder perp dex (trade.xyz), with
// coin ids namespaced "xyz:<SYMBOL>". Crypto perps live on the main dex with
// bare ids ("BTC"). allMids must be queried once per dex; "" = the main dex.
export const STOCK_DEX = "xyz";
export const MID_DEXES = ["", STOCK_DEX] as const; // dexes to stream allMids for

export type Group = "Stocks" | "Crypto" | "Commodity";
export const GROUPS: readonly Group[] = ["Stocks", "Crypto", "Commodity"];

export const DEFAULT_COIN = "BTC";

// The xyz dex mixes equities, commodities, and indices/forex under one
// namespace; the API doesn't tag them, so commodities are listed explicitly.
// Everything else on xyz is treated as a "stock".
const COMMODITY_SYMBOLS = new Set([
  "GOLD",
  "SILVER",
  "COPPER",
  "PLATINUM",
  "PALLADIUM",
  "ALUMINIUM",
  "URANIUM",
  "NATGAS",
  "CL", // WTI crude
  "BRENTOIL",
  "TTF", // Dutch natural gas
  "CORN",
  "WHEAT",
]);

// Crypto = main dex (bare ids). xyz dex = stocks, except the symbols above
// which are commodities.
export const groupOf = (coin: string): Group => {
  if (!coin.startsWith(`${STOCK_DEX}:`)) return "Crypto";
  return COMMODITY_SYMBOLS.has(displaySymbol(coin)) ? "Commodity" : "Stocks";
};

// "xyz:AAPL" -> "AAPL" for display.
export const displaySymbol = (coin: string) =>
  coin.includes(":") ? coin.split(":")[1] : coin;

// Human-friendly names for the well-known symbols; everything else just shows
// its ticker. (Hyperliquid's meta only exposes symbols, not company names.)
const NAMES: Record<string, string> = {
  AAPL: "Apple",
  TSLA: "Tesla",
  NVDA: "NVIDIA",
  MSFT: "Microsoft",
  AMZN: "Amazon",
  META: "Meta",
  GOOGL: "Alphabet",
  PLTR: "Palantir",
  COIN: "Coinbase",
  HOOD: "Robinhood",
  MSTR: "MicroStrategy",
  NFLX: "Netflix",
  AMD: "AMD",
  BTC: "Bitcoin",
  ETH: "Ethereum",
  SOL: "Solana",
  HYPE: "Hyperliquid",
  XRP: "XRP",
  DOGE: "Dogecoin",
  BNB: "BNB",
  AVAX: "Avalanche",
  LINK: "Chainlink",
  SUI: "Sui",
  LTC: "Litecoin",
};
export const coinName = (symbol: string) => NAMES[symbol] ?? symbol;

// Hyperliquid serves a logo per coin keyed by the full id (crypto "BTC",
// stocks/commodities "xyz:INTC"). The xyz-prefixed asset is the accurate one
// for stocks, so always use the full coin id. Failed loads fall back to a
// monogram in CoinIcon.
export const logoUrl = (coin: string) =>
  `https://app.hyperliquid.xyz/coins/${coin}.svg`;

// A tradeable coin with a 24h reference price. `prevDayPx` powers the change %,
// `markPx` is a snapshot price shown until the live mid stream takes over.
export type MarketCoin = {
  coin: string; // "BTC" or "xyz:AAPL"
  symbol: string;
  group: Group;
  markPx: number;
  prevDayPx: number;
  volume: number; // 24h notional volume, used for default sort
};

export type Interval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d" | "1w";
export const INTERVALS: readonly Interval[] = [
  "1m",
  "5m",
  "15m",
  "1h",
  "4h",
  "1d",
  "1w",
];

export const INTERVAL_MS: Record<Interval, number> = {
  "1m": 60_000,
  "5m": 300_000,
  "15m": 900_000,
  "1h": 3_600_000,
  "4h": 14_400_000,
  "1d": 86_400_000,
  "1w": 604_800_000,
};

// Normalized candle. `time` is a UNIX timestamp in *seconds* — the unit
// lightweight-charts expects for intraday data (UTCTimestamp).
export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

// ---- Raw WS message shapes ----

// Candle payload uses single-letter keys and string-encoded numbers.
export type HlCandle = {
  t: number; // open time (ms)
  T: number; // close time (ms)
  s: string; // coin
  i: string; // interval
  o: string;
  c: string;
  h: string;
  l: string;
  v: string;
  n: number; // trade count
};

// Only the messages we act on are typed precisely; anything else parses into
// the fallback and is ignored by the consumer's channel switch.
export type HlMessage =
  | { channel: "candle"; data: HlCandle }
  | { channel: "allMids"; data: { mids: Record<string, string> } }
  | { channel: "subscriptionResponse" | "pong"; data?: unknown };

export function parseCandle(d: HlCandle): Candle {
  return {
    time: Math.floor(d.t / 1000),
    open: Number(d.o),
    high: Number(d.h),
    low: Number(d.l),
    close: Number(d.c),
    volume: Number(d.v),
  };
}

// Fetch the most recent `limit` candles via REST so the chart has history
// before the live stream takes over.
export async function fetchCandleHistory(
  coin: string,
  interval: Interval,
  limit = 300,
): Promise<Candle[]> {
  const endTime = Date.now();
  const startTime = endTime - INTERVAL_MS[interval] * limit;
  const res = await fetch(INFO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "candleSnapshot",
      req: { coin, interval, startTime, endTime },
    }),
  });
  if (!res.ok) throw new Error(`candleSnapshot ${coin} ${interval}: ${res.status}`);
  const arr = (await res.json()) as HlCandle[];
  return Array.isArray(arr) ? arr.map(parseCandle) : [];
}

// metaAndAssetCtxs returns [meta, ctxs] zipped by index: one entry per coin
// with mark/prev-day prices and volume. One call per dex covers the whole
// universe (≈230 crypto + 88 stocks) — cheap enough to power live search.
type AssetCtx = { markPx?: string; prevDayPx?: string; dayNtlVlm?: string };

async function fetchDexUniverse(dex: string): Promise<MarketCoin[]> {
  const body: Record<string, unknown> = { type: "metaAndAssetCtxs" };
  if (dex) body.dex = dex;
  const res = await fetch(INFO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`metaAndAssetCtxs ${dex || "main"}: ${res.status}`);
  const [meta, ctxs] = (await res.json()) as [
    { universe: { name: string }[] },
    AssetCtx[],
  ];
  return meta.universe.map((u, i) => {
    const c = ctxs[i] ?? {};
    const coin = u.name;
    const markPx = Number(c.markPx ?? 0);
    return {
      coin,
      symbol: displaySymbol(coin),
      group: groupOf(coin),
      markPx,
      prevDayPx: Number(c.prevDayPx ?? markPx),
      volume: Number(c.dayNtlVlm ?? 0),
    };
  });
}

// Whole tradeable universe across both dexes, sorted by 24h volume within
// each group so the most-traded names surface first.
export async function fetchUniverse(): Promise<MarketCoin[]> {
  const perDex = await Promise.all(MID_DEXES.map((d) => fetchDexUniverse(d)));
  const all = perDex.flat().filter((c) => c.markPx > 0);
  all.sort((a, b) => b.volume - a.volume);
  return all;
}
