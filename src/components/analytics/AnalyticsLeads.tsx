import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { analyticsAPI } from '@/integrations/api/client';
import type {
  ApiDiscoveredLead,
  ApiLeadStats,
} from '@/types/analytics-api';
import {
  Search,
  Loader2,
  ExternalLink,
  ArrowUp,
  Heart,
  ThumbsUp,
  MessageSquare,
  Repeat2,
  UserPlus,
  Check,
  EyeOff,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Database,
  Sparkles,
} from 'lucide-react';

const PAGE_SIZE = 50;

const SOURCE_STYLES: Record<string, string> = {
  reddit: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
  bluesky: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  youtube: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  twitch: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
  google: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
};

const SOURCE_LABEL: Record<string, string> = {
  reddit: 'Reddit',
  bluesky: 'Bluesky',
  youtube: 'YouTube',
  twitch: 'Twitch',
  google: 'Web',
};

const STATUS_STYLES: Record<string, string> = {
  new: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  added: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  dismissed: 'border-white/10 bg-white/5 text-white/40',
};

const scoreStyle = (score: number) =>
  score >= 70
    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
    : score >= 40
      ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
      : 'border-white/10 bg-white/5 text-white/50';

const INTENT_STYLES: Record<string, string> = {
  buying: 'text-emerald-300',
  selling: 'text-rose-300',
  showcase: 'text-sky-300',
  discussion: 'text-white/50',
  off_topic: 'text-white/40',
};

const authorLabel = (l: ApiDiscoveredLead) => {
  if (l.source === 'reddit') return `u/${l.author}`;
  if (l.source === 'google' || l.source === 'twitch') return l.author;
  return `@${l.author}`;
};

/**
 * Leads — the persistent pool of everything the Discover engine has surfaced.
 * Every search auto-saves its results here; this dashboard is where you see
 * all of it, filter it, and convert leads into prospects.
 */
