"use client";

import type { Navigate } from "@/components/RootRouter";
import type { useUniverse } from "@/hooks/useUniverse";
import { displaySymbol } from "@/lib/hyperliquid";
import { MarketList } from "@/components/MarketList";
import { ChartPanel } from "@/components/ChartPanel";
import { LogoLoader } from "@/components/LogoLoader";

type Universe = ReturnType<typeof useUniverse>;

// The working view: a market list sidebar for quick switching next to the
// focused chart. The selected coin comes from the URL (/chart/SYMBOL).
export function ChartView({
  universe,
  symbol,
  navigate,
}: {
  universe: Universe;
  symbol: string;
  navigate: Navigate;
}) {
  const { coins, prevDay, status } = universe;
  const found = coins.find((c) => c.symbol.toUpperCase() === symbol);
  const openChart = (coin: string) =>
    navigate(`/chart/${encodeURIComponent(displaySymbol(coin))}`);

  return (
    // Desktop: market list sidebar + chart. Mobile: chart fills the screen —
    // coin switching happens on the Discover tab, so the list never eats space.
    <div className="grid h-full min-h-0 lg:grid-cols-[340px_1fr]">
      <aside className="hidden min-h-0 overflow-hidden border-white/10 bg-white/[0.02] backdrop-blur-2xl lg:block lg:border-r">
        <MarketList
          coins={coins}
          loading={status === "loading"}
          selected={found?.coin}
          onSelect={openChart}
        />
      </aside>

      <main className="min-h-0">
        {found ? (
          <ChartPanel coin={found.coin} prevDayPx={prevDay[found.coin]} />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[var(--c-sub)]">
            {status === "loading" ? (
              <LogoLoader label="Loading market" />
            ) : (
              `“${symbol}” isn't a tradeable coin — pick one from Discover.`
            )}
          </div>
        )}
      </main>
    </div>
  );
}
