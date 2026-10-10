import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import moment from 'moment';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Radar,
  RefreshCw,
  Loader2,
  Eye,
  Plus,
  Check,
  ExternalLink,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { InfoTip, TermTip } from './InfoTip';
import { marketHeatAPI } from '@/integrations/api/client';
import type {
  ApiRadarDiscovery,
  ApiRadarItem,
  ApiSpikeKey,
  ApiSpikeRadar,
  ApiSpikeSignal,
} from '@/types/analytics-api';

const errMsg = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

const pct = (n: number) =>
  n > 999 ? '>+999%' : `${n >= 0 ? '+' : ''}${n.toFixed(Math.abs(n) < 10 ? 1 : 0)}%`;
const money = (n: number | null | undefined) =>
  n == null ? '—' : `$${n < 100 ? n.toFixed(2) : Math.round(n).toLocaleString()}`;

/** How each spike signal reads, in plain English. */
const SIGNAL: Record<ApiSpikeKey, { label: (s: ApiSpikeSignal) => string; tip: string }> = {
  floor: {
    label: s => `Floor ${pct(s.value)}`,
    tip: 'The floor (the 10th-percentile asking price) vs about a day ago. When buyers clear a card out, the floor moves first.',
  },
  sweep: {
    label: s => `${Math.round(s.value)}% of cheapest copies gone`,
    tip: 'Of the 10 cheapest copies listed about a day ago, how many are gone now. It only counts when the cheap end is clearing faster than everything else.',
  },
  supply: {
    label: s => `Listings ${pct(s.value)}`,
    tip: 'Live listings vs about a day ago. Supply draining away runs hot.',
  },
  sellThrough: {
    label: s => `${Math.round(s.value)}% sold or pulled`,
    tip: "Of the listings live about a day ago, the share that's gone now.",
  },
  price: {
    label: s => `Asks ${pct(s.value)}`,
    tip: 'The median asking price vs about a day ago.',
  },
  buzz: {
    label: s =>
      `Buzz ${Math.round(s.value)}${s.typical != null ? ` (usually ${Math.round(s.typical)})` : ''}`,
    tip: 'Recent mentions on Reddit, YouTube and Bluesky.',
  },
  tracking: {
    label: s => `${Math.round(s.value)} adds this week`,
    tip: 'People on our platform adding these cards to a portfolio or watchlist.',
  },
};

const scoreColor = (n: number | null) =>
  n == null ? '#6b7280' : n >= 60 ? '#B4FF39' : n >= 30 ? '#fbbf24' : '#9ca3af';

