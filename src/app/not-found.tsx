import { SettingsProvider } from "@/context/SettingsContext";
import { HyperliquidProvider } from "@/context/HyperliquidContext";
import { PortfolioProvider } from "@/context/PortfolioContext";
import { RootRouter } from "@/components/RootRouter";

// The app is a client-routed static export: paths like /chart/LITE and
// /portfolio have no prerendered file, so a direct load / refresh would 404.
// Rendering the same app shell here means the not-found page (exported as
// 404.html, and shown by `next dev` for unmatched routes) boots the client
// router, which then resolves the real view from the URL. This makes deep
// links work in dev and on any static host — not just where _redirects runs.
export default function NotFound() {
  return (
    <SettingsProvider>
      <HyperliquidProvider>
        <PortfolioProvider>
          <RootRouter />
        </PortfolioProvider>
      </HyperliquidProvider>
    </SettingsProvider>
  );
}
