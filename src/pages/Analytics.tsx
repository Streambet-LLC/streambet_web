import { Navigate } from 'react-router-dom';
import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { Loader2, Users, Sparkles } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { AnalyticsInsights } from '@/components/analytics/AnalyticsInsights';
import { AnalyticsMarket } from '@/components/analytics/AnalyticsMarket';
import { AnalyticsPortfolio } from '@/components/analytics/AnalyticsPortfolio';
import { AnalyticsUsage } from '@/components/analytics/AnalyticsUsage';
import { AnalyticsWaitlist } from '@/components/analytics/AnalyticsWaitlist';
// CRM (Sellers / Buyers / Leads) — coming soon. Kept wired for when it's back:
// import { AnalyticsSellers } from '@/components/analytics/AnalyticsSellers';
// import { AnalyticsDiscover } from '@/components/analytics/AnalyticsDiscover';
// import { AnalyticsLeads } from '@/components/analytics/AnalyticsLeads';

type AnalyticsTab =
  | 'ai'
  | 'market'
  | 'crm'
  | 'portfolio'
  | 'usage'
  | 'waitlist';

/**
 * Admin-only Analytics homebase — AI-powered card-market intelligence built
 * on live external data (web research, market pulse, social discovery).
 */
const Analytics = () => {
  const { session, isLoading, isFetching } = useAuthContext();
  const [tab, setTab] = useState<AnalyticsTab>('ai');
  // Sub-view inside the (currently disabled) CRM tab.
  // const [audienceTab, setAudienceTab] = useState<'sellers' | 'buyers' | 'leads'>(
  //   'sellers',
  // );

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
              AI-powered card-market intelligence — a research analyst, live market data,
              tracked-card pricing and forecasts.
            </p>
          </div>

          <Tabs value={tab} onValueChange={v => setTab(v as AnalyticsTab)}>
            <TabsList className="h-auto flex-wrap justify-start bg-[rgba(22,22,22,1)] border border-white/5">
              <TabsTrigger
                value="ai"
                className="gap-1.5 font-semibold text-[#B4FF39] data-[state=active]:bg-[#B4FF39] data-[state=active]:text-black data-[state=active]:shadow-[0_0_12px_rgba(180,255,57,0.35)]"
              >
                <Sparkles className="h-3.5 w-3.5" /> AI
              </TabsTrigger>
              <TabsTrigger value="market">Market Data</TabsTrigger>
              <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
              <TabsTrigger value="crm">CRM</TabsTrigger>
              <TabsTrigger value="usage">Usage</TabsTrigger>
              <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
            </TabsList>

            <TabsContent value="ai" className="mt-6">
              <AnalyticsInsights />
            </TabsContent>

            <TabsContent value="market" className="mt-6">
              <AnalyticsMarket />
            </TabsContent>

            <TabsContent value="crm" className="mt-6">
              {/* Coming soon — the Sellers / Buyers / Leads CRM is temporarily
                disabled. The full implementation is preserved below (commented
                out) so it can be switched back on without rebuilding it. */}
              <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-6 sm:p-8">
                <div className="mx-auto max-w-md text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-[#B4FF39]">
                    <Users className="h-6 w-6" />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-white">CRM</h2>
                  <span className="mt-2 inline-flex items-center rounded-full border border-[#B4FF39]/25 bg-[#B4FF39]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#B4FF39]">
                    Coming soon!
                  </span>
                  <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/60">
                    Seller & buyer discovery, matching, lead management, and sales intelligence, are
                    on the way. Check back soon.
                  </p>
                </div>
              </Card>

              {/*
              ── PRESERVED CRM IMPLEMENTATION (re-enable when ready) ──
              Also restore: the AnalyticsSellers/Discover/Leads imports and the
              `audienceTab` state above, and the `Users` import can stay.

            <div className="space-y-5">
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
            */}
            </TabsContent>

            <TabsContent value="portfolio" className="mt-6">
              <AnalyticsPortfolio />
            </TabsContent>

            <TabsContent value="usage" className="mt-6">
              <AnalyticsUsage />
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
