"use client";

import { useRef, useState } from "react";
import { useSettings, type UpColor } from "@/context/SettingsContext";
import { usePortfolioState } from "@/context/PortfolioContext";
import { saveTrades, saveWatchlist } from "@/lib/storage";
import { INTERVALS, type Interval } from "@/lib/hyperliquid";
import { COLORS } from "@/lib/theme";

const APP_VERSION = "0.1.0";
const GITHUB_URL = "https://github.com/rxxuzi/ledger";
const SETTINGS_KEY = "ledger.settings.v1";
const STORE_KEYS = [
  "ledger.trades.v1",
  "ledger.settings.v1",
  "ledger.holdings.v1",
  "ledger.watchlist.v1",
];

export function SettingsView() {
  const { upColor, setUpColor, defaultInterval, setDefaultInterval } =
    useSettings();
  const { trades, watchlist } = usePortfolioState();
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState<string | null>(null);

  const exportBackup = () => {
    const backup = {
      app: "ledger",
      version: 1,
      exportedAt: new Date().toISOString(),
      trades,
      watchlist,
      settings: { upColor, defaultInterval },
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "ledger-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      if (Array.isArray(data.trades)) saveTrades(data.trades);
      if (Array.isArray(data.watchlist)) saveWatchlist(data.watchlist);
      if (data.settings)
        window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
      window.location.reload();
    } catch {
      setNote("Couldn't read that backup file.");
    }
  };

  const clearAll = () => {
    if (
      !window.confirm(
        "Delete all local data (trades & settings)? This can't be undone.",
      )
    )
      return;
    STORE_KEYS.forEach((k) => window.localStorage.removeItem(k));
    window.location.reload();
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl space-y-9 px-5 py-8">
        {/* color mode */}
        <Section
          title="Color mode"
          desc="Which direction is green. 西洋式 = up green; 日本式 = up red."
        >
          <div className="flex gap-2">
            {(
              [
                { v: "green", label: "Western (up green)" },
                { v: "red", label: "Japanese (up red)" },
              ] as { v: UpColor; label: string }[]
            ).map((o) => {
              const on = upColor === o.v;
              const up = o.v === "green" ? COLORS.bull : COLORS.bear;
              const down = o.v === "green" ? COLORS.bear : COLORS.bull;
              return (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setUpColor(o.v)}
                  className={`press flex flex-1 items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm ring-1 ${
                    on
                      ? "bg-white/[0.06] text-[var(--c-fg)] ring-white/20"
                      : "text-[var(--c-sub)] ring-[var(--c-border)] hover:bg-white/[0.03]"
                  }`}
                >
                  {o.label}
                  <span className="flex gap-1">
                    <Dot color={up} dir="▲" />
                    <Dot color={down} dir="▼" />
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* default interval */}
        <Section
          title="Default interval"
          desc="Timeframe a chart opens at."
        >
          <div className="flex flex-wrap gap-1.5">
            {INTERVALS.map((iv: Interval) => {
              const on = iv === defaultInterval;
              return (
                <button
                  key={iv}
                  type="button"
                  onClick={() => setDefaultInterval(iv)}
                  className={`press rounded-lg px-3.5 py-1.5 text-sm font-medium tabular-nums ${
                    on
                      ? "bg-white/[0.08] text-[var(--c-fg)]"
                      : "text-[var(--c-sub)] hover:text-white/80"
                  }`}
                >
                  {iv}
                </button>
              );
            })}
          </div>
        </Section>

        {/* data management */}
        <Section
          title="Data"
          desc="Everything lives in this browser. Back it up or move it."
        >
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportBackup}
              className="press rounded-lg px-4 py-2 text-sm font-medium text-[var(--c-fg)] ring-1 ring-[var(--c-border)] hover:bg-white/[0.05]"
            >
              Export backup
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="press rounded-lg px-4 py-2 text-sm font-medium text-[var(--c-fg)] ring-1 ring-[var(--c-border)] hover:bg-white/[0.05]"
            >
              Import
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importBackup(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={clearAll}
              className="press rounded-lg px-4 py-2 text-sm font-medium ring-1 ring-[var(--c-border)] hover:bg-white/[0.05]"
              style={{ color: COLORS.bear }}
            >
              Clear all data
            </button>
          </div>
          {note && (
            <p className="mt-2 text-xs" style={{ color: COLORS.bear }}>
              {note}
            </p>
          )}
        </Section>

        {/* about */}
        <Section title="About">
          <p className="text-sm text-[var(--c-sub)]">
            Ledger — realtime perp candles & portfolio, streamed straight from
            Hyperliquid. Serverless and local-first.
          </p>
          <div className="mt-2 flex items-center gap-4 text-sm">
            <span className="font-mono text-[var(--c-sub)]">v{APP_VERSION}</span>
            <a
              href="/about"
              className="press text-[var(--c-fg)] underline underline-offset-2 hover:opacity-80"
            >
              About
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="press text-[var(--c-fg)] underline underline-offset-2 hover:opacity-80"
            >
              GitHub ↗
            </a>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-white/[0.06] pt-6 first:border-0 first:pt-0">
      <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--c-fg)]">
        {title}
      </h2>
      {desc && <p className="mt-0.5 mb-3 text-xs text-[var(--c-sub)]">{desc}</p>}
      {!desc && <div className="mb-3" />}
      {children}
    </section>
  );
}

function Dot({ color, dir }: { color: string; dir: string }) {
  return (
    <span
      className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] text-white"
      style={{ background: color }}
    >
      {dir}
    </span>
  );
}
