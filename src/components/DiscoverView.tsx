"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Navigate } from "@/components/RootRouter";
import type { useUniverse } from "@/hooks/useUniverse";
import { useHyperliquid } from "@/context/HyperliquidContext";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useSettings, useTone } from "@/context/SettingsContext";
import { usePortfolioState } from "@/context/PortfolioContext";
import { displaySymbol, groupOf, GROUPS, type Group } from "@/lib/hyperliquid";
import { COLORS } from "@/lib/theme";
import { compact, pct, price, signedUsd, usd } from "@/lib/format";
import { MarketList } from "@/components/MarketList";
import { LogoLoader } from "@/components/LogoLoader";

const groupColor = (g: Group) =>
  g === "Stocks" ? COLORS.blue : g === "Commodity" ? COLORS.amber : COLORS.purple;

type Universe = ReturnType<typeof useUniverse>;
type Row = {
  coin: string;
  symbol: string;
  group: Group;
  mid: number;
  chg: number;
  volume: number;
};

// 24h-change color scale, clamped at ±4%, interpolating down → up colors
// (which follow the color-mode setting).
const HEAT_CLAMP = 0.04;
const hexRgb = (h: string) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
function heatColor(chg: number, up: string, down: string): string {
  const t = Math.max(0, Math.min(1, (chg + HEAT_CLAMP) / (2 * HEAT_CLAMP)));
  const d = hexRgb(down);
  const u = hexRgb(up);
  const c = d.map((dd, i) => Math.round(dd + (u[i] - dd) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

export function DiscoverView({
  universe,
  navigate,
}: {
  universe: Universe;
  navigate: Navigate;
}) {
  const { coins, prevDay, status } = universe;
  const { mids } = useHyperliquid();
  const open = (coin: string) =>
    navigate(`/chart/${encodeURIComponent(displaySymbol(coin))}`);

  const rows = useMemo<Row[]>(
    () =>
      coins.map((c) => {
        const mid = mids[c.coin] || c.markPx;
        const prev = c.prevDayPx || mid;
        return {
          coin: c.coin,
          symbol: c.symbol,
          group: c.group,
          mid,
          chg: prev ? (mid - prev) / prev : 0,
          volume: c.volume,
        };
      }),
    [coins, mids],
  );

  const heat = useMemo(
    () => [...rows].sort((a, b) => b.volume - a.volume).slice(0, 18),
    [rows],
  );
  const gainers = useMemo(
    () => [...rows].sort((a, b) => b.chg - a.chg).slice(0, 4),
    [rows],
  );
  const losers = useMemo(
    () => [...rows].sort((a, b) => a.chg - b.chg).slice(0, 4),
    [rows],
  );

  return (
    <div className="h-full overflow-hidden">
      {/* Mobile: balance glance + the full searchable / sortable market list,
          so coins like SILVER are still findable without the heatmap. */}
      <div className="flex h-full min-h-0 flex-col lg:hidden">
        <div className="px-4 pt-4">
          <PortfolioMini
            prevDay={prevDay}
            onOpen={() => navigate("/portfolio")}
          />
        </div>
        <div className="mt-3 min-h-0 flex-1 border-t border-white/[0.06]">
          <MarketList
            coins={coins}
            loading={status === "loading"}
            onSelect={open}
          />
        </div>
      </div>

      {/* Desktop: dashboard — info column + heatmap. */}
      <div className="mx-auto hidden w-full max-w-[1600px] gap-5 px-6 py-6 lg:grid lg:h-full lg:grid-cols-[1fr_2fr]">
        <div className="flex flex-col gap-6 lg:min-h-0 lg:overflow-y-auto">
          <PortfolioMini
            prevDay={prevDay}
            onOpen={() => navigate("/portfolio")}
          />
          <WatchlistPanel rows={rows} onOpen={open} />
          <GainersLosers gainers={gainers} losers={losers} onOpen={open} />
          <MostActive rows={rows} onOpen={open} />
        </div>

        <Heatmap rows={heat} loading={status === "loading"} onOpen={open} />
      </div>
    </div>
  );
}

// ---- Heatmap (squarified treemap) ----

type Tile = { row: Row; x: number; y: number; w: number; h: number };

// Squarified treemap (Bruls et al.): lays values out as rectangles that stay
// close to square. Sizes use sqrt(volume) to tame the huge BTC/ETH dynamic
// range. Coordinates are returned in the given W×H space (→ % at render).
function squarify(rows: Row[], W: number, H: number): Tile[] {
  const items = rows
    .map((row) => ({ row, area: Math.sqrt(Math.max(row.volume, 0)) }))
    .filter((i) => i.area > 0);
  const total = items.reduce((s, i) => s + i.area, 0);
  if (total <= 0) return [];
  const scale = (W * H) / total;
  for (const i of items) i.area *= scale;

  const tiles: Tile[] = [];
  let x = 0,
    y = 0,
    w = W,
    h = H;
  let queue = items.slice();
  let rowItems: typeof items = [];

  const worst = (rs: typeof items, len: number) => {
    const sum = rs.reduce((s, r) => s + r.area, 0);
    const max = Math.max(...rs.map((r) => r.area));
    const min = Math.min(...rs.map((r) => r.area));
    const s2 = sum * sum;
    const l2 = len * len;
    return Math.max((l2 * max) / s2, s2 / (l2 * min));
  };

  const layout = (rs: typeof items, alongWidth: boolean) => {
    const sum = rs.reduce((s, r) => s + r.area, 0);
    if (alongWidth) {
      const rowH = sum / w;
      let cx = x;
      for (const r of rs) {
        const rw = rowH ? r.area / rowH : 0;
        tiles.push({ row: r.row, x: cx, y, w: rw, h: rowH });
        cx += rw;
      }
      y += rowH;
      h -= rowH;
    } else {
      const rowW = sum / h;
      let cy = y;
      for (const r of rs) {
        const rh = rowW ? r.area / rowW : 0;
        tiles.push({ row: r.row, x, y: cy, w: rowW, h: rh });
        cy += rh;
      }
      x += rowW;
      w -= rowW;
    }
  };

  while (queue.length) {
    const len = Math.min(w, h);
    const next = queue[0];
    if (
      rowItems.length === 0 ||
      worst(rowItems, len) >= worst([...rowItems, next], len)
    ) {
      rowItems.push(next);
      queue = queue.slice(1);
    } else {
      layout(rowItems, w <= h);
      rowItems = [];
    }
  }
  if (rowItems.length) layout(rowItems, w <= h);
  return tiles;
}

function Heatmap({
  rows,
  loading,
  onOpen,
}: {
  rows: Row[];
  loading: boolean;
  onOpen: (coin: string) => void;
}) {
  const { dir } = useSettings();
  // Measure the real container so the treemap squares against the actual
  // aspect ratio (portrait on mobile, wide on desktop) instead of a fixed one.
  const boxRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 1, h: 1 });
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setDims({ w: el.clientWidth, h: el.clientHeight }),
    );
    ro.observe(el);
    setDims({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const tiles = useMemo(
    () => squarify(rows, dims.w, dims.h),
    [rows, dims],
  );

  return (
    <section className="hidden flex-col lg:flex lg:h-full lg:min-h-0">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--c-fg)]">
          market heatmap
        </h2>
        <span className="rounded-md bg-white/[0.06] px-2 py-1 text-xs font-medium text-[var(--c-sub)]">
          24h
        </span>
      </div>

      <div
        ref={boxRef}
        className="relative h-[78vh] w-full min-h-0 flex-1 lg:h-auto"
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <LogoLoader label="Loading market" />
          </div>
        )}
        {tiles.map(({ row, x, y, w, h }) => {
          const big = (w * h) / (dims.w * dims.h) > 0.06;
          return (
            <button
              key={row.coin}
              type="button"
              onClick={() => onOpen(row.coin)}
              title={`${row.symbol} ${pct(row.chg)}`}
              className="group absolute p-[3px]"
              style={{
                left: `${(x / dims.w) * 100}%`,
                top: `${(y / dims.h) * 100}%`,
                width: `${(w / dims.w) * 100}%`,
                height: `${(h / dims.h) * 100}%`,
              }}
            >
              <span
                className="relative flex h-full w-full flex-col justify-center overflow-hidden rounded-xl px-3 py-2 text-white ring-1 ring-inset ring-white/5 transition duration-150 group-hover:z-10 group-hover:ring-white/50 group-hover:brightness-110 group-active:scale-[0.98]"
                style={{ background: heatColor(row.chg, dir.up, dir.down) }}
              >
                {/* depth: subtle top sheen → bottom shade */}
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/15 to-black/20" />
                <span
                  className={`relative truncate font-semibold leading-tight ${big ? "text-lg" : "text-xs"}`}
                >
                  {row.symbol}
                </span>
                <span
                  className={`relative font-mono tabular-nums leading-tight text-white/90 ${big ? "text-sm" : "text-[10px]"}`}
                >
                  {pct(row.chg)}
                </span>
                {big && (
                  <span className="relative mt-0.5 font-mono text-xs leading-tight text-white/70">
                    ${price(row.mid)}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* color scale legend */}
      <div className="mt-3 flex items-center gap-2">
        <span className="font-mono text-[11px] tabular-nums text-[var(--c-sub)]">
          −4%
        </span>
        <span
          className="h-1.5 flex-1 rounded-full"
          style={{
            background: `linear-gradient(to right, ${dir.down}, ${dir.up})`,
          }}
        />
        <span className="font-mono text-[11px] tabular-nums text-[var(--c-sub)]">
          +4%
        </span>
      </div>
    </section>
  );
}

// ---- Right column ----

function GainersLosers({
  gainers,
  losers,
  onOpen,
}: {
  gainers: Row[];
  losers: Row[];
  onOpen: (coin: string) => void;
}) {
  const { dir } = useSettings();
  return (
    <section className="border-t border-white/[0.06] pt-6">
      <div className="grid grid-cols-2 gap-x-4">
        <div>
          <h3 className="mb-1.5 text-xs font-semibold" style={{ color: dir.up }}>
            ↗ gainers
          </h3>
          {gainers.map((r) => (
            <ChangeRow key={r.coin} row={r} onClick={() => onOpen(r.coin)} />
          ))}
        </div>
        <div>
          <h3 className="mb-1.5 text-xs font-semibold" style={{ color: dir.down }}>
            ↘ losers
          </h3>
          {losers.map((r) => (
            <ChangeRow key={r.coin} row={r} onClick={() => onOpen(r.coin)} />
          ))}
        </div>
      </div>
    </section>
  );
}

function WatchlistPanel({
  rows,
  onOpen,
}: {
  rows: Row[];
  onOpen: (coin: string) => void;
}) {
  const { watched, toggleWatch } = usePortfolioState();
  const tone = useTone();
  const list = rows
    .filter((r) => watched.has(r.coin))
    .sort((a, b) => b.chg - a.chg);

  return (
    <section className="border-t border-white/[0.06] pt-6">
      <h2 className="mb-2 flex items-center gap-1.5 font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--c-fg)]">
        <span style={{ color: COLORS.gold }}>★</span> Watchlist
      </h2>
      {list.length === 0 ? (
        <p className="px-1.5 py-2 text-xs text-[var(--c-sub)]">
          Star a coin on its chart to track it here.
        </p>
      ) : (
        list.map((r) => (
          <div
            key={r.coin}
            className="group flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-white/[0.04]"
          >
            <button
              type="button"
              onClick={() => onOpen(r.coin)}
              className="press flex min-w-0 flex-1 items-center justify-between text-left"
            >
              <span className="truncate text-sm font-medium text-[var(--c-fg)]">
                {r.symbol}
              </span>
              <span
                className="font-mono text-xs tabular-nums"
                style={{ color: tone(r.chg) }}
              >
                {pct(r.chg)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => toggleWatch(r.coin)}
              aria-label="Remove from watchlist"
              className="press text-xs"
              style={{ color: COLORS.gold }}
            >
              ★
            </button>
          </div>
        ))
      )}
    </section>
  );
}

function ChangeRow({ row, onClick }: { row: Row; onClick: () => void }) {
  const tone = useTone();
  return (
    <button
      type="button"
      onClick={onClick}
      className="press flex w-full items-center justify-between rounded-md px-1.5 py-1.5 text-left hover:bg-white/[0.04]"
    >
      <span className="truncate text-sm font-medium text-[var(--c-fg)]">
        {row.symbol}
      </span>
      <span
        className="font-mono text-xs tabular-nums"
        style={{ color: tone(row.chg) }}
      >
        {pct(row.chg)}
      </span>
    </button>
  );
}

const ACTIVE_CATS: ("all" | Group)[] = ["all", ...GROUPS];

function MostActive({
  rows,
  onOpen,
}: {
  rows: Row[];
  onOpen: (coin: string) => void;
}) {
  const [cat, setCat] = useState<"all" | Group>("all");
  const list = useMemo(
    () =>
      [...rows]
        .filter((r) => cat === "all" || r.group === cat)
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 5),
    [rows, cat],
  );

  return (
    <section className="border-t border-white/[0.06] pt-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--c-fg)]">
          most active
        </h2>
        <div className="flex gap-2 text-xs">
          {ACTIVE_CATS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={`press lowercase ${
                cat === c
                  ? "text-[var(--c-fg)]"
                  : "text-[var(--c-sub)] hover:text-white/80"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      {list.map((r) => (
        <button
          key={r.coin}
          type="button"
          onClick={() => onOpen(r.coin)}
          className="press flex w-full items-center justify-between rounded-md px-1.5 py-1.5 text-left hover:bg-white/[0.04]"
        >
          <span className="truncate text-sm font-medium text-[var(--c-fg)]">
            {r.symbol}
          </span>
          <span className="font-mono text-xs tabular-nums text-[var(--c-sub)]">
            ${compact(r.volume)}
          </span>
        </button>
      ))}
    </section>
  );
}

function PortfolioMini({
  prevDay,
  onOpen,
}: {
  prevDay: Record<string, number>;
  onOpen: () => void;
}) {
  const { positions, totals } = usePortfolio();
  const { dir } = useSettings();
  const prevValue = positions.reduce(
    (s, p) => s + (prevDay[p.coin] || p.mid || p.avgPrice) * p.quantity,
    0,
  );
  const dayChange = totals.marketValue - prevValue;
  const dayPct = prevValue > 0 ? dayChange / prevValue : 0;
  const empty = positions.length === 0;

  // Allocation by group for the thin breakdown bar.
  const alloc = GROUPS.map((g) => ({
    g,
    value: positions
      .filter((p) => groupOf(p.coin) === g)
      .reduce((s, p) => s + p.marketValue, 0),
  })).filter((a) => a.value > 0);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="press group block text-left"
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-[var(--c-sub)]">
        <span>your portfolio</span>
        <span className="opacity-0 transition-opacity group-hover:opacity-100">
          manage →
        </span>
      </div>
      <div className="mt-1.5 font-mono text-3xl tabular-nums text-[var(--c-fg)]">
        {usd(totals.marketValue)}
      </div>

      <div className="mt-3 flex gap-8">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[var(--c-sub)]">
            24h
          </div>
          <div
            className="font-mono text-sm tabular-nums"
            style={{
              color: empty ? COLORS.sub : dayChange >= 0 ? dir.up : dir.down,
            }}
          >
            {empty ? "—" : `${signedUsd(dayChange)} · ${pct(dayPct)}`}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[var(--c-sub)]">
            Unrealized P&amp;L
          </div>
          <div
            className="font-mono text-sm tabular-nums"
            style={{
              color: empty ? COLORS.sub : totals.pnl >= 0 ? dir.up : dir.down,
            }}
          >
            {empty ? "—" : `${signedUsd(totals.pnl)} · ${pct(totals.pnlPct)}`}
          </div>
        </div>
      </div>

      {alloc.length > 0 && (
        <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
          {alloc.map((a) => (
            <div
              key={a.g}
              style={{
                width: `${(a.value / totals.marketValue) * 100}%`,
                background: groupColor(a.g),
              }}
              title={`${a.g} ${((a.value / totals.marketValue) * 100).toFixed(0)}%`}
            />
          ))}
        </div>
      )}
    </button>
  );
}
