import { MarketHeatPanel } from './MarketHeatPanel';
import { MarketDashboard } from './MarketDashboard';

/**
 * Market Data — real-time market heat (leading indicators from live active
 * listings) up top, then the AI-researched market-pulse dashboard (segment
 * temperature, indices, movers, catalysts, sales, trends) built on external
 * web data. Per-card research lives in the separate "Tracked Cards" tab.
 */
export const AnalyticsMarket = () => {
  return (
    <div className="space-y-5">
      <MarketHeatPanel />
      <MarketDashboard />
    </div>
  );
};
