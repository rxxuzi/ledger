"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  WS_URL,
  MID_DEXES,
  parseCandle,
  type HlMessage,
  type Interval,
  type Candle,
} from "@/lib/hyperliquid";

export type ConnStatus = "connecting" | "open" | "closed";

type CandleListener = (candle: Candle) => void;

type HyperliquidCtx = {
  status: ConnStatus;
  mids: Record<string, number>;
  // Subscribe to a coin/interval candle stream. Returns an unsubscribe fn.
  // Multiple subscribers to the same stream share one WS subscription.
  subscribeCandle: (
    coin: string,
    interval: Interval,
    listener: CandleListener,
  ) => () => void;
};

const Ctx = createContext<HyperliquidCtx | null>(null);

const streamKey = (coin: string, interval: Interval) => `${coin}|${interval}`;

export function HyperliquidProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnStatus>("connecting");
  const [mids, setMids] = useState<Record<string, number>>({});

  const wsRef = useRef<WebSocket | null>(null);
  const listeners = useRef<Map<string, Set<CandleListener>>>(new Map());

  const send = useCallback((msg: object) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  const sendCandleSub = useCallback(
    (key: string, on: boolean) => {
      const [coin, interval] = key.split("|");
      send({
        method: on ? "subscribe" : "unsubscribe",
        subscription: { type: "candle", coin, interval },
      });
    },
    [send],
  );

  // The whole connection lifecycle lives in one effect. Backoff / timers /
  // disposed are effect-local (not refs) so they can't leak across mounts.
  useEffect(() => {
    let disposed = false;
    let backoff = 1000;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (disposed) return;
      setStatus("connecting");
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("open");
        backoff = 1000;
        // Stream mids from every dex (main crypto + xyz stocks). The main dex
        // takes no `dex` field; named dexes (xyz) require it.
        for (const dex of MID_DEXES) {
          send({
            method: "subscribe",
            subscription: dex
              ? { type: "allMids", dex }
              : { type: "allMids" },
          });
        }
        // Re-subscribe every active candle stream after a reconnect.
        for (const key of listeners.current.keys()) sendCandleSub(key, true);
        pingTimer = setInterval(() => send({ method: "ping" }), 30_000);
      };

      ws.onmessage = (event) => {
        let msg: HlMessage;
        try {
          msg = JSON.parse(event.data as string);
        } catch {
          return;
        }
        if (msg.channel === "allMids") {
          const raw = msg.data.mids;
          setMids((prev) => {
            const next = { ...prev };
            for (const coin in raw) next[coin] = Number(raw[coin]);
            return next;
          });
        } else if (msg.channel === "candle") {
          const d = msg.data;
          const set = listeners.current.get(streamKey(d.s, d.i as Interval));
          if (set) {
            const candle = parseCandle(d);
            set.forEach((fn) => fn(candle));
          }
        }
      };

      ws.onerror = () => ws.close();

      ws.onclose = () => {
        setStatus("closed");
        if (pingTimer) {
          clearInterval(pingTimer);
          pingTimer = null;
        }
        if (disposed) return;
        // Exponential backoff: 1s -> 2s -> 4s ... capped at 30s.
        reconnectTimer = setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, 30_000);
      };
    }

    connect();

    return () => {
      disposed = true;
      if (pingTimer) clearInterval(pingTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [send, sendCandleSub]);

  const subscribeCandle = useCallback(
    (coin: string, interval: Interval, listener: CandleListener) => {
      const key = streamKey(coin, interval);
      let set = listeners.current.get(key);
      if (!set) {
        set = new Set();
        listeners.current.set(key, set);
        sendCandleSub(key, true); // first subscriber opens the WS stream
      }
      set.add(listener);

      return () => {
        const s = listeners.current.get(key);
        if (!s) return;
        s.delete(listener);
        if (s.size === 0) {
          listeners.current.delete(key);
          sendCandleSub(key, false); // last subscriber closes the stream
        }
      };
    },
    [sendCandleSub],
  );

  return (
    <Ctx.Provider value={{ status, mids, subscribeCandle }}>
      {children}
    </Ctx.Provider>
  );
}

export function useHyperliquid(): HyperliquidCtx {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("useHyperliquid must be used within <HyperliquidProvider>");
  return ctx;
}