/** One signal as a chip: lime when it's firing, muted when it's just notable. */
const SignalChip = ({ s }: { s: ApiSpikeSignal }) => (
  <TermTip
    className="no-underline"
    tip={
      <>
        {SIGNAL[s.key].tip}{' '}
        {s.typical != null
          ? s.firing
            ? `That's well outside this one's normal (usually ${s.typical}).`
            : `Usually ${s.typical}, so this is a bit above normal.`
          : "Judged on a fixed threshold until there's about 5 days of history to compare against."}
      </>
    }
  >
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${
        s.firing
          ? 'border-[#B4FF39]/30 bg-[#B4FF39]/10 text-[#B4FF39]'
          : 'border-white/10 bg-white/5 text-white/60'
      }`}
    >
      {SIGNAL[s.key].label(s)}
    </span>
  </TermTip>
);

/**
 * Watch toggle: snapshot hourly for 72h, or stop. Shows time left while
 * watching. `compact` is an icon-only version for dense rows.
 */
export const WatchToggle = ({
  segment,
  watchUntil,
  onChange,
  compact,
}: {
  segment: string;
  watchUntil: string | null | undefined;
  onChange: () => void;
  compact?: boolean;
}) => {
  const [busy, setBusy] = useState(false);
  const watching = !!watchUntil && moment(watchUntil).isAfter();
  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBusy(true);
    try {
      if (watching) {
        await marketHeatAPI.unwatch(segment);
        toast.success('Back to daily snapshots');
      } else {
        await marketHeatAPI.watch(segment, 72);
        toast.success('Watching hourly for the next 3 days');
      }
      onChange();
    } catch (err) {
      toast.error(errMsg(err, 'Could not change watch'));
    } finally {
      setBusy(false);
    }
  };
  const left = watching ? moment(watchUntil).fromNow(true) : '';
  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        title={watching ? `Watching hourly · ${left} left (click to stop)` : 'Watch hourly for 3 days'}
        className={`rounded p-1 transition-opacity ${
          watching
            ? 'text-[#B4FF39] opacity-100'
            : 'text-white/40 opacity-0 hover:text-[#B4FF39] group-hover:opacity-100'
        }`}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    );
  }
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={toggle}
      disabled={busy}
      title={watching ? 'Click to stop watching' : 'Snapshot this hourly for the next 3 days'}
      className={`h-7 gap-1 text-[11px] ${
        watching
          ? 'border-[#B4FF39]/25 bg-[#B4FF39]/10 text-[#B4FF39] hover:bg-[#B4FF39]/20'
          : 'border-white/10 bg-black/40 text-white/70 hover:bg-white/5 hover:text-white'
      }`}
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
      {watching ? `Watching · ${left} left` : 'Watch hourly'}
    </Button>
  );
};

const SubHead = ({ children, tip }: { children: ReactNode; tip: ReactNode }) => (
  <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
    {children}
    <InfoTip>{tip}</InfoTip>
  </div>
);

const Empty = ({ children }: { children: ReactNode }) => (
  <div className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-xs text-muted-foreground">
    {children}
  </div>
);

/** A topic that's spiking (or warming up), with the signals behind it. */
const SpikingRow = ({ item, onChange }: { item: ApiRadarItem; onChange: () => void }) => {
  const notable = item.signals.filter(s => s.z >= 1).sort((a, b) => b.z - a.z);
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-3 ${
        item.flagged ? 'border-[#B4FF39]/20 bg-[#B4FF39]/[0.03]' : 'border-white/8 bg-black/20'
      }`}
    >
      <div className="w-12 shrink-0 text-center">
        <div className="text-xl font-bold leading-none" style={{ color: scoreColor(item.spikeScore) }}>
          {item.spikeScore ?? '—'}
        </div>
        <div className="mt-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
          <TermTip
            side="right"
            tip="How unusual today is for this one, 0 to 100. Several signals jumping at once scores high; one noisy signal on its own doesn't. It's judged against this market's own normal, not against other markets."
          >
            spike
          </TermTip>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium text-white">{item.label}</span>
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-white/40">
            {item.scope === 'segment' ? 'market' : item.scope}
          </span>
          {item.auto && (
            <span className="inline-flex items-center gap-0.5 rounded bg-[#B4FF39]/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-[#B4FF39]">
              <Sparkles className="h-2.5 w-2.5" /> found by radar
            </span>
          )}
          {!item.flagged && (
            <span className="rounded bg-amber-400/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-amber-300">
              warming
            </span>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {notable.length ? (
            notable.map(s => <SignalChip key={s.key} s={s} />)
          ) : (
            <span className="text-[11px] text-muted-foreground">No single signal stands out.</span>
          )}
        </div>
        <div className="mt-1.5 text-[11px] text-muted-foreground">
          {item.floorAskUsd != null && <>floor {money(item.floorAskUsd)} · </>}
          {item.totalActive != null && <>{item.totalActive.toLocaleString()} listed · </>}
          heat {item.heat ?? '—'} · {moment(item.capturedAt).fromNow()}
        </div>
      </div>
      <WatchToggle segment={item.segment} watchUntil={item.watchUntil} onChange={onChange} />
    </div>
  );
};

