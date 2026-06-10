"use client";

import { useEffect, useState } from "react";
import { usePortfolioState } from "@/context/PortfolioContext";
import { coinName, type Group } from "@/lib/hyperliquid";
import { COLORS } from "@/lib/theme";
import { price as fmtPrice, qty as fmtQty } from "@/lib/format";
import { CoinIcon } from "@/components/CoinIcon";

// Record a buy or sell of the current coin without leaving the screen. Selling
// is how you reduce/close a position (it realizes P&L against the average cost
// in the trade log). Price prefills with the live price.
export function HoldingModal({
  coin,
  symbol,
  group,
  defaultPrice,
  onClose,
}: {
  coin: string;
  symbol: string;
  group: Group;
  defaultPrice?: number;
  onClose: () => void;
}) {
  const { holdings, addTrade } = usePortfolioState();
  const held = holdings.find((h) => h.coin === coin);

  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState(
    defaultPrice && defaultPrice > 0
      ? String(Math.round(defaultPrice * 1e6) / 1e6)
      : "",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = () => {
    const q = Number(quantity);
    const p = Number(price);
    if (!(q > 0) || !(p > 0)) {
      setError("Enter a positive quantity and price.");
      return;
    }
    if (side === "sell" && q > (held?.quantity ?? 0) + 1e-9) {
      setError(`You only hold ${fmtQty(held?.quantity ?? 0)} ${symbol}.`);
      return;
    }
    addTrade({ coin, side, quantity: q, price: p });
    onClose();
  };

  const field =
    "w-full rounded-lg bg-white/[0.06] px-3 py-2.5 text-sm text-[var(--c-fg)] tabular-nums outline-none ring-1 ring-[var(--c-border)] placeholder:text-[var(--c-sub)] focus:ring-[var(--c-accent-purple)]/60";
  const accent = side === "buy" ? COLORS.bull : COLORS.bear;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.08] p-5 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <CoinIcon coin={coin} group={group} size={40} />
          <div className="min-w-0">
            <div className="text-base font-semibold text-[var(--c-fg)]">
              {symbol}
            </div>
            <div className="truncate text-xs text-[var(--c-sub)]">
              {held
                ? `${fmtQty(held.quantity)} @ ${fmtPrice(held.avgPrice)}`
                : coinName(symbol)}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="press ml-auto flex h-8 w-8 items-center justify-center rounded-full text-[var(--c-sub)] hover:bg-white/[0.06] hover:text-[var(--c-fg)]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* buy / sell toggle */}
        <div className="mt-4 flex gap-1 rounded-xl bg-white/[0.04] p-1">
          {(["buy", "sell"] as const).map((s) => {
            const on = s === side;
            const c = s === "buy" ? COLORS.bull : COLORS.bear;
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSide(s);
                  setError(null);
                }}
                disabled={s === "sell" && !held}
                className="press flex-1 rounded-lg py-1.5 text-sm font-semibold capitalize disabled:cursor-not-allowed disabled:opacity-40"
                style={
                  on
                    ? { color: c, backgroundColor: `${c}22` }
                    : { color: COLORS.sub }
                }
              >
                {s}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-xs uppercase tracking-wider text-[var(--c-sub)]">
            Quantity
            <input
              autoFocus
              type="number"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              className={`${field} mt-1`}
            />
          </label>
          <label className="text-xs uppercase tracking-wider text-[var(--c-sub)]">
            {side === "buy" ? "Buy" : "Sell"} price $
            <input
              type="number"
              step="any"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              className={`${field} mt-1`}
            />
          </label>
        </div>

        {error && (
          <p className="mt-2 text-xs" style={{ color: COLORS.bear }}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          className="press mt-5 w-full rounded-lg py-2.5 text-sm font-semibold text-white hover:opacity-90"
          style={{ backgroundColor: accent }}
        >
          {side === "buy" ? "Add buy" : "Record sell"}
        </button>
      </div>
    </div>
  );
}
