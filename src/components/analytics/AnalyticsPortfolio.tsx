import { useState } from 'react';
import { AnalyticsTrackedCards } from './AnalyticsTrackedCards';
import { AnalyticsPortfolioHoldings } from './AnalyticsPortfolioHoldings';
import { AnalyticsSoldCards } from './AnalyticsSoldCards';
import { SectionHeader } from './SectionHeader';

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
    <div className="space-y-8">
      <SectionHeader
        title="Portfolio"
        subtitle="Your holdings, watchlist, and sold-card ledger. Track what you paid, what it's worth now, and your profit or loss."
      />

      {/* My Holdings — cost basis vs. live value + gain/loss */}
      <section className="space-y-4">
        <SectionHeader
          title="Holdings"
          subtitle="The cards you own, valued live against what you paid."
        />
        <AnalyticsPortfolioHoldings refreshSignal={refreshSignal} />
      </section>

      {/* Watched Cards — the watchlist you add to + research */}
      <section className="space-y-4">
        <SectionHeader
          title="Watchlist"
          subtitle="Cards you're tracking for research. Mark one owned to move it into Holdings."
        />
        <AnalyticsTrackedCards
          refreshSignal={refreshSignal}
          onChange={() => setRefreshSignal(s => s + 1)}
        />
      </section>

      {/* Sold Cards — realized profit and loss. It reloads itself after every
          edit, so it takes no refreshSignal (that would double-fetch). */}
      <section className="space-y-4">
        <SectionHeader
          title="Sold Cards"
          subtitle="The cards you've sold and what you actually banked after fees."
        />
        <AnalyticsSoldCards onChange={() => setRefreshSignal(s => s + 1)} />
      </section>
    </div>
  );
};
