import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getMockAnalyticsUser, formatUsd, platformLabel } from '@/mocks/analytics';
import {
  PersonaBadge,
  CategoryBadge,
  PlatformIcon,
  ScoreMeter,
} from './AnalyticsBadges';
import { ArrowLeft, ExternalLink, ShieldCheck, Info } from 'lucide-react';
import moment from 'moment';

const SectionCard = ({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <Card className={`bg-[rgba(22,22,22,1)] border-white/5 p-6 ${className}`}>
    <div className="mb-4">
      <div className="text-sm font-medium text-white">{title}</div>
      {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
    </div>
    {children}
  </Card>
);

export const AnalyticsUserDetail = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const user = userId ? getMockAnalyticsUser(userId) : undefined;

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
      {/* Back nav */}
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-white -ml-2"
        onClick={() => navigate('/analytics')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        All Profiles
      </Button>

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
              <PersonaBadge persona={user.persona} />
              {user.topCategories.map(c => (
                <CategoryBadge key={c} category={c} />
              ))}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              @{user.username} · {user.email} · joined{' '}
              {moment(user.joinedAt).format('MMM YYYY')}
            </div>
            <p className="text-sm text-white/80 mt-3 max-w-3xl">{user.inferredBio}</p>
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
              <div className="text-xs text-muted-foreground">Purchases</div>
              <div className="text-lg font-semibold text-white">{user.purchaseCount}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Win Rate</div>
              <div className="text-lg font-semibold text-white">{user.winRate}%</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/5">
          <ScoreMeter
            label="Unified Identity Confidence"
            value={user.unifiedConfidence}
          />
          <ScoreMeter label="Engagement Score" value={user.engagementScore} />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Linked accounts */}
        <SectionCard
          title="Linked Identities"
          subtitle="Public accounts matched via behavior, content & metadata signals"
          className="lg:col-span-1"
        >
          <div className="space-y-3">
            {user.linkedAccounts.map(acc => (
              <div
                key={`${acc.platform}-${acc.handle}`}
                className="rounded-lg border border-white/5 bg-black/30 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 rounded-md bg-white/5 p-1.5">
                      <PlatformIcon platform={acc.platform} className="h-4 w-4 text-white/80" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white flex items-center gap-1.5">
                        @{acc.handle}
                        {acc.verified && (
                          <ShieldCheck className="h-3.5 w-3.5 text-[#B4FF39]" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {platformLabel(acc.platform)}
                        {acc.followers
                          ? ` · ${acc.followers.toLocaleString()} followers`
                          : ''}
                      </div>
                    </div>
                  </div>
                  <a
                    href={acc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground hover:text-white"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                <div className="mt-3">
                  <ScoreMeter label="Match confidence" value={acc.confidence} />
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {acc.signals.map(s => (
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
            ))}
          </div>
        </SectionCard>

        {/* Predictions */}
        <SectionCard
          title="Asset Purchase Predictions"
          subtitle="Likelihood to buy + likelihood to pay at-or-above market"
          className="lg:col-span-2"
        >
          <div className="space-y-3">
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
      </div>

      {/* Recent activity */}
      <SectionCard title="Recent Activity" subtitle="Cross-platform timeline (last 30 days)">
        <div className="space-y-2">
          {user.recentActivity.map(e => (
            <div
              key={e.id}
              className="flex items-center gap-3 rounded-md border border-white/5 bg-black/20 px-3 py-2.5"
            >
              <div className="rounded-md bg-white/5 p-1.5">
                {e.source === 'cardcade' ? (
                  <span className="text-[10px] font-semibold text-[#B4FF39] px-1">CC</span>
                ) : (
                  <PlatformIcon platform={e.source} className="h-4 w-4 text-white/80" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">{e.summary}</div>
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
    </div>
  );
};
