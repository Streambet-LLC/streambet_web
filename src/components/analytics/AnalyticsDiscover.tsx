import { useState } from 'react';
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
  ApiDiscoveryLead,
  ApiQuerySuggestions,
  DiscoverySource,
} from '@/types/analytics-api';
import {
  Search,
  Loader2,
  ExternalLink,
  MessageSquare,
  ArrowUp,
  Heart,
  ThumbsUp,
  Repeat2,
  UserPlus,
  Check,
  Info,
  Sparkles,
} from 'lucide-react';

const SOURCES: { key: DiscoverySource; label: string }[] = [
  { key: 'bluesky', label: 'Bluesky' },
  { key: 'reddit', label: 'Reddit' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'twitch', label: 'Twitch' },
  { key: 'google', label: 'Web' },
];

const SUGGESTED_SUBS = [
  'pokemoncardtrading',
  'PokeInvesting',
  'sportscards',
  'baseballcards',
  'footballcards',
  'basketballcards',
  'mtgfinance',
  'OnePieceTCG',
];

const CONFIG_HINT: Record<DiscoverySource, React.ReactNode> = {
  bluesky: (
    <>
      <code className="text-amber-300">BLUESKY_IDENTIFIER</code> /{' '}
      <code className="text-amber-300">BLUESKY_APP_PASSWORD</code>
    </>
  ),
  reddit: (
    <>
      <code className="text-amber-300">REDDIT_CLIENT_ID</code> /{' '}
      <code className="text-amber-300">REDDIT_CLIENT_SECRET</code>
    </>
  ),
  youtube: <code className="text-amber-300">YOUTUBE_API_KEY</code>,
  google: (
    <>
      <code className="text-amber-300">GOOGLE_CSE_API_KEY</code> /{' '}
      <code className="text-amber-300">GOOGLE_CSE_CX</code>
    </>
  ),
  twitch: (
    <>
      <code className="text-amber-300">TWITCH_CLIENT_ID</code> /{' '}
      <code className="text-amber-300">TWITCH_CLIENT_SECRET</code>
    </>
  ),
};

type Time = 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';

/**
 * Discover — compliant external prospecting across Bluesky, Reddit, YouTube
 * (break-video comments), and the web (Google Programmable Search). Turn
 * posters into prospect profiles. No scraping.
 */
