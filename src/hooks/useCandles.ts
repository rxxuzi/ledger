"use client";

import { useEffect, useState } from "react";
import { useHyperliquid } from "@/context/HyperliquidContext";
import { fetchCandleHistory, type Candle, type Interval } from "@/lib/hyperliquid";

// We display ~300 bars but keep a much longer buffer so long EMAs (e.g. 200)
// are fully warmed up before the visible range begins — the extra bars are
// compute-only context, never drawn (see DISPLAY_BARS in CandleChart).
const MAX_BARS = 1000;

export type CandlesStatus = "loading" | "ready" | "error";

// Loads REST history for a coin/interval, then keeps it live via the shared
// WebSocket. Maintains a rolling buffer of the latest MAX_BARS candles.
export function useCandles(coin: string, interval: Interval) {
  const { subscribeCandle } = useHyperliquid();
  const [candles, setCandles] = useState<Candle[]>([]);
  const [status, setStatus] = useState<CandlesStatus>("loading");

  // Reset synchronously at render-time when the stream changes, so the chart
  // never flashes the previous coin's bars while the new history loads. This
  // is React's documented "adjust state when a prop changes" pattern.
  const streamKey = `${coin}|${interval}`;
  const [prevKey, setPrevKey] = useState(streamKey);
  if (prevKey !== streamKey) {
    setPrevKey(streamKey);
    setCandles([]);
    setStatus("loading");
  }

  useEffect(() => {
    let alive = true;

    fetchCandleHistory(coin, interval, MAX_BARS)
      .then((history) => {
        if (!alive) return;
        setStatus("ready");
        // Merge in front of any live ticks that arrived during the fetch.
        setCandles((live) => {
          if (live.length === 0) return history;
          const lastHist = history[history.length - 1]?.time ?? 0;
          const tail = live.filter((c) => c.time >= lastHist);
          return mergeTail(history, tail);
        });
      })
      .catch(() => alive && setStatus("error"));

    const unsubscribe = subscribeCandle(coin, interval, (candle) => {
      if (!alive) return;
      setCandles((prev) => mergeTail(prev, [candle]));
    });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, [coin, interval, subscribeCandle]);

  return { candles, status };
}

// Apply incoming candles to the buffer: update the last bar in place when the
// timestamp matches, append (and trim) when newer, ignore stale bars.
function mergeTail(buffer: Candle[], incoming: Candle[]): Candle[] {
  let next = buffer;
  for (const candle of incoming) {
    if (next.length === 0) {
      next = [candle];
      continue;
    }
    const last = next[next.length - 1];
    if (candle.time === last.time) {
      next = next.slice(0, -1).concat(candle);
    } else if (candle.time > last.time) {
      next = next.concat(candle);
      if (next.length > MAX_BARS) next = next.slice(next.length - MAX_BARS);
    }
  }
  return next;
}
