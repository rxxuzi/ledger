"use client";

import type { Navigate } from "@/components/RootRouter";
import { SlidingTabs } from "@/components/SlidingTabs";

export type Section =
  | "discover"
  | "chart"
  | "portfolio"
  | "activity"
  | "settings";

const ITEMS: { key: Section; label: string }[] = [
  { key: "discover", label: "Discover" },
  { key: "chart", label: "Chart" },
  { key: "portfolio", label: "Portfolio" },
  { key: "activity", label: "Activity" },
];

// Shared top bar: wordmark + the primary sections, with a highlight pill that
// slides between the active tab. `chartHref` points at the last-viewed coin so
// the Chart tab returns where you left off.
export function AppHeader({
  section,
  chartHref,
  navigate,
}: {
  section: Section;
  chartHref: string;
  navigate: Navigate;
}) {
  const hrefOf = (k: Section) =>
    k === "discover"
      ? "/" // root doubles as Discover
      : k === "chart"
        ? chartHref
        : k === "portfolio"
          ? "/portfolio"
          : "/activity";

  return (
    <header className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-3 py-3 backdrop-blur-2xl sm:gap-5 sm:px-5">
      <button
        type="button"
        onClick={() => navigate("/")}
        aria-label="Ledger — home"
        className="press shrink-0"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static export, local asset */}
        <img src="/logo.svg" alt="Ledger" className="h-7 w-auto sm:h-8" />
      </button>

      <SlidingTabs
        items={ITEMS}
        value={section}
        onChange={(k) => navigate(hrefOf(k))}
        containerClassName="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto sm:flex"
        pillClassName="inset-y-0 rounded-full bg-white/[0.09]"
        tabClassName={(active) =>
          `press font-[family-name:var(--font-display)] rounded-full px-3.5 py-1.5 text-sm font-medium ${
            active
              ? "text-[var(--c-fg)]"
              : "text-[var(--c-sub)] hover:text-white/80"
          }`
        }
      />

      <button
        type="button"
        onClick={() => navigate("/settings")}
        aria-label="Settings"
        className={`press ml-auto hidden h-9 w-9 shrink-0 items-center justify-center rounded-full sm:flex ${
          section === "settings"
            ? "bg-white/[0.09] text-[var(--c-fg)]"
            : "text-[var(--c-sub)] hover:bg-white/[0.05] hover:text-[var(--c-fg)]"
        }`}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
    </header>
  );
}
