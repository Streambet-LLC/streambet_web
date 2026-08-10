import { useCallback, useEffect, useState } from 'react';
import moment from 'moment';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  Search,
  Sparkles,
  ExternalLink,
  StickyNote,
  UserPlus,
  X,
  Check,
  Radar,
} from 'lucide-react';
import { analyticsAPI, crmAPI } from '@/integrations/api/client';
import type {
  ApiDiscoveredLead,
  ApiLeadStats,
  ApiQuerySuggestions,
  DiscoverySource,
} from '@/types/analytics-api';
import { NoteTimeline } from './CrmContacts';

const SOURCES: DiscoverySource[] = [
  'reddit',
  'bluesky',
  'youtube',
  'google',
  'twitch',
];
const INTENT_STYLE: Record<string, string> = {
  buying: 'border-[#B4FF39]/30 bg-[#B4FF39]/10 text-[#B4FF39]',
  selling: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  showcase: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
  discussion: 'border-white/15 bg-white/5 text-white/60',
  off_topic: 'border-white/10 bg-black/30 text-white/35',
};
const scoreColor = (n: number) =>
  n >= 70 ? '#B4FF39' : n >= 40 ? '#fbbf24' : '#f87171';
const PAGE = 25;

/**
 * The Leads engine — discover buyer prospects from social sources, let Claude
 * qualify them (buyer score / intent / interests), then work the pipeline:
 * dismiss noise, add notes, and convert real buyers into CRM contacts.
 */
