// Single source of truth for the palette. Mirrored as CSS variables in
// globals.css (--c-*) for markup, and consumed directly by lightweight-charts
// (which takes plain color strings, not CSS vars).
export const COLORS = {
  bg: "#181b22",
  fg: "#d8f2ef",

  // Candles: green = up, pink = down.
  bull: "#21a86f",
  bear: "#e8447e",

  // Accents — two-tone scheme: green = Stocks, pink = Crypto.
  blue: "#21a86f",
  purple: "#e8447e",
  amber: "#fbb257",
  gold: "#fbbf24", // watchlist star

  // Muted (alpha over white)
  grid: "#ffffff14",
  border: "#ffffff22",
  sub: "#ffffff66",
} as const;

// Accent ramp used to color overlay lines (one per holding/coin).
export const ACCENTS = [
  COLORS.bull,
  COLORS.bear,
  "#4cc78f",
  "#f06f9c",
  COLORS.amber,
  "#7fd9af",
  "#f7a8c2",
  "#d8f2ef",
] as const;