export const AnalyticsDiscover = () => {
  const navigate = useNavigate();
  const [source, setSource] = useState<DiscoverySource>('bluesky');
  const [query, setQuery] = useState('');
  const [subreddit, setSubreddit] = useState('');
  const [sort, setSort] = useState('top');
  const [time, setTime] = useState<Time>('month');
  const [leads, setLeads] = useState<ApiDiscoveryLead[]>([]);
  const [searched, setSearched] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const [suggestions, setSuggestions] = useState<ApiQuerySuggestions | null>(
    null,
  );
  const [suggesting, setSuggesting] = useState(false);

  const switchSource = (s: DiscoverySource) => {
    setSource(s);
    setSort(s === 'reddit' ? 'relevance' : 'top');
    setLeads([]);
    setSearched(false);
    setConfigured(true);
    setSuggestions(null);
  };

  const suggest = async () => {
    if (!query.trim()) {
      toast.info('Type a topic first (e.g. "vintage Charizard").');
      return;
    }
    setSuggesting(true);
    try {
      const res = await analyticsAPI.suggestQueries(query.trim(), source);
      setSuggestions(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Suggest failed.');
    } finally {
      setSuggesting(false);
    }
  };

  const runSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await analyticsAPI.discover({
        source,
        q: query.trim(),
        subreddit:
          source === 'reddit' ? subreddit.trim() || undefined : undefined,
        sort: source === 'reddit' || source === 'bluesky' ? sort : undefined,
        time: source === 'reddit' ? time : undefined,
        limit: 50,
      });
      setConfigured(res.configured);
      setLeads(res.leads);
      if (res.error) {
        toast.error(res.error);
      } else if (res.configured && res.leads.length === 0) {
        toast.info('No results matched — try different terms.');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Search failed.');
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const addAsProspect = async (l: ApiDiscoveryLead) => {
    if (l.platform === 'google') return;
    try {
      // The search already persisted this lead to the pool; convert it there
      // (server builds the profile + marks the lead 'added').
      const { profileId } = await analyticsAPI.convertLead(l.platform, l.id);
      setAdded(a => ({ ...a, [l.id]: true }));
      toast.success(
        <span>
          Added {authorLabel(l)} as a prospect.{' '}
          <button
            className="underline"
            onClick={() => navigate(`/analytics/${profileId}`)}
          >
            View
          </button>
        </span>,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add prospect.');
    }
  };

  const isReddit = source === 'reddit';
  const showSort = source === 'reddit' || source === 'bluesky';
  const canAdd = source !== 'google';

  const authorLabel = (l: ApiDiscoveryLead) => {
    if (l.platform === 'reddit') return `u/${l.author}`;
    if (l.platform === 'google' || l.platform === 'twitch') return l.author;
    return `@${l.author}`;
  };

  const placeholder =
    source === 'google'
      ? 'e.g. "claiming" charizard, WTB vintage pokemon forum…'
      : 'e.g. "ISO Charizard", "claiming", "WTB vintage"…';

  return (
    <div className="space-y-5">
      <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-5 sm:p-6">
        <div className="text-sm font-medium text-white mb-1">
          Discover buyers
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Search public posts for buying intent and turn posters into prospect
          profiles — via official, compliant APIs. No scraping.
        </p>

        {/* Source toggle */}
        <div className="inline-flex flex-wrap items-center rounded-md border border-white/10 bg-black/40 p-0.5 mb-3">
          {SOURCES.map(s => (
            <button
              key={s.key}
              type="button"
              onClick={() => switchSource(s.key)}
              className={`px-3 h-8 rounded text-sm transition-colors ${
                source === s.key
                  ? 'bg-white/10 text-white'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runSearch()}
                placeholder={placeholder}
                className="pl-9 bg-black/40 border-white/10"
              />
            </div>
            {isReddit && (
              <Input
                value={subreddit}
                onChange={e => setSubreddit(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runSearch()}
                placeholder="subreddit (optional)"
                className="bg-black/40 border-white/10 sm:w-[200px]"
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {showSort && (
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-[150px] bg-black/40 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isReddit ? (
                    <>
                      <SelectItem value="relevance">Relevance</SelectItem>
                      <SelectItem value="new">Newest</SelectItem>
                      <SelectItem value="top">Top</SelectItem>
                      <SelectItem value="comments">Most comments</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="top">Top</SelectItem>
                      <SelectItem value="latest">Latest</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            )}
            {isReddit && (
              <Select value={time} onValueChange={v => setTime(v as Time)}>
                <SelectTrigger className="w-[140px] bg-black/40 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Past day</SelectItem>
                  <SelectItem value="week">Past week</SelectItem>
                  <SelectItem value="month">Past month</SelectItem>
                  <SelectItem value="year">Past year</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button
              variant="outline"
              className="border-white/10 bg-white/5 hover:bg-white/10 sm:ml-auto"
              onClick={suggest}
              disabled={!query.trim() || suggesting}
              title="Ask Claude for higher-signal queries"
            >
              {suggesting ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1.5" />
              )}
              Suggest
            </Button>
            <Button
              className="bg-[#B4FF39] text-black hover:bg-[#a2e833]"
              onClick={runSearch}
              disabled={!query.trim() || loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-1.5" />
              )}
              Search
            </Button>
          </div>

          {/* Claude query suggestions */}
          {suggestions && (
            <div className="rounded-lg border border-[#B4FF39]/20 bg-[#B4FF39]/[0.04] p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-[#B4FF39]" />
                Claude suggestions {suggestions.rationale ? `— ${suggestions.rationale}` : ''}
              </div>
              {suggestions.terms.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.terms.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setQuery(t);
                      }}
                      className="text-[11px] rounded-full px-2.5 py-1 border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
              {isReddit && suggestions.subreddits.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.subreddits.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSubreddit(s)}
                      className="text-[11px] rounded-full px-2.5 py-1 border border-orange-500/20 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20"
                    >
                      r/{s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {isReddit && (
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_SUBS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSubreddit(s)}
                  className={`text-[11px] rounded-full px-2.5 py-1 border transition-colors ${
                    subreddit.toLowerCase() === s.toLowerCase()
                      ? 'border-[#B4FF39]/40 bg-[#B4FF39]/10 text-[#B4FF39]'
                      : 'border-white/10 bg-white/5 text-muted-foreground hover:text-white'
                  }`}
                >
                  r/{s}
                </button>
              ))}
            </div>
          )}
          {source === 'youtube' && (
            <p className="text-[11px] text-muted-foreground">
              Searches break/opener videos and mines their commenters — highly
              engaged buyers.
            </p>
          )}
          {source === 'twitch' && (
            <p className="text-[11px] text-muted-foreground">
              Finds card breakers / streamers (sellers & community hubs) —
              great for partnerships and seller outreach.
            </p>
          )}
        </div>
      </Card>

      {/* Not configured */}
      {searched && !configured && (
        <Card className="bg-[rgba(22,22,22,1)] border-amber-500/20 p-5">
          <div className="flex items-start gap-2.5 text-sm text-amber-200/90">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              {SOURCES.find(s => s.key === source)?.label} discovery isn't
              connected yet — set {CONFIG_HINT[source]} on the API, then restart
              it and search again.
            </div>
          </div>
        </Card>
      )}

      {/* Results */}
      {configured && leads.length > 0 && (
        <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-5">
          <div className="text-sm font-medium text-white mb-3">
            {leads.length} result{leads.length === 1 ? '' : 's'}
          </div>
          <div className="space-y-2">
            {leads.map(l => {
              const headline = l.title || l.text || '(no text)';
              const sub = l.title ? l.text : '';
              return (
                <div
                  key={l.id}
                  className="rounded-lg border border-white/5 bg-black/30 p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground mb-1">
                        {l.community && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-normal border-orange-500/30 bg-orange-500/10 text-orange-300"
                          >
                            {l.platform === 'reddit'
                              ? `r/${l.community}`
                              : l.community}
                          </Badge>
                        )}
                        <span className="text-white/70">
                          {authorLabel(l)}
                          {l.authorDisplay ? ` · ${l.authorDisplay}` : ''}
                        </span>
                        {l.upvotes != null && (
                          <span className="inline-flex items-center gap-1">
                            {l.platform === 'reddit' ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : l.platform === 'youtube' ? (
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
                        {l.createdAt > 0 && (
                          <span>{moment.unix(l.createdAt).fromNow()}</span>
                        )}
                      </div>
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-white hover:text-[#B4FF39] inline-flex items-start gap-1"
                      >
                        <span className="line-clamp-2">{headline}</span>
                        <ExternalLink className="h-3 w-3 mt-1 shrink-0 text-muted-foreground" />
                      </a>
                      {sub && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {sub}
                        </p>
                      )}
                    </div>
                    {canAdd && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-60"
                        onClick={() => addAsProspect(l)}
                        disabled={!!added[l.id]}
                      >
                        {added[l.id] ? (
                          <>
                            <Check className="h-3.5 w-3.5 mr-1.5" /> Added
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Add
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Empty after search */}
      {searched && configured && !loading && leads.length === 0 && (
        <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-8 text-center text-sm text-muted-foreground">
          No results matched. Try broader terms
          {isReddit ? ', a different subreddit,' : ''} or a different source.
        </Card>
      )}
    </div>
  );
};
