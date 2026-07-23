import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import moment from 'moment';
import { Responsive, WidthProvider } from 'react-grid-layout';
import type { Layout, Layouts } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Plus,
  RefreshCw,
  GripVertical,
  Settings2,
  Trash2,
  Check,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  CalendarClock,
  Flame,
  Maximize2,
} from 'lucide-react';
import { toast } from 'sonner';
import { analyticsAPI } from '@/integrations/api/client';
import type {
  ApiMarketSnapshot,
  ApiMarketCatalog,
  DashboardConfig,
  DashboardWidget,
  DashboardWidgetType,
} from '@/types/analytics-api';

const Grid = WidthProvider(Responsive);
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const COLS = { lg: 12, md: 12, sm: 6, xs: 2, xxs: 2 };

/**
 * Bump when the default dashboard meaningfully improves — saved configs from
 * older versions are replaced with the new default (user's market selection is
 * preserved).
 */
const CONFIG_VERSION = 2;

/**
 * Entity-fixed categorical palette, validated (dataviz six checks) against the
 * dark surface #161616: lightness band, chroma floor, CVD + normal-vision
 * separation, contrast. Color follows the segment, never its rank.
 */
const SEGMENT_COLORS: Record<string, string> = {
  pokemon: '#65a30d',
  sports: '#0284c7',
  one_piece: '#d97706',
  magic: '#8b5cf6',
  lorcana: '#dc2626',
  all: '#0d9488',
};
const colorFor = (s: string) => SEGMENT_COLORS[s] ?? '#94a3b8';

/** Reserved status colors (up/down/mixed) — never reused for segments. */
const STATUS_UP = '#22c55e';
const STATUS_DOWN = '#ef4444';

/** Widget types that chart a specific metric. */
const METRIC_TYPES: DashboardWidgetType[] = ['stat', 'line', 'bar'];
/** Widget types that read a single market. */
const SINGLE_SEG_TYPES: DashboardWidgetType[] = [
  'stat',
  'movers',
  'catalysts',
  'sales',
  'temperature',
  'indices',
  'brief',
];

const usd = (n: number | null | undefined) =>
  typeof n === 'number'
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(n)
    : '—';

/**
 * Fear/greed-style composite from the raw indices — heat/momentum/demand/
 * sentiment pull it up, supply pressure cools it. Returns 0-100 or null when
 * there's no data yet.
 */
function marketTemp(m: Record<string, number> | undefined): number | null {
  if (!m) return null;
  const g = (k: string) => (typeof m[k] === 'number' ? m[k] : null);
  const parts: [number, number][] = [];
  const push = (k: string, w: number) => {
    const v = g(k);
    if (v != null) parts.push([v, w]);
  };
  push('heat', 0.35);
  push('momentum', 0.25);
  push('demand', 0.2);
  push('sentiment', 0.2);
  if (parts.length === 0) return null;
  const wsum = parts.reduce((a, [, w]) => a + w, 0) || 1;
  let t = parts.reduce((a, [v, w]) => a + v * w, 0) / wsum;
  const sup = g('supply');
  if (sup != null) t -= 0.12 * (sup - 50);
  return Math.max(0, Math.min(100, Math.round(t)));
}

const TEMP_BANDS: { max: number; label: string; color: string; emoji: string }[] =
  [
    { max: 25, label: 'Cold', color: '#38bdf8', emoji: '❄️' },
    { max: 45, label: 'Cool', color: '#22d3ee', emoji: '🌤️' },
    { max: 60, label: 'Neutral', color: '#94a3b8', emoji: '😐' },
    { max: 78, label: 'Warm', color: '#f59e0b', emoji: '🔥' },
    { max: 101, label: 'Hot', color: '#B4FF39', emoji: '🚀' },
  ];
const tempBand = (t: number) =>
  TEMP_BANDS.find((b) => t < b.max) ?? TEMP_BANDS[TEMP_BANDS.length - 1];

const genId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(16).slice(2, 10);

const sizeFor = (type: DashboardWidgetType, cols: number) => {
  if (cols <= 2) {
    if (type === 'stat') return { w: cols, h: 2 };
    if (type === 'temperature') return { w: cols, h: 3 };
    if (type === 'movers' || type === 'catalysts' || type === 'sales')
      return { w: cols, h: 5 };
    if (type === 'indices' || type === 'brief') return { w: cols, h: 4 };
    return { w: cols, h: 4 };
  }
  if (type === 'stat') return { w: 3, h: 2 };
  if (type === 'temperature') return { w: 4, h: 3 };
  if (type === 'leaderboard') return { w: 4, h: 4 };
  if (type === 'indices') return { w: 4, h: 4 };
  if (type === 'brief') return { w: 4, h: 4 };
  if (type === 'movers' || type === 'catalysts' || type === 'sales')
    return { w: 4, h: 5 };
  return { w: 6, h: 4 };
};

