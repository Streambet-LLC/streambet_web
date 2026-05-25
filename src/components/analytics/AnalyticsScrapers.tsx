import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Pause,
  RefreshCw,
  Server,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  MOCK_SCRAPERS,
  platformLabel,
  scraperStatusLabel,
  type ScraperPipeline,
  type ScraperStatus,
} from '@/mocks/analytics';
import { PlatformIcon } from './AnalyticsBadges';
import { cn } from '@/lib/utils';
import { useDemoTicker } from '@/hooks/useDemoTicker';

// ---------------------------------------------------------------------------
// Styling helpers
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<
  ScraperStatus,
  { badge: string; dot: string; icon: React.ComponentType<{ className?: string }>; chart: string }
> = {
  running: {
    badge: 'bg-[#B4FF39]/15 text-[#B4FF39] border-[#B4FF39]/30',
    dot: 'bg-[#B4FF39] shadow-[0_0_8px_rgba(180,255,57,0.7)]',
    icon: CheckCircle2,
    chart: '#B4FF39',
  },
  idle: {
    badge: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    dot: 'bg-slate-400',
    icon: Clock,
    chart: '#94A3B8',
  },
  degraded: {
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]',
    icon: AlertTriangle,
    chart: '#FBBF24',
  },
  error: {
    badge: 'bg-red-500/15 text-red-300 border-red-500/30',
    dot: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]',
    icon: XCircle,
    chart: '#EF4444',
  },
  paused: {
    badge: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
    dot: 'bg-zinc-400',
    icon: Pause,
    chart: '#71717A',
  },
};

const STATUS_ORDER: ScraperStatus[] = ['running', 'idle', 'paused', 'degraded', 'error'];

const formatRelative = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const past = diffMs >= 0;
  const abs = Math.abs(diffMs);
  const mins = Math.round(abs / 60_000);
  const tail = past ? 'ago' : 'from now';
  if (mins < 1) return past ? 'just now' : 'in <1m';
  if (mins < 60) return `${mins}m ${tail}`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ${tail}`;
  const days = Math.round(hours / 24);
  return `${days}d ${tail}`;
};

const formatCount = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const SummaryCard = ({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'default' | 'good' | 'warn' | 'bad';
}) => {
  const toneClass =
    tone === 'good'
      ? 'text-[#B4FF39] bg-[#B4FF39]/10'
      : tone === 'warn'
      ? 'text-amber-300 bg-amber-500/10'
      : tone === 'bad'
      ? 'text-red-300 bg-red-500/10'
      : 'text-[#B4FF39] bg-[#B4FF39]/10';
  return (
    <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
          <div className="text-2xl font-semibold mt-2 text-white">{value}</div>
          {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
        </div>
        <div className={cn('rounded-lg p-2', toneClass)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
};

const StatusBadge = ({ status }: { status: ScraperStatus }) => {
  const s = STATUS_STYLES[status];
  return (
    <Badge variant="outline" className={cn('gap-1.5 font-medium', s.badge)}>
      <span className={cn('inline-block h-1.5 w-1.5 rounded-full', s.dot)} />
      {scraperStatusLabel(status)}
    </Badge>
  );
};

const Sparkline = ({ data, color }: { data: { hour: string; count: number }[]; color: string }) => (
  <ResponsiveContainer width="100%" height={60}>
    <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.5} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <Area
        type="monotone"
        dataKey="count"
        stroke={color}
        strokeWidth={1.5}
        fill={`url(#grad-${color.replace('#', '')})`}
        isAnimationActive={false}
      />
    </AreaChart>
  </ResponsiveContainer>
);

