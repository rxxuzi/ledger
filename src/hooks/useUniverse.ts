"use client";

import { useEffect, useState } from "react";
import { fetchUniverse, type MarketCoin } from "@/lib/hyperliquid";

export type UniverseStatus = "loading" | "ready" | "error";

// One-shot load of the full tradeable universe (crypto + stocks). Returns the
// list plus a coin -> prevDayPx map for computing 24h change against live mids.
export function useUniverse() {
  const [coins, setCoins] = useState<MarketCoin[]>([]);
  const [prevDay, setPrevDay] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<UniverseStatus>("loading");

  useEffect(() => {
    let alive = true;
    fetchUniverse()
      .then((list) => {
        if (!alive) return;
        setCoins(list);
        setPrevDay(Object.fromEntries(list.map((c) => [c.coin, c.prevDayPx])));
        setStatus("ready");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, []);

  return { coins, prevDay, status };
}
