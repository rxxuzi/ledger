import { SettingsProvider } from "@/context/SettingsContext";
import { HyperliquidProvider } from "@/context/HyperliquidContext";
import { PortfolioProvider } from "@/context/PortfolioContext";
import { RootRouter } from "@/components/RootRouter";

export default function Home() {
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
