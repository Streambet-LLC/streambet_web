import { Navigate } from 'react-router-dom';
import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { Loader2, LineChart } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { AnalyticsInsights } from '@/components/analytics/AnalyticsInsights';
import { AnalyticsMarket } from '@/components/analytics/AnalyticsMarket';
import { AnalyticsAdditional } from '@/components/analytics/AnalyticsAdditional';
import { AnalyticsPortfolio } from '@/components/analytics/AnalyticsPortfolio';
import { AnalyticsUsage } from '@/components/analytics/AnalyticsUsage';
import { AnalyticsWaitlist } from '@/components/analytics/AnalyticsWaitlist';
// CRM (Leads engine + manual Buyers / Sellers contacts).
import { AnalyticsLeads } from '@/components/analytics/crm/AnalyticsLeads';
import { AnalyticsSellers } from '@/components/analytics/crm/AnalyticsSellers';
import { CrmContacts } from '@/components/analytics/crm/CrmContacts';

type AnalyticsTab =
  | 'ai'
  | 'market'
  | 'additional'
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
  const [tab, setTab] = useState<AnalyticsTab>('market');
  // Sub-view inside the CRM tab.
  const [audienceTab, setAudienceTab] = useState<'sellers' | 'buyers' | 'leads'>(
    'leads',
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
              AI-powered card-market intelligence — a research analyst, live market data,
              tracked-card pricing and forecasts.
            </p>
          </div>

          <Tabs value={tab} onValueChange={v => setTab(v as AnalyticsTab)}>
            <TabsList className="h-auto flex-wrap justify-start bg-[rgba(22,22,22,1)] border border-white/5">
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="market"
                    className="gap-1.5 font-semibold text-[#B4FF39] data-[state=active]:bg-[#B4FF39] data-[state=active]:text-black data-[state=active]:shadow-[0_0_12px_rgba(180,255,57,0.35)]"
                  >
                    <LineChart className="h-3.5 w-3.5" /> Market Heat
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px] border-white/10 bg-[#161616] text-xs font-normal leading-relaxed text-white/85">
                  Real-time market heat, 7-day forecasts, trends over time, and the market
                  taxonomy. It's built from eBay's live listings plus our own view and save
                  data.
                </TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <TabsTrigger value="additional">Deep Insights</TabsTrigger>
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px] border-white/10 bg-[#161616] text-xs font-normal leading-relaxed text-white/85">
                  An AI-researched deep dive on each market: temperature, indices, movers,
                  catalysts, and headline sales, built from web research.
                </TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <TabsTrigger value="ai">AI</TabsTrigger>
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px] border-white/10 bg-[#161616] text-xs font-normal leading-relaxed text-white/85">
                  Cardy, your AI analyst. Ask her anything about the market in plain English
                  and she'll pull from the live data to answer.
                </TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px] border-white/10 bg-[#161616] text-xs font-normal leading-relaxed text-white/85">
                  Your tracked cards and holdings: what you paid, what they're worth now, and
                  your profit or loss (both on paper and once you've sold).
                </TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  {/* Short label to keep the tab row compact — the panel's own
                      header still reads "CRM / Sales Intelligence". */}
                  <TabsTrigger value="crm">CRM</TabsTrigger>
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px] border-white/10 bg-[#161616] text-xs font-normal leading-relaxed text-white/85">
                  Auto-discovered buyer and seller leads, plus your own contacts with notes,
                  tags, and pipeline stages.
                </TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <TabsTrigger value="usage">Usage</TabsTrigger>
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px] border-white/10 bg-[#161616] text-xs font-normal leading-relaxed text-white/85">
                  Platform and AI usage: activity and cost tracking.
                </TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px] border-white/10 bg-[#161616] text-xs font-normal leading-relaxed text-white/85">
                  Everyone who's signed up for the waitlist, and the details they gave.
                </TooltipContent>
              </Tooltip>
            </TabsList>

            <TabsContent value="ai" className="mt-6">
              <AnalyticsInsights />
            </TabsContent>

            <TabsContent value="market" className="mt-6">
              <AnalyticsMarket />
            </TabsContent>

            <TabsContent value="additional" className="mt-6">
              <AnalyticsAdditional />
            </TabsContent>

            <TabsContent value="crm" className="mt-6">
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    CRM / Sales Intelligence
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                    Discover buyer prospects, qualify them with AI, and manage
                    your buyers, sellers, and leads pipeline.
                  </p>
                </div>

                <div className="inline-flex items-center rounded-md border border-white/10 bg-black/40 p-0.5">
                  {(
                    [
                      { key: 'leads', label: 'Leads' },
                      { key: 'buyers', label: 'Buyers' },
                      { key: 'sellers', label: 'Sellers' },
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

                {audienceTab === 'leads' && <AnalyticsLeads />}
                {audienceTab === 'buyers' && <CrmContacts kind="buyer" />}
                {audienceTab === 'sellers' && <AnalyticsSellers />}
              </div>
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
