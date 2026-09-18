import { MarketDashboard } from './MarketDashboard';
import { SectionHeader } from './SectionHeader';

/**
 * "Additional Data" tab — the older AI-researched market dashboard (temperature,
 * indices, movers, catalysts, headline sales), parked here for now. Some of it
 * overlaps the new Market Heat page; the good parts will get pulled in as
 * drill-ins over time.
 */
export const AnalyticsAdditional = () => (
  <div className="space-y-5">
    <SectionHeader
      title="Deep Insights"
      subtitle="An AI-researched deep dive on each market, built from web research: temperature, indices, movers, catalysts, and headline sales. Some of this overlaps Market Heat and will fold in over time."
    />
    <MarketDashboard />
  </div>
);
