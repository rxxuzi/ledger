import type { Metadata, Viewport } from "next";
import {
  Geist,
  Geist_Mono,
  Instrument_Serif,
  Space_Grotesk,
} from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face for the wordmark + top nav — geometric, modern, a touch more
// character than the body sans.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

// Serif for the wordmark — editorial, premium "ledger" feel.
const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#181b22",
};

const DESCRIPTION =
  "Realtime candles for stocks, crypto, and commodities, streamed straight from Hyperliquid. A local-first portfolio with no account and no server.";

export const metadata: Metadata = {
  metadataBase: new URL("https://ledger.rxxuzi.com"),
  title: "Ledger — realtime markets & portfolio",
  description: DESCRIPTION,
  applicationName: "Ledger",
  authors: [{ name: "rxxuzi", url: "https://github.com/rxxuzi" }],
  creator: "rxxuzi",
  keywords: [
    "Hyperliquid",
    "portfolio tracker",
    "crypto",
    "stocks",
    "commodities",
    "perpetuals",
    "candlestick chart",
    "realtime prices",
    "watchlist",
    "local-first",
  ],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "Ledger",
    title: "Ledger — realtime markets & portfolio",
    description: DESCRIPTION,
    url: "/",
    locale: "en_US",
    images: [{ url: "/ogp.png", width: 1200, height: 630, alt: "Ledger" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ledger — realtime markets & portfolio",
    description: DESCRIPTION,
    images: ["/ogp.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
