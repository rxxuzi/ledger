import type { Holding, Trade } from "./storage";

export type Position = Holding & {
  mid: number; // current mark price
  marketValue: number;
  cost: number;
  pnl: number;
  pnlPct: number; // fraction, e.g. 0.0124 = +1.24%
};

export type PortfolioTotals = {
  marketValue: number;
  cost: number;
  pnl: number;
  pnlPct: number;
};

export function computePositions(
  holdings: Holding[],
  mids: Record<string, number>,
): Position[] {
  return holdings.map((h) => {
    const mid = mids[h.coin] ?? 0;
    const marketValue = mid * h.quantity;
    const cost = h.avgPrice * h.quantity;
    const pnl = marketValue - cost;
    return {
      ...h,
      mid,
      marketValue,
      cost,
      pnl,
      pnlPct: cost > 0 ? pnl / cost : 0,
    };
  });
}

export function computeTotals(positions: Position[]): PortfolioTotals {
  const marketValue = positions.reduce((s, p) => s + p.marketValue, 0);
  const cost = positions.reduce((s, p) => s + p.cost, 0);
  const pnl = marketValue - cost;
  return { marketValue, cost, pnl, pnlPct: cost > 0 ? pnl / cost : 0 };
}

export type RealizedStats = {
  totalRealized: number;
  trades: number; // total trades
  sells: number; // realizing trades
  wins: number; // sells closed in profit
  winRate: number; // wins / sells (fraction)
};

export type Replay = {
  holdings: Holding[]; // current open positions (qty > 0), with average cost
  realized: RealizedStats;
  tradeRealized: Record<string, number>; // tradeId -> realized P&L (sells only)
};

// Replay the trade log with average-cost accounting: buys raise the position
// and cost basis; sells realize P&L against the running average and reduce the
// basis proportionally. A sell of more than is held is clamped to the position.
export function replayTrades(trades: Trade[]): Replay {
  const sorted = [...trades].sort((a, b) => a.time - b.time);
  const pos: Record<string, { qty: number; cost: number }> = {};
  const tradeRealized: Record<string, number> = {};
  let totalRealized = 0;
  let sells = 0;
  let wins = 0;

  for (const t of sorted) {
    const p = (pos[t.coin] ??= { qty: 0, cost: 0 });
    if (t.side === "buy") {
      p.qty += t.quantity;
      p.cost += t.quantity * t.price;
    } else {
      const avg = p.qty > 0 ? p.cost / p.qty : 0;
      const qty = Math.min(t.quantity, p.qty);
      const realized = (t.price - avg) * qty;
      tradeRealized[t.id] = realized;
      totalRealized += realized;
      sells += 1;
      if (realized >= 0) wins += 1;
      p.qty -= qty;
      p.cost -= avg * qty;
      if (p.qty < 1e-9) {
        p.qty = 0;
        p.cost = 0;
      }
    }
  }

  const holdings: Holding[] = Object.entries(pos)
    .filter(([, p]) => p.qty > 1e-9)
    .map(([coin, p]) => ({ coin, quantity: p.qty, avgPrice: p.cost / p.qty }));

  return {
    holdings,
    realized: {
      totalRealized,
      trades: trades.length,
      sells,
      wins,
      winRate: sells > 0 ? wins / sells : 0,
    },
    tradeRealized,
  };
}
