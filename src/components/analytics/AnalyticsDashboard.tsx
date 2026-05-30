import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { MOCK_ANALYTICS_OVERVIEW, formatUsd, categoryLabel } from '@/mocks/analytics';
import { CategoryBadge } from './AnalyticsBadges';
import { Users, Link2, TrendingUp, Sparkles } from 'lucide-react';
import { useDemoTicker } from '@/hooks/useDemoTicker';
import { useCollectorAnalyticsOverview } from '@/hooks/useCollectorAnalytics';
import { useIsRealDataOnly } from '@/hooks/useRealDataOnly';
import { toast } from 'sonner';

const CATEGORY_PIE_COLORS = ['#FACC15', '#EF4444', '#3B82F6', '#94A3B8'];

const StatCard = ({
  label,
  value,
  hint,
  icon: Icon,
  pulse = false,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  pulse?: boolean;
}) => (
  <Card
    className={`bg-[rgba(22,22,22,1)] border-white/5 p-6 transition-colors ${
      pulse ? 'border-[#B4FF39]/50 shadow-[0_0_0_1px_rgba(180,255,57,0.3)]' : ''
    }`}
  >
    <div className="flex items-start justify-between">
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className={`text-2xl font-semibold mt-2 ${pulse ? 'text-[#B4FF39]' : 'text-white'}`}>
          {value}
        </div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </div>
      <div className="rounded-lg bg-[#B4FF39]/10 p-2">
        <Icon className="h-4 w-4 text-[#B4FF39]" />
      </div>
    </div>
  </Card>
);

const ChartCard = ({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <Card className={`bg-[rgba(22,22,22,1)] border-white/5 p-6 ${className}`}>
    <div className="mb-4">
      <div className="text-sm font-medium text-white">{title}</div>
      {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
    </div>
    {children}
  </Card>
);

/**
 * Loading shell shown while the real `/admin/analytics/collectors/overview`
 * payload is in flight. Mirrors the live dashboard layout (stat row + two
 * chart rows + table) so the page doesn't jump when data resolves.
 */
const AnalyticsDashboardSkeleton = ({ realOnly }: { realOnly: boolean }) => {
  const statCount = realOnly ? 2 : 4;
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: statCount }).map((_, i) => (
          <Card key={i} className="bg-[rgba(22,22,22,1)] border-white/5 p-6">
            <Skeleton className="h-3 w-24 bg-white/10" />
            <Skeleton className="h-7 w-32 mt-3 bg-white/10" />
            <Skeleton className="h-3 w-40 mt-2 bg-white/5" />
          </Card>
        ))}
      </div>

      <div className={`grid grid-cols-1 ${realOnly ? '' : 'lg:grid-cols-3'} gap-4`}>
        <Card
          className={`bg-[rgba(22,22,22,1)] border-white/5 p-6 ${realOnly ? '' : 'lg:col-span-2'}`}
        >
          <Skeleton className="h-4 w-48 bg-white/10" />
          <Skeleton className="h-3 w-32 mt-2 bg-white/5" />
          <Skeleton className="h-[260px] w-full mt-4 bg-white/5" />
        </Card>
        {!realOnly && (
          <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-6">
            <Skeleton className="h-4 w-56 bg-white/10" />
            <Skeleton className="h-3 w-40 mt-2 bg-white/5" />
            <Skeleton className="h-[260px] w-full mt-4 bg-white/5" />
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-6">
          <Skeleton className="h-4 w-40 bg-white/10" />
          <Skeleton className="h-3 w-48 mt-2 bg-white/5" />
          <Skeleton className="h-[240px] w-full mt-4 bg-white/5 rounded-full" />
        </Card>
        <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-6 lg:col-span-2">
          <Skeleton className="h-4 w-48 bg-white/10" />
          <Skeleton className="h-3 w-56 mt-2 bg-white/5" />
          <div className="space-y-3 mt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full bg-white/5" />
            ))}
          </div>
        </Card>
      </div>

      <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-6">
        <Skeleton className="h-4 w-56 bg-white/10" />
        <Skeleton className="h-3 w-72 mt-2 bg-white/5" />
        <div className="space-y-2 mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full bg-white/5" />
          ))}
        </div>
      </Card>
    </div>
  );
};

