"use client";

import { useEffect, useRef, useState } from "react";

// Intro: the mark is inked in pale strokes, fills, tints green/red row by
// row, then bulls scatter up and bears down — and the About page is born.
const PALE = "#d8f2ef";
const UP = "#21a86f";
const DOWN = "#e8447e";

// Logo geometry — do not edit. d + orientation + rough centroid.
const TRI: { d: string; up: boolean; cx: number; cy: number }[] = [
  { up: true, cx: 256, cy: 158, d: "M 261.50 95.66 Q 256.00 86.13 250.50 95.66 L 201.89 179.85 Q 196.39 189.38 207.39 189.38 L 304.61 189.38 Q 315.61 189.38 310.11 179.85 Z" },
  { up: true, cx: 189, cy: 268, d: "M 191.50 216.90 Q 186.00 207.38 180.50 216.90 L 131.89 301.10 Q 126.39 310.62 137.39 310.62 L 234.61 310.62 Q 245.61 310.62 240.11 301.10 Z" },
  { up: false, cx: 256, cy: 236, d: "M 201.89 210.90 Q 196.39 201.38 207.39 201.38 L 304.61 201.38 Q 315.61 201.38 310.11 210.90 L 261.50 295.10 Q 256.00 304.62 250.50 295.10 Z" },
  { up: true, cx: 116, cy: 390, d: "M 121.50 338.15 Q 116.00 328.62 110.50 338.15 L 61.89 422.34 Q 56.39 431.87 67.39 431.87 L 164.61 431.87 Q 175.61 431.87 170.11 422.34 Z" },
  { up: false, cx: 186, cy: 357, d: "M 131.89 332.15 Q 126.39 322.62 137.39 322.62 L 234.61 322.62 Q 245.61 322.62 240.11 332.15 L 191.50 416.34 Q 186.00 425.87 180.50 416.34 Z" },
  { up: true, cx: 256, cy: 390, d: "M 261.50 338.15 Q 256.00 328.62 250.50 338.15 L 201.89 422.34 Q 196.39 431.87 207.39 431.87 L 304.61 431.87 Q 315.61 431.87 310.11 422.34 Z" },
  { up: false, cx: 326, cy: 357, d: "M 271.89 332.15 Q 266.39 322.62 277.39 322.62 L 374.61 322.62 Q 385.61 322.62 380.11 332.15 L 331.50 416.34 Q 326.00 425.87 320.50 416.34 Z" },
  { up: true, cx: 396, cy: 390, d: "M 401.50 338.15 Q 396.00 328.62 390.50 338.15 L 341.89 422.34 Q 336.39 431.87 347.39 431.87 L 444.61 431.87 Q 455.61 431.87 450.11 422.34 Z" },
];

const FEATURES = [
  ["Discover", "A market heatmap, movers, and a searchable universe of perps."],
  ["Chart", "Live candlesticks with EMAs, an OHLCV legend, and the price in the tab."],
  ["Portfolio", "Positions, P&L, and allocation — derived from a local trade log."],
  ["Activity", "Trade history, realized P&L, exports, and a watchlist."],
];

// Ink top row first, fanning out from the center column.
const drawDelay = (t: (typeof TRI)[number]) =>
  ((t.cy - 158) / 232) * 0.45 + (Math.abs(t.cx - 256) / 140) * 0.12;

// Color floods downward, row by row.
const tintDelay = (t: (typeof TRI)[number]) => ((t.cy - 158) / 232) * 0.35;

