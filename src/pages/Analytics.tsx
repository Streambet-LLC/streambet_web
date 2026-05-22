import { Navigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { AnalyticsUsersList } from '@/components/analytics/AnalyticsUsersList';
import { AnalyticsUserDetail } from '@/components/analytics/AnalyticsUserDetail';
import { Badge } from '@/components/ui/badge';

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
  const [tab, setTab] = useState<'overview' | 'profiles'>(userId ? 'profiles' : 'overview');

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
        <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-8 pb-16">
        {/* Page header */}
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-white">Analytics</h1>
              <Badge
                variant="outline"
                className="bg-[#B4FF39]/10 text-[#B4FF39] border-[#B4FF39]/30"
              >
                Admin Preview
              </Badge>
              <Badge
                variant="outline"
                className="bg-white/5 text-muted-foreground border-white/10"
              >
                Mock Data
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Unified collector intelligence — purchase propensity, payment-percentile predictions,
              and cross-platform identity confidence built from public eBay, Instagram, X, TikTok,
              and Facebook signals.
            </p>
          </div>
        </div>

        {/* If a userId is in the URL, render detail directly */}
        {userId ? (
          <AnalyticsUserDetail />
        ) : (
          <Tabs value={tab} onValueChange={v => setTab(v as 'overview' | 'profiles')}>
            <TabsList className="bg-[rgba(22,22,22,1)] border border-white/5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="profiles">Profiles</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <AnalyticsDashboard />
            </TabsContent>

            <TabsContent value="profiles" className="mt-6">
              <AnalyticsUsersList />
            </TabsContent>
          </Tabs>
        )}
        </div>
      </main>
    </div>
  );
};

export default Analytics;
