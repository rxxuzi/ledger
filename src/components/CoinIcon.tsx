"use client";

import { useState } from "react";
import { COLORS } from "@/lib/theme";
import { usePortfolioState } from "@/context/PortfolioContext";
import { displaySymbol, logoUrl, type Group } from "@/lib/hyperliquid";

// Logos come from Hyperliquid, keyed by full coin id. Any failed load falls
// back to a colored monogram (first two letters of the symbol). A watchlisted
// coin gets a small gold star in the top-right corner.
export function CoinIcon({
  coin,
  group,
  size = 36,
  watchBadge = true,
}: {
  coin: string;
  group: Group;
  size?: number;
  watchBadge?: boolean; // show the star when this coin is watchlisted
}) {
  // Track the URL that failed, not a bare boolean — so switching to a coin with
  // a working logo (e.g. a chart-header icon that's reused across coins) resets
  // the fallback instead of staying stuck on the monogram.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const { watched } = usePortfolioState();
  const color =
    group === "Stocks"
      ? COLORS.blue
      : group === "Commodity"
        ? COLORS.amber
        : COLORS.purple;
  const symbol = displaySymbol(coin);
  const url = logoUrl(coin);
  const failed = failedUrl === url;
  const starred = watchBadge && watched.has(coin);

  const inner = failed ? (
    <span
      className="flex h-full w-full items-center justify-center rounded-full font-semibold"
      style={{ background: `${color}22`, color, fontSize: size * 0.32 }}
    >
      {symbol.slice(0, 2)}
    </span>
  ) : (
    <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/10">
      {/* eslint-disable-next-line @next/next/no-img-element -- static export, remote logos, no optimization needed */}
      <img
        key={url}
        src={url}
        alt={symbol}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailedUrl(url)}
        className="h-full w-full object-contain"
      />
    </span>
  );

  return (
    <span
      className="relative inline-flex shrink-0"
      style={{ width: size, height: size }}
    >
      {inner}
      {starred && (
        <span
          className="pointer-events-none absolute -right-1 -top-1 leading-none"
          style={{
            color: COLORS.gold,
            fontSize: size * 0.42,
            textShadow: "0 0 2px rgba(0,0,0,0.8)",
          }}
          aria-label="watchlisted"
        >
          ★
        </span>
      )}
    </span>
  );
}
