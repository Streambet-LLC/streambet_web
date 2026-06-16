import { useNavigate, useParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  getMockAnalyticsUser,
  formatUsd,
  platformLabel,
  type LinkedAccount,
  type MatchCandidate,
  type SocialPlatform,
  type UnmatchedPlatform,
  type ActivityEvent,
} from '@/mocks/analytics';
import {
  PersonaBadge,
  CategoryBadge,
  PlatformIcon,
  ScoreMeter,
} from './AnalyticsBadges';
import { useDemoTicker } from '@/hooks/useDemoTicker';
import {
  useCollectorProfileDetail,
  useCollectorProfileDetailRaw,
} from '@/hooks/useCollectorAnalytics';
import { useIsRealDataOnly } from '@/hooks/useRealDataOnly';
import {
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  Info,
  ChevronRight,
  Plus,
  Search,
  X as XIcon,
  UserPlus,
  Pencil,
} from 'lucide-react';
import moment from 'moment';
import { AnalyticsEditProfileDialog } from './AnalyticsEditProfileDialog';

const SectionCard = ({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <Card className={`bg-[rgba(22,22,22,1)] border-white/5 p-6 flex flex-col ${className}`}>
    <div className="mb-4">
      <div className="text-sm font-medium text-white">{title}</div>
      {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
    </div>
    <div className="flex-1 min-h-0 flex flex-col">{children}</div>
  </Card>
);

/** Small provenance pill: admin-entered (Manual) vs derived from activity (Auto). */
const SourceTag = ({ source }: { source: 'manual' | 'auto' }) => (
  <Badge
    variant="outline"
    className={`text-[9px] py-0 px-1.5 font-medium shrink-0 ${
      source === 'manual'
        ? 'border-violet-400/30 bg-violet-400/10 text-violet-300'
        : 'border-white/10 bg-white/5 text-white/50'
    }`}
  >
    {source === 'manual' ? 'MANUAL' : 'AUTO'}
  </Badge>
);

/** One labeled row in the Collector Profile Data card. */
const DataRow = ({
  label,
  source,
  children,
}: {
  label: string;
  source?: 'manual' | 'auto' | null;
  children: React.ReactNode;
}) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
    <div className="text-xs text-muted-foreground w-36 shrink-0 pt-0.5">{label}</div>
    <div className="flex-1 min-w-0 text-sm text-white/90">{children}</div>
    {source && <SourceTag source={source} />}
  </div>
);

const DataChips = ({ items }: { items: string[] }) => (
  <div className="flex flex-wrap gap-1">
    {items.map(i => (
      <Badge
        key={i}
        variant="outline"
        className="bg-white/5 border-white/10 text-[11px] font-normal text-white/80"
      >
        {i}
      </Badge>
    ))}
  </div>
);

const Dash = () => <span className="text-muted-foreground">—</span>;

/**
 * Loading placeholder for the detail page. Mirrors the real layout
 * (header card → 3-col identity grid → activity feed) so the page
 * doesn't reflow once data arrives, and so admins don't briefly see
 * mock data or the "Profile not found" empty state.
 */
const AnalyticsUserDetailSkeleton = ({ onBack }: { onBack: () => void }) => (
  <div className="space-y-6" aria-busy="true">
    <div className="flex items-center justify-between">
      <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Analytics
      </Button>
      <Skeleton className="h-9 w-32 bg-white/10" />
    </div>

    {/* Header card */}
    <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-6">
      <div className="flex items-start gap-4">
        <Skeleton className="h-16 w-16 rounded-full bg-white/10" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-48 bg-white/10" />
          <Skeleton className="h-3 w-32 bg-white/5" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-5 w-24 bg-white/10" />
            <Skeleton className="h-5 w-20 bg-white/10" />
            <Skeleton className="h-5 w-16 bg-white/10" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 min-w-[240px]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-2.5 w-16 bg-white/5" />
              <Skeleton className="h-5 w-20 bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    </Card>

    {/* Three-column identity / activity row */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {Array.from({ length: 3 }).map((_, col) => (
        <Card key={col} className="bg-[rgba(22,22,22,1)] border-white/5 p-6 space-y-4">
          <Skeleton className="h-4 w-32 bg-white/10" />
          <Skeleton className="h-3 w-48 bg-white/5" />
          <div className="space-y-3 pt-2">
            {Array.from({ length: 4 }).map((_, row) => (
              <div key={row} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full bg-white/10" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-3/4 bg-white/10" />
                  <Skeleton className="h-2.5 w-1/2 bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>

    {/* Activity feed */}
    <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-6 space-y-4">
      <Skeleton className="h-4 w-40 bg-white/10" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Skeleton className="h-8 w-8 rounded bg-white/10" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-2/3 bg-white/10" />
                <Skeleton className="h-2.5 w-1/3 bg-white/5" />
              </div>
            </div>
            <Skeleton className="h-4 w-16 bg-white/10" />
          </div>
        ))}
      </div>
    </Card>
  </div>
);

export const AnalyticsUserDetail = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  // Try to load this profile from the real backend (real socials + real
  // recent orders). If the API call returns nothing — e.g. the userId is a
  // mock-only id from the demo dataset — fall back to the original mock
  // record so the page still renders end-to-end. When the global toggle
  // is on we skip the mock fallback entirely.
  const { data: apiUser, isLoading: apiLoading } = useCollectorProfileDetail(userId);
  // Raw (un-merged) detail for the per-field provenance breakdown — gives us
  // the actual annotations so we can tell admin overrides from auto-derived.
  const { data: rawDetail } = useCollectorProfileDetailRaw(
    apiUser && userId ? userId : undefined,
  );
  const realOnly = useIsRealDataOnly();
  const mockUser = userId && !realOnly ? getMockAnalyticsUser(userId) : undefined;
  const user = apiUser ?? mockUser;
  // Show a skeleton while the API is still resolving and we don't yet have
  // *anything* to render. In `realOnly` mode there is no mock fallback, so
  // the skeleton is the only thing standing between the user and a flash of
  // the "Profile not found" empty state.
  const showSkeleton = apiLoading && !apiUser && !mockUser;
  const [openAccount, setOpenAccount] = useState<LinkedAccount | null>(null);
  const [confidenceOpen, setConfidenceOpen] = useState(false);
  const [engagementOpen, setEngagementOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  /**
   * Live demo activity: prepended every ~8-15s to make the timeline feel
   * real-time. New events are flagged with `__live` so we can highlight them.
   */
  const [liveActivity, setLiveActivity] = useState<(ActivityEvent & { __live?: boolean })[]>(
    [],
  );

  /**
   * Local overlay for admin-applied links. Demo-only — keeps changes in
   * component state so the underlying mock object is not mutated.
   */
  const [adminLinks, setAdminLinks] = useState<LinkedAccount[]>([]);
  const [dismissedCandidates, setDismissedCandidates] = useState<Set<string>>(new Set());

  /** Modal state for the admin "link an account" flow. */
  const [linkModal, setLinkModal] = useState<
    | { platform: SocialPlatform; candidates: MatchCandidate[]; presetHandle?: string }
    | null
  >(null);
  const [manualHandle, setManualHandle] = useState('');

  const linkedAccounts = useMemo(
    () => (user ? [...user.linkedAccounts, ...adminLinks] : []),
    [user, adminLinks],
  );
  const linkedPlatforms = useMemo(
    () => new Set(linkedAccounts.map(a => a.platform)),
    [linkedAccounts],
  );
  const unmatchedPlatforms: UnmatchedPlatform[] = useMemo(() => {
    if (!user?.unmatchedPlatforms) return [];
    return user.unmatchedPlatforms
      .filter(p => !linkedPlatforms.has(p.platform))
      .map(p => ({
        ...p,
        candidates: p.candidates.filter(
          c => !dismissedCandidates.has(`${p.platform}:${c.handle}`),
        ),
      }));
  }, [user, linkedPlatforms, dismissedCandidates]);

  /**
   * Decompose the unified identity confidence score into weighted
   * contributors so admins can audit *why* the score is what it is.
   * All numbers are derived from linkedAccounts so manual edits update
   * the breakdown live.
   */
  const confidenceBreakdown = useMemo(() => {
    const accounts = linkedAccounts;
    const n = accounts.length;
    const avgMatch = n
      ? Math.round(accounts.reduce((a, x) => a + x.confidence, 0) / n)
      : 0;
    const verifiedCount = accounts.filter(a => a.verified).length;
    const manualCount = accounts.filter(a => a.manuallyLinked).length;
    const signalCount = accounts.reduce((a, x) => a + x.signals.length, 0);
    // Coverage score: how many distinct platforms out of 7 we've linked.
    const coverage = Math.min(100, Math.round((n / 7) * 100));
    // Signal density: cap at ~3 strong signals per account.
    const density = Math.min(100, Math.round((signalCount / Math.max(1, n * 3)) * 100));
    // Verification boost: % of accounts with platform-level verification.
    const verification = n ? Math.round((verifiedCount / n) * 100) : 0;
    // Manual confirmation boost.
    const manualConfirm = n ? Math.round((manualCount / n) * 100) : 0;

    return [
      {
        key: 'avg-match',
        label: 'Average per-account match',
        value: avgMatch,
        weight: 0.45,
        detail: `${n} linked accounts · mean confidence ${avgMatch}%`,
      },
      {
        key: 'coverage',
        label: 'Platform coverage',
        value: coverage,
        weight: 0.2,
        detail: `${n}/7 platforms with at least one linked account`,
      },
      {
        key: 'density',
        label: 'Signal density',
        value: density,
        weight: 0.15,
        detail: `${signalCount} contributing signals across all accounts`,
      },
      {
        key: 'verification',
        label: 'Platform verification',
        value: verification,
        weight: 0.1,
        detail: `${verifiedCount} of ${n} accounts platform-verified`,
      },
      {
        key: 'manual',
        label: 'Admin confirmation',
        value: manualConfirm,
        weight: 0.1,
        detail: manualCount
          ? `${manualCount} account${manualCount === 1 ? '' : 's'} manually confirmed`
          : 'No admin overrides applied yet',
      },
    ];
  }, [linkedAccounts]);

  /**
   * Decompose the engagement score into recency, breadth, transaction
   * activity, and social amplification factors. Derived deterministically
   * from the user's mock dataset so the math stays plausible across reloads.
   */
  const engagementBreakdown = useMemo(() => {
    if (!user) return [];
    const recent = user.recentActivity;
    const purchases = recent.filter(e => e.kind === 'purchase' || e.kind === 'sale').length;
    const bids = recent.filter(e => e.kind === 'bid').length;
    const watchlist = recent.filter(e => e.kind === 'watchlist').length;
    const social = recent.filter(e => e.kind === 'social_mention').length;
    const sources = new Set(recent.map(e => e.source)).size;
    const daysSinceLast = recent.length
      ? Math.max(
          0,
          Math.round((Date.now() - new Date(recent[0].at).getTime()) / 86_400_000),
        )
      : 30;

    // Recency: 100 if active today, decays linearly to 0 at 30 days idle.
    const recency = Math.max(0, Math.min(100, Math.round(100 - (daysSinceLast / 30) * 100)));
    // Breadth: distinct sources active in last 30d, capped at 5.
    const breadth = Math.min(100, Math.round((sources / 5) * 100));
    // Transactions: purchases + bids in last 30d, capped at 8 events.
    const txn = Math.min(100, Math.round(((purchases + bids) / 8) * 100));
    // Watchlist activity: capped at 4 adds.
    const watching = Math.min(100, Math.round((watchlist / 4) * 100));
    // Social amplification: posts mentioning CardCade content, capped at 4.
    const amplification = Math.min(100, Math.round((social / 4) * 100));

    return [
      {
        key: 'recency',
        label: 'Recency',
        value: recency,
        weight: 0.3,
        detail:
          daysSinceLast === 0
            ? 'Active today'
            : `Last activity ${daysSinceLast} day${daysSinceLast === 1 ? '' : 's'} ago`,
      },
      {
        key: 'breadth',
        label: 'Cross-platform breadth',
        value: breadth,
        weight: 0.2,
        detail: `${sources} distinct source${sources === 1 ? '' : 's'} in last 30 days`,
      },
      {
        key: 'txn',
        label: 'Transaction activity',
        value: txn,
        weight: 0.25,
        detail: `${purchases} purchase/sale event${purchases === 1 ? '' : 's'} · ${bids} bid${bids === 1 ? '' : 's'} (last 30d)`,
      },
      {
        key: 'watching',
        label: 'Watchlist intent',
        value: watching,
        weight: 0.1,
        detail: `${watchlist} watchlist add${watchlist === 1 ? '' : 's'} (last 30d)`,
      },
      {
        key: 'amplification',
        label: 'Social amplification',
        value: amplification,
        weight: 0.15,
        detail: social
          ? `${social} cross-platform mention${social === 1 ? '' : 's'} of CardCade content`
          : 'No tracked social mentions in last 30d',
      },
    ];
  }, [user]);

  const platformUrl = (platform: SocialPlatform, handle: string): string => {    const h = handle.replace(/^@/, '');
    return platform === 'ebay'
      ? `https://www.ebay.com/usr/${h}`
      : platform === 'instagram'
      ? `https://instagram.com/${h}`
      : platform === 'twitter'
      ? `https://twitter.com/${h}`
      : platform === 'tiktok'
      ? `https://tiktok.com/@${h}`
      : platform === 'facebook'
      ? `https://facebook.com/${h}`
      : platform === 'reddit'
      ? `https://reddit.com/user/${h}`
      : `https://discord.com/users/${h}`;
  };

  const confirmCandidate = (platform: SocialPlatform, c: MatchCandidate) => {
    setAdminLinks(prev => [
      ...prev,
      {
        platform,
        handle: c.handle,
        url: c.url,
        confidence: 100,
        followers: c.followers,
        signals: [...c.signals, 'Admin confirmed'],
        manuallyLinked: true,
      },
    ]);
    toast.success(`Linked @${c.handle} on ${platformLabel(platform)}`);
    setLinkModal(null);
  };

  const dismissCandidate = (platform: SocialPlatform, handle: string) => {
    setDismissedCandidates(prev => {
      const next = new Set(prev);
      next.add(`${platform}:${handle}`);
      return next;
    });
  };

  const submitManualLink = () => {
    if (!linkModal) return;
    const handle = manualHandle.trim().replace(/^@/, '');
    if (!handle) {
      toast.error('Handle is required');
      return;
    }
    setAdminLinks(prev => [
      ...prev,
      {
        platform: linkModal.platform,
        handle,
        url: platformUrl(linkModal.platform, handle),
        confidence: 100,
        signals: ['Manually added by admin'],
        manuallyLinked: true,
      },
    ]);
    toast.success(`Linked @${handle} on ${platformLabel(linkModal.platform)}`);
    setLinkModal(null);
    setManualHandle('');
  };

  // ------------------------------------------------------------------
  // Live demo ticker — prepends a fresh activity event every 8-15s.
  // ------------------------------------------------------------------
  useDemoTicker(
    () => {
      if (!user) return;
      const templates: Omit<ActivityEvent, 'id' | 'at'>[] = [
        {
          kind: 'bid',
          source: 'cardcade',
          summary: 'Placed bid on a watched listing',
          amountUsd: Math.round(80 + Math.random() * 1800),
        },
        {
          kind: 'watchlist',
          source: 'cardcade',
          summary: 'Added a new card to watchlist',
        },
        {
          kind: 'search',
          source: 'cardcade',
          summary: 'Searched for a new asset',
        },
        {
          kind: 'social_mention',
          source: linkedAccounts[0]?.platform ?? 'instagram',
          summary: 'New post referencing tracked assets',
        },
        {
          kind: 'purchase',
          source: 'cardcade',
          summary: 'Won an auction',
          amountUsd: Math.round(120 + Math.random() * 2400),
        },
        {
          kind: 'sale',
          source: 'ebay',
          summary: 'Sold a card from inventory',
          amountUsd: Math.round(60 + Math.random() * 900),
        },
      ];
      const t = templates[Math.floor(Math.random() * templates.length)];
      const ev: ActivityEvent & { __live?: boolean } = {
        ...t,
        id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        at: new Date().toISOString(),
        __live: true,
      };
      setLiveActivity(prev => [ev, ...prev].slice(0, 25));
      // Clear the "live" highlight after the pulse animation.
      setTimeout(() => {
        setLiveActivity(prev =>
          prev.map(e => (e.id === ev.id ? { ...e, __live: false } : e)),
        );
      }, 2200);
    },
    { minMs: 8000, maxMs: 15000, enabled: !!user && !realOnly },
  );

  const activityFeed = useMemo<(ActivityEvent & { __live?: boolean })[]>(
    () => [...liveActivity, ...(user?.recentActivity ?? [])],
    [liveActivity, user],
  );

  if (showSkeleton) {
    return <AnalyticsUserDetailSkeleton onBack={() => navigate('/analytics')} />;
  }

  if (!user) {
    return (
      <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-12 text-center">
        <div className="text-muted-foreground">Profile not found.</div>
        <Button
          variant="ghost"
          className="mt-4"
          onClick={() => navigate('/analytics')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Analytics
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back nav + admin edit */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-white -ml-2"
          onClick={() => navigate('/analytics')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          All Profiles
        </Button>
        {!!apiUser && !!userId && (
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 bg-white/5 text-white hover:bg-white/15 hover:text-white hover:border-white/20"
            onClick={() => setEditOpen(true)}
            title="Inject socials + AI annotations"
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit profile
          </Button>
        )}
      </div>

      {/* Header card */}
      <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-[#B4FF39]/20 text-[#B4FF39] text-lg">
              {user.displayName
                .split(' ')
                .map(s => s[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold text-white">{user.displayName}</h2>
              {!realOnly && <PersonaBadge persona={user.persona} />}
              {user.topCategories.map(c => (
                <CategoryBadge key={c} category={c} />
              ))}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {[
                user.username ? `@${user.username}` : 'no account yet',
                user.email || null,
                `joined ${moment(user.joinedAt).format('MMM YYYY')}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </div>
            {!realOnly && user.inferredBio && (
              <p className="text-sm text-white/80 mt-3 max-w-3xl">{user.inferredBio}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-right">
            <div>
              <div className="text-xs text-muted-foreground">Lifetime Spend</div>
              <div className="text-lg font-semibold text-white">
                {formatUsd(user.lifetimeSpendUsd)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Predicted 30d</div>
              <div className="text-lg font-semibold text-[#B4FF39]">
                {formatUsd(user.predicted30dSpendUsd)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">30d Actual</div>
              <div className="text-lg font-semibold text-white">
                {formatUsd(user.actual30dSpendUsd ?? 0)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Purchases</div>
              <div className="text-lg font-semibold text-white">{user.purchaseCount}</div>
            </div>
            {!realOnly && (
              <div>
                <div className="text-xs text-muted-foreground">Win Rate</div>
                <div className="text-lg font-semibold text-white">{user.winRate}%</div>
              </div>
            )}
          </div>
        </div>

        {!realOnly && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/5">
            <button
              type="button"
              onClick={() => setConfidenceOpen(true)}
              className="text-left rounded-md -m-2 p-2 hover:bg-white/[0.03] transition group"
              title="View confidence breakdown"
            >
              <ScoreMeter
                label="Unified Identity Confidence"
                value={user.unifiedConfidence}
              />
              <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground group-hover:text-white/70 flex items-center gap-1">
                <Info className="h-3 w-3" />
                View breakdown
              </div>
            </button>
            <button
              type="button"
              onClick={() => setEngagementOpen(true)}
              className="text-left rounded-md -m-2 p-2 hover:bg-white/[0.03] transition group"
              title="View engagement breakdown"
            >
              <ScoreMeter label="Engagement Score" value={user.engagementScore} />
              <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground group-hover:text-white/70 flex items-center gap-1">
                <Info className="h-3 w-3" />
                View breakdown
              </div>
            </button>
          </div>
        )}
      </Card>

      {/* Collector profile data — every field tagged Manual vs Auto. */}
      {rawDetail && (
        <SectionCard
          title="Collector Profile Data"
          subtitle="Each field is tagged Manual (admin-entered) or Auto (derived from CardCade activity)."
        >
          {(() => {
            const ann = rawDetail.analyticsProfile ?? {};
            return (
              <div className="space-y-0">
                <DataRow label="Record source">
                  <Badge
                    variant="outline"
                    className={`text-[11px] font-normal ${
                      rawDetail.manuallyAdded
                        ? 'border-violet-400/30 bg-violet-400/10 text-violet-300'
                        : 'border-white/10 bg-white/5 text-white/60'
                    }`}
                  >
                    {rawDetail.manuallyAdded
                      ? 'Manually added by admin'
                      : 'Auto (organic signup / buyer)'}
                  </Badge>
                </DataRow>
                <DataRow label="Account">
                  {rawDetail.username || rawDetail.email ? (
                    <span>
                      {rawDetail.username ? `@${rawDetail.username}` : ''}
                      {rawDetail.username && rawDetail.email ? ' · ' : ''}
                      {rawDetail.email ?? ''}
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic">
                      Not linked yet — will tie to a real account when they sign
                      up
                    </span>
                  )}
                </DataRow>
                <DataRow
                  label="Persona"
                  source={rawDetail.persona ? 'manual' : null}
                >
                  {rawDetail.persona ?? <Dash />}
                </DataRow>
                <DataRow
                  label="Affiliation"
                  source={rawDetail.affiliation ? 'manual' : null}
                >
                  {rawDetail.affiliation ?? <Dash />}
                </DataRow>
                <DataRow
                  label="Buyer volume"
                  source={rawDetail.volume ? 'auto' : null}
                >
                  {rawDetail.volume ?? <Dash />}
                </DataRow>
                <DataRow
                  label="Location"
                  source={rawDetail.location ? 'auto' : null}
                >
                  {rawDetail.location ?? <Dash />}
                </DataRow>
                <DataRow
                  label="Preferred sports"
                  source={
                    rawDetail.preferredSports.length
                      ? ann.preferredSports?.length
                        ? 'manual'
                        : 'auto'
                      : null
                  }
                >
                  {rawDetail.preferredSports.length ? (
                    <DataChips items={rawDetail.preferredSports} />
                  ) : (
                    <Dash />
                  )}
                </DataRow>
                <DataRow
                  label="Preferred teams"
                  source={
                    rawDetail.preferredTeams.length
                      ? ann.preferredTeams?.length
                        ? 'manual'
                        : 'auto'
                      : null
                  }
                >
                  {rawDetail.preferredTeams.length ? (
                    <DataChips items={rawDetail.preferredTeams} />
                  ) : (
                    <Dash />
                  )}
                </DataRow>
                <DataRow label="Bio" source={ann.bio ? 'manual' : null}>
                  {ann.bio ?? <Dash />}
                </DataRow>
                <DataRow
                  label="Interests"
                  source={ann.interests?.length ? 'manual' : null}
                >
                  {ann.interests?.length ? (
                    <DataChips items={ann.interests} />
                  ) : (
                    <Dash />
                  )}
                </DataRow>
                <DataRow
                  label="Preferences"
                  source={ann.preferences?.length ? 'manual' : null}
                >
                  {ann.preferences?.length ? (
                    <DataChips items={ann.preferences} />
                  ) : (
                    <Dash />
                  )}
                </DataRow>
                <DataRow label="Notes" source={ann.notes ? 'manual' : null}>
                  {ann.notes ? (
                    <span className="whitespace-pre-wrap">{ann.notes}</span>
                  ) : (
                    <Dash />
                  )}
                </DataRow>
              </div>
            );
          })()}
        </SectionCard>
      )}

      <div className={`grid grid-cols-1 ${realOnly ? '' : 'lg:grid-cols-3'} gap-6`}>
        {/* Linked accounts */}
        <SectionCard
          title={realOnly ? 'Seller Socials' : 'Linked Identities'}
          subtitle={
            realOnly
              ? `${linkedAccounts.length} provided by seller`
              : `${linkedAccounts.length} matched · ${unmatchedPlatforms.length} unmatched platform${unmatchedPlatforms.length === 1 ? '' : 's'}`
          }
          className="lg:col-span-1"
        >
          <div className="flex-1 min-h-0 overflow-y-auto pr-2 -mr-2 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {/* Matched */}
            <div className="space-y-2">
              {linkedAccounts.map(acc => {
                const tone =
                  acc.confidence >= 80
                    ? 'text-[#B4FF39]'
                    : acc.confidence >= 60
                    ? 'text-yellow-300'
                    : 'text-orange-300';
                return (
                  <button
                    key={`${acc.platform}-${acc.handle}`}
                    type="button"
                    onClick={() => setOpenAccount(acc)}
                    className="w-full text-left rounded-lg border border-white/5 bg-black/30 p-3 hover:bg-black/50 hover:border-white/10 transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-md bg-white/5 p-1.5 shrink-0">
                        <PlatformIcon platform={acc.platform} className="h-4 w-4 text-white/80" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-white flex items-center gap-1.5 truncate">
                          @{acc.handle}
                          {acc.verified && (
                            <ShieldCheck className="h-3.5 w-3.5 text-[#B4FF39] shrink-0" />
                          )}
                          {acc.manuallyLinked && (
                            <Badge
                              variant="outline"
                              className="bg-[#B4FF39]/10 text-[#B4FF39] border-[#B4FF39]/30 text-[9px] py-0 px-1.5 font-medium"
                            >
                              MANUAL
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {platformLabel(acc.platform)}
                          {acc.followers
                            ? ` · ${acc.followers.toLocaleString()} followers`
                            : ''}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-sm font-semibold ${tone}`}>{acc.confidence}%</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                          match
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-white shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Unmatched / suggested (mock-only — admin review workflow) */}
            {!realOnly && unmatchedPlatforms.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between px-1">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                    Unmatched platforms
                  </div>
                  <div className="text-[10px] text-muted-foreground">Admin review</div>
                </div>
                {unmatchedPlatforms.map(up => {
                  const top = up.candidates[0];
                  return (
                    <div
                      key={up.platform}
                      className="rounded-lg border border-dashed border-white/10 bg-black/20 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-md bg-white/[0.03] p-1.5 shrink-0">
                          <PlatformIcon
                            platform={up.platform}
                            className="h-4 w-4 text-muted-foreground"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-white/70 truncate">
                            {platformLabel(up.platform)}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {up.candidates.length > 0
                              ? `${up.candidates.length} suggestion${up.candidates.length === 1 ? '' : 's'} · ${up.reason}`
                              : up.reason}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setLinkModal({
                              platform: up.platform,
                              candidates: up.candidates,
                              presetHandle: top?.handle,
                            })
                          }
                          className="h-7 px-2 text-xs border-white/10 bg-white/5 hover:bg-white/10"
                        >
                          {up.candidates.length > 0 ? (
                            <>
                              <Search className="h-3 w-3 mr-1" />
                              Review
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </>
                          )}
                        </Button>
                      </div>
                      {top && (
                        <div className="mt-2 pl-9 text-xs text-muted-foreground">
                          Top candidate{' '}
                          <span className="text-white/80 font-medium">@{top.handle}</span>{' '}
                          <span className="text-orange-300 font-semibold">{top.confidence}%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SectionCard>

        {/* Predictions (mock-only — no forecast model wired yet) */}
        {!realOnly && (
          <SectionCard
            title="Asset Purchase Predictions"
            subtitle={`${user.predictions.length} forecasts · likelihood to buy + pay at-or-above market`}
            className="lg:col-span-2"
          >
            <div className="flex-1 min-h-0 max-h-[520px] overflow-y-auto pr-2 -mr-2 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {user.predictions.map(p => (
                <div
                  key={p.assetId}
                  className="rounded-lg border border-white/5 bg-black/30 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-sm font-medium text-white truncate">{p.name}</div>
                        <CategoryBadge category={p.category} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {p.era} · Market {formatUsd(p.marketPriceUsd)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-muted-foreground">Predicted ceiling</div>
                      <div className="text-sm font-semibold text-[#B4FF39]">
                        {formatUsd(p.predictedCeilingUsd)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                    <ScoreMeter label="Buy likelihood" value={p.buyLikelihood} />
                    <ScoreMeter label="Pay ≥ market" value={p.payMarketLikelihood} />
                    <ScoreMeter label="Model confidence" value={p.confidence} />
                  </div>

                  <div className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent>Why the model surfaced this asset</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span>{p.rationale}</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </div>

      {/* Recent activity */}
      <SectionCard
        title="Recent Activity"
        subtitle={
          <>
            Cross-platform timeline · <span className="text-[#B4FF39]">● live</span>
          </>
        }
      >
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-2 -mr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {activityFeed.map(e => (
            <div
              key={e.id}
              className={`flex items-center gap-3 rounded-md border px-3 py-2.5 transition-colors ${
                e.__live
                  ? 'border-[#B4FF39]/40 bg-[#B4FF39]/10 animate-pulse'
                  : 'border-white/5 bg-black/20'
              }`}
            >
              <div className="rounded-md bg-white/5 p-1.5">
                {e.source === 'cardcade' ? (
                  <span className="text-[10px] font-semibold text-[#B4FF39] px-1">CC</span>
                ) : (
                  <PlatformIcon platform={e.source} className="h-4 w-4 text-white/80" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate flex items-center gap-2">
                  {e.summary}
                  {e.__live && (
                    <span className="text-[9px] uppercase tracking-wide text-[#B4FF39] font-semibold">
                      new
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {moment(e.at).fromNow()} · {e.source === 'cardcade' ? 'CardCade' : platformLabel(e.source)} · {e.kind.replace('_', ' ')}
                </div>
              </div>
              {e.amountUsd != null && (
                <div className="text-sm font-medium text-white shrink-0">
                  {formatUsd(e.amountUsd)}
                </div>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Linked-account match details modal */}
      <Dialog open={!!openAccount} onOpenChange={open => !open && setOpenAccount(null)}>
        <DialogContent className="bg-[rgba(18,18,18,1)] border-white/10 text-white max-w-lg">
          {openAccount && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-white/5 p-2">
                    <PlatformIcon
                      platform={openAccount.platform}
                      className="h-5 w-5 text-white/90"
                    />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="flex items-center gap-2 text-base">
                      @{openAccount.handle}
                      {openAccount.verified && (
                        <ShieldCheck className="h-4 w-4 text-[#B4FF39]" />
                      )}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      {platformLabel(openAccount.platform)}
                      {openAccount.followers
                        ? ` · ${openAccount.followers.toLocaleString()} followers`
                        : ''}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-5 pt-2">
                <div>
                  <ScoreMeter label="Match confidence" value={openAccount.confidence} />
                </div>

                <div>
                  <div className="text-xs font-medium text-white/80 mb-2">
                    Signals that contributed to this match
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {openAccount.signals.map(s => (
                      <Badge
                        key={s}
                        variant="outline"
                        className="bg-white/5 border-white/10 text-[11px] font-normal text-white/80"
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="rounded-md border border-white/5 bg-black/30 p-3 text-xs text-muted-foreground space-y-1">
                  <div className="flex items-start gap-1.5">
                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>
                      Confidence is computed from behavioral, content, and metadata overlap
                      across this user's CardCade activity and public {platformLabel(openAccount.platform)} signals.
                      Scores ≥ 80% are treated as strong matches; 60–79% as probable; below 60% as weak.
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/10 bg-white/5 hover:bg-white/10"
                    onClick={() => setOpenAccount(null)}
                  >
                    Close
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    className="bg-[#B4FF39] text-black hover:bg-[#B4FF39]/90"
                  >
                    <a href={openAccount.url} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      View profile
                    </a>
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Admin link / review modal for unmatched platforms */}
      <Dialog
        open={!!linkModal}
        onOpenChange={open => {
          if (!open) {
            setLinkModal(null);
            setManualHandle('');
          }
        }}
      >
        <DialogContent className="bg-[rgba(18,18,18,1)] border-white/10 text-white max-w-lg">
          {linkModal && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-white/5 p-2">
                    <PlatformIcon
                      platform={linkModal.platform}
                      className="h-5 w-5 text-white/90"
                    />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-base">
                      Link {platformLabel(linkModal.platform)} account
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      Confirm a suggested match or paste a handle manually. Admin overrides are
                      treated as 100% confidence.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-5 pt-2">
                {linkModal.candidates.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-white/80 mb-2">
                      Suggested candidates ({linkModal.candidates.length})
                    </div>
                    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 -mr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                      {linkModal.candidates.map(c => (
                        <div
                          key={c.handle}
                          className="rounded-md border border-white/5 bg-black/30 p-3"
                        >
                          <div className="flex items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white truncate">
                                  @{c.handle}
                                </span>
                                <a
                                  href={c.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-muted-foreground hover:text-white"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {c.followers
                                  ? `${c.followers.toLocaleString()} followers · `
                                  : ''}
                                <span className="text-orange-300 font-medium">
                                  {c.confidence}% match
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {c.signals.map(s => (
                                  <Badge
                                    key={s}
                                    variant="outline"
                                    className="bg-white/5 border-white/10 text-[10px] font-normal text-muted-foreground"
                                  >
                                    {s}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1.5 shrink-0">
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-[#B4FF39] text-black hover:bg-[#B4FF39]/90"
                                onClick={() => confirmCandidate(linkModal.platform, c)}
                              >
                                Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-muted-foreground hover:text-white"
                                onClick={() => {
                                  dismissCandidate(linkModal.platform, c.handle);
                                  // Refresh list within modal
                                  setLinkModal(prev =>
                                    prev
                                      ? {
                                          ...prev,
                                          candidates: prev.candidates.filter(
                                            x => x.handle !== c.handle,
                                          ),
                                        }
                                      : prev,
                                  );
                                }}
                              >
                                <XIcon className="h-3 w-3 mr-1" />
                                Dismiss
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs font-medium text-white/80 mb-2">
                    Or add manually
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        @
                      </span>
                      <Input
                        value={manualHandle}
                        onChange={e => setManualHandle(e.target.value)}
                        placeholder={`${linkModal.platform === 'twitter' ? 'username' : 'handle'}`}
                        className="pl-7 bg-black/40 border-white/10 text-white"
                        onKeyDown={e => {
                          if (e.key === 'Enter') submitManualLink();
                        }}
                      />
                    </div>
                    <Button
                      onClick={submitManualLink}
                      className="bg-[#B4FF39] text-black hover:bg-[#B4FF39]/90"
                    >
                      <UserPlus className="h-4 w-4 mr-1.5" />
                      Link
                    </Button>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1.5">
                    {platformUrl(linkModal.platform, manualHandle || 'handle')}
                  </div>
                </div>

                <div className="rounded-md border border-white/5 bg-black/30 p-3 text-xs text-muted-foreground flex items-start gap-1.5">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    Manual links are audit-logged with your admin ID. They feed back into the
                    matcher as positive training labels for the next retraining cycle.
                  </span>
                </div>
              </div>

              <DialogFooter className="pt-2 border-t border-white/5">
                <Button
                  variant="outline"
                  className="border-white/10 bg-white/5 hover:bg-white/10"
                  onClick={() => {
                    setLinkModal(null);
                    setManualHandle('');
                  }}
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Unified identity confidence breakdown modal */}
      <Dialog open={confidenceOpen} onOpenChange={setConfidenceOpen}>
        <DialogContent className="bg-[rgba(18,18,18,1)] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Unified Identity Confidence</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Weighted blend of signals across this user's matched accounts. Click any factor
              for context.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Headline score */}
            <div className="rounded-lg border border-white/5 bg-black/30 p-4">
              <div className="flex items-baseline justify-between">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Composite score
                </div>
                <div className="text-3xl font-semibold text-[#B4FF39]">
                  {user.unifiedConfidence}%
                </div>
              </div>
              <div className="mt-2">
                <ScoreMeter value={user.unifiedConfidence} />
              </div>
              <div className="text-[11px] text-muted-foreground mt-2">
                {user.unifiedConfidence >= 85
                  ? 'Strong — safe for downstream targeting & spend predictions.'
                  : user.unifiedConfidence >= 65
                  ? 'Moderate — usable, but review unmatched platforms to strengthen.'
                  : 'Weak — treat predictions as directional only.'}
              </div>
            </div>

            {/* Factor breakdown */}
            <div className="space-y-3">
              <div className="text-xs font-medium text-white/80">Contributing factors</div>
              {confidenceBreakdown.map(f => (
                <div
                  key={f.key}
                  className="rounded-md border border-white/5 bg-black/30 p-3"
                >
                  <div className="flex items-baseline justify-between gap-3 mb-1.5">
                    <div className="text-sm text-white truncate">{f.label}</div>
                    <div className="flex items-baseline gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className="bg-white/5 border-white/10 text-[10px] font-normal text-muted-foreground"
                      >
                        weight {Math.round(f.weight * 100)}%
                      </Badge>
                      <span className="text-sm font-semibold text-white">{f.value}%</span>
                    </div>
                  </div>
                  <ScoreMeter value={f.value} />
                  <div className="text-[11px] text-muted-foreground mt-1.5">{f.detail}</div>
                </div>
              ))}
            </div>

            <div className="rounded-md border border-white/5 bg-black/30 p-3 text-xs text-muted-foreground flex items-start gap-1.5">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                Composite ={' '}
                <span className="font-mono text-white/80">
                  Σ (factor × weight)
                </span>
                . Manual admin links propagate immediately and can raise this score on the
                next refresh cycle.
              </span>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-white/5">
            <Button
              variant="outline"
              className="border-white/10 bg-white/5 hover:bg-white/10"
              onClick={() => setConfidenceOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Engagement score breakdown modal */}
      <Dialog open={engagementOpen} onOpenChange={setEngagementOpen}>
        <DialogContent className="bg-[rgba(18,18,18,1)] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Engagement Score</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Weighted blend of recency, breadth, transactions, watchlist intent, and social
              amplification over the last 30 days.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            <div className="rounded-lg border border-white/5 bg-black/30 p-4">
              <div className="flex items-baseline justify-between">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Composite score
                </div>
                <div className="text-3xl font-semibold text-[#B4FF39]">
                  {user.engagementScore}%
                </div>
              </div>
              <div className="mt-2">
                <ScoreMeter value={user.engagementScore} />
              </div>
              <div className="text-[11px] text-muted-foreground mt-2">
                {user.engagementScore >= 80
                  ? 'Highly engaged — prioritize for retention & high-value campaigns.'
                  : user.engagementScore >= 50
                  ? 'Steadily active — good candidate for nurture sequences.'
                  : 'Low engagement — consider reactivation flows.'}
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-medium text-white/80">Contributing factors</div>
              {engagementBreakdown.map(f => (
                <div
                  key={f.key}
                  className="rounded-md border border-white/5 bg-black/30 p-3"
                >
                  <div className="flex items-baseline justify-between gap-3 mb-1.5">
                    <div className="text-sm text-white truncate">{f.label}</div>
                    <div className="flex items-baseline gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className="bg-white/5 border-white/10 text-[10px] font-normal text-muted-foreground"
                      >
                        weight {Math.round(f.weight * 100)}%
                      </Badge>
                      <span className="text-sm font-semibold text-white">{f.value}%</span>
                    </div>
                  </div>
                  <ScoreMeter value={f.value} />
                  <div className="text-[11px] text-muted-foreground mt-1.5">{f.detail}</div>
                </div>
              ))}
            </div>

            <div className="rounded-md border border-white/5 bg-black/30 p-3 text-xs text-muted-foreground flex items-start gap-1.5">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                Composite ={' '}
                <span className="font-mono text-white/80">Σ (factor × weight)</span>. Refreshed
                daily from the cross-platform activity stream.
              </span>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-white/5">
            <Button
              variant="outline"
              className="border-white/10 bg-white/5 hover:bg-white/10"
              onClick={() => setEngagementOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin: edit socials + AI annotations */}
      {userId && (
        <AnalyticsEditProfileDialog
          userId={userId}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}
    </div>
  );
};