export default function AboutPage() {
  // 0 pre · 1 inked · 2 tinted · 3 scattered · 4 revealed
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setPhase(4);
      return;
    }
    const ts = [
      setTimeout(() => setPhase(1), 50),
      setTimeout(() => setPhase(2), 1350),
      setTimeout(() => setPhase(3), 2400),
      setTimeout(() => setPhase(4), 3250),
    ];
    return () => ts.forEach(clearTimeout);
  }, []);

  const entered = phase >= 1;
  const colored = phase >= 2;
  const gone = phase >= 3;
  const revealed = phase >= 4;

  return (
    <main className="relative min-h-screen bg-[var(--c-bg)] text-[var(--c-fg)]">
      <AboutLanding visible={revealed} />

      <div
        aria-hidden
        onClick={() => setPhase(4)}
        className={`fixed inset-0 z-30 flex cursor-pointer items-center justify-center overflow-hidden bg-[var(--c-bg)] transition-opacity duration-700 ${
          revealed ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        {/* glow stays small until the burst, then flares once */}
        <div
          className="pointer-events-none absolute h-[60vmin] w-[60vmin] rounded-full blur-3xl transition-all duration-1000 ease-out"
          style={{
            opacity: gone ? 0.8 : colored ? 0.4 : entered ? 0.18 : 0,
            transform: gone ? "scale(1.6)" : "scale(1)",
            background: colored
              ? "radial-gradient(circle, rgba(33,168,111,0.35), rgba(232,68,126,0.22) 55%, transparent 72%)"
              : "radial-gradient(circle, rgba(216,242,239,0.22), transparent 70%)",
          }}
        />

        <svg
          viewBox="0 0 512 512"
          className="relative w-[56vmin] max-w-[480px] overflow-visible"
          role="img"
          aria-label="Ledger"
        >
          {TRI.map((t, i) => {
            const d = drawDelay(t);
            const transition = gone
              ? `transform 0.95s cubic-bezier(0.55, 0, 0.3, 1) ${i * 0.035}s, opacity 0.85s ease ${i * 0.035}s, fill 0.7s ease`
              : `stroke-dashoffset 0.8s cubic-bezier(0.6, 0, 0.3, 1) ${d}s, fill-opacity 0.55s ease ${d + 0.35}s, stroke-opacity 0.6s ease ${tintDelay(t)}s, fill 0.7s ease ${tintDelay(t)}s, transform 0.95s ease`;
            return (
              <path
                key={i}
                d={t.d}
                pathLength={1}
                fill={colored ? (t.up ? UP : DOWN) : PALE}
                stroke={PALE}
                strokeWidth={2}
                strokeDasharray={1}
                style={{
                  transformBox: "fill-box",
                  transformOrigin: "center",
                  strokeDashoffset: entered ? 0 : 1,
                  strokeOpacity: colored ? 0 : 0.9,
                  fillOpacity: entered ? 1 : 0,
                  opacity: gone ? 0 : 1,
                  transform: gone
                    ? // bulls glide up, bears down; a horizontal fan and a
                      // slight roll keep them from stacking in a line.
                    `translate(${(t.cx - 256) * 0.6}px, ${t.up ? -620 : 620}px) rotate(${(t.cx - 256) * 0.06 * (t.up ? -1 : 1)}deg) scale(0.5)`
                    : "none",
                  transition,
                }}
              />
            );
          })}
        </svg>

        <span
          className="absolute bottom-8 font-mono text-[11px] tracking-[0.25em] text-[var(--c-sub)] uppercase transition-opacity duration-700"
          style={{ opacity: entered && !gone ? 0.7 : 0 }}
        >
          tap to skip
        </span>
      </div>
    </main>
  );
}

function AboutLanding({ visible }: { visible: boolean }) {
  return (
    <div className={visible ? "" : "pointer-events-none"}>
      <PyramidField visible={visible} />

      <section className="relative z-10 flex min-h-screen items-center px-6">
        <div className="mx-auto w-full max-w-3xl">
          <Stagger show={visible} delay={0.12}>
            <div className="mt-6 flex items-center gap-5 sm:gap-7">
              <MiniMark />
              <h1
                className="font-[family-name:var(--font-serif)] text-8xl leading-[0.85] text-[var(--c-fg)] sm:text-[10rem]"
                style={{
                  letterSpacing: visible ? "-0.025em" : "0.1em",
                  transition:
                    "letter-spacing 1.4s cubic-bezier(0.2, 0.6, 0.2, 1)",
                }}
              >
                Ledger
              </h1>
            </div>
          </Stagger>

          <Stagger show={visible} delay={0.3}>
            <p className="mt-8 max-w-2xl text-xl leading-relaxed text-[var(--c-sub)] sm:text-2xl">
              Ledger streams real-time candles for stocks, crypto, and
              commodities straight from Hyperliquid, and keeps your portfolio in
              your browser.{" "}
              <span className="text-[var(--c-fg)]">No account, no server.</span>
            </p>
          </Stagger>

          <Stagger show={visible} delay={0.45}>
            <div className="mt-9 flex items-center gap-3 font-[family-name:var(--font-display)]">
              <a
                href="/"
                className="press rounded-full bg-[var(--c-fg)] px-7 py-2.5 text-sm font-semibold text-[var(--c-bg)] hover:opacity-90"
              >
                Open Ledger
              </a>
              <a
                href="#about"
                className="press rounded-full px-7 py-2.5 text-sm font-medium text-[var(--c-fg)] ring-1 ring-[var(--c-border)] hover:bg-white/[0.05]"
              >
                Learn more
              </a>
            </div>
          </Stagger>
        </div>

        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[var(--c-sub)]"
          style={{ animation: "bob 1.8s ease-in-out infinite" }}
          aria-hidden
        >
          ↓
        </div>
      </section>

      <div id="about" className="relative z-10 mx-auto max-w-3xl px-6 pb-28">
        <TriRule />

        <div className="space-y-28 pt-24">
          <Reveal>
            <Statement up eyebrow="Why it exists" title="One feed, every market.">
              Most portfolio trackers ask you to sign up, hold your data on
              their servers, and bury the chart under a heavy interface. Stocks,
              crypto, and commodities usually live in separate apps. Hyperliquid
              already streams equity and commodity perps around the clock
              through a single public feed. Ledger is the thin client that turns
              that feed into one surface, with no backend to log in to and
              nothing to leak.
            </Statement>
          </Reveal>

          <Reveal>
            <Statement up eyebrow="How it works" title="No account. No server.">
              Prices come directly from Hyperliquid&apos;s public WebSocket.
              Your browser connects to it itself; there is no middle server.
              Holdings and trades live in your browser&apos;s local storage, on
              your device only. Share links compress a portfolio into the URL,
              so even sharing never touches a server.
            </Statement>
          </Reveal>

          <Reveal>
            <Statement eyebrow="About the prices" title="Mark prices, not the tape.">
              Ledger shows the mark price of Hyperliquid perpetuals, not the
              quote from a traditional exchange. Stock prices reference
              Pyth&apos;s oracle feed. During regular market hours they track
              the underlying closely, but they are not the official NYSE or
              NASDAQ price.
            </Statement>
          </Reveal>

          <Reveal>
            <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
              {FEATURES.map(([title, desc]) => (
                <div
                  key={title}
                  className="group border-l border-[var(--c-border)] pl-5 transition-colors hover:border-[var(--c-fg)]"
                >
                  <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--c-fg)]">
                    {title}
                  </h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--c-sub)] sm:text-base">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        <div className="pt-24">
          <TriRule />
        </div>

        <Reveal>
          <div className="flex flex-col items-start gap-7 pt-24">
            <h2 className="font-[family-name:var(--font-serif)] text-4xl tracking-tight text-[var(--c-fg)] sm:text-5xl">
              Open the terminal.
            </h2>
            <a
              href="/"
              className="press rounded-full bg-[var(--c-fg)] px-8 py-3 font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--c-bg)] hover:opacity-90"
            >
              Open Ledger
            </a>
          </div>
        </Reveal>
      </div>

      <footer className="relative z-10 border-t border-white/[0.06] px-6 py-8 text-center font-mono text-xs text-[var(--c-sub)]">
        v0.1.0 · Built by{" "}
        <a
          href="https://github.com/rxxuzi"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--c-fg)] underline underline-offset-2"
        >
          rxxuzi
        </a>{" "}
        · Data from{" "}
        <a
          href="https://hyperliquid.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--c-fg)] underline underline-offset-2"
        >
          Hyperliquid
        </a>
      </footer>
    </div>
  );
}

// A pyramid silhouette tessellated from small up/down triangles — the logo's
// motif, scaled up into ambient backdrop. Returns paths for `rows` rows.
function pyramid(rows: number, s = 22) {
  const h = s * 0.866;
  const paths: string[] = [];
  for (let i = 0; i < rows; i++) {
    const off = ((rows - 1 - i) * s) / 2;
    const topY = i * h;
    const botY = (i + 1) * h;
    for (let j = 0; j <= i; j++) {
      const a = off + j * s;
      paths.push(`M ${a + s / 2} ${topY} L ${a} ${botY} L ${a + s} ${botY} Z`);
    }
    for (let k = 0; k < i; k++) {
      const a = off + (k + 0.5) * s;
      paths.push(`M ${a} ${topY} L ${a + s} ${topY} L ${a + s / 2} ${botY} Z`);
    }
  }
  return paths;
}

const ROWS = 7;
const S = 22;
const PYRAMID = pyramid(ROWS, S);
const PYR_W = ROWS * S;
const PYR_H = ROWS * S * 0.866;

// Ambient corners: green bull pyramid lower-left, red bear pyramid upper-right.
function PyramidField({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden transition-opacity duration-1000"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <svg
        className="absolute -bottom-[6vmin] -left-[6vmin] h-[46vmin] w-[46vmin]"
        viewBox={`0 0 ${PYR_W} ${PYR_H}`}
        style={{
          opacity: 0.13,
          maskImage:
            "radial-gradient(circle at 25% 80%, black, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(circle at 25% 80%, black, transparent 75%)",
        }}
      >
        {PYRAMID.map((d, i) => (
          <path key={i} d={d} fill={UP} />
        ))}
      </svg>

      <svg
        className="absolute -right-[6vmin] -top-[6vmin] h-[46vmin] w-[46vmin] rotate-180"
        viewBox={`0 0 ${PYR_W} ${PYR_H}`}
        style={{
          opacity: 0.13,
          maskImage:
            "radial-gradient(circle at 25% 80%, black, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(circle at 25% 80%, black, transparent 75%)",
        }}
      >
        {PYRAMID.map((d, i) => (
          <path key={i} d={d} fill={DOWN} />
        ))}
      </svg>
    </div>
  );
}

// Hero children fade up one after another once the intro clears.
function Stagger({
                   show,
                   delay,
                   children,
                 }: {
  show: boolean;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.9s ease ${delay}s, transform 0.9s cubic-bezier(0.2, 0.6, 0.2, 1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

// Signature divider: the logo's triangles, miniaturized into a rule.
function TriRule() {
  return (
    <div
      className="flex items-center justify-center gap-3 opacity-50"
      aria-hidden
    >
      <span className="h-px w-16 bg-[var(--c-border)] sm:w-24" />
      <svg width="84" height="10" viewBox="0 0 84 10">
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const x = i * 14;
          const up = i % 2 === 0;
          return (
            <path
              key={i}
              d={up ? `M ${x + 5} 1 L ${x + 10} 9 L ${x} 9 Z` : `M ${x} 1 L ${x + 10} 1 L ${x + 5} 9 Z`}
              fill={up ? UP : DOWN}
            />
          );
        })}
      </svg>
      <span className="h-px w-16 bg-[var(--c-border)] sm:w-24" />
    </div>
  );
}

// The official mark — pale, sized to sit beside the wordmark.
function MiniMark() {
  return (
    <svg
      width="88"
      height="88"
      viewBox="0 0 512 512"
      className="shrink-0 sm:h-32 sm:w-32"
      role="img"
      aria-label="Ledger"
    >
      {TRI.map((t, i) => (
        <path key={i} d={t.d} fill={PALE} />
      ))}
    </svg>
  );
}

function Statement({
                     eyebrow,
                     title,
                     up = false,
                     children,
                   }: {
  eyebrow: string;
  title: string;
  up?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--c-sub)]">
        <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden>
          <path
            d={up ? "M 5 1 L 10 9 L 0 9 Z" : "M 0 1 L 10 1 L 5 9 Z"}
            fill={up ? UP : DOWN}
          />
        </svg>
        {eyebrow}
      </div>
      <h2 className="mt-4 font-[family-name:var(--font-serif)] text-4xl tracking-tight text-[var(--c-fg)] sm:text-5xl">
        {title}
      </h2>
      <p className="mt-5 max-w-prose text-[15px] leading-relaxed text-[var(--c-sub)]">
        {children}
      </p>
    </div>
  );
}

function Reveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      }`}
    >
      {children}
    </div>
  );
}