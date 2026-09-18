import { useEffect, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarketHeatPanel } from './MarketHeatPanel';
import { MarketForecastPanel } from './MarketForecastPanel';
import { MarketTaxonomyPanel } from './MarketTaxonomyPanel';
import { SectionHeader, SectionBanner } from './SectionHeader';
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
    body: 'Every row is a market with its heat score from 0 to 100, plus the drivers behind it: how many are listed, where supply and price are heading, and buzz. Click any row to open its trend over time.',
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
    title: 'Forward predictions',
    body: "A simple read on where each market's heat looks headed over the next week. It gets sharper as more days of data come in.",
  },
  {
    selector: '[data-tour="mh-taxonomy"]',
    title: 'The market map',
    body: 'The hierarchy every metric slices by: markets, sets, players, and cards. Add or tweak what gets tracked here.',
  },
  {
    title: "You're all set",
    body: 'That was the tour. You can reopen it any time with the "Tour" button at the top of this page.',
  },
];

/**
 * Market Heat — the main page, in three top-level areas: LIVE DATA (real-time
 * heat), FORWARD PREDICTIONS (the forecast), and MARKET MAP (the taxonomy).
 * The older AI-researched dashboard now lives in the "Additional Data" tab.
 * Ships with a skippable guided tour (auto-shown once, relaunchable).
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
      {/* 1 — LIVE DATA */}
      <section className="space-y-4">
        <SectionBanner
          label="Live Data"
          tip="What the market is doing right now, pulled daily from eBay's active listings. These are early signals that tend to move before the sold comps do."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTourOpen(true)}
              className="h-7 gap-1.5 border-white/10 bg-black/40 text-xs text-white/80 hover:bg-white/5 hover:text-white"
            >
              <HelpCircle className="h-3.5 w-3.5" /> Tour
            </Button>
          }
        />
        <SectionHeader
          title="Live Heat"
          subtitle="A heat score per market, plus the drivers behind it. Click any row to dig into its trend, or switch scope to go from markets down to players and cards."
        />
        <MarketHeatPanel />
      </section>

      {/* 2 — FORWARD PREDICTIONS */}
      <section data-tour="mh-forecast" className="space-y-4">
        <SectionBanner
          label="Forward Predictions"
          tip="Where each market looks headed next, projected from its recent trend. This is where heat turns into a forward view."
        />
        <SectionHeader
          title="7-Day Forecast"
          subtitle="Where each market's heat looks headed over the next week, based on its recent trend."
        />
        <MarketForecastPanel />
      </section>

      {/* 3 — MARKET MAP */}
      <section data-tour="mh-taxonomy" className="space-y-4">
        <SectionBanner
          label="Market Map"
          tip="The hierarchy everything is organized by: markets, sub-categories, sets, players, and cards. It's what lets you drill from a whole market down to a single card."
        />
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
