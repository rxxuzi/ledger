"use client";

import type { Navigate } from "@/components/RootRouter";
import type { Section } from "@/components/AppHeader";

const ITEMS: { key: Section; label: string }[] = [
  { key: "discover", label: "Discover" },
  { key: "chart", label: "Chart" },
  { key: "portfolio", label: "Portfolio" },
  { key: "activity", label: "Activity" },
  { key: "settings", label: "Settings" },
];

// Native-style bottom tab bar, mobile only (sm:hidden). In-flow at the bottom
// of the column so it never overlaps content; honors the iOS home indicator.
export function BottomNav({
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
          : k === "activity"
            ? "/activity"
            : "/settings";

  return (
    <nav className="flex shrink-0 items-stretch border-t border-white/10 bg-white/[0.04] pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl sm:hidden">
      {ITEMS.map((it) => {
        const active = it.key === section;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => navigate(hrefOf(it.key))}
            className={`press flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium ${
              active ? "text-[var(--c-fg)]" : "text-[var(--c-sub)]"
            }`}
          >
            <NavIcon name={it.key} />
            {it.label}
          </button>
        );
      })}
    </nav>
  );
}

function NavIcon({ name }: { name: Section }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "discover":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M4 20V11M9.3 20V5M14.6 20V14M20 20V8" />
        </svg>
      );
    case "portfolio":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 12V3a9 9 0 0 1 9 9z" />
        </svg>
      );
    case "activity":
      return (
        <svg {...common}>
          <path d="M3 12h4l3 8 4-16 3 8h4" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
  }
}
