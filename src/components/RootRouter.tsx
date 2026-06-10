"use client";

import { useCallback, useEffect, useState } from "react";
import { useUniverse } from "@/hooks/useUniverse";
import { DEFAULT_COIN, displaySymbol } from "@/lib/hyperliquid";
import { AppHeader, type Section } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { DiscoverView } from "@/components/DiscoverView";
import { ChartView } from "@/components/ChartView";
import { PortfolioView } from "@/components/PortfolioView";
import { ActivityView } from "@/components/ActivityView";
import { SettingsView } from "@/components/SettingsView";
import { SharedView } from "@/components/SharedView";

export type Navigate = (to: string) => void;

const chartSymbolOf = (path: string): string | null => {
  const m = path.match(/^\/chart\/([^/]+)/);
  return m ? decodeURIComponent(m[1]).toUpperCase() : null;
};

const SECTION_TITLE: Partial<Record<Section, string>> = {
  discover: "Discover",
  portfolio: "Portfolio",
  activity: "Activity",
  settings: "Settings",
};

const sectionOf = (path: string): Section =>
  path.startsWith("/portfolio")
    ? "portfolio"
    : path.startsWith("/activity")
      ? "activity"
      : path.startsWith("/settings")
        ? "settings"
        : path.startsWith("/chart")
          ? "chart"
          : "discover";

// Tiny client-side router. The app is a static export (no server), so instead
// of real Next routes we swap top-level views off the pathname and drive
// navigation through the History API. The tradeable universe is loaded once
// here and shared, so navigating between views never refetches it.
export function RootRouter() {
  const universe = useUniverse();
  const [path, setPath] = useState("/");

  useEffect(() => {
    const sync = () => setPath(window.location.pathname);
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const navigate = useCallback<Navigate>((to) => {
    window.history.pushState(null, "", to);
    setPath(to.split(/[?#]/)[0]);
  }, []);

  // Read-only share view lives at /share.
  const isShare = /^\/share(\/|$)/.test(path);

  // Remember the last coin viewed so the "Chart" tab returns to it.
  const [lastSym, setLastSym] = useState(displaySymbol(DEFAULT_COIN));
  useEffect(() => {
    const s = chartSymbolOf(path);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (s) setLastSym(s);
  }, [path]);

  const section = sectionOf(path);

  // Reflect the current section in the tab title. The chart sets its own
  // (live price), and the share view is standalone, so skip both here.
  useEffect(() => {
    if (isShare || section === "chart") return;
    document.title = `${SECTION_TITLE[section] ?? "Ledger"} · Ledger`;
  }, [isShare, section]);

  // The public read-only share view stands alone (its own header, no app nav).
  if (isShare) {
    return <SharedView navigate={navigate} />;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <AppHeader
        section={section}
        chartHref={`/chart/${encodeURIComponent(lastSym)}`}
        navigate={navigate}
      />
      <main className="min-h-0 flex-1">
        {section === "discover" && (
          <DiscoverView universe={universe} navigate={navigate} />
        )}
        {section === "chart" && (
          <ChartView
            universe={universe}
            symbol={chartSymbolOf(path) ?? lastSym}
            navigate={navigate}
          />
        )}
        {section === "portfolio" && (
          <PortfolioView universe={universe} navigate={navigate} />
        )}
        {section === "activity" && <ActivityView navigate={navigate} />}
        {section === "settings" && <SettingsView />}
      </main>
      <BottomNav
        section={section}
        chartHref={`/chart/${encodeURIComponent(lastSym)}`}
        navigate={navigate}
      />
    </div>
  );
}
