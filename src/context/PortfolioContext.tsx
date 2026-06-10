"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  loadHoldings,
  loadTrades,
  loadWatchlist,
  saveTrades,
  saveWatchlist,
  type Holding,
  type Trade,
} from "@/lib/storage";
import { replayTrades, type RealizedStats } from "@/lib/portfolio";

type NewTrade = {
  coin: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  time?: number;
};

type PortfolioCtx = {
  trades: Trade[];
  holdings: Holding[]; // derived: current open positions
  realized: RealizedStats; // derived
  tradeRealized: Record<string, number>; // derived: per-sell realized P&L
  addTrade: (t: NewTrade) => void;
  removeTrade: (id: string) => void;
  // Watchlist
  watchlist: string[]; // starred coin ids, newest first
  watched: Set<string>; // lookup helper
  toggleWatch: (coin: string) => void;
};

const Ctx = createContext<PortfolioCtx | null>(null);

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);

  // Load after mount (localStorage is client-only; keeps SSR/CSR markup the
  // same). One-time migration: seed the trade log from any legacy holdings as
  // opening "buy" trades so existing positions carry over.
  useEffect(() => {
    let loaded = loadTrades();
    if (loaded.length === 0) {
      const legacy = loadHoldings();
      if (legacy.length > 0) {
        loaded = legacy.map((h, i) => ({
          id: newId(),
          time: Date.now() - (legacy.length - i),
          coin: h.coin,
          side: "buy" as const,
          quantity: h.quantity,
          price: h.avgPrice,
        }));
        saveTrades(loaded);
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTrades(loaded);
    setWatchlist(loadWatchlist());
  }, []);

  const toggleWatch = useCallback((coin: string) => {
    setWatchlist((prev) => {
      const next = prev.includes(coin)
        ? prev.filter((c) => c !== coin)
        : [coin, ...prev];
      saveWatchlist(next);
      return next;
    });
  }, []);

  const watched = useMemo(() => new Set(watchlist), [watchlist]);

  const addTrade = useCallback((t: NewTrade) => {
    setTrades((prev) => {
      const next = [
        ...prev,
        {
          id: newId(),
          time: t.time ?? Date.now(),
          coin: t.coin,
          side: t.side,
          quantity: t.quantity,
          price: t.price,
        },
      ];
      saveTrades(next);
      return next;
    });
  }, []);

  const removeTrade = useCallback((id: string) => {
    setTrades((prev) => {
      const next = prev.filter((t) => t.id !== id);
      saveTrades(next);
      return next;
    });
  }, []);

  const { holdings, realized, tradeRealized } = useMemo(
    () => replayTrades(trades),
    [trades],
  );

  return (
    <Ctx.Provider
      value={{
        trades,
        holdings,
        realized,
        tradeRealized,
        addTrade,
        removeTrade,
        watchlist,
        watched,
        toggleWatch,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function usePortfolioState(): PortfolioCtx {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("usePortfolioState must be used within <PortfolioProvider>");
  return ctx;
}