const ScraperCard = ({ s, pulse = false }: { s: ScraperPipeline; pulse?: boolean }) => {
  const style = STATUS_STYLES[s.status];
  const hasErrors = s.recentErrors.length > 0;

  return (
    <Card
      className={cn(
        'bg-[rgba(22,22,22,1)] border-white/5 p-5 flex flex-col gap-4 transition-colors',
        pulse && 'border-[#B4FF39]/50 shadow-[0_0_0_1px_rgba(180,255,57,0.3)]',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="rounded-lg bg-white/5 p-2 shrink-0">
            <PlatformIcon platform={s.platform} className="h-5 w-5 text-white/80" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate">{s.name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {platformLabel(s.platform)} · {s.strategy.replace('_', ' ')} · {s.region}
            </div>
          </div>
        </div>
        <StatusBadge status={s.status} />
      </div>

      {/* Sparkline */}
      <div>
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>Throughput · last 24h</span>
          <span className="text-white/80 font-medium">{formatCount(s.itemsScraped24h)}</span>
        </div>
        <Sparkline data={s.throughput24h} color={style.chart} />
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-md bg-black/30 border border-white/5 p-2.5">
          <div className="text-muted-foreground">Success (24h)</div>
          <div
            className={cn(
              'mt-1 font-semibold',
              s.successRate24h >= 95
                ? 'text-[#B4FF39]'
                : s.successRate24h >= 80
                ? 'text-amber-300'
                : 'text-red-300',
            )}
          >
            {s.successRate24h.toFixed(1)}%
          </div>
        </div>
        <div className="rounded-md bg-black/30 border border-white/5 p-2.5">
          <div className="text-muted-foreground">Avg latency</div>
          <div className="mt-1 font-semibold text-white">
            {s.avgLatencyMs === 0 ? '—' : `${s.avgLatencyMs} ms`}
          </div>
        </div>
        <div className="rounded-md bg-black/30 border border-white/5 p-2.5">
          <div className="text-muted-foreground">Queue depth</div>
          <div className="mt-1 font-semibold text-white">{s.queueDepth.toLocaleString()}</div>
        </div>
        <div className="rounded-md bg-black/30 border border-white/5 p-2.5">
          <div className="text-muted-foreground">Rotations (24h)</div>
          <div className="mt-1 font-semibold text-white">{s.rotations24h}</div>
        </div>
      </div>

      {/* Timing */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Last run <span className="text-white/80">{formatRelative(s.lastRunAt)}</span>
        </span>
        <span>
          Next <span className="text-white/80">{formatRelative(s.nextRunAt)}</span>
        </span>
        <span className="hidden sm:inline">{s.schedule}</span>
      </div>

      {/* Errors / note */}
      {hasErrors && (
        <div className="rounded-md border border-red-500/20 bg-red-500/5 p-2.5 text-xs space-y-1.5">
          {s.recentErrors.slice(0, 2).map((e, i) => (
            <div key={i} className="flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-red-300 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-red-300">{e.code}</span>
                  <span className="text-muted-foreground">×{e.count}</span>
                  <span className="text-muted-foreground ml-auto">{formatRelative(e.at)}</span>
                </div>
                <div className="text-white/80 truncate">{e.message}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {s.note && !hasErrors && (
        <div className="text-xs text-muted-foreground italic">{s.note}</div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 mt-auto">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-white/10 bg-white/5 hover:bg-white/10"
          disabled
        >
          <RefreshCw className="h-3 w-3 mr-1.5" />
          Run now
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-white/10 bg-white/5 hover:bg-white/10"
          disabled
        >
          {s.status === 'paused' ? (
            <>
              <Zap className="h-3 w-3 mr-1.5" /> Resume
            </>
          ) : (
            <>
              <Pause className="h-3 w-3 mr-1.5" /> Pause
            </>
          )}
        </Button>
        <span className="ml-auto text-[10px] text-muted-foreground/70 uppercase tracking-wide">
          {s.kind.replace('_', ' ')}
        </span>
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const STATUS_FILTERS: { value: ScraperStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'running', label: 'Running' },
  { value: 'degraded', label: 'Degraded' },
  { value: 'error', label: 'Error' },
  { value: 'paused', label: 'Paused' },
  { value: 'idle', label: 'Idle' },
];

export const AnalyticsScrapers = () => {
  const [filter, setFilter] = useState<ScraperStatus | 'all'>('all');
  const [scrapers, setScrapers] = useState<ScraperPipeline[]>(MOCK_SCRAPERS);
  const [pulsedId, setPulsedId] = useState<string | null>(null);

  useDemoTicker(
    () => {
      // Pick a random running pipeline and bump its counters.
      const runningOnes = scrapers.filter(s => s.status === 'running');
      if (runningOnes.length === 0) return;
      const target = runningOnes[Math.floor(Math.random() * runningOnes.length)];
      const bump = 1 + Math.floor(Math.random() * 6);
      setScrapers(prev =>
        prev.map(s =>
          s.id === target.id
            ? {
                ...s,
                itemsScraped24h: s.itemsScraped24h + bump,
                itemsScrapedTotal: s.itemsScrapedTotal + bump,
                lastRunAt: new Date().toISOString(),
              }
            : s,
        ),
      );
      setPulsedId(target.id);
      setTimeout(() => setPulsedId(prev => (prev === target.id ? null : prev)), 1600);
    },
    { minMs: 4000, maxMs: 9000 },
  );

  const summary = useMemo(() => {
    const total = scrapers.length;
    const running = scrapers.filter(s => s.status === 'running').length;
    const degraded = scrapers.filter(s => s.status === 'degraded').length;
    const errors = scrapers.filter(s => s.status === 'error').length;
    const items24h = scrapers.reduce((a, s) => a + s.itemsScraped24h, 0);
    const itemsTotal = scrapers.reduce((a, s) => a + s.itemsScrapedTotal, 0);
    const queue = scrapers.reduce((a, s) => a + s.queueDepth, 0);
    const avgSuccess =
      scrapers.filter(s => s.status !== 'paused').reduce((a, s) => a + s.successRate24h, 0) /
      Math.max(1, scrapers.filter(s => s.status !== 'paused').length);
    return { total, running, degraded, errors, items24h, itemsTotal, queue, avgSuccess };
  }, [scrapers]);

  const filtered = useMemo(() => {
    const list = filter === 'all' ? scrapers : scrapers.filter(s => s.status === filter);
    return [...list].sort(
      (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
    );
  }, [filter, scrapers]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: scrapers.length };
    for (const s of scrapers) map[s.status] = (map[s.status] ?? 0) + 1;
    return map;
  }, [scrapers]);

  return (
    <div className="space-y-6">
      {/* Top summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard
          label="Active Pipelines"
          value={`${summary.running}/${summary.total}`}
          hint={`${summary.degraded} degraded · ${summary.errors} error`}
          icon={Server}
          tone={summary.errors + summary.degraded === 0 ? 'good' : 'warn'}
        />
        <SummaryCard
          label="Items Scraped (24h)"
          value={formatCount(summary.items24h)}
          hint={`${formatCount(summary.itemsTotal)} lifetime`}
          icon={Database}
        />
        <SummaryCard
          label="Avg Success Rate"
          value={`${summary.avgSuccess.toFixed(1)}%`}
          hint="Across non-paused workers"
          icon={Activity}
          tone={summary.avgSuccess >= 95 ? 'good' : summary.avgSuccess >= 85 ? 'warn' : 'bad'}
        />
        <SummaryCard
          label="Queue Depth"
          value={summary.queue.toLocaleString()}
          hint="Pending jobs across pools"
          icon={Clock}
        />
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_FILTERS.map(f => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition',
                active
                  ? 'border-[#B4FF39]/40 bg-[#B4FF39]/10 text-[#B4FF39]'
                  : 'border-white/10 bg-white/5 text-muted-foreground hover:text-white hover:border-white/20',
              )}
            >
              {f.value !== 'all' && (
                <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_STYLES[f.value].dot)} />
              )}
              {f.label}
              <span className="text-[10px] opacity-70">{counts[f.value] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(s => (
          <ScraperCard key={s.id} s={s} pulse={s.id === pulsedId} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-sm text-muted-foreground py-12">
          No pipelines match this filter.
        </div>
      )}
    </div>
  );
};
