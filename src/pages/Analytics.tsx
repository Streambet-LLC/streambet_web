import { Navigate } from 'react-router-dom';
import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AnalyticsInsights } from '@/components/analytics/AnalyticsInsights';
import { AnalyticsSellers } from '@/components/analytics/AnalyticsSellers';
import { AnalyticsDiscover } from '@/components/analytics/AnalyticsDiscover';
import { AnalyticsLeads } from '@/components/analytics/AnalyticsLeads';
import { AnalyticsMarket } from '@/components/analytics/AnalyticsMarket';
import { AnalyticsPortfolio } from '@/components/analytics/AnalyticsPortfolio';
import { AnalyticsWaitlist } from '@/components/analytics/AnalyticsWaitlist';

/**
 * Admin-only Analytics homebase — AI-powered card-market intelligence built
 * on live external data (web research, market pulse, social discovery).
 */
const Analytics = () => {
  const { session, isLoading, isFetching } = useAuthContext();
  const [tab, setTab] = useState<
    'market' | 'audience' | 'insights' | 'portfolio' | 'waitlist'
  >('market');
  // Sub-view inside the Sellers/Buyers tab.
  const [audienceTab, setAudienceTab] = useState<'sellers' | 'buyers' | 'leads'>(
    'sellers',
  );

  if (isLoading || isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login?redirect=/analytics" replace />;
  }

  if (session.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="h-[calc(100dvh-64px)] overflow-auto">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-10 py-6 md:py-8 pb-16">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            AI-powered card-market intelligence — tracked-card pricing and
            forecasts, market-segment trends, prospect discovery, and a
            research analyst built on live web data.
          </p>
        </div>

        <Tabs
          value={tab}
          onValueChange={v =>
            setTab(
              v as
                | 'market'
                | 'audience'
                | 'insights'
                | 'portfolio'
                | 'waitlist',
            )
          }
        >
          <TabsList className="h-auto flex-wrap justify-start bg-[rgba(22,22,22,1)] border border-white/5">
            <TabsTrigger value="market">Market</TabsTrigger>
            <TabsTrigger value="audience">Sellers/Buyers</TabsTrigger>
            <TabsTrigger value="insights" className="gap-1.5">
              Insights
            </TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
          </TabsList>

          <TabsContent value="market" className="mt-6">
            <AnalyticsMarket />
          </TabsContent>

          <TabsContent value="audience" className="mt-6">
            <div className="space-y-5">
              {/* Sub-view toggle: Sellers · Buyers (discovery) · Leads */}
              <div className="inline-flex items-center rounded-md border border-white/10 bg-black/40 p-0.5">
                {(
                  [
                    { key: 'sellers', label: 'Sellers' },
                    { key: 'buyers', label: 'Buyers' },
                    { key: 'leads', label: 'Leads' },
                  ] as const
                ).map(v => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => setAudienceTab(v.key)}
                    className={`px-3 h-8 rounded text-sm transition-colors ${
                      audienceTab === v.key
                        ? 'bg-white/10 text-white'
                        : 'text-muted-foreground hover:text-white'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>

              {audienceTab === 'sellers' && <AnalyticsSellers />}
              {audienceTab === 'buyers' && <AnalyticsDiscover />}
              {audienceTab === 'leads' && <AnalyticsLeads />}
            </div>
          </TabsContent>

          <TabsContent value="insights" className="mt-6">
            <AnalyticsInsights />
          </TabsContent>

          <TabsContent value="portfolio" className="mt-6">
            <AnalyticsPortfolio />
          </TabsContent>

          <TabsContent value="waitlist" className="mt-6">
            <AnalyticsWaitlist />
          </TabsContent>
        </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Analytics;
