import { MarketHeatPanel } from './MarketHeatPanel';
import { MarketForecastPanel } from './MarketForecastPanel';
import { MarketDashboard } from './MarketDashboard';
import { MarketTaxonomyPanel } from './MarketTaxonomyPanel';
import { SectionHeader } from './SectionHeader';

/**
 * Market Data, broken into labeled sections: real-time heat + forecast up top,
 * then the AI-researched market-pulse dashboard, and finally the taxonomy that
 * every metric slices by. Per-card research lives in "Tracked Cards".
 */
export const AnalyticsMarket = () => {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <SectionHeader
          title="Live Heat"
          subtitle="Early signals from live listings. These tend to move before the sold comps do."
        />
        <MarketHeatPanel />
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="7-Day Forecast"
          subtitle="Where each market's heat looks headed over the next week, based on its recent trend."
        />
        <MarketForecastPanel />
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Market Pulse"
          subtitle="An AI-researched read on each market's temperature, indices, movers, and catalysts, built from web research."
        />
        <MarketDashboard />
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Market Taxonomy"
          subtitle="The hierarchy every metric slices by. Add or curate markets, sets, players, and cards here."
        />
        <MarketTaxonomyPanel />
      </section>
    </div>
  );
};
