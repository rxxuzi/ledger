"use client";

import { useMemo } from "react";
import { useHyperliquid } from "@/context/HyperliquidContext";
import { usePortfolioState } from "@/context/PortfolioContext";
import { computePositions, computeTotals } from "@/lib/portfolio";

// Joins holdings with live mids into priced positions + totals.
export function usePortfolio() {
  const { holdings } = usePortfolioState();
  const { mids } = useHyperliquid();

  const positions = useMemo(
    () => computePositions(holdings, mids),
    [holdings, mids],
  );
  const totals = useMemo(() => computeTotals(positions), [positions]);

  return { positions, totals, mids };
}
