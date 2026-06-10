"use client";

import { useEffect, useState } from "react";
import { useHyperliquid } from "@/context/HyperliquidContext";
import { usePortfolioState } from "@/context/PortfolioContext";
import { useSettings } from "@/context/SettingsContext";
import { useCandles } from "@/hooks/useCandles";
import {
  INTERVALS,
  coinName,
  displaySymbol,
  groupOf,
  type Interval,
} from "@/lib/hyperliquid";
import { COLORS } from "@/lib/theme";
import { pct, price } from "@/lib/format";
import { CandleChart, EMA_OPTIONS } from "@/components/charts/CandleChart";
import { CoinIcon } from "@/components/CoinIcon";
import { HoldingModal } from "@/components/HoldingModal";
import { LogoLoader } from "@/components/LogoLoader";

export function ChartPanel({
  coin,
  prevDayPx,
}: {
  coin: string;
  prevDayPx: number | undefined;
}) {
  const { defaultInterval, dir } = useSettings();
  const [interval, setInterval] = useState<Interval>(defaultInterval);
  const [emaPeriods, setEmaPeriods] = useState<number[]>([]);
  const [trackOpen, setTrackOpen] = useState(false);
  const { candles, status } = useCandles(coin, interval);
  const { mids } = useHyperliquid();

  const toggleEma = (period: number) =>
    setEmaPeriods((prev) =>
      prev.includes(period)
        ? prev.filter((p) => p !== period)
        : [...prev, period].sort((a, b) => a - b),
    );

  const { holdings, watched, toggleWatch } = usePortfolioState();
  const tracked = holdings.some((h) => h.coin === coin);
  const isWatched = watched.has(coin);

  const symbol = displaySymbol(coin);
  const group = groupOf(coin);

  const last = candles[candles.length - 1];
  const livePrice = mids[coin] || last?.close || 0;
  const change = prevDayPx ? (livePrice - prevDayPx) / prevDayPx : 0;
  const up = change >= 0;
  const tone = up ? dir.up : dir.down;

  // Live price in the tab title, so it's visible even when the tab is in the
  // background. (Leaving the chart resets the title via the router.)
  useEffect(() => {
    document.title = livePrice
      ? `$${price(livePrice)} · ${symbol}`
      : `${symbol} · Ledger`;
  }, [livePrice, symbol]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* detail header */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 pb-2 pt-5 sm:px-6">
        <div className="flex items-center gap-3">
          <CoinIcon coin={coin} group={group} size={44} watchBadge={false} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-[var(--c-fg)]">
                {symbol}
              </h1>
              <span className="text-xs uppercase tracking-widest text-[var(--c-sub)]">
                {coinName(symbol)}
              </span>
            </div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="font-mono text-2xl tabular-nums text-[var(--c-fg)]">
                ${price(livePrice)}
              </span>
              <span
                className="font-mono text-sm tabular-nums"
                style={{ color: tone }}
              >
                {up ? "▲" : "▼"} {prevDayPx ? pct(change) : "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleWatch(coin)}
            aria-label={isWatched ? "Remove from watchlist" : "Add to watchlist"}
            title={isWatched ? "Watchlisted" : "Add to watchlist"}
            className="press flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-[var(--c-border)] hover:bg-white/[0.06]"
            style={{ color: isWatched ? COLORS.gold : "var(--c-sub)" }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill={isWatched ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 18.9 6.1 21.5l1.2-6.5L2.5 9.4l6.6-.9z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setTrackOpen(true)}
            className="press rounded-full bg-white/[0.06] px-4 py-2 text-sm font-medium text-[var(--c-fg)] ring-1 ring-[var(--c-border)] hover:bg-white/[0.1]"
          >
            {tracked ? "✓ Tracked" : "+ Track"}
          </button>
        </div>
      </div>

      {/* interval switcher + EMA overlays */}
      <div className="flex flex-wrap items-center gap-1 px-6 pb-1">
        {INTERVALS.map((iv) => {
          const active = iv === interval;
          return (
            <button
              key={iv}
              type="button"
              onClick={() => setInterval(iv)}
              className={`press rounded-lg px-3 py-1 text-xs font-medium tabular-nums ${
                active
                  ? "bg-white/[0.08] text-[var(--c-fg)]"
                  : "text-[var(--c-sub)] hover:text-white/80"
              }`}
            >
              {iv}
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-1">
          <span className="mr-0.5 text-[11px] uppercase tracking-wider text-[var(--c-sub)]">
            EMA
          </span>
          {EMA_OPTIONS.map((o) => {
            const on = emaPeriods.includes(o.period);
            return (
              <button
                key={o.period}
                type="button"
                onClick={() => toggleEma(o.period)}
                className={`press rounded-md px-2 py-1 text-xs font-medium tabular-nums ${
                  on ? "" : "text-[var(--c-sub)] hover:text-white/80"
                }`}
                style={
                  on
                    ? { color: o.color, backgroundColor: `${o.color}1f` }
                    : undefined
                }
              >
                {o.period}
              </button>
            );
          })}
        </div>
      </div>

      {/* chart */}
      <div className="relative min-h-0 flex-1 px-2 pb-2">
        {status === "loading" && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <LogoLoader label={`Loading ${symbol}`} />
          </div>
        )}
        {status === "error" && <Overlay>couldn&apos;t load {symbol}</Overlay>}
        <CandleChart
          candles={candles}
          emaPeriods={emaPeriods}
          up={dir.up}
          down={dir.down}
        />
      </div>

      {trackOpen && (
        <HoldingModal
          coin={coin}
          symbol={symbol}
          group={group}
          defaultPrice={livePrice}
          onClose={() => setTrackOpen(false)}
        />
      )}
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-xs uppercase tracking-widest text-[var(--c-sub)]">
      {children}
    </div>
  );
}
