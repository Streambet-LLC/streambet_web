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
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Loader2,
  GripVertical,
  Settings2,
  Trash2,
  Check,
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

const SEGMENT_COLORS: Record<string, string> = {
  pokemon: '#B4FF39',
  sports: '#38bdf8',
  one_piece: '#f59e0b',
  magic: '#a78bfa',
  lorcana: '#f472b6',
  all: '#e5e7eb',
};
const colorFor = (s: string) => SEGMENT_COLORS[s] ?? '#94a3b8';

const genId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(16).slice(2, 10);

const sizeFor = (type: DashboardWidgetType, cols: number) => {
  if (cols <= 2) return { w: cols, h: type === 'stat' ? 2 : 4 };
  if (type === 'stat') return { w: 3, h: 2 };
  return { w: 6, h: 4 };
};

/** Build a default dashboard when the admin has none saved. */
function defaultConfig(): DashboardConfig {
  const widgets: DashboardWidget[] = [
    { id: genId(), type: 'stat', title: 'Pokémon heat', metric: 'heat', segments: ['pokemon'] },
    { id: genId(), type: 'stat', title: 'Sports heat', metric: 'heat', segments: ['sports'] },
    { id: genId(), type: 'bar', title: 'Market heat by segment', metric: 'heat', segments: ['pokemon', 'sports', 'all'] },
    { id: genId(), type: 'line', title: 'Momentum over time', metric: 'momentum', segments: ['pokemon', 'sports', 'all'] },
  ];
  const lg: Layout[] = [
    { i: widgets[0].id, x: 0, y: 0, w: 3, h: 2 },
    { i: widgets[1].id, x: 3, y: 0, w: 3, h: 2 },
    { i: widgets[2].id, x: 0, y: 2, w: 6, h: 4 },
    { i: widgets[3].id, x: 6, y: 2, w: 6, h: 4 },
  ];
  return {
    segments: ['pokemon', 'sports', 'all'],
    widgets,
    layouts: { lg },
  };
}

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

  const loadedRef = useRef(false);

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
        const cfg =
          savedCfg && savedCfg.widgets?.length ? savedCfg : defaultConfig();
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
        analyticsAPI.getMarketSeries(s, days).then(d => [s, d] as const).catch(() => [s, []] as const)
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
        segs.map(s => analyticsAPI.getMarketSeries(s, days).then(d => [s, d] as const).catch(() => [s, []] as const))
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
    return (
      <div className="flex items-center gap-2 py-16 justify-center text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading dashboard…
      </div>
    );
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
                  ? 'border-transparent text-black'
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
        className="layout"
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
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {segmentLabel(seg)} · {metricLabel(widget.metric)}
        </div>
        <div
          className="text-4xl font-bold leading-tight"
          style={{ color: colorFor(seg) }}
        >
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
          <Bar dataKey="value" radius={[3, 3, 0, 0]} isAnimationActive={false}>
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
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
        <YAxis domain={[0, 100]} tick={axisTick} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            background: 'rgba(18,18,18,0.96)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        {widget.segments.map(s => (
          <Line
            key={s}
            type="monotone"
            dataKey={s}
            name={segmentLabel(s)}
            stroke={colorFor(s)}
            strokeWidth={2}
            dot={{ r: 2.5, fill: colorFor(s), strokeWidth: 0 }}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
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

  const single = type === 'stat';
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
    const autoTitle = single
      ? `${catalog.segments.find(s => s.key === segs[0])?.label ?? segs[0]} ${metricLabel.toLowerCase()}`
      : `${metricLabel}${type === 'bar' ? ' by segment' : ' over time'}`;
    onSave({
      id: widget?.id ?? genId(),
      type,
      title: title.trim() || autoTitle,
      metric,
      segments: single ? [segs[0]] : segs,
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
                <SelectItem value="stat">Stat (latest value)</SelectItem>
                <SelectItem value="bar">Bar (compare markets)</SelectItem>
                <SelectItem value="line">Line (trend over time)</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
