"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import type { Navigate } from "@/components/RootRouter";
import { usePortfolioState } from "@/context/PortfolioContext";
import { usePortfolio } from "@/hooks/usePortfolio";
import { displaySymbol } from "@/lib/hyperliquid";
import { COLORS } from "@/lib/theme";
import { pct, price, qty, signedUsd, usd } from "@/lib/format";
import { encodeShare, type ShareItem } from "@/lib/share";
import { useTone } from "@/context/SettingsContext";

const fmtDate = (ms: number) =>
  new Date(ms).toLocaleString(undefined, {
    year: "2-digit",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function download(name: string, type: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function ActivityView({ navigate }: { navigate: Navigate }) {
  const { trades, realized, tradeRealized, removeTrade, watchlist, toggleWatch } =
    usePortfolioState();
  const { totals } = usePortfolio();
  const tone = useTone();
  const [shareOpen, setShareOpen] = useState(false);

  const rows = useMemo(
    () => [...trades].sort((a, b) => b.time - a.time),
    [trades],
  );

  const exportCsv = () => {
    const head = "time,date,coin,side,quantity,price,realized\n";
    const body = rows
      .map((t) =>
        [
          t.time,
          new Date(t.time).toISOString(),
          displaySymbol(t.coin),
          t.side,
          t.quantity,
          t.price,
          t.side === "sell" ? (tradeRealized[t.id] ?? 0) : "",
        ].join(","),
      )
      .join("\n");
    download("ledger-trades.csv", "text/csv", head + body);
  };
  const exportJson = () =>
    download("ledger-trades.json", "application/json", JSON.stringify(trades, null, 2));

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl px-5 py-8">
        {/* summary */}
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4 sm:gap-x-12">
          <Stat label="Realized P&L">
            <span
              className="font-mono text-3xl tabular-nums"
              style={{ color: realized.sells ? tone(realized.totalRealized) : COLORS.sub }}
            >
              {realized.sells ? signedUsd(realized.totalRealized) : usd(0)}
            </span>
          </Stat>
          <Stat label="Win rate">
            <span className="font-mono text-2xl tabular-nums text-[var(--c-fg)]">
              {realized.sells ? pct(realized.winRate).replace("+", "") : "—"}
            </span>
            {realized.sells > 0 && (
              <span className="ml-2 text-sm text-[var(--c-sub)]">
                {realized.wins}/{realized.sells}
              </span>
            )}
          </Stat>
          <Stat label="Trades">
            <span className="font-mono text-2xl tabular-nums text-[var(--c-fg)]">
              {realized.trades}
            </span>
          </Stat>
          <Stat label="Open value">
            <span className="font-mono text-2xl tabular-nums text-[var(--c-fg)]">
              {usd(totals.marketValue)}
            </span>
          </Stat>
        </div>

        {/* actions */}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="press rounded-lg bg-[var(--c-accent-purple)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Share portfolio
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!trades.length}
            className="press rounded-lg px-4 py-2 text-sm font-medium text-[var(--c-fg)] ring-1 ring-[var(--c-border)] hover:bg-white/[0.05] disabled:opacity-40"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={exportJson}
            disabled={!trades.length}
            className="press rounded-lg px-4 py-2 text-sm font-medium text-[var(--c-fg)] ring-1 ring-[var(--c-border)] hover:bg-white/[0.05] disabled:opacity-40"
          >
            Export JSON
          </button>
        </div>

        {/* watchlist */}
        <div className="mt-8">
          <h2 className="mb-2 flex items-center gap-1.5 font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--c-fg)]">
            <span style={{ color: COLORS.gold }}>★</span> Watchlist
          </h2>
          {watchlist.length === 0 ? (
            <p className="text-sm text-[var(--c-sub)]">
              No coins yet — tap the ★ on a coin&apos;s chart.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {watchlist.map((coin) => (
                <span
                  key={coin}
                  className="flex items-center gap-1.5 rounded-full bg-white/[0.05] py-1 pl-3 pr-1.5 ring-1 ring-[var(--c-border)]"
                >
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/chart/${encodeURIComponent(displaySymbol(coin))}`)
                    }
                    className="press text-sm font-medium text-[var(--c-fg)]"
                  >
                    {displaySymbol(coin)}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleWatch(coin)}
                    aria-label={`Remove ${displaySymbol(coin)}`}
                    className="press flex h-5 w-5 items-center justify-center rounded-full text-xs text-[var(--c-sub)] hover:bg-white/[0.06] hover:text-[var(--c-bear)]"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* history */}
        <div className="mt-8">
          <h2 className="mb-2 font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--c-fg)]">
            Trade history
          </h2>
          {rows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-[var(--c-sub)]">
              No trades yet. Buy a coin from its chart or the portfolio page.
            </p>
          ) : (
            <div>
              <div className="flex items-center gap-3 px-3 pb-2 text-[11px] uppercase tracking-wider text-[var(--c-sub)]">
                <span className="flex-1">Date</span>
                <span className="w-12">Side</span>
                <span className="hidden w-20 text-right sm:block">Qty</span>
                <span className="hidden w-20 text-right sm:block">Price</span>
                <span className="w-24 text-right">Realized</span>
                <span className="w-14" />
              </div>
              {rows.map((t) => (
                <div
                  key={t.id}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/[0.03]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-[var(--c-fg)]">
                      {displaySymbol(t.coin)}
                    </div>
                    <div className="truncate text-xs text-[var(--c-sub)]">
                      {fmtDate(t.time)}
                    </div>
                  </div>
                  <div
                    className="w-12 text-xs font-semibold uppercase"
                    style={{ color: t.side === "buy" ? COLORS.bull : COLORS.bear }}
                  >
                    {t.side}
                  </div>
                  <div className="hidden w-20 text-right font-mono text-sm tabular-nums text-[var(--c-fg)] sm:block">
                    {qty(t.quantity)}
                  </div>
                  <div className="hidden w-20 text-right font-mono text-sm tabular-nums text-[var(--c-fg)] sm:block">
                    {price(t.price)}
                  </div>
                  <div
                    className="w-24 text-right font-mono text-sm tabular-nums"
                    style={{
                      color:
                        t.side === "sell" ? tone(tradeRealized[t.id] ?? 0) : COLORS.sub,
                    }}
                  >
                    {t.side === "sell" ? signedUsd(tradeRealized[t.id] ?? 0) : "—"}
                  </div>
                  <div className="w-14 text-right">
                    <button
                      type="button"
                      onClick={() => removeTrade(t.id)}
                      className="press rounded-md px-2 py-1 text-xs text-[var(--c-sub)] transition-colors hover:text-[var(--c-bear)] sm:opacity-0 sm:group-hover:opacity-100"
                      aria-label="Delete trade"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {shareOpen && (
        <ShareModal onClose={() => setShareOpen(false)} navigate={navigate} />
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

function ShareModal({
  onClose,
  navigate,
}: {
  onClose: () => void;
  navigate: Navigate;
}) {
  const { positions, totals } = usePortfolio();
  const [hidden, setHidden] = useState(false);
  const [url, setUrl] = useState("");
  const [qrSrc, setQrSrc] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Rebuild the link whenever the hide-amounts toggle changes.
  useEffect(() => {
    let alive = true;
    const items: ShareItem[] = hidden
      ? positions.map((p) => ({
          c: p.coin,
          w: totals.marketValue > 0 ? p.marketValue / totals.marketValue : 0,
        }))
      : positions.map((p) => ({ c: p.coin, q: p.quantity, a: p.avgPrice }));
    encodeShare({ v: 1, hidden, items }).then((token) => {
      if (!alive) return;
      const link = `${window.location.origin}/share#${token}`;
      setUrl(link);
      QRCode.toDataURL(link, {
        margin: 1,
        width: 240,
        color: { dark: "#0f1115", light: "#ffffff" },
      }).then((src) => alive && setQrSrc(src));
    });
    return () => {
      alive = false;
    };
  }, [hidden, positions, totals.marketValue]);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const empty = positions.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden
      />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.08] p-5 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--c-fg)]">
            Share portfolio
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="press flex h-8 w-8 items-center justify-center rounded-full text-[var(--c-sub)] hover:bg-white/[0.06] hover:text-[var(--c-fg)]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {empty ? (
          <p className="mt-4 text-sm text-[var(--c-sub)]">
            Nothing to share yet — add a position first.
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs text-[var(--c-sub)]">
              Encoded in the link fragment — never sent to a server. Read-only.
            </p>

            {qrSrc && (
              <div className="mt-4 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrSrc}
                  alt="Portfolio QR"
                  className="h-44 w-44 rounded-xl"
                />
              </div>
            )}

            {/* hide amounts toggle */}
            <label className="mt-4 flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2.5">
              <span className="text-sm text-[var(--c-fg)]">
                Hide amounts
                <span className="ml-1 text-xs text-[var(--c-sub)]">
                  (share weights only)
                </span>
              </span>
              <input
                type="checkbox"
                checked={hidden}
                onChange={(e) => setHidden(e.target.checked)}
                className="h-4 w-4 accent-[var(--c-accent-purple)]"
              />
            </label>

            <div className="mt-3 flex gap-2">
              <input
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded-lg bg-white/[0.05] px-3 py-2 font-mono text-xs text-[var(--c-sub)] outline-none ring-1 ring-[var(--c-border)]"
              />
              <button
                type="button"
                onClick={copy}
                className="press shrink-0 rounded-lg bg-[var(--c-accent-purple)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(url.slice(window.location.origin.length));
              }}
              className="press mt-2 text-xs text-[var(--c-sub)] underline underline-offset-2 hover:text-[var(--c-fg)]"
            >
              Preview the read-only view
            </button>
          </>
        )}
      </div>
    </div>
  );
}
