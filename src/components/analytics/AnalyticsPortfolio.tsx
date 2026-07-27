import { AnalyticsTrackedCards } from './AnalyticsTrackedCards';
import { AnalyticsPortfolioHoldings } from './AnalyticsPortfolioHoldings';

/**
 * Portfolio tab — the money view of your holdings (cost basis, live value,
 * gain/loss, movers) on top, then the tracked-cards watchlist you add to and
 * research below.
 */
export const AnalyticsPortfolio = () => {
  return (
    <div className="space-y-5">
      {/* Holdings — cost basis vs. live value + gain/loss */}
      <AnalyticsPortfolioHoldings />

      {/* Tracked cards — the watchlist you add to + research */}
      <AnalyticsTrackedCards />
    </div>
  );
};
