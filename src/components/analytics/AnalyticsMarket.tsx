import { MarketDashboard } from './MarketDashboard';

/**
 * Market Data — the live market-pulse dashboard: AI-researched market
 * intelligence per segment (temperature, indices, movers, catalysts, sales,
 * trends) built on EXTERNAL web data only. Per-card research lives in the
 * separate "Tracked Cards" tab.
 */
export const AnalyticsMarket = () => {
  return (
    <div className="space-y-5">
      <MarketDashboard />
    </div>
  );
};
