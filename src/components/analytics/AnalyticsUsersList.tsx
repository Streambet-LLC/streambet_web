import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { useCollectorProfiles } from '@/hooks/useCollectorAnalytics';
import { useIsRealDataOnly } from '@/hooks/useRealDataOnly';
import { Search, ArrowUpRight } from 'lucide-react';

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

export const AnalyticsUsersList = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [persona, setPersona] = useState<'all' | Persona>('all');
  const [category, setCategory] = useState<'all' | AssetCategory>('all');
  const [sort, setSort] = useState<'spend' | 'confidence' | 'predicted' | 'engagement'>('predicted');

  const realOnly = useIsRealDataOnly();

  // Pull real CardCade profiles (with seller socials + buy/sell totals).
  // The hook returns rows already merged onto the AnalyticsUser shape so
  // the table doesn't need to care about API vs mock plumbing. When the
  // network is loading we transparently fall back to mocks — unless the
  // admin has explicitly toggled "real data only", in which case we show
  // nothing rather than fake rows.
  const { data: profilesData, isLoading } = useCollectorProfiles({
    limit: 100,
    search: query.trim() || undefined,
  });
  const sourceUsers: AnalyticsUser[] = profilesData?.rows
    ?? (realOnly ? [] : MOCK_ANALYTICS_USERS);

  const rows = useMemo(() => {
    let list = sourceUsers.filter(u => {
      if (persona !== 'all' && u.persona !== persona) return false;
      if (category !== 'all' && !u.topCategories.includes(category)) return false;
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
  }, [sourceUsers, query, persona, category, sort]);

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
              <th className="py-3 pr-4 text-right">
                {realOnly ? '30d Spend' : 'Predicted 30d'}
              </th>
              {!realOnly && <th className="py-3 pr-4 w-[140px]">Engagement</th>}
              <th className="py-3 pr-2 w-[40px]"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(u => (
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
            {rows.length === 0 && (
              <tr>
                <td colSpan={realOnly ? 5 : 8} className="py-8 text-center text-muted-foreground">
                  {isLoading ? 'Loading collector profiles…' : 'No profiles match the current filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