export const AnalyticsDashboard = () => {
  // Real CardCade data (buy/sell + categories) gets merged onto the mock
  // overview shell so the demo-only fields (personas, confidence buckets,
  // etc.) keep rendering while real signals replace the rest.
  const { data: overview, isLoading } = useCollectorAnalyticsOverview();
  const realOnly = useIsRealDataOnly();

  // While the real overview is in flight we don't want to flash mock
  // numbers on screen — especially in real-data-only mode, where the
  // dashboard otherwise renders confidently wrong stats. Show skeletons
  // until the API resolves; mock mode falls back to the in-memory mock
  // overview so the demo keeps its existing instant-render behavior.
  const showSkeleton = isLoading && !overview;
  const o = overview ?? MOCK_ANALYTICS_OVERVIEW;

  const [totalProfiles, setTotalProfiles] = useState(o.totalProfiles);
  const [linkedIdentities, setLinkedIdentities] = useState(o.unifiedIdentitiesLinked);
  const [predictedSpend, setPredictedSpend] = useState(o.predicted30dSpendUsd);
  const [pulseKey, setPulseKey] = useState<string | null>(null);

  // Re-sync the demo-ticker counters whenever a fresh overview arrives, so
  // the real backend numbers replace the mock seed values.
  useEffect(() => {
    if (!overview) return;
    setTotalProfiles(overview.totalProfiles);
    setPredictedSpend(overview.predicted30dSpendUsd);
    // unifiedIdentitiesLinked is still mock-derived; leave as-is.
  }, [overview]);

  const flash = (key: string) => {
    setPulseKey(key);
    setTimeout(() => setPulseKey(prev => (prev === key ? null : prev)), 1800);
  };

  useDemoTicker(
    () => {
      if (realOnly) return; // No fake "discovery" pings when showing real data only.
      const roll = Math.random();
      if (roll < 0.4) {
        const bump = 1 + Math.floor(Math.random() * 3);
        setTotalProfiles(p => p + bump);
        flash('profiles');
        toast.success(`${bump} new profile${bump > 1 ? 's' : ''} discovered`, {
          description: 'Scraper picked up fresh handles across IG + TikTok',
        });
      } else if (roll < 0.75) {
        setLinkedIdentities(p => p + 1);
        flash('linked');
        const samples = [
          '@kantograils ↔ @kanto.grails',
          '@thrifted.tcg ↔ thriftedtcg',
          '@vintage_holos ↔ vintageholos_yt',
          '@cardhoarder ↔ cardhoarder.eth',
        ];
        toast.success('New unified identity linked', {
          description: samples[Math.floor(Math.random() * samples.length)],
        });
      } else {
        const bump = Math.round(800 + Math.random() * 4200);
        setPredictedSpend(p => p + bump);
        flash('spend');
      }
    },
    { minMs: 9000, maxMs: 18000 }
  );

  if (showSkeleton) {
    return <AnalyticsDashboardSkeleton realOnly={realOnly} />;
  }

  return (
    <div className="space-y-6">
      {/* Top stat row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Unified Profiles"
          value={totalProfiles.toLocaleString()}
          hint={realOnly ? 'CardCade accounts' : 'Across CardCade + scraped sources'}
          icon={Users}
          pulse={pulseKey === 'profiles'}
        />
        {!realOnly && (
          <StatCard
            label="Linked Identities"
            value={linkedIdentities.toLocaleString()}
            hint={`Avg confidence ${o.avgIdentityConfidence}%`}
            icon={Link2}
            pulse={pulseKey === 'linked'}
          />
        )}
        <StatCard
          label={realOnly ? '30-Day Spend' : 'Predicted 30-Day Spend'}
          value={formatUsd(predictedSpend)}
          hint={realOnly ? 'Paid orders, last 30 days' : 'Sum of model forecasts'}
          icon={TrendingUp}
          pulse={pulseKey === 'spend'}
        />
        {!realOnly && o.confidenceDistribution.length >= 5 && (
          <StatCard
            label="High-Intent Buyers"
            value={(
              o.confidenceDistribution[3].count + o.confidenceDistribution[4].count
            ).toLocaleString()}
            hint="Confidence ≥ 76%"
            icon={Sparkles}
          />
        )}
      </div>

      {/* Spend trend + Confidence dist */}
      <div className={`grid grid-cols-1 ${realOnly ? '' : 'lg:grid-cols-3'} gap-4`}>
        <ChartCard
          title={realOnly ? 'Weekly Spend' : 'Predicted vs. Actual Spend'}
          subtitle="Last 12 weeks · USD (thousands)"
          className={realOnly ? '' : 'lg:col-span-2'}
        >
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={o.spendTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="week" stroke="#ffffff60" fontSize={12} />
              <YAxis stroke="#ffffff60" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: '#0A0A0A',
                  border: '1px solid #ffffff20',
                  borderRadius: 8,
                  fontSize: 12,
                  color: '#ffffff',
                }}
                labelStyle={{ color: '#ffffff' }}
                itemStyle={{ color: '#ffffff' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {realOnly ? (
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#B4FF39"
                  strokeWidth={2}
                  dot={false}
                  name="Spend"
                />
              ) : (
                <>
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#B4FF39"
                    strokeWidth={2}
                    dot={false}
                    name="Predicted"
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#60A5FA"
                    strokeWidth={2}
                    dot={false}
                    name="Actual"
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {!realOnly && (
          <ChartCard
            title="Identity Confidence Distribution"
            subtitle="Linked accounts by match confidence"
          >
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={o.confidenceDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="bucket" stroke="#ffffff60" fontSize={12} />
                <YAxis stroke="#ffffff60" fontSize={12} />
                <Tooltip
                  cursor={{ fill: '#ffffff08' }}
                  contentStyle={{
                    background: '#0A0A0A',
                    border: '1px solid #ffffff20',
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#ffffff',
                  }}
                  labelStyle={{ color: '#ffffff' }}
                  itemStyle={{ color: '#ffffff' }}
                />
                <Bar dataKey="count" fill="#B4FF39" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {/* Category affinity + Top personas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          title="Category Affinity"
          subtitle={
            realOnly
              ? 'Real spend share by category · last 30 days'
              : 'Predicted spend share by category'
          }
        >
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={o.categoryAffinity}
                dataKey="predictedSpendUsd"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
              >
                {o.categoryAffinity.map((_, i) => (
                  <Cell key={i} fill={CATEGORY_PIE_COLORS[i % CATEGORY_PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#0A0A0A',
                  border: '1px solid #ffffff20',
                  borderRadius: 8,
                  fontSize: 12,
                  color: '#ffffff',
                }}
                labelStyle={{ color: '#ffffff' }}
                itemStyle={{ color: '#ffffff' }}
                formatter={(value: number) => formatUsd(value)}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title={realOnly ? 'Top Selling Assets' : 'Top Predicted Assets'}
          subtitle={
            realOnly
              ? 'Most purchased prizes · last 30 days'
              : 'Highest forecast spend over next 30 days'
          }
          className="lg:col-span-2"
        >
          <div className="space-y-3">
            {o.topAssets.map(a => (
              <div
                key={a.assetId}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-black/30 p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CategoryBadge category={a.category} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">{a.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.predictedBuyers.toLocaleString()}{' '}
                      {realOnly ? 'buyers' : 'predicted buyers'}
                      {!realOnly && ` · avg ${a.avgBuyLikelihood}% intent`}
                    </div>
                  </div>
                </div>
                <div className="text-right pl-4 shrink-0">
                  <div className="text-sm font-semibold text-[#B4FF39]">
                    {formatUsd(a.totalPredictedSpendUsd)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {realOnly ? 'revenue' : 'forecast'}
                  </div>
                </div>
              </div>
            ))}
            {o.topAssets.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-6">
                No paid orders in the last 30 days.
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Personas (mock-only) */}
      {!realOnly && (
        <ChartCard title="Collector Personas" subtitle="Inferred from purchase + social behavior">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {o.topPersonas.map(p => (
              <div key={p.persona} className="rounded-lg border border-white/5 bg-black/30 p-3">
                <div className="text-xs text-muted-foreground">{p.persona}</div>
                <div className="text-lg font-semibold text-white mt-1">
                  {p.count.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      {/* Category roll-up table */}
      <ChartCard
        title={realOnly ? 'Category Spend Detail' : 'Category Forecast Detail'}
        subtitle={
          realOnly
            ? 'Buyers + real spend per category · last 30 days'
            : 'Users + predicted spend per category'
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground border-b border-white/5">
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">{realOnly ? 'Buyers (30d)' : 'Active Profiles'}</th>
                <th className="py-2 pr-4">
                  {realOnly ? '30-Day Spend' : 'Predicted 30-Day Spend'}
                </th>
                <th className="py-2 pr-4">Avg Spend / User</th>
              </tr>
            </thead>
            <tbody>
              {o.categoryAffinity.map(c => (
                <tr key={c.category} className="border-b border-white/5 last:border-0">
                  <td className="py-3 pr-4">
                    <CategoryBadge category={c.category} />
                  </td>
                  <td className="py-3 pr-4 text-white">{c.userCount.toLocaleString()}</td>
                  <td className="py-3 pr-4 text-[#B4FF39] font-medium">
                    {formatUsd(c.predictedSpendUsd)}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {c.userCount > 0 ? formatUsd(c.predictedSpendUsd / c.userCount) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* keep categoryLabel referenced so tree-shake doesn't drop the helper export */}
        <div className="sr-only">{categoryLabel('pokemon')}</div>
      </ChartCard>
    </div>
  );
};
