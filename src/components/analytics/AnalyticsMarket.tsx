import { MarketHeatPanel } from './MarketHeatPanel';
import { MarketForecastPanel } from './MarketForecastPanel';
import { MarketDashboard } from './MarketDashboard';
import { MarketTaxonomyPanel } from './MarketTaxonomyPanel';

/**
 * Market Data — real-time market heat (leading indicators from live active
 * listings + our own view/save engagement) up top, then the AI-researched
 * market-pulse dashboard (segment temperature, indices, movers, catalysts,
 * sales, trends) built on external web data, and finally the market taxonomy
 * that every metric slices by. Per-card research lives in "Tracked Cards".
 */
export const AnalyticsMarket = () => {
  return (
    <div className="space-y-5">
      <MarketHeatPanel />
      <MarketForecastPanel />
      <MarketDashboard />
      <MarketTaxonomyPanel />
    </div>
  );
};
