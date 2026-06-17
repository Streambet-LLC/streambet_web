import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MOCK_ANALYTICS_USERS,
  formatUsd,
  type Persona,
  type AssetCategory,
  type AnalyticsUser,
} from '@/mocks/analytics';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { PersonaBadge, CategoryBadge, ScoreMeter } from './AnalyticsBadges';
import { AnalyticsCreateProfileDialog } from './AnalyticsCreateProfileDialog';
import {
  useCollectorProfiles,
  useSetCollectorExclusion,
} from '@/hooks/useCollectorAnalytics';
import { useIsRealDataOnly } from '@/hooks/useRealDataOnly';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Search,
  ArrowUpRight,
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  EyeOff,
  Eye,
} from 'lucide-react';

const PERSONAS: ('all' | Persona)[] = [
  'all',
  'Whale Collector',
  'Set Builder',
  'Vintage Hunter',
  'Speculator',
  'Casual Flipper',
  'Bargain Hunter',
  'Loyal Fan',
  'New Account',
];

const CATEGORIES: ('all' | AssetCategory)[] = ['all', 'pokemon', 'one_piece', 'sports', 'other'];

// Server-side page size for the real-data profiles list.
const PAGE_SIZE = 50;

// Column-header sort keys (client-side sort of the loaded page).
type ColSortKey = 'name' | 'persona' | 'affiliation' | 'location' | 'volume' | 'spend';
// These sort high→low on first click (numeric); the rest sort A→Z.
const NUMERIC_SORT_KEYS = new Set<ColSortKey>(['volume', 'spend']);

// Buyer-volume badge colors (High/Medium/Low).
const VOLUME_STYLES: Record<'High' | 'Medium' | 'Low', string> = {
  High: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Medium: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Low: 'bg-white/5 text-white/60 border-white/10',
};

