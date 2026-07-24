import { useEffect, useState } from 'react';
import moment from 'moment';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  RefreshCw,
  Loader2,
  LineChart as LineIcon,
  ExternalLink,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatUsd } from '@/utils/format';
import { analyticsAPI } from '@/integrations/api/client';
import type {
  ApiCardMarketProfile,
  ApiCardMarketPoint,
  ApiCardMarketLatest,
} from '@/types/analytics-api';

/** A weighted price input, as returned in a reading's meta.components. */
interface PriceComponent {
  source: string;
  priceUsd: number | null;
  sampleSize: number | null;
  weightPct: number | null;
  kind?: string;
  url?: string | null;
  note?: string | null;
}

// Fixed categorical color per source — assigned by identity, never cycled.
const SOURCE_COLORS: Record<string, string> = {
  web: '#B4FF39',
  ebay: '#38bdf8',
  tcgplayer: '#f59e0b',
  pricecharting: '#a78bfa',
  psa: '#f472b6',
};
const SOURCE_LABELS: Record<string, string> = {
  web: 'Web research',
  ebay: 'eBay',
  tcgplayer: 'TCGplayer',
  pricecharting: 'PriceCharting',
  psa: 'PSA',
};
const colorFor = (s: string) => SOURCE_COLORS[s] ?? '#94a3b8';
const labelFor = (s: string) => SOURCE_LABELS[s] ?? s;

type Row = { ts: number; label: string; volume: number } & Record<string, number>;

/** Pivot the flat snapshot history into one row per capture time. */
function buildRows(history: ApiCardMarketPoint[]): {
  rows: Row[];
  sources: string[];
} {
  const byTs = new Map<number, Row>();
  const sources = new Set<string>();
  for (const p of history) {
    const t = new Date(p.capturedAt).getTime();
    const row =
      byTs.get(t) ??
      ({ ts: t, label: moment(p.capturedAt).format('MMM D'), volume: 0 } as Row);
    if (p.medianUsd != null) {
      row[p.source] = p.medianUsd;
      sources.add(p.source);
    }
    if (p.sampleCount) row.volume += p.sampleCount;
    byTs.set(t, row);
  }
  const rows = [...byTs.values()].sort((a, b) => a.ts - b.ts);
  return { rows, sources: [...sources] };
}

const axisTick = { fill: 'rgba(255,255,255,0.45)', fontSize: 11 };

const MoneyTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[rgba(18,18,18,0.96)] px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 text-muted-foreground">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: p.color }}
          />
          <span className="text-white/80">{labelFor(p.name)}</span>
          <span className="ml-auto font-medium text-white">
            {formatUsd(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

const CountTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[rgba(18,18,18,0.96)] px-3 py-2 text-xs shadow-lg">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium text-white">{payload[0].value} comps</div>
    </div>
  );
};

