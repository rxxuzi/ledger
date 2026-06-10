"use client";

import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type UTCTimestamp,
} from "lightweight-charts";
import { COLORS } from "@/lib/theme";
import { compact, price } from "@/lib/format";
import type { Candle } from "@/lib/hyperliquid";

// Selectable EMA overlays. Each period keeps a fixed color so the toggle in
// the chart panel and the line on the chart always agree.
export const EMA_OPTIONS: { period: number; color: string }[] = [
  { period: 9, color: "#fbb257" },
  { period: 20, color: "#7aa2ff" },
  { period: 50, color: "#c08cff" },
  { period: 100, color: "#5fd0c0" },
  { period: 200, color: "#e8f4f1" },
];

// How many bars the chart actually shows. The candle buffer is longer (see
// useCandles) so EMAs are warmed up before this window starts.
const DISPLAY_BARS = 300;

const display = <T,>(arr: T[]): T[] =>
  arr.length > DISPLAY_BARS ? arr.slice(-DISPLAY_BARS) : arr;

// True EMA: seeded with the SMA of the first `period` closes, then the standard
// recurrence. Computed over the full (long) buffer; the caller slices it to the
// visible window, so the value at the left edge is already accurate.
function emaLine(candles: Candle[], period: number): LineData[] {
  if (candles.length < period) return [];
  let sum = 0;
  for (let i = 0; i < period; i++) sum += candles[i].close;
  let prev = sum / period;
  const k = 2 / (period + 1);
  const out: LineData[] = [
    { time: candles[period - 1].time as UTCTimestamp, value: prev },
  ];
  for (let i = period; i < candles.length; i++) {
    prev = candles[i].close * k + prev * (1 - k);
    out.push({ time: candles[i].time as UTCTimestamp, value: prev });
  }
  return out;
}

// EMA over the full buffer, sliced to the visible window.
const emaDisplay = (candles: Candle[], period: number): LineData[] =>
  display(emaLine(candles, period));

const toBar = (c: Candle): CandlestickData => ({
  time: c.time as UTCTimestamp,
  open: c.open,
  high: c.high,
  low: c.low,
  close: c.close,
});

const toVol = (c: Candle, up: string, down: string): HistogramData => ({
  time: c.time as UTCTimestamp,
  value: c.volume,
  color: c.close >= c.open ? `${up}66` : `${down}66`,
});

// OHLCV snapshot shown in the legend (the hovered bar, or the latest one).
type Legend = { o: number; h: number; l: number; c: number; v: number };
const legendOf = (c: Candle): Legend => ({
  o: c.open,
  h: c.high,
  l: c.low,
  c: c.close,
  v: c.volume,
});

