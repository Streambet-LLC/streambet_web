import { useState } from 'react';
import { AnalyticsTrackedCards } from './AnalyticsTrackedCards';
import { AnalyticsPortfolioHoldings } from './AnalyticsPortfolioHoldings';
import { AnalyticsSoldCards } from './AnalyticsSoldCards';

/**
 * Portfolio tab — My Holdings (cost basis, live value, gain/loss, movers) on
 * top, then the watchlist you add to and research, then the sold-card ledger
 * with realized P/L.
 */
export const AnalyticsPortfolio = () => {
  // Logging a sale can draw down a holding, so both lists above the ledger
  // need to refetch when the ledger changes.
  const [refreshSignal, setRefreshSignal] = useState(0);

  return (
    <div className="space-y-5">
      {/* My Holdings — cost basis vs. live value + gain/loss */}
      <AnalyticsPortfolioHoldings refreshSignal={refreshSignal} />

      {/* Watched Cards — the watchlist you add to + research */}
      <AnalyticsTrackedCards
        refreshSignal={refreshSignal}
        onChange={() => setRefreshSignal(s => s + 1)}
      />

      {/* Sold Cards — realized profit and loss. It reloads itself after every
          edit, so it takes no refreshSignal (that would double-fetch). */}
      <AnalyticsSoldCards onChange={() => setRefreshSignal(s => s + 1)} />
    </div>
  );
};
