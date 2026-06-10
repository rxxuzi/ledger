"use client";

import { useState } from "react";
import type { Navigate } from "@/components/RootRouter";
import type { useUniverse } from "@/hooks/useUniverse";
import { usePortfolio } from "@/hooks/usePortfolio";
import { usePortfolioState } from "@/context/PortfolioContext";
import {
  coinName,
  displaySymbol,
  groupOf,
  type MarketCoin,
} from "@/lib/hyperliquid";
import { COLORS } from "@/lib/theme";
import { pct, price, qty, signedUsd, usd } from "@/lib/format";
import { CoinIcon } from "@/components/CoinIcon";
import { HoldingModal } from "@/components/HoldingModal";
import { useTone } from "@/context/SettingsContext";

const groupColor = (coin: string) => {
  const g = groupOf(coin);
  return g === "Stocks" ? COLORS.blue : g === "Commodity" ? COLORS.amber : COLORS.purple;
};

type Universe = ReturnType<typeof useUniverse>;

export function PortfolioView({
  universe,
  navigate,
}: {
  universe: Universe;
  navigate: Navigate;
}) {
  const { coins } = universe;
  const { positions, totals } = usePortfolio();
  const tone = useTone();
  const [editCoin, setEditCoin] = useState<string | null>(null);

  // Largest position first — the clearest reading of "what do I hold".
  const sorted = [...positions].sort((a, b) => b.marketValue - a.marketValue);
  const openChart = (coin: string) =>
    navigate(`/chart/${encodeURIComponent(displaySymbol(coin))}`);
  const editing = positions.find((p) => p.coin === editCoin);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl px-5 py-8">
          {/* summary */}
          <div className="flex flex-wrap items-end gap-x-8 gap-y-4 sm:gap-x-12">
            <Stat label="Total value">
              <span className="font-mono text-4xl tabular-nums text-[var(--c-fg)]">
                {usd(totals.marketValue)}
              </span>
            </Stat>
            <Stat label="Total P&L">
              <span
                className="font-mono text-2xl tabular-nums"
                style={{ color: tone(totals.pnl) }}
              >
                {positions.length ? signedUsd(totals.pnl) : "—"}
              </span>
              {positions.length > 0 && (
                <span
                  className="ml-2 font-mono text-base tabular-nums"
                  style={{ color: tone(totals.pnl) }}
                >
                  {pct(totals.pnlPct)}
                </span>
              )}
            </Stat>
            <Stat label="Cost basis">
              <span className="font-mono text-2xl tabular-nums text-[var(--c-sub)]">
                {usd(totals.cost)}
              </span>
            </Stat>
          </div>

          {/* allocation bar */}
          {totals.marketValue > 0 && (
            <div className="mt-6 flex h-2 overflow-hidden rounded-full bg-white/[0.05]">
              {sorted.map((p) => (
                <div
                  key={p.coin}
                  style={{
                    width: `${(p.marketValue / totals.marketValue) * 100}%`,
                    background: groupColor(p.coin),
                  }}
                  title={`${displaySymbol(p.coin)} · ${((p.marketValue / totals.marketValue) * 100).toFixed(1)}%`}
                />
              ))}
            </div>
          )}

          {/* holdings */}
          <div className="mt-8">
            {sorted.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-[var(--c-sub)]">
                No positions yet. Add one below to start tracking its P&amp;L.
              </p>
            ) : (
              <div className="overflow-hidden">
                {/* column header (qty/price hide on small screens) */}
                <div className="flex items-center gap-3 px-3 pb-2 text-[11px] uppercase tracking-wider text-[var(--c-sub)]">
                  <span className="flex-1">Asset</span>
                  <span className="hidden w-24 text-right sm:block">Holdings</span>
                  <span className="hidden w-20 text-right sm:block">Price</span>
                  <span className="w-28 text-right">Value / P&amp;L</span>
                  <span className="w-12" />
                </div>
                {sorted.map((p) => {
                  const alloc = totals.marketValue
                    ? (p.marketValue / totals.marketValue) * 100
                    : 0;
                  return (
                    <div
                      key={p.coin}
                      className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-white/[0.03]"
                    >
                      {/* asset */}
                      <button
                        type="button"
                        onClick={() => openChart(p.coin)}
                        className="press flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <CoinIcon coin={p.coin} group={groupOf(p.coin)} size={34} />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-[var(--c-fg)]">
                            {displaySymbol(p.coin)}
                          </div>
                          <div className="truncate text-xs text-[var(--c-sub)]">
                            {alloc.toFixed(1)}% · {coinName(displaySymbol(p.coin))}
                          </div>
                        </div>
                      </button>

                      {/* holdings */}
                      <div className="hidden w-24 text-right sm:block">
                        <div className="font-mono text-sm tabular-nums text-[var(--c-fg)]">
                          {qty(p.quantity)}
                        </div>
                        <div className="font-mono text-xs tabular-nums text-[var(--c-sub)]">
                          @ {price(p.avgPrice)}
                        </div>
                      </div>

                      {/* live price */}
                      <div className="hidden w-20 text-right font-mono text-sm tabular-nums text-[var(--c-fg)] sm:block">
                        {p.mid ? price(p.mid) : "—"}
                      </div>

                      {/* value / pnl */}
                      <div className="w-28 text-right">
                        <div className="font-mono text-sm tabular-nums text-[var(--c-fg)]">
                          {usd(p.marketValue)}
                        </div>
                        <div
                          className="font-mono text-xs tabular-nums"
                          style={{ color: tone(p.pnl) }}
                        >
                          {signedUsd(p.pnl)} · {pct(p.pnlPct)}
                        </div>
                      </div>

                      {/* edit / sell */}
                      <div className="w-12 text-right">
                        <button
                          type="button"
                          onClick={() => setEditCoin(p.coin)}
                          className="press rounded-md px-2 py-1 text-xs text-[var(--c-sub)] transition-colors hover:text-[var(--c-fg)] sm:opacity-0 sm:group-hover:opacity-100"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <AddHolding coins={coins} />
        </div>

      {editing && (
        <HoldingModal
          coin={editing.coin}
          symbol={displaySymbol(editing.coin)}
          group={groupOf(editing.coin)}
          defaultPrice={editing.mid}
          onClose={() => setEditCoin(null)}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-[var(--c-sub)]">
        {label}
      </div>
      <div className="mt-1 flex items-baseline">{children}</div>
    </div>
  );
}

function AddHolding({ coins }: { coins: MarketCoin[] }) {
  const { addTrade } = usePortfolioState();
  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState("");
  const [avg, setAvg] = useState("");
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const sym = symbol.trim().toUpperCase();
    const match = coins.find((c) => c.symbol.toUpperCase() === sym);
    const q = Number(quantity);
    const a = Number(avg);
    if (!match) return setError(`Unknown coin "${sym}".`);
    if (!(q > 0) || !(a > 0)) return setError("Enter a positive qty and price.");
    addTrade({ coin: match.coin, side: "buy", quantity: q, price: a });
    setSymbol("");
    setQuantity("");
    setAvg("");
    setError(null);
  };

  const field =
    "rounded-lg bg-white/[0.05] px-3 py-2.5 text-sm text-[var(--c-fg)] tabular-nums outline-none ring-1 ring-[var(--c-border)] placeholder:text-[var(--c-sub)] focus:ring-[var(--c-accent-purple)]/60";

  return (
    <div className="mt-10 border-t border-[var(--c-border)] pt-6">
      <div className="mb-3 text-xs uppercase tracking-widest text-[var(--c-sub)]">
        Add / update position
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          list="portfolio-coins"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="Coin (e.g. BTC)"
          spellCheck={false}
          className={`${field} w-40 uppercase`}
        />
        <input
          type="number"
          step="any"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Quantity"
          className={`${field} w-36`}
        />
        <input
          type="number"
          step="any"
          value={avg}
          onChange={(e) => setAvg(e.target.value)}
          placeholder="Avg price $"
          className={`${field} w-36`}
        />
        <datalist id="portfolio-coins">
          {coins.map((c) => (
            <option key={c.coin} value={c.symbol} />
          ))}
        </datalist>
        <button
          type="button"
          onClick={add}
          className="press rounded-lg bg-[var(--c-accent-purple)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Add
        </button>
      </div>
      {error && (
        <p className="mt-2 text-xs" style={{ color: COLORS.bear }}>
          {error}
        </p>
      )}
    </div>
  );
}