export const AnalyticsLeads = () => {
  const [rows, setRows] = useState<ApiDiscoveredLead[]>([]);
  const [total, setTotal] = useState(0);
  const [unqualified, setUnqualified] = useState(0);
  const [stats, setStats] = useState<ApiLeadStats | null>(null);
  const [loading, setLoading] = useState(true);

  // discovery
  const [source, setSource] = useState<DiscoverySource>('reddit');
  const [query, setQuery] = useState('');
  const [discovering, setDiscovering] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<ApiQuerySuggestions | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [qualifying, setQualifying] = useState(false);

  // filters
  const [fSource, setFSource] = useState('all');
  const [fStatus, setFStatus] = useState('new');
  const [fIntent, setFIntent] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'recent' | 'score'>('score');
  const [offset, setOffset] = useState(0);

  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [converted, setConverted] = useState<Record<string, boolean>>({});

  const load = useCallback(
    async (nextOffset = 0) => {
      setLoading(true);
      try {
        const [list, s] = await Promise.all([
          analyticsAPI.getLeads({
            source: fSource,
            status: fStatus,
            intent: fIntent,
            search: search.trim() || undefined,
            sort,
            limit: PAGE,
            offset: nextOffset,
          }),
          nextOffset === 0 ? analyticsAPI.getLeadStats() : Promise.resolve(null),
        ]);
        setTotal(list.total);
        setUnqualified(list.unqualified);
        setRows(r => (nextOffset === 0 ? list.data : [...r, ...list.data]));
        setOffset(nextOffset);
        if (s) setStats(s);
      } catch {
        /* keep last known */
      } finally {
        setLoading(false);
      }
    },
    [fSource, fStatus, fIntent, search, sort]
  );

  useEffect(() => {
    const t = setTimeout(() => load(0), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const discover = async () => {
    if (!query.trim() || discovering) return;
    setDiscovering(true);
    setBanner(null);
    try {
      const res = await analyticsAPI.discover({
        source,
        q: query.trim(),
        limit: 25,
      });
      if (!res.configured)
        setBanner(`${source} isn't configured (missing API credentials).`);
      else if (res.error) setBanner(`${source} search failed: ${res.error}`);
      else setBanner(`Found ${res.leads.length} result(s) — saved to the pool.`);
      await load(0);
    } catch {
      setBanner('Discovery failed. Try again.');
    } finally {
      setDiscovering(false);
    }
  };

  const suggest = async () => {
    if (!query.trim() || suggesting) return;
    setSuggesting(true);
    try {
      setSuggestions(await analyticsAPI.suggestQueries(query.trim(), source));
    } catch {
      /* ignore */
    } finally {
      setSuggesting(false);
    }
  };

  const qualify = async () => {
    if (qualifying || unqualified === 0) return;
    setQualifying(true);
    setBanner(null);
    try {
      const { queued } = await analyticsAPI.qualifyLeads(Math.min(unqualified, 60));
      setBanner(
        `Queued ${queued} lead(s) for AI scoring — refreshing shortly…`
      );
      setTimeout(() => load(0), 4000);
    } catch {
      setBanner('Qualification failed.');
    } finally {
      setQualifying(false);
    }
  };

  const setStatus = async (lead: ApiDiscoveredLead, status: 'new' | 'dismissed') => {
    // Drop from the current filtered view + keep the "load more" remaining
    // count honest (the lead no longer matches this filter).
    setRows(rs => rs.filter(r => r.id !== lead.id));
    setTotal(t => Math.max(0, t - 1));
    try {
      await analyticsAPI.setLeadStatus(lead.source, lead.externalId, status);
    } catch {
      load(0);
    }
  };

  const convert = async (lead: ApiDiscoveredLead) => {
    setConverted(c => ({ ...c, [lead.id]: true }));
    try {
      await crmAPI.convertLead(lead.id, 'buyer');
    } catch {
      setConverted(c => ({ ...c, [lead.id]: false }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Discovery bar */}
      <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-4 sm:p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <Radar className="h-4 w-4 text-[#B4FF39]" /> Discover prospects
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={source}
            onChange={e => setSource(e.target.value as DiscoverySource)}
            className="h-9 rounded-md border border-white/10 bg-black/40 px-2 text-sm text-white/80 outline-none"
          >
            {SOURCES.map(s => (
              <option key={s} value={s} className="capitalize">
                {s}
              </option>
            ))}
          </select>
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && discover()}
            placeholder='e.g. "looking to buy pokemon slabs"'
            className="h-9 min-w-[220px] flex-1 border-white/10 bg-black/40 text-sm text-white placeholder:text-muted-foreground"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={suggest}
            disabled={!query.trim() || suggesting}
            className="h-9 gap-1.5 border-white/10 bg-black/40 text-xs text-white/80 hover:bg-white/5 hover:text-white"
          >
            {suggesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Suggest
          </Button>
          <Button
            size="sm"
            onClick={discover}
            disabled={!query.trim() || discovering}
            className="h-9 gap-1.5 bg-[#B4FF39] text-xs font-semibold text-black hover:bg-[#B4FF39]/90"
          >
            {discovering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Discover
          </Button>
        </div>

        {suggestions && (
          <div className="mt-3 rounded-lg border border-white/8 bg-black/20 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                AI suggestions
              </span>
              <button onClick={() => setSuggestions(null)} className="text-white/30 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.terms.map((t, i) => (
                <button
                  key={`t${i}`}
                  onClick={() => setQuery(t)}
                  className="rounded-full border border-[#B4FF39]/25 bg-[#B4FF39]/10 px-2.5 py-0.5 text-[11px] text-[#B4FF39] hover:bg-[#B4FF39]/20"
                >
                  {t}
                </button>
              ))}
              {suggestions.subreddits.map((s, i) => (
                <button
                  key={`s${i}`}
                  onClick={() => setQuery(s)}
                  className="rounded-full border border-white/10 bg-black/30 px-2.5 py-0.5 text-[11px] text-white/70 hover:bg-white/5"
                >
                  r/{s.replace(/^r\//, '')}
                </button>
              ))}
            </div>
            {suggestions.rationale && (
              <p className="mt-2 text-[11px] italic text-muted-foreground">
                {suggestions.rationale}
              </p>
            )}
          </div>
        )}

        {banner && (
          <div className="mt-3 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/70">
            {banner}
          </div>
        )}
      </Card>

      {/* Stats + qualify */}
      <div className="flex flex-wrap items-center gap-2">
        <StatChip label="In pool" value={stats?.total ?? total} />
        <StatChip label="Unqualified" value={unqualified} accent={unqualified > 0} />
        {stats &&
          Object.entries(stats.bySource)
            .slice(0, 5)
            .map(([k, v]) => <StatChip key={k} label={k} value={v} muted />)}
        <div className="ml-auto">
          <Button
            size="sm"
            onClick={qualify}
            disabled={qualifying || unqualified === 0}
            className="h-8 gap-1.5 bg-white/10 text-xs text-white hover:bg-white/20 disabled:opacity-40"
          >
            {qualifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            AI-qualify {unqualified > 0 ? unqualified : ''}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search pool"
            className="h-8 w-44 border-white/10 bg-black/40 pl-8 text-xs text-white placeholder:text-muted-foreground"
          />
        </div>
        <Filter value={fStatus} onChange={setFStatus} opts={[['new', 'Active'], ['added', 'Converted'], ['dismissed', 'Dismissed'], ['all', 'All statuses']]} />
        <Filter value={fSource} onChange={setFSource} opts={[['all', 'All sources'], ...SOURCES.map(s => [s, s] as [string, string])]} />
        <Filter value={fIntent} onChange={setFIntent} opts={[['all', 'All intent'], ['buying', 'Buying'], ['selling', 'Selling'], ['showcase', 'Showcase'], ['discussion', 'Discussion']]} />
        <button
          type="button"
          onClick={() => setSort(s => (s === 'score' ? 'recent' : 'score'))}
          className="h-8 rounded-md border border-white/10 bg-black/40 px-2.5 text-xs text-white/70 hover:text-white"
        >
          Sort: {sort === 'score' ? 'Buyer score' : 'Most recent'}
        </button>
      </div>

      {/* Leads list */}
      <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-4 sm:p-5">
        {loading && rows.length === 0 ? (
          <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading leads…
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No leads in this view. Run a discovery above to populate the pool.
          </div>
        ) : (
          <div className="space-y-2.5">
            {rows.map(l => (
              <div key={l.id} className="rounded-lg border border-white/8 bg-black/20 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded border border-white/10 bg-black/40 px-1.5 text-[10px] uppercase text-white/50">
                        {l.source}
                      </span>
                      <span className="font-medium text-white">
                        {l.authorDisplay || l.author}
                      </span>
                      {l.community && (
                        <span className="text-xs text-muted-foreground">
                          {l.source === 'reddit' ? 'r/' : ''}
                          {l.community}
                        </span>
                      )}
                      {l.intent && (
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] capitalize ${INTENT_STYLE[l.intent] ?? INTENT_STYLE.discussion}`}>
                          {String(l.intent).replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    {(l.title || l.text) && (
                      <p className="mt-1.5 line-clamp-3 text-sm text-white/75">
                        {l.title ? <span className="font-medium">{l.title}. </span> : null}
                        {l.text}
                      </p>
                    )}
                    {l.interests && l.interests.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {l.interests.map((t, i) => (
                          <span key={i} className="rounded-full border border-[#B4FF39]/20 bg-[#B4FF39]/5 px-2 py-0.5 text-[11px] text-[#B4FF39]/80">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 text-[11px] text-muted-foreground">
                      {l.postedAt && <span>{moment(l.postedAt).fromNow()}</span>}
                      {l.upvotes != null && <span>▲ {l.upvotes}</span>}
                      {l.comments != null && <span>💬 {l.comments}</span>}
                      {l.url && (
                        <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#B4FF39]/80 hover:text-[#B4FF39]">
                          view <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {l.buyerScore != null ? (
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">buyer</div>
                        <div className="text-lg font-bold leading-none" style={{ color: scoreColor(l.buyerScore) }}>
                          {l.buyerScore}
                        </div>
                      </div>
                    ) : (
                      <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[10px] text-white/40">
                        unscored
                      </span>
                    )}
                    <div className="flex items-center gap-1.5">
                      {converted[l.id] || l.status === 'added' ? (
                        <span className="inline-flex h-7 items-center gap-1 rounded-md border border-[#B4FF39]/30 bg-[#B4FF39]/10 px-2 text-[11px] text-[#B4FF39]">
                          <Check className="h-3.5 w-3.5" /> Buyer
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => convert(l)}
                          title="Convert to buyer contact"
                          className="flex h-7 items-center gap-1 rounded-md border border-white/10 bg-black/40 px-2 text-[11px] text-white/70 hover:border-[#B4FF39]/40 hover:text-[#B4FF39]"
                        >
                          <UserPlus className="h-3.5 w-3.5" /> Convert
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setNoteFor(v => (v === l.id ? null : l.id))}
                        title="Notes"
                        className={`flex h-7 w-7 items-center justify-center rounded-md border border-white/10 ${noteFor === l.id ? 'bg-white/10 text-white' : 'bg-black/40 text-white/50 hover:text-white'}`}
                      >
                        <StickyNote className="h-3.5 w-3.5" />
                      </button>
                      {l.status === 'dismissed' ? (
                        <button type="button" onClick={() => setStatus(l, 'new')} className="flex h-7 items-center rounded-md border border-white/10 bg-black/40 px-2 text-[11px] text-white/60 hover:text-white">
                          Restore
                        </button>
                      ) : (
                        <button type="button" onClick={() => setStatus(l, 'dismissed')} title="Dismiss" className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-black/40 text-white/40 hover:border-red-500/30 hover:text-red-400">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {noteFor === l.id && <NoteTimeline leadId={l.id} />}
              </div>
            ))}

            {total > rows.length && (
              <button
                type="button"
                onClick={() => load(offset + PAGE)}
                disabled={loading}
                className="mt-1 w-full rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-center text-xs text-muted-foreground hover:bg-white/5 hover:text-white"
              >
                {loading ? 'Loading…' : `Load more (${total - rows.length})`}
              </button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

const StatChip = ({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: number;
  accent?: boolean;
  muted?: boolean;
}) => (
  <div
    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs ${
      accent
        ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
        : 'border-white/8 bg-black/20 text-white/70'
    }`}
  >
    <span className={muted ? 'capitalize text-muted-foreground' : ''}>{label}</span>
    <span className="font-semibold text-white">{value}</span>
  </div>
);

const Filter = ({
  value,
  onChange,
  opts,
}: {
  value: string;
  onChange: (v: string) => void;
  opts: [string, string][];
}) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    className="h-8 rounded-md border border-white/10 bg-black/40 px-2 text-xs capitalize text-white/70 outline-none"
  >
    {opts.map(([v, l]) => (
      <option key={v} value={v}>
        {l}
      </option>
    ))}
  </select>
);
