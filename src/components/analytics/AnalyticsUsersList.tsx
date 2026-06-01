import { useEffect, useMemo, useState } from 'react';
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
import { PersonaBadge, CategoryBadge, ScoreMeter } from './AnalyticsBadges';
import { AnalyticsCreateProfileDialog } from './AnalyticsCreateProfileDialog';
import { useCollectorProfiles } from '@/hooks/useCollectorAnalytics';
import { useIsRealDataOnly } from '@/hooks/useRealDataOnly';
import { Search, ArrowUpRight, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

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

export const AnalyticsUsersList = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [persona, setPersona] = useState<'all' | Persona>('all');
  const [category, setCategory] = useState<'all' | AssetCategory>('all');
  const [sort, setSort] = useState<'spend' | 'confidence' | 'predicted' | 'engagement'>('spend');
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  const realOnly = useIsRealDataOnly();

  // Any change to the filters/search/sort invalidates the current page
  // offset, so jump back to the first page to avoid landing on an empty
  // out-of-range page.
  useEffect(() => {
    setPage(0);
  }, [query, persona, category, sort, realOnly]);

  // Map the UI sort control onto the server-side sort key. Only the real
  // spend-based sorts can be pushed to the backend; the mock-only sorts
  // (confidence/engagement) fall back to lifetime spend server-side and are
  // re-sorted client-side over the returned rows.
  const serverSort: 'lifetime' | 'last30d' | 'recent' =
    sort === 'predicted' ? 'last30d' : 'lifetime';

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
    sort: serverSort,
    category,
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

    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'spend':
          return b.lifetimeSpendUsd - a.lifetimeSpendUsd;
        case 'confidence':
          return b.unifiedConfidence - a.unifiedConfidence;
        case 'engagement':
          return b.engagementScore - a.engagementScore;
        case 'predicted':
        default:
          return b.predicted30dSpendUsd - a.predicted30dSpendUsd;
      }
    });

    return list;
  }, [sourceUsers, query, persona, category, sort, usingRealData]);

  // Pagination math (real-data mode only — mocks render as a single page).
  const total = profilesData?.total ?? rows.length;
  const totalPages = usingRealData ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;
  const canPrev = usingRealData && page > 0;
  const canNext = usingRealData && page < totalPages - 1;
  const rangeStart = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd = usingRealData ? Math.min(total, (page + 1) * PAGE_SIZE) : rows.length;

  return (
    <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-6">
      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by username, name, or email…"
            className="pl-9 bg-black/40 border-white/10"
          />
        </div>
        <Select
          value={persona}
          onValueChange={v => setPersona(v as 'all' | Persona)}
          disabled={realOnly}
        >
          <SelectTrigger className="w-full lg:w-[180px] bg-black/40 border-white/10">
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
          <SelectTrigger className="w-full lg:w-[160px] bg-black/40 border-white/10">
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
          <SelectTrigger className="w-full lg:w-[200px] bg-black/40 border-white/10">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="predicted">
              {realOnly ? '30-day spend' : 'Predicted 30-day spend'}
            </SelectItem>
            <SelectItem value="spend">Lifetime spend</SelectItem>
            {!realOnly && <SelectItem value="confidence">Identity confidence</SelectItem>}
            {!realOnly && <SelectItem value="engagement">Engagement</SelectItem>}
          </SelectContent>
        </Select>
        <Button
          className="h-10 bg-[#B4FF39] text-black hover:bg-[#a2e833] w-full lg:w-auto"
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
              <th className="py-3 pr-4">User</th>
              {!realOnly && <th className="py-3 pr-4">Persona</th>}
              <th className="py-3 pr-4">Top Categories</th>
              {!realOnly && <th className="py-3 pr-4 w-[160px]">Identity Confidence</th>}
              <th className="py-3 pr-4 text-right">Lifetime Spend</th>
              <th className="py-3 pr-4 text-right">{realOnly ? '30d Spend' : 'Predicted 30d'}</th>
              {!realOnly && <th className="py-3 pr-4 w-[140px]">Engagement</th>}
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
                  {!realOnly && (
                    <td className="py-3 pr-4">
                      <Skeleton className="h-5 w-24 bg-white/10" />
                    </td>
                  )}
                  <td className="py-3 pr-4">
                    <Skeleton className="h-5 w-28 bg-white/10" />
                  </td>
                  {!realOnly && (
                    <td className="py-3 pr-4">
                      <Skeleton className="h-2 w-full bg-white/10" />
                    </td>
                  )}
                  <td className="py-3 pr-4 text-right">
                    <Skeleton className="h-4 w-16 ml-auto bg-white/10" />
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <Skeleton className="h-4 w-16 ml-auto bg-white/10" />
                  </td>
                  {!realOnly && (
                    <td className="py-3 pr-4">
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
                        <div className="font-medium text-white truncate">{u.displayName}</div>
                        <div className="text-xs text-muted-foreground truncate">@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  {!realOnly && (
                    <td className="py-3 pr-4">
                      <PersonaBadge persona={u.persona} />
                    </td>
                  )}
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {u.topCategories.map(c => (
                        <CategoryBadge key={c} category={c} />
                      ))}
                    </div>
                  </td>
                  {!realOnly && (
                    <td className="py-3 pr-4">
                      <ScoreMeter value={u.unifiedConfidence} />
                    </td>
                  )}
                  <td className="py-3 pr-4 text-right text-white">
                    {formatUsd(u.lifetimeSpendUsd)}
                  </td>
                  <td className="py-3 pr-4 text-right text-[#B4FF39] font-medium">
                    {formatUsd(u.predicted30dSpendUsd)}
                  </td>
                  {!realOnly && (
                    <td className="py-3 pr-4">
                      <ScoreMeter value={u.engagementScore} />
                    </td>
                  )}
                  <td className="py-3 pr-2 text-right">
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
                  </td>
                </tr>
              ))}
            {!showSkeleton && rows.length === 0 && (
              <tr>
                <td colSpan={realOnly ? 5 : 8} className="py-8 text-center text-muted-foreground">
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
