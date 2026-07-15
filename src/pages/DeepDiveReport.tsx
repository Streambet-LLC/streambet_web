import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import moment from 'moment';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Navigation } from '@/components/Navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Loader2,
  ExternalLink,
  Telescope,
  TrendingUp,
  History,
  Layers,
  AlertTriangle,
  Target,
  Users,
  Star,
} from 'lucide-react';
import { analyticsAPI } from '@/integrations/api/client';
import type { ApiDeepResearchJob, ApiCardForecast } from '@/types/analytics-api';

const OUTLOOK_COLOR: Record<string, string> = {
  Bullish: '#B4FF39',
  Neutral: '#9ca3af',
  Bearish: '#f87171',
};
const BUZZ_COLOR: Record<string, string> = {
  High: '#B4FF39',
  Medium: '#fbbf24',
  Low: '#9ca3af',
};
const UP = '#B4FF39';
const DOWN = '#f87171';

const TRAJ_COLOR: Record<string, string> = {
  Rising: '#B4FF39',
  Stable: '#9ca3af',
  Falling: '#f87171',
};

const magVal = (m: string) =>
  m === 'large' ? 3 : m === 'small' ? 1 : 2;
const dirColor = (d: string) => (d === 'down' ? DOWN : UP);
const clamp = (n: number) => Math.max(0, Math.min(100, n));
const ratingColor = (score: number) =>
  score >= 70 ? '#B4FF39' : score >= 45 ? '#fbbf24' : '#f87171';

/** A titled report card. */
const Section = ({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) => (
  <section className="rounded-xl border border-white/8 bg-[rgba(22,22,22,1)] p-4 sm:p-5">
    <div className="mb-3 flex items-center gap-2">
      <span className="text-[#B4FF39]">{icon}</span>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-white/80">
        {title}
      </h2>
    </div>
    {children}
  </section>
);

const ScenarioTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: { name: string; x: number; mag: string; dir: string } }[];
}) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="max-w-xs rounded-lg border border-white/10 bg-[rgba(18,18,18,0.96)] px-3 py-2 text-xs shadow-lg">
      <div className="mb-0.5 font-medium text-white">{p.name}</div>
      <div className="text-muted-foreground">
        {p.x}% likely · {p.mag} · {p.dir === 'down' ? 'downside' : 'upside'}
      </div>
    </div>
  );
};

