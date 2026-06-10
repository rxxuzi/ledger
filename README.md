<p align="center">
  <img src="./logo.svg" alt="Ledger" width="360">
</p>

# Ledger

Real-time candles for stocks, crypto, and commodities, streamed from
Hyperliquid, with a portfolio that lives in your browser.

Hyperliquid already streams equity, crypto, and commodity perps around the clock
through a single WebSocket. Ledger is a thin client over that feed: browse the
market, watch a chart, track positions. No account, no server.

[ledger.rxxuzi.com](https://ledger.rxxuzi.com)

## Features

- **Discover** — a market heatmap, sized by volume and colored by 24h change,
  with gainers, losers, and most active alongside.
- **Chart** — candlesticks with EMA overlays and a volume pane. Live price in
  the tab title.
- **Portfolio** — positions, P&L, and cost basis, all derived from your trade
  log.
- **Activity** — full trade history with CSV / JSON export.
- **Share** — encode a portfolio into a link fragment, with an option to hide
  amounts. Read-only, never sent anywhere.

## How it works

The browser connects to Hyperliquid's WebSocket itself. Your holdings, trades,
and settings live in `localStorage`, on your device only. Share links pack the
portfolio into the URL fragment (`#`), which never leaves the browser.

Stock and commodity perps live on Hyperliquid's `xyz` builder dex (ids like
`xyz:AAPL`); crypto is on the main dex with bare ids (`BTC`).

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, static export)
- React 19, TypeScript, Tailwind v4
- [Lightweight Charts v5](https://github.com/tradingview/lightweight-charts)
- Hyperliquid public WebSocket + `/info` REST

## Getting started

Requires Node 20+.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static export to ./out
```

## Deploy

Builds to static files for Cloudflare Pages, or any static host:

- Build command: `next build`
- Output directory: `out`

Routing is client-side, so deep links (`/chart/AAPL`, `/portfolio`, `/share`)
map back to the app shell via `public/_redirects`.

## Prices

Ledger shows the mark price of Hyperliquid perps, not exchange quotes. Stock
prices come from Pyth's oracle — close to the underlying during market hours,
but not the official NYSE or NASDAQ price.

## LICENSE

MIT
