import { Navigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { AnalyticsUsersList } from '@/components/analytics/AnalyticsUsersList';
import { AnalyticsUserDetail } from '@/components/analytics/AnalyticsUserDetail';
import { AnalyticsInsights } from '@/components/analytics/AnalyticsInsights';
import { AnalyticsSellers } from '@/components/analytics/AnalyticsSellers';
import { AnalyticsScrapers } from '@/components/analytics/AnalyticsScrapers';
import { useRealDataOnly } from '@/hooks/useRealDataOnly';

/**
 * Admin-only Analytics homebase.
 *
 * Route is gated to admins. The mock dataset is intentionally hard-coded
 * (see [src/mocks/analytics.ts](src/mocks/analytics.ts)) so this demo
 * showcases the UI/UX before backend wiring lands.
 */
const Analytics = () => {
  const { session, isLoading, isFetching } = useAuthContext();
  const { userId } = useParams<{ userId?: string }>();
  const [tab, setTab] = useState<
    'overview' | 'profiles' | 'sellers' | 'insights' | 'scrapers'
  >(userId ? 'profiles' : 'overview');
  const [realOnly, setRealOnly] = useRealDataOnly();

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
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-white">Analytics</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Unified collector intelligence — purchase propensity, payment-percentile predictions,
              and cross-platform identity confidence built from public eBay, Instagram, X, TikTok,
              and Facebook signals.
            </p>
          </div>
          {/* Global toggle: hides every mock-derived field across all tabs. */}
          <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-[rgba(22,22,22,1)] px-4 py-2">
            <Switch
              id="analytics-real-only"
              checked={realOnly}
              onCheckedChange={setRealOnly}
            />
            <Label
              htmlFor="analytics-real-only"
              className="text-xs text-muted-foreground cursor-pointer select-none"
            >
              {realOnly ? 'Showing real CardCade data only' : 'Show real data only (hide mocks)'}
            </Label>
          </div>
        </div>

        {/* If a userId is in the URL, render detail directly */}
        {userId ? (
          <AnalyticsUserDetail />
        ) : (
          <Tabs
            value={tab === 'scrapers' && realOnly ? 'overview' : tab}
            onValueChange={v =>
              setTab(
                v as
                  | 'overview'
                  | 'profiles'
                  | 'sellers'
                  | 'insights'
                  | 'scrapers',
              )
            }
          >
            <TabsList className="bg-[rgba(22,22,22,1)] border border-white/5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="profiles">Profiles</TabsTrigger>
              <TabsTrigger value="sellers">Sellers</TabsTrigger>
              <TabsTrigger value="insights" className="gap-1.5">
                Insights
              </TabsTrigger>
              {!realOnly && <TabsTrigger value="scrapers">Scrapers</TabsTrigger>}
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <AnalyticsDashboard />
            </TabsContent>

            <TabsContent value="profiles" className="mt-6">
              <AnalyticsUsersList />
            </TabsContent>

            <TabsContent value="sellers" className="mt-6">
              <AnalyticsSellers />
            </TabsContent>

            <TabsContent value="insights" className="mt-6">
              <AnalyticsInsights />
            </TabsContent>

            {!realOnly && (
              <TabsContent value="scrapers" className="mt-6">
                <AnalyticsScrapers />
              </TabsContent>
            )}
          </Tabs>
        )}
        </div>
      </main>
    </div>
  );
};

export default Analytics;