export function CandleChart({
  candles,
  emaPeriods = [],
  up = COLORS.bull,
  down = COLORS.bear,
}: {
  candles: Candle[];
  emaPeriods?: number[];
  up?: string; // up-candle color (honors the color-mode setting)
  down?: string; // down-candle color
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Kept in refs so the data effect can read current colors without re-running.
  const upRef = useRef(up);
  const downRef = useRef(down);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  // Live EMA line series, keyed by period. Reconciled as the selection changes.
  const emaRef = useRef<Map<number, ISeriesApi<"Line">>>(new Map());
  const candlesRef = useRef<Candle[]>([]);
  const lastTimeRef = useRef<number | null>(null);
  // Latest bar's OHLCV, used as the legend's resting value when not hovering.
  const lastBarRef = useRef<Legend | null>(null);
  const [legend, setLegend] = useState<Legend | null>(null);

  // Create the chart once.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: COLORS.sub,
        fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
        fontSize: 11,
        // Keep the TradingView attribution mark — required by the
        // Lightweight Charts license.
        attributionLogo: true,
      },
      grid: {
        vertLines: { color: COLORS.grid },
        horzLines: { color: COLORS.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: COLORS.border,
          width: 1,
          style: LineStyle.Dotted,
          labelBackgroundColor: COLORS.blue,
        },
        horzLine: {
          color: COLORS.border,
          width: 1,
          style: LineStyle.Dotted,
          labelBackgroundColor: COLORS.blue,
        },
      },
      rightPriceScale: {
        borderColor: COLORS.border,
        // Leave room at the bottom for the volume histogram.
        scaleMargins: { top: 0.08, bottom: 0.22 },
      },
      timeScale: {
        borderColor: COLORS.border,
        timeVisible: true,
        secondsVisible: false,
        // Keep the view pinned to the data when zooming/panning out, instead
        // of scrolling off into empty space.
        fixLeftEdge: true,
        fixRightEdge: true,
        lockVisibleTimeRangeOnResize: true,
        rightOffset: 4,
        barSpacing: 8,
        minBarSpacing: 1.5,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: COLORS.bull,
      downColor: COLORS.bear,
      borderUpColor: COLORS.bull,
      borderDownColor: COLORS.bear,
      wickUpColor: COLORS.bull,
      wickDownColor: COLORS.bear,
    });

    // Volume as a thin histogram pinned to the bottom, on its own hidden scale.
    const vol = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
      lastValueVisible: false,
      priceLineVisible: false,
    });
    chart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    // Legend follows the crosshair; falls back to the latest bar on leave.
    chart.subscribeCrosshairMove((param) => {
      const bar = param.seriesData.get(series) as CandlestickData | undefined;
      const v = param.seriesData.get(vol) as HistogramData | undefined;
      if (!bar) {
        setLegend(lastBarRef.current);
        return;
      }
      setLegend({
        o: bar.open,
        h: bar.high,
        l: bar.low,
        c: bar.close,
        v: v?.value ?? 0,
      });
    });

    chartRef.current = chart;
    seriesRef.current = series;
    volRef.current = vol;

    const emaMap = emaRef.current;
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      volRef.current = null;
      emaMap.clear(); // series are disposed with the chart
      lastTimeRef.current = null;
      lastBarRef.current = null;
    };
  }, []);

  // Reconcile EMA overlays with the selected periods: add new lines, drop
  // deselected ones, and seed any new line from the current candle buffer.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const map = emaRef.current;

    for (const [period, series] of map) {
      if (!emaPeriods.includes(period)) {
        chart.removeSeries(series);
        map.delete(period);
      }
    }
    for (const period of emaPeriods) {
      if (map.has(period)) continue;
      const color =
        EMA_OPTIONS.find((o) => o.period === period)?.color ?? COLORS.fg;
      const series = chart.addSeries(LineSeries, {
        color,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      series.setData(emaDisplay(candlesRef.current, period));
      map.set(period, series);
    }
  }, [emaPeriods]);

  // Apply the up/down color mode to the candle series and recolor the volume
  // bars from the current buffer (runs on mount and whenever the mode flips).
  useEffect(() => {
    upRef.current = up;
    downRef.current = down;
    seriesRef.current?.applyOptions({
      upColor: up,
      downColor: down,
      borderUpColor: up,
      borderDownColor: down,
      wickUpColor: up,
      wickDownColor: down,
    });
    volRef.current?.setData(
      display(candlesRef.current).map((c) => toVol(c, up, down)),
    );
  }, [up, down]);

  // Reconcile data: full reset on coin/interval switch (detected as a
  // non-monotonic / empty change), incremental update on each live tick.
  useEffect(() => {
    const series = seriesRef.current;
    const vol = volRef.current;
    if (!series || !vol) return;

    candlesRef.current = candles;

    if (candles.length === 0) {
      series.setData([]);
      vol.setData([]);
      for (const s of emaRef.current.values()) s.setData([]);
      lastTimeRef.current = null;
      lastBarRef.current = null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLegend(null);
      return;
    }

    const last = candles[candles.length - 1];
    const prevTime = lastTimeRef.current;

    if (prevTime === null || last.time < prevTime) {
      // First load, or the series was replaced with a different stream
      // (coin/interval switch). Only the visible window is drawn; the longer
      // buffer behind it just warms up the EMAs. Reframe: re-enable price
      // auto-scale (the user may have manually zoomed the previous chart) and
      // fit the time range to the visible window.
      const win = display(candles);
      series.setData(win.map(toBar));
      vol.setData(win.map((c) => toVol(c, upRef.current, downRef.current)));
      chartRef.current?.priceScale("right").applyOptions({ autoScale: true });
      chartRef.current?.timeScale().fitContent();
    } else {
      // Same stream: update or append just the latest bar.
      series.update(toBar(last));
      vol.update(toVol(last, upRef.current, downRef.current));
    }
    // EMA recomputes off the full buffer, then is sliced to the window.
    for (const [period, line] of emaRef.current) {
      line.setData(emaDisplay(candles, period));
    }

    lastTimeRef.current = last.time;
    lastBarRef.current = legendOf(last);
    setLegend(legendOf(last));
  }, [candles]);

  return (
    <div className="relative h-full w-full">
      {legend && <OhlcvLegend legend={legend} />}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

function OhlcvLegend({ legend }: { legend: Legend }) {
  const up = legend.c >= legend.o;
  const tone = up ? COLORS.bull : COLORS.bear;
  return (
    <div className="pointer-events-none absolute left-3 top-2 z-10 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-xs tabular-nums">
      <Field label="O" value={price(legend.o)} color={tone} />
      <Field label="H" value={price(legend.h)} color={tone} />
      <Field label="L" value={price(legend.l)} color={tone} />
      <Field label="C" value={price(legend.c)} color={tone} />
      <Field label="V" value={compact(legend.v)} />
    </div>
  );
}

function Field({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <span className="flex items-center gap-1">
      <span className="text-[var(--c-sub)]">{label}</span>
      <span style={{ color: color ?? "var(--c-fg)" }}>{value}</span>
    </span>
  );
}