export const AnalyticsUsersList = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [persona, setPersona] = useState<'all' | Persona>('all');
  const [category, setCategory] = useState<'all' | AssetCategory>('all');
  const [sort, setSort] = useState<
    'recent' | 'spend' | 'confidence' | 'predicted' | 'engagement'
  >('recent');
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [showOmitted, setShowOmitted] = useState(false);

  // Client-side column-header sort (overrides the server order for the loaded
  // page). Null = use the server order (which defaults to recently-added).
  const [headerSort, setHeaderSort] = useState<{
    key: ColSortKey;
    dir: 'asc' | 'desc';
  } | null>(null);
  const toggleHeaderSort = (key: ColSortKey) =>
    setHeaderSort(prev =>
      prev && prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: NUMERIC_SORT_KEYS.has(key) ? 'desc' : 'asc' }
    );

  /** A clickable, sortable column header (toggles asc/desc, shows an arrow). */
  const sortHead = (label: string, key: ColSortKey, thClass = '') => (
    <th className={`py-3 pr-4 ${thClass}`}>
      <button
        type="button"
        onClick={() => toggleHeaderSort(key)}
        className="inline-flex items-center gap-1 hover:text-white transition-colors"
      >
        <span>{label}</span>
        <span className="text-[8px] leading-none w-2 inline-block">
          {headerSort?.key === key
            ? headerSort.dir === 'asc'
              ? '▲'
              : '▼'
            : ''}
        </span>
      </button>
    </th>
  );

  const realOnly = useIsRealDataOnly();
  const isMobile = useIsMobile();
  const setExclusion = useSetCollectorExclusion();

  const handleToggleOmit = (
    e: MouseEvent,
    userId: string,
    nextExcluded: boolean
  ) => {
    e.stopPropagation();
    setExclusion.mutate(
      { userId, excluded: nextExcluded },
      {
        onSuccess: () =>
          toast.success(
            nextExcluded
              ? 'User omitted from analytics'
              : 'User restored to analytics'
          ),
        onError: err =>
          toast.error(
            err instanceof Error ? err.message : 'Failed to update'
          ),
      }
    );
  };

  // Changing a filter/search or the dropdown sort jumps back to page 1 and
  // clears any column-header sort (the dropdown is the global default order).
  useEffect(() => {
    setPage(0);
    setHeaderSort(null);
  }, [query, persona, category, sort, realOnly, showOmitted]);

  // Clicking a column header re-sorts globally too, so reset to page 1.
  useEffect(() => {
    setPage(0);
  }, [headerSort]);

  // The Lifetime/Predicted spend columns are fused into one whose value +
  // header follow the sort dropdown: "Predicted 30-day spend" shows the
  // forecast (green); every other sort shows lifetime spend.
  const spendIsPredicted = sort === 'predicted';
  const spendHeader = spendIsPredicted ? 'Predicted 30D' : 'Lifetime Spend';

  // Effective server-side sort: a column-header click wins (global, with its
  // own direction); otherwise the dropdown sets the order. Both are pushed to
  // the backend so sorting spans the ENTIRE list, not just the loaded page.
  const effectiveSort = headerSort
    ? headerSort.key === 'spend'
      ? spendIsPredicted
        ? 'predicted'
        : 'lifetime'
      : headerSort.key
    : sort === 'predicted'
      ? 'predicted'
      : sort === 'recent'
        ? 'recent'
        : 'lifetime';
  const effectiveDir: 'asc' | 'desc' = headerSort ? headerSort.dir : 'desc';

  // Pull real CardCade profiles (with seller socials + buy/sell totals).
  // The hook returns rows already merged onto the AnalyticsUser shape so
  // the table doesn't need to care about API vs mock plumbing. When the
  // network is loading we transparently fall back to mocks — unless the
  // admin has explicitly toggled "real data only", in which case we show
  // a skeleton table rather than fake rows.
  //
  // Sorting + spend aggregation happen server-side so the list reflects the
  // top spenders across the ENTIRE user base (auctions, shop, ACH, etc.),
  // not just whichever accounts happen to be returned first.
  const {
    data: profilesData,
    isLoading,
    isFetching,
  } = useCollectorProfiles({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    search: query.trim() || undefined,
    sort: effectiveSort,
    dir: effectiveDir,
    category,
    includeOmitted: showOmitted,
  });
  // First-load skeleton: we have no data yet AND we're actually waiting on
  // the network. Subsequent re-fetches (search debounce, sort change) keep
  // the previous rows visible to avoid layout flashes.
  const showSkeleton = isLoading && !profilesData;
  const usingRealData = !!profilesData;
  const sourceUsers: AnalyticsUser[] = profilesData?.rows ?? (realOnly ? [] : MOCK_ANALYTICS_USERS);

  const rows = useMemo(() => {
    let list = sourceUsers.filter(u => {
      if (persona !== 'all' && u.persona !== persona) return false;
      // Category is filtered server-side for real data (by actual purchases).
      // For mock data we still filter client-side over `topCategories`.
      if (!usingRealData && category !== 'all' && !u.topCategories.includes(category)) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        if (
          !u.username.toLowerCase().includes(q) &&
          !u.displayName.toLowerCase().includes(q) &&
          !u.email.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });

    // Real data is ordered GLOBALLY by the server (effectiveSort/effectiveDir),
    // so we keep that order. Only the mock/demo dataset is sorted client-side.
    if (!usingRealData) {
      const rankVolume = (v?: string | null) =>
        v === 'High' ? 3 : v === 'Medium' ? 2 : v === 'Low' ? 1 : 0;
      if (headerSort) {
        const acc = (u: AnalyticsUser): string | number => {
          switch (headerSort.key) {
            case 'name':
              return u.displayName.toLowerCase();
            case 'persona':
              return (u.persona || '').toLowerCase();
            case 'affiliation':
              return (u.affiliation || '').toLowerCase();
            case 'location':
              return (u.location || '').toLowerCase();
            case 'volume':
              return rankVolume(u.volume);
            case 'spend':
              return spendIsPredicted
                ? u.predicted30dSpendUsd
                : u.lifetimeSpendUsd;
          }
        };
        list = [...list].sort((a, b) => {
          const av = acc(a);
          const bv = acc(b);
          const c =
            typeof av === 'number' && typeof bv === 'number'
              ? av - bv
              : String(av).localeCompare(String(bv));
          return headerSort.dir === 'asc' ? c : -c;
        });
      } else {
        list = [...list].sort((a, b) => {
          switch (sort) {
            case 'spend':
              return b.lifetimeSpendUsd - a.lifetimeSpendUsd;
            case 'predicted':
              return b.predicted30dSpendUsd - a.predicted30dSpendUsd;
            case 'confidence':
              return b.unifiedConfidence - a.unifiedConfidence;
            case 'engagement':
              return b.engagementScore - a.engagementScore;
            case 'recent':
            default:
              return 0;
          }
        });
      }
    }

    return list;
  }, [
    sourceUsers,
    query,
    persona,
    category,
    sort,
    usingRealData,
    headerSort,
    spendIsPredicted,
  ]);

  // Pagination math (real-data mode only — mocks render as a single page).
  const total = profilesData?.total ?? rows.length;
  const totalPages = usingRealData ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;
  const canPrev = usingRealData && page > 0;
  const canNext = usingRealData && page < totalPages - 1;
  const rangeStart = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd = usingRealData ? Math.min(total, (page + 1) * PAGE_SIZE) : rows.length;

  return (
    <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-4 sm:p-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 mb-5">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={isMobile ? 'Search…' : 'Search by username, name, or email…'}
            className="pl-9 bg-black/40 border-white/10"
          />
        </div>
        <Select
          value={persona}
          onValueChange={v => setPersona(v as 'all' | Persona)}
          disabled={realOnly}
        >
          <SelectTrigger className="w-full sm:w-[180px] bg-black/40 border-white/10">
            <SelectValue placeholder="Persona" />
          </SelectTrigger>
          <SelectContent>
            {PERSONAS.map(p => (
              <SelectItem key={p} value={p}>
                {p === 'all' ? 'All Personas' : p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={v => setCategory(v as 'all' | AssetCategory)}>
          <SelectTrigger className="w-full sm:w-[160px] bg-black/40 border-white/10">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => (
              <SelectItem key={c} value={c}>
                {c === 'all'
                  ? 'All Categories'
                  : c === 'pokemon'
                    ? 'Pokémon'
                    : c === 'one_piece'
                      ? 'One Piece'
                      : c === 'sports'
                        ? 'Sports'
                        : 'Other'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={v => setSort(v as typeof sort)}>
          <SelectTrigger className="w-full sm:w-[200px] bg-black/40 border-white/10">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recently added</SelectItem>
            <SelectItem value="predicted">
              Predicted 30-day spend
            </SelectItem>
            <SelectItem value="spend">Lifetime spend</SelectItem>
            {!realOnly && <SelectItem value="confidence">Identity confidence</SelectItem>}
            {!realOnly && <SelectItem value="engagement">Engagement</SelectItem>}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 px-1 shrink-0">
          <Switch
            id="show-omitted"
            checked={showOmitted}
            onCheckedChange={setShowOmitted}
          />
          <label
            htmlFor="show-omitted"
            className="text-xs text-muted-foreground whitespace-nowrap cursor-pointer"
          >
            Show omitted
          </label>
        </div>
        <Button
          className="h-10 bg-[#B4FF39] text-black hover:bg-[#a2e833] w-full sm:w-auto sm:ml-auto"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1.5" /> Add profile
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-muted-foreground border-b border-white/5">
              {sortHead('User', 'name')}
              {sortHead('Persona', 'persona', 'hidden md:table-cell')}
              <th className="py-3 pr-4 hidden md:table-cell">Top Categories</th>
              {sortHead('Affiliation', 'affiliation', 'hidden lg:table-cell')}
              {sortHead('Location', 'location', 'hidden lg:table-cell')}
              {sortHead('Volume', 'volume', 'hidden sm:table-cell')}
              {!realOnly && (
                <th className="py-3 pr-4 w-[160px] hidden lg:table-cell">
                  Identity Confidence
                </th>
              )}
              {sortHead(spendHeader, 'spend', 'text-center')}
              {!realOnly && (
                <th className="py-3 pr-4 w-[140px] hidden lg:table-cell">
                  Engagement
                </th>
              )}
              <th className="py-3 pr-2 w-[40px]"></th>
            </tr>
          </thead>
          <tbody>
            {showSkeleton &&
              Array.from({ length: 8 }).map((_, i) => (
                <tr
                  key={`skeleton-${i}`}
                  className="border-b border-white/5 last:border-0"
                  aria-busy="true"
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full bg-white/10" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3 w-32 bg-white/10" />
                        <Skeleton className="h-2.5 w-20 bg-white/5" />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 hidden md:table-cell">
                    <Skeleton className="h-5 w-24 bg-white/10" />
                  </td>
                  <td className="py-3 pr-4 hidden md:table-cell">
                    <Skeleton className="h-5 w-28 bg-white/10" />
                  </td>
                  <td className="py-3 pr-4 hidden lg:table-cell">
                    <Skeleton className="h-5 w-20 bg-white/10" />
                  </td>
                  <td className="py-3 pr-4 hidden lg:table-cell">
                    <Skeleton className="h-5 w-24 bg-white/10" />
                  </td>
                  <td className="py-3 pr-4 hidden sm:table-cell">
                    <Skeleton className="h-5 w-16 bg-white/10" />
                  </td>
                  {!realOnly && (
                    <td className="py-3 pr-4 hidden lg:table-cell">
                      <Skeleton className="h-2 w-full bg-white/10" />
                    </td>
                  )}
                  <td className="py-3 pr-4 text-center">
                    <Skeleton className="h-4 w-16 mx-auto bg-white/10" />
                  </td>
                  {!realOnly && (
                    <td className="py-3 pr-4 hidden lg:table-cell">
                      <Skeleton className="h-2 w-full bg-white/10" />
                    </td>
                  )}
                  <td className="py-3 pr-2">
                    <Skeleton className="h-8 w-8 ml-auto bg-white/5" />
                  </td>
                </tr>
              ))}
            {!showSkeleton &&
              rows.map(u => (
                <tr
                  key={u.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer transition-colors"
                  onClick={() => navigate(`/analytics/${u.id}`)}
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-[#B4FF39]/20 text-[#B4FF39] text-xs">
                          {u.displayName
                            .split(' ')
                            .map(s => s[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-medium text-white truncate flex items-center gap-2">
                          <span className="truncate">{u.displayName}</span>
                          <Badge
                            variant="outline"
                            className={`shrink-0 text-[10px] font-normal ${
                              u.manuallyAdded
                                ? 'border-violet-400/30 bg-violet-400/10 text-violet-300'
                                : 'border-white/10 bg-white/5 text-white/50'
                            }`}
                          >
                            {u.manuallyAdded ? 'Manual' : 'Auto'}
                          </Badge>
                          {u.excluded && (
                            <Badge
                              variant="outline"
                              className="shrink-0 border-amber-400/30 bg-amber-400/10 text-amber-300 text-[10px] font-normal"
                            >
                              Omitted
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {u.username ? `@${u.username}` : (
                            <span className="italic">no account yet</span>
                          )}
                        </div>
                        {/* Mobile-only meta: surfaces columns hidden on small screens */}
                        {(u.persona || u.volume || u.location) && (
                          <div className="md:hidden mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground">
                            {u.persona && (
                              <span className="text-white/70">{u.persona}</span>
                            )}
                            {u.volume && (
                              <span
                                className={`rounded px-1.5 py-0.5 border ${VOLUME_STYLES[u.volume]}`}
                              >
                                {u.volume}
                              </span>
                            )}
                            {u.location && (
                              <span className="whitespace-nowrap">{u.location}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 hidden md:table-cell">
                    {realOnly ? (
                      u.persona ? (
                        <span className="text-white/90">{u.persona}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )
                    ) : (
                      <PersonaBadge persona={u.persona} />
                    )}
                  </td>
                  <td className="py-3 pr-4 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {u.topCategories.map(c => (
                        <CategoryBadge key={c} category={c} />
                      ))}
                    </div>
                    {u.topCategories.includes('sports') &&
                      ((u.preferredSports?.length ?? 0) > 0 ||
                        (u.preferredTeams?.length ?? 0) > 0) && (
                        <div className="flex flex-wrap gap-1 mt-1 pl-0.5">
                          {(u.preferredSports ?? []).map(s => (
                            <span
                              key={s}
                              className="text-[10px] rounded px-1.5 py-0.5 bg-sky-500/10 text-sky-300 border border-sky-500/20"
                            >
                              {s}
                            </span>
                          ))}
                          {(u.preferredTeams ?? []).map(t => (
                            <span
                              key={t}
                              className="text-[10px] rounded px-1.5 py-0.5 bg-white/5 text-white/70 border border-white/10"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                  </td>
                  <td className="py-3 pr-4 hidden lg:table-cell">
                    {u.affiliation ? (
                      <span className="text-white/90">{u.affiliation}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 hidden lg:table-cell">
                    {u.location ? (
                      <span className="text-white/90 whitespace-nowrap">{u.location}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 hidden sm:table-cell">
                    {u.volume ? (
                      <span
                        className={`text-[11px] rounded px-1.5 py-0.5 border ${VOLUME_STYLES[u.volume]}`}
                      >
                        {u.volume}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  {!realOnly && (
                    <td className="py-3 pr-4 hidden lg:table-cell">
                      <ScoreMeter value={u.unifiedConfidence} />
                    </td>
                  )}
                  <td
                    className={`py-3 pr-4 text-center ${
                      spendIsPredicted
                        ? 'text-[#B4FF39] font-medium'
                        : 'text-white'
                    }`}
                  >
                    {formatUsd(
                      spendIsPredicted
                        ? u.predicted30dSpendUsd
                        : u.lifetimeSpendUsd
                    )}
                  </td>
                  {!realOnly && (
                    <td className="py-3 pr-4 hidden lg:table-cell">
                      <ScoreMeter value={u.engagementScore} />
                    </td>
                  )}
                  <td className="py-3 pr-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={e => {
                          e.stopPropagation();
                          navigate(`/analytics/${u.id}`);
                        }}
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={e => e.stopPropagation()}
                            aria-label="Row actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          onClick={e => e.stopPropagation()}
                        >
                          {u.excluded ? (
                            <DropdownMenuItem
                              onClick={e => handleToggleOmit(e, u.id, false)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Restore to analytics
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="text-amber-300 focus:text-amber-300"
                              onClick={e => handleToggleOmit(e, u.id, true)}
                            >
                              <EyeOff className="h-4 w-4 mr-2" />
                              Omit from analytics
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            {!showSkeleton && rows.length === 0 && (
              <tr>
                <td colSpan={realOnly ? 8 : 10} className="py-8 text-center text-muted-foreground">
                  {isFetching ? 'Refreshing…' : 'No profiles match the current filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination (real-data mode) */}
      {usingRealData && !showSkeleton && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
          <div className="text-xs text-muted-foreground">
            {total === 0
              ? 'No collectors'
              : `Showing ${rangeStart.toLocaleString()}–${rangeEnd.toLocaleString()} of ${total.toLocaleString()}`}
            {isFetching && total > 0 ? ' · Refreshing…' : ''}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-white/10 bg-black/40"
              disabled={!canPrev}
              onClick={() => setPage(p => Math.max(0, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-white/10 bg-black/40"
              disabled={!canNext}
              onClick={() => setPage(p => p + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <AnalyticsCreateProfileDialog open={createOpen} onOpenChange={setCreateOpen} />
    </Card>
  );
};