/**
 * Build the default dashboard — what a card-market user expects per segment:
 * temperature + full index board + AI brief + movers + catalysts + headline
 * sales for the primary market, plus cross-market comparison and trends.
 */
function defaultConfig(keepSegments?: string[]): DashboardConfig {
  const segments =
    keepSegments && keepSegments.length > 0
      ? keepSegments
      : ['pokemon', 'sports', 'all'];
  const primary = segments[0] ?? 'pokemon';
  const pLabel =
    { pokemon: 'Pokémon', sports: 'Sports', one_piece: 'One Piece', magic: 'Magic', lorcana: 'Lorcana', all: 'All TCG' }[primary] ?? primary;

  const board: DashboardWidget = { id: genId(), type: 'leaderboard', title: 'Hottest markets', metric: 'heat', segments: [] };
  const temp: DashboardWidget = { id: genId(), type: 'temperature', title: `${pLabel} market temp`, metric: 'heat', segments: [primary] };
  const indices: DashboardWidget = { id: genId(), type: 'indices', title: `${pLabel} — index board`, metric: 'heat', segments: [primary] };
  const brief: DashboardWidget = { id: genId(), type: 'brief', title: `${pLabel} — AI market brief`, metric: 'heat', segments: [primary] };
  const movers: DashboardWidget = { id: genId(), type: 'movers', title: `${pLabel} — top movers`, metric: 'heat', segments: [primary] };
  const cats: DashboardWidget = { id: genId(), type: 'catalysts', title: `${pLabel} — release radar`, metric: 'heat', segments: [primary] };
  const sales: DashboardWidget = { id: genId(), type: 'sales', title: `${pLabel} — headline sales`, metric: 'heat', segments: [primary] };
  const bar: DashboardWidget = { id: genId(), type: 'bar', title: 'Market heat by segment', metric: 'heat', segments };
  const line: DashboardWidget = { id: genId(), type: 'line', title: 'Momentum over time', metric: 'momentum', segments };
  const heatLine: DashboardWidget = { id: genId(), type: 'line', title: 'Market heat over time', metric: 'heat', segments };
  const widgets = [board, temp, indices, brief, movers, cats, sales, bar, line, heatLine];
  const lg: Layout[] = [
    { i: board.id, x: 0, y: 0, w: 4, h: 4 },
    { i: temp.id, x: 4, y: 0, w: 4, h: 4 },
    { i: indices.id, x: 8, y: 0, w: 4, h: 4 },
    { i: brief.id, x: 0, y: 4, w: 8, h: 4 },
    { i: bar.id, x: 8, y: 4, w: 4, h: 4 },
    { i: movers.id, x: 0, y: 8, w: 4, h: 5 },
    { i: cats.id, x: 4, y: 8, w: 4, h: 5 },
    { i: sales.id, x: 8, y: 8, w: 4, h: 5 },
    { i: heatLine.id, x: 0, y: 13, w: 6, h: 4 },
    { i: line.id, x: 6, y: 13, w: 6, h: 4 },
  ];
  return {
    segments,
    widgets,
    layouts: { lg },
    version: CONFIG_VERSION,
  };
}

/* ---------------- Loading skeleton ---------------- */

