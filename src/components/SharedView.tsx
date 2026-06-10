"use client";

import { useEffect, useState } from "react";
import type { Navigate } from "@/components/RootRouter";
import { useHyperliquid } from "@/context/HyperliquidContext";
import { usePortfolioState } from "@/context/PortfolioContext";
import { coinName, displaySymbol, groupOf } from "@/lib/hyperliquid";
import { pct, price, qty, signedUsd, usd } from "@/lib/format";
import { decodeShare, type SharePayload } from "@/lib/share";
import { CoinIcon } from "@/components/CoinIcon";
import { useTone } from "@/context/SettingsContext";

// Read-only viewer for a shared portfolio (/share#<token>). Decodes the link
// fragment client-side, then tidies the URL to /p/. Nothing here touches the
// viewer's own data unless they hit Import.
export function SharedView({ navigate }: { navigate: Navigate }) {
  const { mids } = useHyperliquid();
  const { addTrade } = usePortfolioState();
  const tone = useTone();
  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    document.title = "Shared portfolio · Ledger";
  }, []);

  useEffect(() => {
    const token = window.location.hash.replace(/^#/, "");
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(true);
      return;
    }
    decodeShare(token)
      .then(setPayload)
      .catch(() => setError(true))
      // Tidy the URL once decoded — the data already lives in state.
      .finally(() => window.history.replaceState(null, "", "/share"));
  }, []);

  const importAll = () => {
    payload?.items.forEach((it) => {
      if (it.q && it.a)
        addTrade({ coin: it.c, side: "buy", quantity: it.q, price: it.a });
    });
    navigate("/portfolio");
  };

  // Derived view rows.
  const rows = (payload?.items ?? []).map((it) => {
    const mid = mids[it.c] || 0;
    const value = it.q ? mid * it.q : 0;
    const cost = it.q && it.a ? it.a * it.q : 0;
    return { it, mid, value, cost, pnl: value - cost };
  });
  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const totalPnl = totalValue - totalCost;
  const importable = !!payload && !payload.hidden;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b border-white/10 bg-white/[0.03] px-5 py-3 backdrop-blur-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element -- static export, local asset */}
        <img src="/logo.svg" alt="Ledger" className="h-8 w-auto" />
        <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-[var(--c-sub)]">
          shared · read-only
        </span>
        <button
          type="button"
          onClick={() => navigate("/discover")}
          className="press ml-auto rounded-full bg-white/[0.06] px-4 py-2 text-sm font-medium text-[var(--c-fg)] ring-1 ring-[var(--c-border)] hover:bg-white/[0.1]"
        >
          Open Ledger →
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-5 py-8">
          {error ? (
            <p className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-[var(--c-sub)]">
              This share link is empty or invalid.
            </p>
          ) : !payload ? (
            <p className="py-12 text-center text-sm text-[var(--c-sub)]">
              Decoding…
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-widest text-[var(--c-sub)]">
                    Shared portfolio
                  </div>
                  {payload.hidden ? (
                    <div className="mt-1 font-mono text-2xl text-[var(--c-fg)]">
                      {payload.items.length} holdings
                    </div>
                  ) : (
                    <div className="mt-1 font-mono text-4xl tabular-nums text-[var(--c-fg)]">
                      {usd(totalValue)}
                    </div>
                  )}
                </div>
                {!payload.hidden && (
                  <div
                    className="font-mono text-sm tabular-nums"
                    style={{ color: tone(totalPnl) }}
                  >
                    {signedUsd(totalPnl)} ·{" "}
                    {pct(totalCost > 0 ? totalPnl / totalCost : 0)}
                  </div>
                )}
              </div>

              <div className="mt-6 divide-y divide-white/[0.06]">
                {rows.map(({ it, mid, value, pnl, cost }) => (
                  <div
                    key={it.c}
                    className="flex items-center gap-3 py-3"
                  >
                    <CoinIcon coin={it.c} group={groupOf(it.c)} size={34} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-[var(--c-fg)]">
                        {displaySymbol(it.c)}
                      </div>
                      <div className="truncate text-xs text-[var(--c-sub)]">
                        {payload.hidden
                          ? coinName(displaySymbol(it.c))
                          : `${qty(it.q ?? 0)} @ ${price(it.a ?? 0)}`}
                      </div>
                    </div>
                    {payload.hidden ? (
                      <div className="font-mono text-sm tabular-nums text-[var(--c-fg)]">
                        {pct(it.w ?? 0).replace("+", "")}
                      </div>
                    ) : (
                      <div className="text-right">
                        <div className="font-mono text-sm tabular-nums text-[var(--c-fg)]">
                          {mid ? usd(value) : "—"}
                        </div>
                        <div
                          className="font-mono text-xs tabular-nums"
                          style={{ color: tone(pnl) }}
                        >
                          {cost ? `${signedUsd(pnl)} · ${pct(pnl / cost)}` : "—"}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-8 flex items-center gap-3">
                <button
                  type="button"
                  onClick={importAll}
                  disabled={!importable}
                  className="press rounded-lg bg-[var(--c-accent-purple)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
                >
                  Import to my portfolio
                </button>
                <span className="text-xs text-[var(--c-sub)]">
                  {importable
                    ? "Adds these as buys — your existing data is untouched."
                    : "Amounts are hidden, so this link can't be imported."}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