const ReportBody = ({
  job,
}: {
  job: ApiDeepResearchJob & { result: ApiCardForecast };
}) => {
  const f = job.result;
  const outlookColor = OUTLOOK_COLOR[f.outlook] ?? OUTLOOK_COLOR.Neutral;

  const upPts = (f.catalysts ?? [])
    .filter(c => c.direction !== 'down')
    .map(c => ({ x: c.probabilityPct, y: magVal(c.magnitude), z: 1, name: c.event, mag: c.magnitude, dir: 'up' }));
  const downPts = (f.catalysts ?? [])
    .filter(c => c.direction === 'down')
    .map(c => ({ x: c.probabilityPct, y: magVal(c.magnitude), z: 1, name: c.event, mag: c.magnitude, dir: 'down' }));

  return (
    <div className="space-y-4">
      {/* Hero */}
      <section
        className="rounded-xl border p-5"
        style={{
          borderColor: `${outlookColor}33`,
          background: `${outlookColor}0d`,
        }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Badge
            variant="outline"
            className="text-sm font-semibold"
            style={{
              borderColor: `${outlookColor}66`,
              color: outlookColor,
              background: `${outlookColor}1a`,
            }}
          >
            {f.outlook}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {f.horizon} horizon
          </span>
        </div>

        {/* Confidence meter */}
        <div className="mt-4 max-w-md">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Confidence</span>
            <span className="font-medium text-white">{f.confidence}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(0, Math.min(100, f.confidence))}%`,
                background: outlookColor,
              }}
            />
          </div>
        </div>

        {/* Rating / liquidity / trajectory */}
        {(f.rating || f.liquidity || f.priceTrajectory) && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {f.rating && (
              <div className="rounded-lg border border-white/8 bg-black/30 p-3">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <Star className="h-3 w-3" /> Our rating
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span
                    className="text-2xl font-bold"
                    style={{ color: ratingColor(f.rating.score) }}
                  >
                    {f.rating.score}
                  </span>
                  <span className="text-xs text-white/70">
                    /100 · {f.rating.label}
                  </span>
                </div>
                {f.rating.rationale && (
                  <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    {f.rating.rationale}
                  </div>
                )}
              </div>
            )}
            {f.liquidity && (
              <div className="rounded-lg border border-white/8 bg-black/30 p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Liquidity
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-white">
                    {f.liquidity.score}
                  </span>
                  <span className="text-xs text-white/70">
                    /100 · {f.liquidity.level}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[#38bdf8]"
                    style={{ width: `${clamp(f.liquidity.score)}%` }}
                  />
                </div>
              </div>
            )}
            {f.priceTrajectory && (
              <div className="rounded-lg border border-white/8 bg-black/30 p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Price trajectory
                </div>
                <div
                  className="text-lg font-semibold"
                  style={{
                    color: TRAJ_COLOR[f.priceTrajectory.direction] ?? '#fff',
                  }}
                >
                  {f.priceTrajectory.direction}
                </div>
                {f.priceTrajectory.note && (
                  <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    {f.priceTrajectory.note}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <p className="mt-4 text-[15px] leading-relaxed text-white/90">
          {f.thesis}
        </p>
      </section>

      {/* Social buzz */}
      {f.socialBuzz && (
        <Section icon={<TrendingUp className="h-4 w-4" />} title="Social buzz">
          <div className="flex items-start gap-3">
            <Badge
              variant="outline"
              className="shrink-0 text-[11px] font-medium"
              style={{
                borderColor: `${BUZZ_COLOR[f.socialBuzz.level] ?? '#9ca3af'}55`,
                color: BUZZ_COLOR[f.socialBuzz.level] ?? '#9ca3af',
                background: `${BUZZ_COLOR[f.socialBuzz.level] ?? '#9ca3af'}14`,
              }}
            >
              {f.socialBuzz.level}
            </Badge>
            <p className="text-sm leading-relaxed text-white/80">
              {f.socialBuzz.summary}
            </p>
          </div>
        </Section>
      )}

      {/* Likely buyers */}
      {f.likelyBuyers && (
        <Section icon={<Users className="h-4 w-4" />} title="Likely buyers">
          <p className="text-sm leading-relaxed text-white/80">
            {f.likelyBuyers.profile}
          </p>
          {f.likelyBuyers.archetypes?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {f.likelyBuyers.archetypes.map((a, i) => (
                <span
                  key={i}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-white/75"
                >
                  {a}
                </span>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Scenario matrix + catalysts */}
      {f.catalysts?.length > 0 && (
        <Section
          icon={<Target className="h-4 w-4" />}
          title="Catalysts & scenarios"
        >
          {/* Probability × impact matrix */}
          {f.catalysts.length > 1 && (
            <div className="mb-4">
              <div className="mb-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: UP }} />
                  Upside
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: DOWN }} />
                  Downside
                </span>
                <span className="ml-auto">probability × impact</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: -6 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tickFormatter={(v: number) => `${v}%`}
                    tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    domain={[0.5, 3.5]}
                    ticks={[1, 2, 3]}
                    tickFormatter={(v: number) =>
                      v === 3 ? 'Large' : v === 1 ? 'Small' : 'Moderate'
                    }
                    tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={64}
                  />
                  <ZAxis type="number" dataKey="z" range={[80, 80]} />
                  <Tooltip
                    content={<ScenarioTooltip />}
                    cursor={{ stroke: 'rgba(255,255,255,0.15)' }}
                  />
                  <Scatter data={upPts} fill={UP} fillOpacity={0.85} />
                  <Scatter data={downPts} fill={DOWN} fillOpacity={0.85} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Catalyst rows with probability bars */}
          <div className="space-y-2">
            {f.catalysts.map((c, i) => {
              const color = dirColor(c.direction);
              return (
                <div
                  key={i}
                  className="rounded-lg border border-white/5 bg-black/30 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-white">
                      {c.event}
                    </span>
                    <span
                      className="flex shrink-0 items-center gap-1 text-xs font-medium"
                      style={{ color }}
                    >
                      {c.direction === 'down' ? (
                        <ArrowDown className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowUp className="h-3.5 w-3.5" />
                      )}
                      {c.magnitude}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(0, Math.min(100, c.probabilityPct))}%`,
                          background: color,
                        }}
                      />
                    </div>
                    <span className="w-9 shrink-0 text-right text-xs text-muted-foreground">
                      {c.probabilityPct}%
                    </span>
                  </div>
                  {c.note && (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {c.note}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Precedents */}
      {f.precedents?.length > 0 && (
        <Section
          icon={<History className="h-4 w-4" />}
          title="Historical precedents"
        >
          <div className="space-y-2.5">
            {f.precedents.map((p, i) => (
              <div key={i} className="border-l-2 border-white/10 pl-3">
                <div className="text-sm font-medium text-white/90">
                  {p.comparable}
                </div>
                <div className="text-xs leading-relaxed text-muted-foreground">
                  {p.outcome}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Macro factors */}
      {f.macroFactors?.length > 0 && (
        <Section icon={<Layers className="h-4 w-4" />} title="Macro factors">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {f.macroFactors.map((m, i) => (
              <div
                key={i}
                className="rounded-lg border border-white/5 bg-black/30 p-3"
              >
                <div className="text-sm font-medium text-white/90">
                  {m.factor}
                </div>
                <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {m.note}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Risks */}
      {f.risks?.length > 0 && (
        <Section
          icon={<AlertTriangle className="h-4 w-4" />}
          title="Risks"
        >
          <div className="space-y-2">
            {f.risks.map((r, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400/80" />
                <div>
                  <span className="text-sm text-white/90">{r.risk}</span>
                  <span className="text-xs text-muted-foreground"> — {r.note}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Suggested action */}
      {f.suggestedAction && (
        <section className="rounded-xl border border-[#B4FF39]/25 bg-[#B4FF39]/[0.06] p-4 sm:p-5">
          <div className="mb-1.5 flex items-center gap-2">
            <Target className="h-4 w-4 text-[#B4FF39]" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#B4FF39]">
              Suggested action
            </h2>
          </div>
          <p className="text-[15px] leading-relaxed text-white/90">
            {f.suggestedAction}
          </p>
        </section>
      )}

      {/* Sources */}
      {f.sources?.length > 0 && (
        <Section
          icon={<ExternalLink className="h-4 w-4" />}
          title="Sources"
        >
          <div className="flex flex-wrap gap-1.5">
            {f.sources.map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/75 hover:border-white/20 hover:text-white"
              >
                <ExternalLink className="h-3 w-3" />
                {s.title || 'source'}
              </a>
            ))}
          </div>
        </Section>
      )}

      <p className="pt-1 text-center text-[11px] text-muted-foreground">
        AI/market estimate synthesized from live web research — not financial
        advice.
      </p>
    </div>
  );
};

const DeepDiveReport = () => {
  const { session, isLoading, isFetching } = useAuthContext();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<ApiDeepResearchJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    const load = async () => {
      try {
        const j = await analyticsAPI.getDeepResearch(id);
        if (!active) return;
        if (!j) setNotFound(true);
        else setJob(j);
      } catch {
        if (active) setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    // Poll while still researching.
    const t = window.setInterval(() => {
      if (job && (job.status === 'done' || job.status === 'error')) return;
      load();
    }, 4000);
    return () => {
      active = false;
      window.clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, job?.status]);

  if (isLoading || isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!session) return <Navigate to="/login?redirect=/analytics" replace />;
  if (session.role !== 'admin') return <Navigate to="/" replace />;

  const active = job?.status === 'pending' || job?.status === 'running';

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="h-[calc(100dvh-64px)] overflow-auto">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 py-6 md:py-8 pb-16">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-4 -ml-2 h-8 px-2 text-muted-foreground hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          <div className="mb-5 flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#B4FF39]/15 text-[#B4FF39]">
              <Telescope className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold text-white break-words">
                {job?.subject ?? 'Deep dive'}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Deep dive{' '}
                {job?.completedAt
                  ? `· ${moment(job.completedAt).fromNow()}`
                  : job
                    ? `· ${moment(job.createdAt).fromNow()}`
                    : ''}
              </p>
            </div>
          </div>

          {loading && !job ? (
            <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : notFound ? (
            <div className="rounded-xl border border-white/8 bg-[rgba(22,22,22,1)] p-8 text-center text-sm text-muted-foreground">
              This deep dive could not be found.
            </div>
          ) : active ? (
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-8 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-amber-300" />
              <p className="mt-3 text-sm text-white/80">
                Researching across the web…
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                This usually takes about a minute. This page updates
                automatically.
              </p>
            </div>
          ) : job?.status === 'error' ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/[0.05] p-6 text-sm text-red-300">
              This deep dive failed: {job.error ?? 'unknown error'}
            </div>
          ) : job?.result ? (
            <ReportBody
              job={job as ApiDeepResearchJob & { result: ApiCardForecast }}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
};

export default DeepDiveReport;
