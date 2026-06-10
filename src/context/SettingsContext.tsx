"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { COLORS } from "@/lib/theme";
import type { Interval } from "@/lib/hyperliquid";

export type UpColor = "green" | "red";

export type Settings = {
  upColor: UpColor;
  defaultInterval: Interval;
};

const DEFAULTS: Settings = {
  upColor: "green",
  defaultInterval: "1h",
};

const KEY = "ledger.settings.v1";

type SettingsCtx = Settings & {
  setUpColor: (c: UpColor) => void;
  setDefaultInterval: (i: Interval) => void;
  // Price-direction colors derived from upColor (西洋式 vs 日本式). Only the
  // up/down tint flips — status/danger colors stay fixed.
  dir: { up: string; down: string };
};

const Ctx = createContext<SettingsCtx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSettings({
        upColor: parsed?.upColor === "red" ? "red" : "green",
        defaultInterval: parsed?.defaultInterval ?? DEFAULTS.defaultInterval,
      });
    } catch {
      /* keep defaults */
    }
  }, []);

  const persist = useCallback((next: Settings) => {
    setSettings(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  const setUpColor = useCallback(
    (upColor: UpColor) => persist({ ...settings, upColor }),
    [settings, persist],
  );
  const setDefaultInterval = useCallback(
    (defaultInterval: Interval) => persist({ ...settings, defaultInterval }),
    [settings, persist],
  );

  const dir = useMemo(
    () =>
      settings.upColor === "green"
        ? { up: COLORS.bull, down: COLORS.bear }
        : { up: COLORS.bear, down: COLORS.bull },
    [settings.upColor],
  );

  return (
    <Ctx.Provider
      value={{ ...settings, setUpColor, setDefaultInterval, dir }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useSettings(): SettingsCtx {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("useSettings must be used within <SettingsProvider>");
  return ctx;
}

// Direction tint helper: positive → up color, negative → down color, honoring
// the user's color mode.
export function useTone(): (n: number) => string {
  const { dir } = useSettings();
  return useCallback((n: number) => (n >= 0 ? dir.up : dir.down), [dir]);
}