/** A specific card that lit up inside a tracked topic. */
const DiscoveryRow = ({ d, onChange }: { d: ApiRadarDiscovery; onChange: () => void }) => {
  const [busy, setBusy] = useState(false);
  const track = async () => {
    setBusy(true);
    try {
      const r = await marketHeatAPI.promote(d.segment, d.signature);
      if (r.key) toast.success(`Now tracking ${d.label}, watched hourly for 3 days`);
      else toast.error("Couldn't add it (the tracking limit may be reached)");
      onChange();
    } catch (e) {
      toast.error(errMsg(e, 'Could not track this card'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-lg border border-white/8 bg-black/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-muted-foreground">{d.topicLabel}</span>
        <ArrowRight className="h-3 w-3 text-white/30" />
        <span className="font-medium text-white">{d.label}</span>
        {!d.stillHot && (
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-white/40">
            cooled off
          </span>
        )}
        <span className="ml-auto flex items-center gap-1.5">
          {d.sampleUrl && (
            <a
              href={d.sampleUrl}
              target="_blank"
              rel="noreferrer"
              title="See a listing on eBay"
              className="rounded p-1 text-white/40 hover:text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {d.trackedKey ? (
            <span className="inline-flex items-center gap-1 rounded bg-[#B4FF39]/10 px-2 py-1 text-[11px] text-[#B4FF39]">
              <Check className="h-3 w-3" /> Tracking
            </span>
          ) : (
            <Button
              size="sm"
              onClick={track}
              disabled={busy}
              className="h-7 gap-1 bg-[#B4FF39] text-[11px] text-black hover:bg-[#a3ee28]"
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Track
            </Button>
          )}
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {d.floorChangePct != null && (
          <span className={d.floorChangePct > 0 ? 'text-[#B4FF39]' : ''}>floor {pct(d.floorChangePct)}</span>
        )}
        <span>
          {d.clearedCount} cop{d.clearedCount === 1 ? 'y' : 'ies'} gone · {d.listedCount} left
        </span>
        <span>from {money(d.floorUsd)}</span>
        <span>{moment(d.capturedAt).fromNow()}</span>
      </div>
      {d.notYetMoved.length > 0 && (
        <div className="mt-1.5 text-[11px] text-white/50">
          <TermTip tip="The same card in other grades or versions that haven't moved yet. When one version runs, the others often follow.">
            Not moved yet
          </TermTip>
          : {d.notYetMoved.map(n => `${n.label} (${n.listedCount} from ${money(n.floorUsd)})`).join(' · ')}
        </div>
      )}
    </div>
  );
};

/**
 * Spike Radar — catches cards, players and markets in the first hours of a
 * move: what's spiking against its own normal, where the market may rotate
 * next, specific cards found lighting up inside tracked topics, and the
 * hourly watch list.
 */
export const SpikeRadarPanel = () => {
  const [data, setData] = useState<ApiSpikeRadar | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await marketHeatAPI.radar());
    } catch {
      /* keep last known */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Watch mode snapshots hourly; keep the radar reasonably fresh while open.
    const t = setInterval(load, 5 * 60_000);
    return () => clearInterval(t);
  }, [load]);

  const flagged = data?.spiking.filter(i => i.flagged) ?? [];
  const warming = data?.spiking.filter(i => !i.flagged) ?? [];

  return (
    <Card className="relative overflow-hidden bg-[rgba(22,22,22,1)] border-white/5 p-4 sm:p-5">
      {loading && data && (
        <div className="absolute inset-x-0 top-0 h-0.5 animate-pulse bg-[#B4FF39]/70" />
      )}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Radar className="h-4 w-4 text-[#B4FF39]" />
          <span className="text-sm font-medium text-white">Spike Radar</span>
          <InfoTip side="bottom">
            Catches a card, player or market in the first hours of a move. Each one is compared
            to its own normal day: the cheapest copies getting bought up, the floor jumping,
            listings draining, buzz spiking. Anything that flags gets snapshotted every hour for
            two days so you can watch it unfold, and specific cards that light up inside
            something we track get added automatically.
          </InfoTip>
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            what's moving now, before it's everywhere
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className="text-[11px] text-muted-foreground">
              <TermTip tip="Watch mode snapshots each watched item hourly. eBay allows about 5,000 calls a day, so at most this many are watched at once.">
                {data.budget.watching} watched hourly
              </TermTip>{' '}
              · {data.budget.snapshots24h.toLocaleString()} snapshots in 24h
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
            className="h-8 gap-1.5 border-white/10 bg-black/40 text-xs text-white/80 hover:bg-white/5 hover:text-white"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </Button>
        </div>
      </div>

      {!data && loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full bg-white/5" />
          ))}
        </div>
      ) : !data ? (
        <Empty>Couldn't load the radar. Try Refresh.</Empty>
      ) : (
        <div className="space-y-6">
          {/* 1 — Spiking now */}
          <div>
            <SubHead tip="Ranked by spike score. Flagged means two or more signals are well outside their normal at once, or one is overwhelming. Warming means something's starting to stand out.">
              Spiking now
            </SubHead>
            {flagged.length + warming.length === 0 ? (
              <Empty>
                Nothing unusual right now. The radar judges each item against its own normal, which
                takes about 5 days of snapshots to learn; until then it uses fixed thresholds.
              </Empty>
            ) : (
              <div className="space-y-2">
                {[...flagged, ...warming].map(i => (
                  <SpikingRow key={i.segment} item={i} onChange={load} />
                ))}
              </div>
            )}
          </div>

          {/* 2 — Rotation catch-up */}
          {data.catchUp.length > 0 && (
            <div>
              <SubHead tip="When one card in a family spikes, the market often cycles to its siblings next: same set, same player, same parent. These haven't moved yet.">
                Next in line
              </SubHead>
              <div className="space-y-2">
                {data.catchUp.map(g => (
                  <div key={g.of.segment} className="rounded-lg border border-white/8 bg-black/20 p-3">
                    <div className="mb-2 text-[11px] text-muted-foreground">
                      <span className="text-white">{g.of.label}</span> is spiking. Same family, not
                      moved yet:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {g.items.map(s => (
                        <div
                          key={s.segment}
                          className="flex items-center gap-2 rounded-md border border-white/10 bg-black/30 py-1 pl-2.5 pr-1"
                        >
                          <span className="text-xs text-white/85">{s.label}</span>
                          <span className="text-[10px] text-muted-foreground">heat {s.heat ?? '—'}</span>
                          <WatchToggle segment={s.segment} watchUntil={s.watchUntil} onChange={load} compact />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3 — Discoveries */}
          <div>
            <SubHead tip="We break tracked players, sets and cards down into the exact cards inside them (year, number, parallel, grade) and watch each one. These lit up in the last 3 days: their floor jumped as copies sold, or half their copies cleared out. Up to 10 a day get tracked automatically.">
              Found inside tracked markets
            </SubHead>
            {data.discoveries.length === 0 ? (
              <Empty>
                No specific cards have lit up in the last 3 days. These show up once tracked sets,
                players and cards have a day of history to compare against.
              </Empty>
            ) : (
              <div className="space-y-2">
                {data.discoveries.map(d => (
                  <DiscoveryRow key={`${d.segment}|${d.signature}`} d={d} onChange={load} />
                ))}
              </div>
            )}
          </div>

          {/* 4 — Watch list */}
          <div>
            <SubHead tip="Snapshotted every hour instead of once a day. Things get added here when they flag, when the radar discovers them, or when you click Watch.">
              Watching hourly
            </SubHead>
            {data.watching.length === 0 ? (
              <Empty>Nothing is being watched. Use Watch on any market or card to follow it hourly.</Empty>
            ) : (
              <div className="divide-y divide-white/5 rounded-lg border border-white/8 bg-black/20">
                {data.watching.map(w => (
                  <div key={w.segment} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-xs text-white/85">{w.label}</span>
                    {w.watchReason && (
                      <span className="max-w-[45%] truncate text-[11px] text-muted-foreground">
                        {w.watchReason}
                      </span>
                    )}
                    <span className="text-[11px]" style={{ color: scoreColor(w.spikeScore) }}>
                      spike {w.spikeScore ?? '—'}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {w.lastSnapshotAt ? `last ${moment(w.lastSnapshotAt).fromNow()}` : 'first snapshot soon'}
                    </span>
                    <WatchToggle segment={w.segment} watchUntil={w.watchUntil} onChange={load} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};
