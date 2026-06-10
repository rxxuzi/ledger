"use client";

import { useMemo, useState } from "react";
import { useHyperliquid } from "@/context/HyperliquidContext";
import {
  coinName,
  GROUPS,
  groupOf,
  type Group,
  type MarketCoin,
} from "@/lib/hyperliquid";
import { useTone } from "@/context/SettingsContext";
import { usePortfolioState } from "@/context/PortfolioContext";
import { pct, price } from "@/lib/format";
import { CoinIcon } from "@/components/CoinIcon";
import { SlidingTabs } from "@/components/SlidingTabs";
import { LogoLoader } from "@/components/LogoLoader";

type Cat = "All" | Group | "Watch";
const CATS: Cat[] = ["All", ...GROUPS, "Watch"];
const catLabel = (c: Cat) => (c === "Watch" ? "★" : c);

type SortKey = "vol" | "price" | "chg" | "name";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "vol", label: "Vol" },
  { key: "price", label: "Price" },
  { key: "chg", label: "Chg" },
  { key: "name", label: "A–Z" },
];

// The market browser (Discover): search + category + sort over the full
// universe. Picking a row calls onSelect with the full coin id.
export function MarketList({
  coins,
  loading,
  selected,
  onSelect,
}: {
  coins: MarketCoin[];
  loading: boolean;
  // Highlighted coin id (used by the chart sidebar; omitted in Discover).
  selected?: string;
  onSelect: (coin: string) => void;
}) {
  const { mids } = useHyperliquid();
  const { watched } = usePortfolioState();
  const tone = useTone();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<Cat>("All");
  const [sortKey, setSortKey] = useState<SortKey>("vol");
  const [desc, setDesc] = useState(true);

  const chooseSort = (k: SortKey) => {
    if (k === sortKey) setDesc((d) => !d);
    else {
      setSortKey(k);
      setDesc(k !== "name");
    }
  };

  const rows = useMemo(() => {
    const q = query.trim().toUpperCase();
    const valued = coins
      .filter((c) => {
        if (cat === "Watch") {
          if (!watched.has(c.coin)) return false;
        } else if (cat !== "All" && c.group !== cat) {
          return false;
        }
        if (!q) return true;
        return (
          c.symbol.includes(q) || coinName(c.symbol).toUpperCase().includes(q)
        );
      })
      .map((c) => {
        const mid = mids[c.coin] || c.markPx;
        const chg = c.prevDayPx ? (mid - c.prevDayPx) / c.prevDayPx : 0;
        return { c, mid, chg };
      });

    const dir = desc ? -1 : 1;
    valued.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.c.symbol.localeCompare(b.c.symbol) * dir;
        case "price":
          return (a.mid - b.mid) * dir;
        case "chg":
          return (a.chg - b.chg) * dir;
        default:
          return (a.c.volume - b.c.volume) * dir;
      }
    });
    return valued;
  }, [coins, query, cat, mids, sortKey, desc, watched]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-3 pt-4">
        {/* search */}
        <div className="flex items-center gap-2 rounded-xl bg-white/[0.05] px-3.5 py-2.5 ring-1 ring-white/10 backdrop-blur-xl focus-within:ring-[var(--c-accent-purple)]/60">
          <SearchIcon />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search coins"
            spellCheck={false}
            className="w-full bg-transparent text-sm text-[var(--c-fg)] placeholder:text-[var(--c-sub)] outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="press text-[var(--c-sub)] hover:text-[var(--c-fg)]"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* category segmented */}
        <SlidingTabs
          items={CATS.map((c) => ({ key: c, label: catLabel(c) }))}
          value={cat}
          onChange={setCat}
          fill
          containerClassName="mt-3 gap-1 rounded-xl bg-white/[0.04] p-1"
          pillClassName="inset-y-1 rounded-lg bg-white/[0.08]"
          tabClassName={(active) =>
            `press rounded-lg py-1.5 text-center text-xs font-medium ${
              active
                ? "text-[var(--c-fg)]"
                : "text-[var(--c-sub)] hover:text-white/80"
            }`
          }
        />

        {/* sort control */}
        <div className="mt-2 flex items-center gap-1 px-0.5">
          <span className="mr-1 text-[11px] uppercase tracking-wider text-[var(--c-sub)]">
            Sort
          </span>
          {SORTS.map((s) => {
            const active = s.key === sortKey;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => chooseSort(s.key)}
                className={`press flex items-center gap-0.5 rounded-md px-2 py-1 text-xs font-medium ${
                  active
                    ? "bg-white/[0.08] text-[var(--c-fg)]"
                    : "text-[var(--c-sub)] hover:text-white/80"
                }`}
              >
                {s.label}
                {active && (
                  <span className="text-[9px] leading-none">
                    {desc ? "▼" : "▲"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* list */}
      <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
        {loading && (
          <div className="flex justify-center py-12">
            <LogoLoader size={40} label="Loading market" />
          </div>
        )}
        {!loading && rows.length === 0 && (
          <ListMessage>
            {cat === "Watch" && !query
              ? "No watchlist yet — tap the ★ on a coin's chart."
              : `No coins match “${query}”.`}
          </ListMessage>
        )}
        {rows.map(({ c, mid, chg }) => {
          const isSelected = c.coin === selected;
          return (
            <button
              key={c.coin}
              type="button"
              onClick={() => onSelect(c.coin)}
              className={`press flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left ${
                isSelected ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"
              }`}
            >
              <CoinIcon coin={c.coin} group={groupOf(c.coin)} size={36} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-[var(--c-fg)]">
                  {c.symbol}
                </div>
                <div className="truncate text-xs text-[var(--c-sub)]">
                  {coinName(c.symbol)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm tabular-nums text-[var(--c-fg)]">
                  {price(mid)}
                </div>
                <div
                  className="font-mono text-xs tabular-nums"
                  style={{ color: tone(chg) }}
                >
                  {pct(chg)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ListMessage({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 py-8 text-center text-sm text-[var(--c-sub)]">
      {children}
    </p>
  );
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="shrink-0 text-[var(--c-sub)]"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}
