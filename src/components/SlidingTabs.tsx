"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// A tab strip with a highlight that slides between the active tab. The pill is
// positioned by measuring the active button, so it animates left/width on any
// selection or layout change. Styling is fully delegated via className props so
// the same mechanism drives both the header nav and the segmented filters.
export function SlidingTabs<K extends string>({
  items,
  value,
  onChange,
  fill = false,
  containerClassName = "",
  pillClassName = "",
  tabClassName,
}: {
  items: { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
  fill?: boolean; // tabs share width equally (segmented look)
  containerClassName?: string;
  pillClassName?: string;
  tabClassName: (active: boolean) => string;
}) {
  const navRef = useRef<HTMLDivElement>(null);
  const refs = useRef<Partial<Record<K, HTMLButtonElement | null>>>({});
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  const measure = useCallback(() => {
    const el = refs.current[value];
    const nav = navRef.current;
    if (!el || !nav) return;
    // Measure both in border-box (viewport) coords and take the delta, so the
    // pill aligns exactly regardless of container padding / offsetParent quirks.
    const navBox = nav.getBoundingClientRect();
    const elBox = el.getBoundingClientRect();
    setPill({ left: elBox.left - navBox.left, width: elBox.width });
  }, [value]);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure, items.length]);

  return (
    <div ref={navRef} className={`relative flex ${containerClassName}`}>
      {pill && (
        <span
          aria-hidden
          className={`pointer-events-none absolute left-0 transition-[transform,width] duration-300 ease-[cubic-bezier(0.4,0,0,1)] ${pillClassName}`}
          style={{ transform: `translateX(${pill.left}px)`, width: pill.width }}
        />
      )}
      {items.map((it) => (
        <button
          key={it.key}
          ref={(el) => {
            refs.current[it.key] = el;
          }}
          type="button"
          onClick={() => onChange(it.key)}
          className={`relative z-10 ${fill ? "flex-1" : ""} ${tabClassName(it.key === value)}`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
