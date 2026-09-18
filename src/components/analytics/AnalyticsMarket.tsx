import { useEffect, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarketHeatPanel } from './MarketHeatPanel';
import { MarketForecastPanel } from './MarketForecastPanel';
import { MarketDashboard } from './MarketDashboard';
import { MarketTaxonomyPanel } from './MarketTaxonomyPanel';
import { SectionHeader } from './SectionHeader';
import { GuidedTour, type TourStep } from './MarketHeatTour';

const TOUR_KEY = 'mh_tour_seen_v1';

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to Market Heat',
    body: "This page reads the live card market from eBay's active listings and turns it into early signals, before the sold comps catch up. Here's a quick 60-second tour.",
  },
  {
    selector: '[data-tour="mh-scope"]',
    title: 'Pick what to look at',
    body: 'Switch between whole markets, sets, players and characters, or single cards. The dropdown narrows everything down to one market.',
  },
  {
    selector: '[data-tour="mh-rows"]',
    title: 'Read a market',
    body: 'Every row is a market with its heat score from 0 to 100, plus signals like how many are listed, where supply and price are heading, and buzz. Click any row to open its trend over time.',
  },
  {
    selector: '[data-tour="mh-add"]',
    title: 'Track anything',
    body: 'Add a player, card, or set you care about. You can test the eBay search first to see what it pulls, then it starts snapshotting on its own.',
  },
  {
    selector: '[data-tour="mh-snapshot"]',
    title: 'Fresh data',
    body: 'It refreshes on its own once a day, but you can grab a new snapshot any time with this button.',
  },
  {
    selector: '[data-tour="mh-forecast"]',
    title: '7-day outlook',
    body: "A simple read on where each market's heat looks headed over the next week. It gets sharper as more days of data come in.",
  },
  {
    selector: '[data-tour="mh-pulse"]',
    title: 'Market pulse',
    body: 'A deeper, AI-researched take on each market, built from web research. This one is separate from the live heat up top.',
  },
  {
    selector: '[data-tour="mh-taxonomy"]',
    title: 'Behind the scenes',
    body: 'The taxonomy is the hierarchy every metric slices by. Add or tweak the markets, sets, and players here.',
  },
  {
    title: "You're all set",
    body: 'That was the tour. You can reopen it any time with the "Tour" button at the top of this page.',
  },
];

/**
 * Market Heat, broken into labeled sections: real-time heat + forecast up top,
 * then the AI-researched market-pulse dashboard, and finally the taxonomy that
 * every metric slices by. Ships with a skippable guided tour (auto-shown once,
 * relaunchable from the "Tour" button).
 */
export const AnalyticsMarket = () => {
  const [tourOpen, setTourOpen] = useState(false);

  // Auto-show the tour on first visit only.
  useEffect(() => {
    try {
      if (!localStorage.getItem(TOUR_KEY)) setTourOpen(true);
    } catch {
      /* private mode / blocked storage — just don't auto-show */
    }
  }, []);

  const closeTour = () => {
    setTourOpen(false);
    try {
      localStorage.setItem(TOUR_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <SectionHeader
            title="Live Heat"
            subtitle="Early signals from live listings. These tend to move before the sold comps do."
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTourOpen(true)}
            className="shrink-0 gap-1.5 border-white/10 bg-black/40 text-xs text-white/80 hover:bg-white/5 hover:text-white"
          >
            <HelpCircle className="h-3.5 w-3.5" /> Tour
          </Button>
        </div>
        <MarketHeatPanel />
      </section>

      <section data-tour="mh-forecast" className="space-y-4">
        <SectionHeader
          title="7-Day Forecast"
          subtitle="Where each market's heat looks headed over the next week, based on its recent trend."
        />
        <MarketForecastPanel />
      </section>

      <section data-tour="mh-pulse" className="space-y-4">
        <SectionHeader
          title="Market Pulse"
          subtitle="An AI-researched read on each market's temperature, indices, movers, and catalysts, built from web research."
        />
        <MarketDashboard />
      </section>

      <section data-tour="mh-taxonomy" className="space-y-4">
        <SectionHeader
          title="Market Taxonomy"
          subtitle="The hierarchy every metric slices by. Add or curate markets, sets, players, and cards here."
        />
        <MarketTaxonomyPanel />
      </section>

      <GuidedTour steps={TOUR_STEPS} open={tourOpen} onClose={closeTour} />
    </div>
  );
};