/** Skeleton card matching the widget chrome (header bar + body). */
const WidgetSkeleton = ({
  className,
  variant = 'lines',
}: {
  className?: string;
  variant?: 'lines' | 'chart' | 'gauge';
}) => (
  <div
    className={`overflow-hidden rounded-xl border border-white/8 bg-[rgba(22,22,22,1)] ${className ?? ''}`}
  >
    <div className="flex items-center gap-1.5 border-b border-white/5 px-3 py-2">
      <Skeleton className="h-3.5 w-3.5 rounded bg-white/5" />
      <Skeleton className="h-3 w-32 rounded bg-white/5" />
    </div>
    <div className="flex h-[calc(100%-33px)] flex-col p-3">
      {variant === 'gauge' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <Skeleton className="h-[110px] w-[110px] rounded-full bg-white/5" />
          <Skeleton className="h-3 w-20 rounded bg-white/5" />
        </div>
      )}
      {variant === 'chart' && (
        <div className="flex flex-1 items-end gap-2 pb-1">
          {[55, 80, 40, 65, 30, 72, 50].map((h, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t bg-white/5"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      )}
      {variant === 'lines' && (
        <div className="flex flex-1 flex-col justify-center gap-2.5">
          {[100, 85, 92, 70, 60].map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 shrink-0 rounded-full bg-white/5" />
              <Skeleton
                className="h-3 rounded bg-white/5"
                style={{ width: `${w}%` }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

/** Full-page skeleton mirroring the controls row + default widget layout. */
const DashboardSkeleton = () => (
  <div>
    {/* Controls */}
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Skeleton className="h-3 w-14 rounded bg-white/5" />
      {[64, 56, 72, 52].map((w, i) => (
        <Skeleton key={i} className="h-6 rounded-full bg-white/5" style={{ width: w }} />
      ))}
      <div className="ml-auto flex items-center gap-2">
        <Skeleton className="h-8 w-[92px] rounded-md bg-white/5" />
        <Skeleton className="h-8 w-24 rounded-md bg-white/5" />
        <Skeleton className="h-8 w-28 rounded-md bg-white/5" />
      </div>
    </div>

    {/* Widget grid — mirrors the default lg layout (rowHeight 58, 12px gaps) */}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
      <WidgetSkeleton className="h-[268px] lg:col-span-4" variant="lines" />
      <WidgetSkeleton className="h-[268px] lg:col-span-4" variant="gauge" />
      <WidgetSkeleton className="h-[268px] lg:col-span-4" variant="lines" />
      <WidgetSkeleton className="h-[268px] sm:col-span-2 lg:col-span-8" variant="lines" />
      <WidgetSkeleton className="h-[268px] lg:col-span-4" variant="chart" />
      <WidgetSkeleton className="h-[338px] lg:col-span-4" variant="lines" />
      <WidgetSkeleton className="h-[338px] lg:col-span-4" variant="lines" />
      <WidgetSkeleton className="h-[338px] lg:col-span-4" variant="lines" />
      <WidgetSkeleton className="h-[268px] lg:col-span-6" variant="chart" />
      <WidgetSkeleton className="h-[268px] lg:col-span-6" variant="chart" />
    </div>
  </div>
);

export const MarketDashboard = () => {
  const [catalog, setCatalog] = useState<ApiMarketCatalog | null>(null);
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [latest, setLatest] = useState<Record<string, ApiMarketSnapshot>>({});
  const [series, setSeries] = useState<Record<string, ApiMarketSnapshot[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saved, setSaved] = useState(true);
  const [editor, setEditor] = useState<DashboardWidget | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  /** Widget currently shown in the fullscreen dialog. */
  const [expanded, setExpanded] = useState<DashboardWidget | null>(null);
  /**
   * RGL animates items into place on mount (widgets fly outward from the
   * origin). Transitions stay disabled (.rgl-no-anim) until after the grid's
   * first paint, then turn on for drag/resize.
   */
  const [gridAnimated, setGridAnimated] = useState(false);

  const loadedRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    const t = window.setTimeout(() => setGridAnimated(true), 250);
    return () => window.clearTimeout(t);
  }, [loading]);

  const metricLabel = useCallback(
    (k: string) => catalog?.metrics.find(m => m.key === k)?.label ?? k,
    [catalog]
  );
  const segmentLabel = useCallback(
    (k: string) => catalog?.segments.find(s => s.key === k)?.label ?? k,
    [catalog]
  );

  // Initial load: catalog + saved config + latest snapshots.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [cat, savedCfg, lat] = await Promise.all([
          analyticsAPI.getMarketCatalog(),
          analyticsAPI.getMarketDashboard().catch(() => null),
          analyticsAPI.getMarketLatest().catch(() => []),
        ]);
        if (!active) return;
        setCatalog(cat);
        // Auto-upgrade: saved configs from an older default-layout version are
        // replaced with the new richer default (market selection preserved).
        const cfg =
          savedCfg &&
          savedCfg.widgets?.length &&
          savedCfg.version === CONFIG_VERSION
            ? savedCfg
            : defaultConfig(savedCfg?.segments);
        setConfig(cfg);
        const latMap: Record<string, ApiMarketSnapshot> = {};
        for (const s of lat) latMap[s.segment] = s;
        setLatest(latMap);
      } catch {
        if (active) setConfig(defaultConfig());
      } finally {
        if (active) setLoading(false);
        setTimeout(() => (loadedRef.current = true), 300);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Fetch history for segments referenced by any line widget.
  const lineSegments = useMemo(() => {
    const set = new Set<string>();
    config?.widgets
      .filter(w => w.type === 'line')
      .forEach(w => w.segments.forEach(s => set.add(s)));
    return [...set];
  }, [config]);

  const rangeDays = config?.rangeDays ?? 0;

  useEffect(() => {
    if (lineSegments.length === 0) return;
    let active = true;
    const days = rangeDays > 0 ? rangeDays : undefined;
    Promise.all(
      lineSegments.map(s =>
        analyticsAPI.getMarketSeries(s, days).then(d => [s, d] as const).catch(() => [s, [] as ApiMarketSnapshot[]] as const)
      )
    ).then(pairs => {
      if (!active) return;
      setSeries(prev => {
        const next = { ...prev };
        for (const [s, d] of pairs) next[s] = d;
        return next;
      });
    });
    return () => {
      active = false;
    };
  }, [lineSegments.join(','), rangeDays]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced auto-save whenever the config changes (after initial load).
  useEffect(() => {
    if (!config || !loadedRef.current) return;
    setSaved(false);
    const t = setTimeout(() => {
      analyticsAPI
        .saveMarketDashboard(config)
        .then(() => setSaved(true))
        .catch(() => setSaved(false));
    }, 900);
    return () => clearTimeout(t);
  }, [config]);

  const patchConfig = (fields: Partial<DashboardConfig>) =>
    setConfig(c => (c ? { ...c, ...fields } : c));

  const onLayoutChange = (_current: Layout[], all: Layouts) => {
    if (!config) return;
    setConfig(c => (c ? { ...c, layouts: all as DashboardConfig['layouts'] } : c));
  };

  const addWidget = (w: DashboardWidget) => {
    if (!config) return;
    const widgets = [...config.widgets, w];
    const layouts: DashboardConfig['layouts'] = {};
    // Append a placement to every known breakpoint layout (RGL fills the rest).
    for (const bp of Object.keys(COLS) as (keyof typeof COLS)[]) {
      const existing = config.layouts[bp] ?? config.layouts.lg ?? [];
      const s = sizeFor(w.type, COLS[bp]);
      layouts[bp] = [
        ...existing,
        { i: w.id, x: 0, y: Infinity, w: s.w, h: s.h },
      ];
    }
    setConfig({ ...config, widgets, layouts });
  };

  const updateWidget = (w: DashboardWidget) => {
    if (!config) return;
    setConfig({
      ...config,
      widgets: config.widgets.map(x => (x.id === w.id ? w : x)),
    });
  };

  const removeWidget = (id: string) => {
    if (!config) return;
    const layouts: DashboardConfig['layouts'] = {};
    for (const bp of Object.keys(config.layouts))
      layouts[bp] = (config.layouts[bp] ?? []).filter(l => l.i !== id);
    setConfig({
      ...config,
      widgets: config.widgets.filter(w => w.id !== id),
      layouts,
    });
  };

  const refreshMarkets = async () => {
    if (!config || refreshing) return;
    setRefreshing(true);
    try {
      const results = await Promise.all(
        config.segments.map(s =>
          analyticsAPI.refreshMarket(s).then(
            snap => [s, snap] as const,
            () => [s, null] as const
          )
        )
      );
      const latMap = { ...latest };
      for (const [s, snap] of results) if (snap) latMap[s] = snap;
      setLatest(latMap);
      // Re-pull series for line widgets so new points show.
      const segs = lineSegments;
      const days = rangeDays > 0 ? rangeDays : undefined;
      const pairs = await Promise.all(
        segs.map(s => analyticsAPI.getMarketSeries(s, days).then(d => [s, d] as const).catch(() => [s, [] as ApiMarketSnapshot[]] as const))
      );
      setSeries(prev => {
        const next = { ...prev };
        for (const [s, d] of pairs) next[s] = d;
        return next;
      });
      toast.success('Market data refreshed');
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Refresh failed. Check the Anthropic key.';
      toast.error(msg);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading || !config || !catalog) {
    return <DashboardSkeleton />;
  }

  const hasData = Object.keys(latest).length > 0;

  return (
    <div>
      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground mr-1">
          Markets
        </span>
        {catalog.segments.map(s => {
          const on = config.segments.includes(s.key);
          return (
            <button
              key={s.key}
              type="button"
              onClick={() =>
                patchConfig({
                  segments: on
                    ? config.segments.filter(x => x !== s.key)
                    : [...config.segments, s.key],
                })
              }
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                on
                  ? 'border-transparent text-white'
                  : 'border-white/10 bg-black/30 text-white/70 hover:bg-white/5'
              }`}
              style={on ? { background: colorFor(s.key) } : undefined}
            >
              {s.label}
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            {saved ? (
              <>
                <Check className="h-3 w-3 text-[#B4FF39]" /> Saved
              </>
            ) : (
              'Saving…'
            )}
          </span>
          <Select
            value={String(rangeDays)}
            onValueChange={v => patchConfig({ rangeDays: parseInt(v, 10) })}
          >
            <SelectTrigger className="h-8 w-[92px] bg-black/40 border-white/10 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
              <SelectItem value="0">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditor(null);
              setEditorOpen(true);
            }}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" /> Add widget
          </Button>
          <Button
            size="sm"
            onClick={refreshMarkets}
            disabled={refreshing || config.segments.length === 0}
            className="h-8 gap-1.5 bg-[#B4FF39] text-black hover:bg-[#B4FF39]/90"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Researching…' : 'Refresh data'}
          </Button>
        </div>
      </div>

      {!hasData && (
        <div className="mb-4 rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-center text-xs text-muted-foreground">
          No market data yet. Pick your markets above and hit{' '}
          <span className="text-white/80">Refresh data</span> — Claude researches
          each segment live (~30–60s) and every pull is saved so trends build
          over time.
        </div>
      )}

      <Grid
        className={gridAnimated ? 'layout' : 'layout rgl-no-anim'}
        measureBeforeMount
        layouts={config.layouts as unknown as Layouts}
        breakpoints={BREAKPOINTS}
        cols={COLS}
        rowHeight={58}
        margin={[12, 12]}
        draggableHandle=".widget-drag"
        onLayoutChange={onLayoutChange}
        isBounded
      >
        {config.widgets.map(w => (
          <div
            key={w.id}
            className="overflow-hidden rounded-xl border border-white/8 bg-[rgba(22,22,22,1)]"
          >
            <div className="flex items-center gap-1.5 border-b border-white/5 px-3 py-1.5">
              <span className="widget-drag flex cursor-move items-center text-muted-foreground/60 hover:text-white/80">
                <GripVertical className="h-3.5 w-3.5" />
              </span>
              <span className="flex-1 truncate text-xs font-medium text-white/85">
                {w.title}
              </span>
              <button
                type="button"
                onClick={() => setExpanded(w)}
                className="text-muted-foreground/60 hover:text-white"
                aria-label="Expand"
                title="Expand"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditor(w);
                  setEditorOpen(true);
                }}
                className="text-muted-foreground/60 hover:text-white"
              >
                <Settings2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => removeWidget(w.id)}
                className="text-muted-foreground/60 hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="h-[calc(100%-33px)] p-3">
              <WidgetBody
                widget={w}
                latest={latest}
                series={series}
                metricLabel={metricLabel}
                segmentLabel={segmentLabel}
              />
            </div>
          </div>
        ))}
      </Grid>

      <WidgetEditorDialog
        open={editorOpen}
        widget={editor}
        catalog={catalog}
        defaultSegments={config.segments}
        onClose={() => setEditorOpen(false)}
        onSave={w => {
          if (editor) updateWidget(w);
          else addWidget(w);
          setEditorOpen(false);
        }}
      />

      {/* Fullscreen widget view — same body, room to breathe. */}
      <Dialog open={!!expanded} onOpenChange={o => !o && setExpanded(null)}>
        <DialogContent className="flex h-[92dvh] w-[96vw] max-w-[1400px] flex-col border-white/10 bg-[rgba(18,18,18,1)] p-4 sm:p-6">
          {expanded && (
            <>
              <DialogHeader className="shrink-0">
                <DialogTitle className="text-base text-white">
                  {expanded.title}
                </DialogTitle>
              </DialogHeader>
              <div className="min-h-0 flex-1">
                <WidgetBody
                  widget={expanded}
                  latest={latest}
                  series={series}
                  metricLabel={metricLabel}
                  segmentLabel={segmentLabel}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ---------------- Widget body ---------------- */

const WidgetBody = ({
  widget,
  latest,
  series,
  metricLabel,
  segmentLabel,
}: {
  widget: DashboardWidget;
  latest: Record<string, ApiMarketSnapshot>;
  series: Record<string, ApiMarketSnapshot[]>;
  metricLabel: (k: string) => string;
  segmentLabel: (k: string) => string;
}) => {
  const axisTick = { fill: 'rgba(255,255,255,0.45)', fontSize: 11 };

  if (widget.type === 'stat') {
    const seg = widget.segments[0];
    const snap = seg ? latest[seg] : undefined;
    const val = snap?.metrics?.[widget.metric];
    return (
      <div className="flex h-full flex-col justify-center">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: colorFor(seg) }}
          />
          {segmentLabel(seg)} · {metricLabel(widget.metric)}
        </div>
        <div className="text-4xl font-bold leading-tight text-white">
          {typeof val === 'number' ? val : '—'}
          {typeof val === 'number' && (
            <span className="ml-1 text-base font-normal text-muted-foreground">
              /100
            </span>
          )}
        </div>
        {snap && (
          <div className="mt-1 text-[10px] text-muted-foreground">
            as of {moment(snap.capturedAt).fromNow()}
          </div>
        )}
      </div>
    );
  }

  if (widget.type === 'indices') {
    return (
      <IndicesBody
        seg={widget.segments[0]}
        snap={latest[widget.segments[0]]}
        metricLabel={metricLabel}
      />
    );
  }
  if (widget.type === 'brief') {
    return <BriefBody snap={latest[widget.segments[0]]} />;
  }

  if (widget.type === 'temperature') {
    return (
      <TemperatureBody
        seg={widget.segments[0]}
        snap={latest[widget.segments[0]]}
        segmentLabel={segmentLabel}
      />
    );
  }
  if (widget.type === 'leaderboard') {
    return <LeaderboardBody latest={latest} segmentLabel={segmentLabel} />;
  }
  if (widget.type === 'movers') {
    return <MoversBody snap={latest[widget.segments[0]]} />;
  }
  if (widget.type === 'catalysts') {
    return <CatalystsBody snap={latest[widget.segments[0]]} />;
  }
  if (widget.type === 'sales') {
    return <SalesBody snap={latest[widget.segments[0]]} />;
  }

  if (widget.type === 'bar') {
    const data = widget.segments.map(s => ({
      name: segmentLabel(s),
      seg: s,
      value: latest[s]?.metrics?.[widget.metric] ?? 0,
    }));
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 6, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="name" tick={axisTick} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
          <YAxis domain={[0, 100]} tick={axisTick} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            contentStyle={{
              background: 'rgba(18,18,18,0.96)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar
            dataKey="value"
            radius={[4, 4, 0, 0]}
            maxBarSize={44}
            isAnimationActive={false}
          >
            {data.map(d => (
              <Cell key={d.seg} fill={colorFor(d.seg)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // line
  const map = new Map<string, Record<string, number | string>>();
  for (const s of widget.segments) {
    for (const snap of series[s] ?? []) {
      const row =
        map.get(snap.capturedAt) ??
        ({ t: snap.capturedAt, label: moment(snap.capturedAt).format('MMM D') } as Record<
          string,
          number | string
        >);
      const v = snap.metrics?.[widget.metric];
      if (typeof v === 'number') row[s] = v;
      map.set(snap.capturedAt, row);
    }
  }
  const rows = [...map.values()].sort(
    (a, b) => new Date(a.t as string).getTime() - new Date(b.t as string).getTime()
  );
  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-center text-[11px] text-muted-foreground">
        No history yet — refresh a couple of times to build a trend.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          minTickGap={32}
          interval="preserveStartEnd"
        />
        <YAxis domain={[0, 100]} tick={axisTick} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            background: 'rgba(18,18,18,0.96)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        {widget.segments.length > 1 && (
          <Legend
            iconType="circle"
            iconSize={7}
            wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}
          />
        )}
        {widget.segments.map(s => (
          <Line
            key={s}
            type="monotone"
            dataKey={s}
            name={segmentLabel(s)}
            stroke={colorFor(s)}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

/* ---------------- New widget bodies ---------------- */

const Empty = ({ text }: { text: string }) => (
  <div className="flex h-full items-center justify-center px-2 text-center text-[11px] text-muted-foreground">
    {text}
  </div>
);

const AsOf = ({ at }: { at: string }) => (
  <div className="mt-1 shrink-0 text-[10px] text-muted-foreground">
    as of {moment(at).fromNow()}
  </div>
);

/**
 * Full index board for one market — every 0-100 index as a labeled bar.
 * Single-hue (the segment's color) since the job is magnitude, not identity.
 */
const IndicesBody = ({
  seg,
  snap,
  metricLabel,
}: {
  seg: string;
  snap: ApiMarketSnapshot | undefined;
  metricLabel: (k: string) => string;
}) => {
  const metrics = snap?.metrics;
  if (!metrics) return <Empty text="No data yet — refresh this market." />;
  const rows = Object.entries(metrics).filter(
    (e): e is [string, number] => typeof e[1] === 'number',
  );
  if (rows.length === 0)
    return <Empty text="No indices yet — refresh this market." />;
  const c = colorFor(seg);
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col justify-center gap-1.5 overflow-y-auto pr-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center gap-2">
            <span className="w-[110px] shrink-0 truncate text-[11px] text-white/75">
              {metricLabel(k)}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(2, Math.min(100, v))}%`, background: c }}
              />
            </div>
            <span className="w-7 shrink-0 text-right text-xs font-semibold tabular-nums text-white">
              {Math.round(v)}
            </span>
          </div>
        ))}
      </div>
      {snap && <AsOf at={snap.capturedAt} />}
    </div>
  );
};

/** AI market brief — the analyst summary + highlights from the last refresh. */
const BriefBody = ({ snap }: { snap: ApiMarketSnapshot | undefined }) => {
  if (!snap || (!snap.summary && !(snap.highlights ?? []).length))
    return <Empty text="No brief yet — refresh this market." />;
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {snap.summary && (
          <p className="text-xs leading-relaxed text-white/85">{snap.summary}</p>
        )}
        {(snap.highlights ?? []).length > 0 && (
          <ul className="space-y-1">
            {(snap.highlights ?? []).map((h, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] leading-snug text-white/70">
                <Flame className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                {h}
              </li>
            ))}
          </ul>
        )}
        {(snap.sources ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {(snap.sources ?? []).slice(0, 4).map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/60 hover:text-white"
              >
                <ExternalLink className="h-2.5 w-2.5" />
                {s.title || 'source'}
              </a>
            ))}
          </div>
        )}
      </div>
      <AsOf at={snap.capturedAt} />
    </div>
  );
};

/** Fear/greed-style donut gauge for one market. */
const TemperatureBody = ({
  seg,
  snap,
  segmentLabel,
}: {
  seg: string;
  snap: ApiMarketSnapshot | undefined;
  segmentLabel: (k: string) => string;
}) => {
  const t = marketTemp(snap?.metrics);
  if (t == null) return <Empty text="No data yet — refresh this market." />;
  const band = tempBand(t);
  const C = 2 * Math.PI * 52;
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="relative h-[120px] w-[120px] max-h-full">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={band.color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - t / 100)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-bold leading-none text-white">{t}</div>
          <div className="text-[10px] text-muted-foreground">/ 100</div>
        </div>
      </div>
      <div className="mt-1 text-sm font-semibold" style={{ color: band.color }}>
        {band.emoji} {band.label}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {segmentLabel(seg)} market temp
      </div>
      {snap && <AsOf at={snap.capturedAt} />}
    </div>
  );
};