export const AnalyticsLeads = () => {
  const navigate = useNavigate();
  const [source, setSource] = useState('all');
  const [status, setStatus] = useState('new');
  const [intent, setIntent] = useState('all');
  const [sort, setSort] = useState<'recent' | 'score'>('recent');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(0);
  const [leads, setLeads] = useState<ApiDiscoveredLead[]>([]);
  const [total, setTotal] = useState(0);
  const [unqualified, setUnqualified] = useState(0);
  const [stats, setStats] = useState<ApiLeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [qualifying, setQualifying] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(0), [source, status, intent, sort, debounced]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([
        analyticsAPI.getLeads({
          source,
          status,
          intent,
          sort,
          search: debounced,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        }),
        analyticsAPI.getLeadStats(),
      ]);
      setLeads(list.data);
      setTotal(list.total);
      setUnqualified(list.unqualified ?? 0);
      setStats(s);
    } catch {
      setLeads([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [source, status, intent, sort, debounced, page]);

  useEffect(() => {
    load();
  }, [load]);

  const qualify = async () => {
    setQualifying(true);
    try {
      const { qualified } = await analyticsAPI.qualifyLeads(60);
      toast.success(
        qualified > 0
          ? `Claude scored ${qualified} lead${qualified === 1 ? '' : 's'}.`
          : 'Nothing new to qualify.',
      );
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Qualify failed.');
    } finally {
      setQualifying(false);
    }
  };

  const convert = async (l: ApiDiscoveredLead) => {
    setBusy(l.id);
    try {
      const { profileId } = await analyticsAPI.convertLead(l.source, l.externalId);
      toast.success(
        <span>
          Added as a prospect.{' '}
          <button className="underline" onClick={() => navigate(`/analytics/${profileId}`)}>
            View
          </button>
        </span>,
      );
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Convert failed.');
    } finally {
      setBusy(null);
    }
  };

  const setStatusFor = async (
    l: ApiDiscoveredLead,
    next: 'new' | 'dismissed',
  ) => {
    setBusy(l.id);
    try {
      await analyticsAPI.setLeadStatus(l.source, l.externalId, next);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed.');
    } finally {
      setBusy(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total leads" value={stats?.total ?? 0} accent />
        <StatCard label="New" value={stats?.byStatus.new ?? 0} />
        <StatCard label="Converted" value={stats?.byStatus.added ?? 0} />
        <StatCard label="Dismissed" value={stats?.byStatus.dismissed ?? 0} />
      </div>
      {stats && Object.keys(stats.bySource).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(stats.bySource)
            .sort((a, b) => b[1] - a[1])
            .map(([s, n]) => (
              <button
                key={s}
                type="button"
                onClick={() => setSource(s)}
                className={`text-[11px] rounded-full px-2.5 py-1 border ${
                  SOURCE_STYLES[s] ?? 'border-white/10 bg-white/5 text-white/60'
                }`}
              >
                {SOURCE_LABEL[s] ?? s}: {n.toLocaleString()}
              </button>
            ))}
        </div>
      )}

      {/* Filters */}
      <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-4">
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search leads by handle, text, or query…"
              className="pl-9 bg-black/40 border-white/10"
            />
          </div>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-full sm:w-[150px] bg-black/40 border-white/10">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="bluesky">Bluesky</SelectItem>
              <SelectItem value="reddit">Reddit</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="twitch">Twitch</SelectItem>
              <SelectItem value="google">Web</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-[140px] bg-black/40 border-white/10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="added">Converted</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={intent} onValueChange={setIntent}>
            <SelectTrigger className="w-full sm:w-[140px] bg-black/40 border-white/10">
              <SelectValue placeholder="Intent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All intent</SelectItem>
              <SelectItem value="buying">Buying</SelectItem>
              <SelectItem value="selling">Selling</SelectItem>
              <SelectItem value="showcase">Showcase</SelectItem>
              <SelectItem value="discussion">Discussion</SelectItem>
              <SelectItem value="off_topic">Off-topic</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={v => setSort(v as 'recent' | 'score')}>
            <SelectTrigger className="w-full sm:w-[150px] bg-black/40 border-white/10">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most recent</SelectItem>
              <SelectItem value="score">Top buyer score</SelectItem>
            </SelectContent>
          </Select>
          <Button
            className="bg-[#B4FF39] text-black hover:bg-[#a2e833] sm:ml-auto"
            onClick={qualify}
            disabled={qualifying}
          >
            {qualifying ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1.5" />
            )}
            Qualify{unqualified > 0 ? ` (${unqualified})` : ''}
          </Button>
        </div>
      </Card>

      {/* List */}
      <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-5">
        {loading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : leads.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <Database className="h-6 w-6 mx-auto mb-2 opacity-50" />
            No leads yet. Run searches in the{' '}
            <span className="text-white/80">Discover</span> tab — every result is
            saved here automatically.
          </div>
        ) : (
          <>
            <div className="text-xs text-muted-foreground mb-3">
              {total.toLocaleString()} lead{total === 1 ? '' : 's'}
            </div>
            <div className="space-y-2">
              {leads.map(l => (
                <div
                  key={l.id}
                  className="rounded-lg border border-white/5 bg-black/30 p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground mb-1">
                        {l.buyerScore != null && (
                          <span
                            className={`text-[10px] rounded px-1.5 py-0.5 border font-semibold ${scoreStyle(l.buyerScore)}`}
                            title="Claude buyer-likelihood score"
                          >
                            {l.buyerScore}
                          </span>
                        )}
                        {l.intent && (
                          <span
                            className={`font-medium ${INTENT_STYLES[l.intent] ?? 'text-white/50'}`}
                          >
                            {l.intent.replace('_', ' ')}
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-normal ${SOURCE_STYLES[l.source] ?? ''}`}
                        >
                          {SOURCE_LABEL[l.source] ?? l.source}
                        </Badge>
                        {l.community && (
                          <span>
                            {l.source === 'reddit' ? `r/${l.community}` : l.community}
                          </span>
                        )}
                        <span className="text-white/70">{authorLabel(l)}</span>
                        {l.upvotes != null && (
                          <span className="inline-flex items-center gap-1">
                            {l.source === 'reddit' ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : l.source === 'youtube' ? (
                              <ThumbsUp className="h-3 w-3" />
                            ) : (
                              <Heart className="h-3 w-3" />
                            )}
                            {l.upvotes}
                          </span>
                        )}
                        {l.comments != null && (
                          <span className="inline-flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {l.comments}
                          </span>
                        )}
                        {l.reposts != null && l.reposts > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Repeat2 className="h-3 w-3" />
                            {l.reposts}
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-normal ${STATUS_STYLES[l.status] ?? ''}`}
                        >
                          {l.status}
                        </Badge>
                      </div>
                      <a
                        href={l.url ?? '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-white hover:text-[#B4FF39] inline-flex items-start gap-1"
                      >
                        <span className="line-clamp-2">
                          {l.title || l.text || '(no text)'}
                        </span>
                        <ExternalLink className="h-3 w-3 mt-1 shrink-0 text-muted-foreground" />
                      </a>
                      {l.title && l.text && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {l.text}
                        </p>
                      )}
                      {l.interests && l.interests.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {l.interests.slice(0, 6).map(i => (
                            <span
                              key={i}
                              className="text-[10px] rounded px-1.5 py-0.5 bg-sky-500/10 text-sky-300 border border-sky-500/20"
                            >
                              {i}
                            </span>
                          ))}
                        </div>
                      )}
                      {l.qualifyReasoning && (
                        <p className="text-[11px] text-muted-foreground/80 italic mt-1">
                          {l.qualifyReasoning}
                        </p>
                      )}
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {l.query ? `found via "${l.query}"` : ''}
                        {l.query ? ' · ' : ''}
                        {moment(l.postedAt || l.createdAt).fromNow()}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {l.status === 'added' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-white/10 bg-white/5"
                          onClick={() =>
                            l.convertedUserId &&
                            navigate(`/analytics/${l.convertedUserId}`)
                          }
                        >
                          <Check className="h-3.5 w-3.5 mr-1.5" /> Added
                        </Button>
                      ) : (
                        l.source !== 'google' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-white/10 bg-white/5 hover:bg-white/10"
                            onClick={() => convert(l)}
                            disabled={busy === l.id}
                          >
                            {busy === l.id ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            Convert
                          </Button>
                        )
                      )}
                      {l.status === 'dismissed' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-white"
                          onClick={() => setStatusFor(l, 'new')}
                          disabled={busy === l.id}
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Restore
                        </Button>
                      ) : (
                        l.status !== 'added' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-amber-300"
                            onClick={() => setStatusFor(l, 'dismissed')}
                            disabled={busy === l.id}
                          >
                            <EyeOff className="h-3.5 w-3.5 mr-1.5" /> Dismiss
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
              <div className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-white/10 bg-white/5"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-white/10 bg-white/5"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

const StatCard = ({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) => (
  <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-4">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div
      className={`mt-1 text-2xl font-semibold ${accent ? 'text-[#B4FF39]' : 'text-white'}`}
    >
      {value.toLocaleString()}
    </div>
  </Card>
);
