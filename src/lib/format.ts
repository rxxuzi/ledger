// Display formatters. All values are USD.

export function usd(n: number, digits = 2): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function signedUsd(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${usd(Math.abs(n))}`;
}

export function pct(fraction: number): string {
  const sign = fraction > 0 ? "+" : fraction < 0 ? "−" : "";
  return `${sign}${(Math.abs(fraction) * 100).toFixed(2)}%`;
}

export function price(n: number): string {
  if (!n) return "—";
  // Adaptive precision: big prices (BTC) need 2 decimals, tiny ones (DOGE) more.
  const abs = Math.abs(n);
  const digits = abs >= 1 ? 2 : abs >= 0.01 ? 4 : 6;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function qty(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

// Compact magnitude for volumes etc. (1.2K, 3.4M, 5.6B).
export function compact(n: number): string {
  if (!n) return "0";
  return n.toLocaleString("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  });
}