/** Ranks every market that has data by temperature. */
const LeaderboardBody = ({
  latest,
  segmentLabel,
}: {
  latest: Record<string, ApiMarketSnapshot>;
  segmentLabel: (k: string) => string;
}) => {
  const rows = Object.values(latest)
    .map((s) => ({ seg: s.segment, temp: marketTemp(s.metrics) }))
    .filter((r): r is { seg: string; temp: number } => r.temp != null)
    .sort((a, b) => b.temp - a.temp);
  if (rows.length === 0)
    return <Empty text="Refresh a few markets to rank them." />;
  return (
    <div className="flex h-full flex-col gap-1.5 overflow-y-auto pr-1">
      {rows.map((r, i) => {
        const band = tempBand(r.temp);
        return (
          <div key={r.seg} className="flex items-center gap-2">
            <span className="w-4 text-center text-xs font-semibold text-muted-foreground">
              {i + 1}
            </span>
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: colorFor(r.seg) }}
            />
            <span className="w-20 shrink-0 truncate text-xs text-white/85">
              {segmentLabel(r.seg)}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full"
                style={{ width: `${r.temp}%`, background: band.color }}
              />
            </div>
            <span className="w-7 shrink-0 text-right text-xs font-semibold tabular-nums text-white">
              {r.temp}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/** Top gainers & faders for one market. */
const MoversBody = ({ snap }: { snap: ApiMarketSnapshot | undefined }) => {
  const movers = snap?.movers ?? [];
  if (movers.length === 0)
    return <Empty text="No movers yet — refresh this market." />;
  return (
    <div className="flex h-full flex-col gap-1 overflow-y-auto pr-1">
      {movers.map((m, i) => {
        const up = m.direction !== 'down';
        const c = up ? STATUS_UP : STATUS_DOWN;
        return (
          <a
            key={i}
            href={m.url ?? undefined}
            target={m.url ? '_blank' : undefined}
            rel="noreferrer"
            className={`flex items-start gap-2 rounded-md px-1.5 py-1 ${
              m.url ? 'hover:bg-white/5' : ''
            }`}
          >
            {up ? (
              <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: c }} />
            ) : (
              <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: c }} />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-xs font-medium text-white/90">
                  {m.card}
                </span>
                {m.changePct != null && (
                  <span className="shrink-0 text-xs font-semibold tabular-nums" style={{ color: c }}>
                    {m.changePct > 0 ? '+' : ''}
                    {Math.round(m.changePct)}%
                  </span>
                )}
                {m.url && <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />}
              </div>
              {m.note && (
                <div className="truncate text-[11px] text-muted-foreground">
                  {m.note}
                </div>
              )}
            </div>
          </a>
        );
      })}
    </div>
  );
};

const IMPACT_COLOR: Record<string, string> = {
  up: STATUS_UP,
  down: STATUS_DOWN,
  mixed: '#f59e0b',
};

/** Upcoming catalysts / release radar for one market. */
const CatalystsBody = ({ snap }: { snap: ApiMarketSnapshot | undefined }) => {
  const cats = snap?.catalysts ?? [];
  if (cats.length === 0)
    return <Empty text="No upcoming catalysts found — refresh this market." />;
  return (
    <div className="flex h-full flex-col gap-1.5 overflow-y-auto pr-1">
      {cats.map((c, i) => {
        const ic = c.impact ? IMPACT_COLOR[c.impact] ?? '#94a3b8' : '#94a3b8';
        return (
          <div key={i} className="flex items-start gap-2 rounded-md px-1.5 py-1">
            <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-xs font-medium text-white/90">
                  {c.title}
                </span>
                {c.impact && (
                  <span
                    className="shrink-0 rounded px-1 text-[10px] font-semibold uppercase"
                    style={{ color: ic, background: `${ic}22` }}
                  >
                    {c.impact}
                  </span>
                )}
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                {[c.timeframe, c.note].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** Notable recent headline sales for one market. */
const SalesBody = ({ snap }: { snap: ApiMarketSnapshot | undefined }) => {
  const sales = snap?.sales ?? [];
  if (sales.length === 0)
    return <Empty text="No headline sales yet — refresh this market." />;
  return (
    <div className="flex h-full flex-col gap-1 overflow-y-auto pr-1">
      {sales.map((s, i) => (
        <a
          key={i}
          href={s.url ?? undefined}
          target={s.url ? '_blank' : undefined}
          rel="noreferrer"
          className={`flex items-center gap-2 rounded-md px-1.5 py-1 ${
            s.url ? 'hover:bg-white/5' : ''
          }`}
        >
          <Flame className="h-3.5 w-3.5 shrink-0 text-[#f59e0b]" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium text-white/90">
              {s.card}
            </div>
            <div className="truncate text-[11px] text-muted-foreground">
              {[s.grade, s.venue, s.soldAt].filter(Boolean).join(' · ')}
            </div>
          </div>
          <span className="shrink-0 text-sm font-semibold text-[#B4FF39] tabular-nums">
            {usd(s.priceUsd)}
          </span>
        </a>
      ))}
    </div>
  );
};

/* ---------------- Widget editor ---------------- */

const WidgetEditorDialog = ({
  open,
  widget,
  catalog,
  defaultSegments,
  onClose,
  onSave,
}: {
  open: boolean;
  widget: DashboardWidget | null;
  catalog: ApiMarketCatalog;
  defaultSegments: string[];
  onClose: () => void;
  onSave: (w: DashboardWidget) => void;
}) => {
  const [type, setType] = useState<DashboardWidgetType>('stat');
  const [title, setTitle] = useState('');
  const [metric, setMetric] = useState(catalog.metrics[0]?.key ?? 'heat');
  const [segments, setSegments] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    if (widget) {
      setType(widget.type);
      setTitle(widget.title);
      setMetric(widget.metric);
      setSegments(widget.segments);
    } else {
      setType('stat');
      setMetric(catalog.metrics[0]?.key ?? 'heat');
      const seg = defaultSegments.length ? [defaultSegments[0]] : ['pokemon'];
      setSegments(seg);
      setTitle('');
    }
  }, [open, widget, catalog, defaultSegments]);

  const needsMetric = METRIC_TYPES.includes(type);
  const noSegment = type === 'leaderboard';
  const single = SINGLE_SEG_TYPES.includes(type);
  const toggleSeg = (k: string) => {
    if (single) {
      setSegments([k]);
      return;
    }
    setSegments(s => (s.includes(k) ? s.filter(x => x !== k) : [...s, k]));
  };

  const save = () => {
    const segs = segments.length
      ? segments
      : [defaultSegments[0] ?? 'pokemon'];
    const metricLabel =
      catalog.metrics.find(m => m.key === metric)?.label ?? metric;
    const segLabel =
      catalog.segments.find(s => s.key === segs[0])?.label ?? segs[0];
    let autoTitle: string;
    switch (type) {
      case 'movers':
        autoTitle = `${segLabel} — top movers`;
        break;
      case 'catalysts':
        autoTitle = `${segLabel} — release radar`;
        break;
      case 'sales':
        autoTitle = `${segLabel} — headline sales`;
        break;
      case 'temperature':
        autoTitle = `${segLabel} market temp`;
        break;
      case 'indices':
        autoTitle = `${segLabel} — index board`;
        break;
      case 'brief':
        autoTitle = `${segLabel} — AI market brief`;
        break;
      case 'leaderboard':
        autoTitle = 'Hottest markets';
        break;
      case 'stat':
        autoTitle = `${segLabel} ${metricLabel.toLowerCase()}`;
        break;
      case 'bar':
        autoTitle = `${metricLabel} by segment`;
        break;
      default:
        autoTitle = `${metricLabel} over time`;
    }
    onSave({
      id: widget?.id ?? genId(),
      type,
      title: title.trim() || autoTitle,
      metric,
      segments: noSegment ? [] : single ? [segs[0]] : segs,
    });
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="bg-[rgba(18,18,18,1)] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            {widget ? 'Edit widget' : 'Add widget'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Chart type</label>
            <Select value={type} onValueChange={v => setType(v as DashboardWidgetType)}>
              <SelectTrigger className="h-9 bg-black/40 border-white/10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="movers">Top movers (gainers &amp; faders)</SelectItem>
                <SelectItem value="catalysts">Release radar (upcoming)</SelectItem>
                <SelectItem value="sales">Headline sales</SelectItem>
                <SelectItem value="temperature">Market temperature (gauge)</SelectItem>
                <SelectItem value="indices">Index board (all metrics)</SelectItem>
                <SelectItem value="brief">AI market brief (summary)</SelectItem>
                <SelectItem value="leaderboard">Hottest-market leaderboard</SelectItem>
                <SelectItem value="stat">Stat (latest value)</SelectItem>
                <SelectItem value="bar">Bar (compare markets)</SelectItem>
                <SelectItem value="line">Line (trend over time)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {needsMetric && (
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Metric</label>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger className="h-9 bg-black/40 border-white/10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {catalog.metrics.map(m => (
                    <SelectItem key={m.key} value={m.key}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!noSegment && (
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                {single ? 'Market' : 'Markets'}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {catalog.segments.map(s => {
                  const on = segments.includes(s.key);
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => toggleSeg(s.key)}
                      className={`rounded-full border px-2.5 py-1 text-xs ${
                        on
                          ? 'border-transparent text-black'
                          : 'border-white/10 bg-black/30 text-white/70'
                      }`}
                      style={on ? { background: colorFor(s.key) } : undefined}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Title (optional)
            </label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Auto from metric + market"
              className="h-9 bg-black/40 border-white/10 text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={save}
            className="bg-[#B4FF39] text-black hover:bg-[#B4FF39]/90"
          >
            {widget ? 'Save' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