export const CardMarketProfile = ({ cardId }: { cardId: string }) => {
  const [profile, setProfile] = useState<ApiCardMarketProfile | null>(null);
  // The price reading whose provenance ("how we got this") modal is open.
  const [openReading, setOpenReading] = useState<ApiCardMarketLatest | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setProfile(null);
    analyticsAPI
      .getCardProfile(cardId)
      .then(p => active && setProfile(p))
      .catch(() => active && setProfile(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [cardId]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const p = await analyticsAPI.refreshCardProfile(cardId);
      setProfile(p);
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Refresh failed. Check the Anthropic key and try again.';
      toast.error(msg);
    } finally {
      setRefreshing(false);
    }
  };

  const header = (
    <div className="flex items-center gap-2">
      <LineIcon className="h-4 w-4 text-[#B4FF39]" />
      <span className="text-xs font-medium uppercase tracking-wide text-white/80">
        Market history
      </span>
    </div>
  );

  if (loading) {
    return (
      <div className="rounded-lg border border-white/10 bg-black/20 p-4">
        {header}
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading market data…
        </div>
      </div>
    );
  }

  const history = profile?.history ?? [];
  const { rows, sources } = buildRows(history);
  const hasPrice = rows.some(r => sources.some(s => r[s] != null));
  const hasVolume = rows.some(r => r.volume > 0);

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        {header}
        <Button
          size="sm"
          variant="ghost"
          onClick={refresh}
          disabled={refreshing}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-white"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
          />
          {refreshing ? 'Pulling…' : profile?.updatedAt ? 'Refresh' : 'Pull data'}
        </Button>
      </div>

      {/* Consensus + latest per source */}
      {profile && (profile.consensusMedianUsd != null || profile.latest.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {profile.consensusMedianUsd != null && (
            <div className="rounded-md border border-[#B4FF39]/20 bg-[#B4FF39]/[0.06] px-2.5 py-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Consensus
              </span>{' '}
              <span className="text-sm font-semibold text-white">
                {formatUsd(profile.consensusMedianUsd)}
              </span>
            </div>
          )}
          {profile.latest.map(l => {
            const estimated = l.meta?.estimated === true;
            return (
              <button
                key={l.source}
                type="button"
                onClick={() => setOpenReading(l)}
                title="See how this price was derived"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] text-white/80 transition-colors hover:border-white/25 hover:bg-white/10"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: colorFor(l.source) }}
                />
                {labelFor(l.source)}:{' '}
                <span className="font-medium underline decoration-white/20 underline-offset-2">
                  {l.medianUsd != null ? formatUsd(l.medianUsd) : '—'}
                </span>
                {estimated && (
                  <span className="rounded bg-amber-400/15 px-1 text-[9px] font-medium uppercase tracking-wide text-amber-300">
                    est
                  </span>
                )}
                <Info className="h-3 w-3 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!hasPrice && (
        <div className="rounded-md border border-white/5 bg-black/20 px-3 py-4 text-center">
          <p className="text-xs text-muted-foreground">
            No market data yet. Pull current pricing from eBay comps and live
            multi-site web research — each pull is saved so history builds over
            time.
          </p>
          <Button
            size="sm"
            onClick={refresh}
            disabled={refreshing}
            className="mt-3 bg-[#B4FF39] text-black hover:bg-[#B4FF39]/90"
          >
            {refreshing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Pulling…
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" /> Pull market data
              </>
            )}
          </Button>
        </div>
      )}

      {/* Price over time */}
      {hasPrice && (
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            Median price over time
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart
              data={rows}
              margin={{ top: 6, right: 8, bottom: 0, left: -8 }}
            >
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={axisTick}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              />
              <YAxis
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={(v: number) => `$${v >= 1000 ? `${Math.round(v / 100) / 10}k` : v}`}
              />
              <Tooltip
                content={<MoneyTooltip />}
                cursor={{ stroke: 'rgba(255,255,255,0.15)' }}
              />
              {sources.length > 1 && (
                <Legend
                  formatter={(v: string) => (
                    <span className="text-xs text-white/70">{labelFor(v)}</span>
                  )}
                />
              )}
              {sources.map(s => (
                <Line
                  key={s}
                  type="monotone"
                  dataKey={s}
                  stroke={colorFor(s)}
                  strokeWidth={2}
                  dot={{ r: 3, fill: colorFor(s), strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Comps volume over time */}
      {hasVolume && (
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            Comps per pull
          </div>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart
              data={rows}
              margin={{ top: 2, right: 8, bottom: 0, left: -8 }}
            >
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={axisTick}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              />
              <YAxis
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                width={52}
                allowDecimals={false}
              />
              <Tooltip
                content={<CountTooltip />}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Bar
                dataKey="volume"
                fill="#38bdf8"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Cited sources from the latest web read */}
      {profile?.latest
        .filter(l => l.source === 'web')
        .flatMap(l => {
          const src = (l.meta?.sources ?? []) as { title: string; url: string }[];
          return Array.isArray(src) ? src : [];
        })
        .slice(0, 6)
        .map((s, i) => (
          <a
            key={i}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mr-1.5 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/70 hover:border-white/20 hover:text-white"
          >
            <ExternalLink className="h-3 w-3" />
            {s.title || 'source'}
          </a>
        ))}

      <div className="text-[10px] text-muted-foreground">
        eBay comps + live multi-site web research. Prices are estimates, not
        financial advice.
      </div>

      <PriceProvenanceDialog
        reading={openReading}
        onClose={() => setOpenReading(null)}
      />
    </div>
  );
};

/* -------- Price provenance modal: "how we got this price" -------- */

const KIND_LABEL: Record<string, string> = {
  sold: 'Sold comp',
  listing: 'Active listing',
  guide: 'Price guide',
  analog: 'Analog (estimated)',
};

const PriceProvenanceDialog = ({
  reading,
  onClose,
}: {
  reading: ApiCardMarketLatest | null;
  onClose: () => void;
}) => {
  const meta = (reading?.meta ?? {}) as Record<string, unknown>;
  const estimated = meta.estimated === true;
  const basis = typeof meta.basis === 'string' ? meta.basis : null;
  const confidence = typeof meta.confidence === 'string' ? meta.confidence : null;
  const asOf = typeof meta.asOf === 'string' ? meta.asOf : null;
  const note = typeof meta.note === 'string' ? meta.note : null;
  const components = (
    Array.isArray(meta.components) ? meta.components : []
  ) as PriceComponent[];
  const sources = (
    Array.isArray(meta.sources) ? meta.sources : []
  ) as { title: string; url: string }[];

  return (
    <Dialog open={!!reading} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto border-white/10 bg-[rgba(18,18,18,1)]">
        {reading && (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2 text-white">
                {labelFor(reading.source)} price
                <span className="text-xl font-bold text-[#B4FF39]">
                  {reading.medianUsd != null ? formatUsd(reading.medianUsd) : '—'}
                </span>
                {estimated && (
                  <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-300">
                    estimated
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              {/* Range + meta */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {reading.lowUsd != null && reading.highUsd != null && (
                  <span>
                    Range:{' '}
                    <span className="text-white/80">
                      {formatUsd(reading.lowUsd)}–{formatUsd(reading.highUsd)}
                    </span>
                  </span>
                )}
                {reading.sampleCount != null && (
                  <span>
                    Comps seen:{' '}
                    <span className="text-white/80">{reading.sampleCount}</span>
                  </span>
                )}
                {confidence && (
                  <span>
                    Confidence:{' '}
                    <span className="text-white/80 capitalize">{confidence}</span>
                  </span>
                )}
                {asOf && (
                  <span>
                    As of <span className="text-white/80">{asOf}</span>
                  </span>
                )}
              </div>

              {/* How it was derived */}
              {basis && (
                <div className="rounded-lg border border-white/8 bg-black/30 p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <Info className="h-3.5 w-3.5" /> How this was calculated
                  </div>
                  <p className="text-[13px] leading-relaxed text-white/85">
                    {basis}
                  </p>
                </div>
              )}

              {/* Weighted component breakdown */}
              {components.length > 0 && (
                <div>
                  <div className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                    Weighted from {components.length} source
                    {components.length === 1 ? '' : 's'}
                  </div>
                  <div className="space-y-2">
                    {components.map((c, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-white/5 bg-black/30 p-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-white/90">
                            {c.url ? (
                              <a
                                href={c.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 truncate hover:text-white hover:underline"
                              >
                                {c.source}
                                <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                              </a>
                            ) : (
                              <span className="truncate">{c.source}</span>
                            )}
                            {c.kind && (
                              <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-white/50">
                                {KIND_LABEL[c.kind] ?? c.kind}
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 text-[13px] font-medium text-white">
                            {c.priceUsd != null ? formatUsd(c.priceUsd) : '—'}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                            <div
                              className="h-full rounded-full bg-[#B4FF39]/70"
                              style={{
                                width: `${Math.max(2, Math.min(100, c.weightPct ?? 0))}%`,
                              }}
                            />
                          </div>
                          <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                            {c.weightPct != null ? `${Math.round(c.weightPct)}%` : '—'}
                          </span>
                          {c.sampleSize != null && (
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {c.sampleSize} comp{c.sampleSize === 1 ? '' : 's'}
                            </span>
                          )}
                        </div>
                        {c.note && (
                          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                            {c.note}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {note && <p className="text-[12px] text-white/60">{note}</p>}

              {/* Cited sources */}
              {sources.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                    Sources
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {sources.map((s, i) => (
                      <a
                        key={i}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/70 hover:border-white/20 hover:text-white"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {s.title || 'source'}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {components.length === 0 && !basis && (
                <p className="text-[12px] text-muted-foreground">
                  This reading predates the source breakdown — refresh the market
                  data to see the full weighted provenance.
                </p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
