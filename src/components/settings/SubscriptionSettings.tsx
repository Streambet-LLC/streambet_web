import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/integrations/api/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ProBadge } from '@/components/pro/ProBadge';
import { Crown, ArrowUpCircle, Mail, Sparkles, ShieldCheck, Clock, Star, Gift } from 'lucide-react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import type { Subscription } from '@/types/subscription';

const benefits = [
  {
    icon: Clock,
    title: '48-Hour Early Access',
    description: 'Be first to shop all new items before anyone else',
  },
  {
    icon: Star,
    title: 'Pro-Exclusive Items',
    description: 'Unlock items only available to Pro members',
  },
  {
    icon: Crown,
    title: 'Gold Pro Badge',
    description: 'Stand out with a verified Pro badge on your profile',
  },
  {
    icon: ShieldCheck,
    title: 'Concierge Support',
    description: 'Priority seller support with dedicated assistance',
  },
];

export const SubscriptionSettings = () => {
  const { session, refetchSession } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subscriptionData, isLoading } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: async () => {
      const res = await api.subscription.getStatus();
      return res.data as Subscription | null;
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: (plan: 'monthly' | 'yearly') => api.subscription.createCheckoutSession(plan),
    onSuccess: res => {
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to start checkout. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: () => api.subscription.upgradeToYearly(),
    onSuccess: () => {
      toast({
        title: 'Upgraded!',
        description: 'Your subscription has been upgraded to the yearly plan.',
      });
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      refetchSession();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to upgrade. Please try again.',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-electric-lime" />
      </div>
    );
  }

  const isActive = subscriptionData?.status === 'active';
  const isMonthly = subscriptionData?.plan === 'monthly';
  const isAdminGranted = subscriptionData?.stripeSubscriptionId?.startsWith('admin_grant_');

  // Admin-granted Pro
  if (isActive && isAdminGranted) {
    return (
      <div className="space-y-6 pb-16 sm:pb-24">
        {/* Active status card */}
        <div className="relative overflow-hidden rounded-2xl bg-[#0f0f0f] border border-electric-lime/20 p-5 sm:p-8">
          {/* Lime accent line at top */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-electric-lime to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] h-16 bg-electric-lime/5 blur-3xl" />

          <div className="relative flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-electric-lime/10 border border-electric-lime/20 shrink-0">
              <ProBadge size="md" showTooltip={false} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-white font-fabio tracking-wide">
                  CardCade Pro
                </h2>
                <span className="inline-flex items-center rounded-full bg-electric-lime/10 border border-electric-lime/20 text-electric-lime text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
                  Active
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                You're enjoying all Pro benefits
              </p>
            </div>
          </div>

          {/* Granted by CardCade */}
          <div className="relative mt-5 rounded-xl bg-[#141414] border border-[rgba(255,255,255,0.06)] p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-electric-lime/10 shrink-0">
                <Gift className="w-4 h-4 text-electric-lime" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Granted by CardCade</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Your Pro membership was granted by the CardCade team. Enjoy all the perks!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {benefits.map(benefit => (
            <div
              key={benefit.title}
              className="flex items-start gap-3 rounded-xl bg-[#141414] border border-[rgba(255,255,255,0.06)] p-4 transition-colors hover:border-electric-lime/20"
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-electric-lime/10 shrink-0 mt-0.5">
                <benefit.icon className="w-4 h-4 text-electric-lime" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{benefit.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Not subscribed
  if (!isActive) {
    return (
      <div className="space-y-6 pb-16 sm:pb-24">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-2xl bg-[#0f0f0f] border border-[rgba(255,255,255,0.08)] p-6 sm:p-8">
          {/* Subtle lime glow at top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[1px] bg-gradient-to-r from-transparent via-electric-lime to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] h-16 bg-electric-lime/5 blur-3xl" />

          <div className="relative flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-electric-lime/10 border border-electric-lime/20">
              <Crown className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-fabio tracking-wide">
                CardCade Pro
              </h2>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Unlock the full CardCade experience with exclusive perks.
          </p>
        </div>

        {/* Benefits grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {benefits.map(benefit => (
            <div
              key={benefit.title}
              className="flex items-start gap-3 rounded-xl bg-[#141414] border border-[rgba(255,255,255,0.06)] p-4 transition-colors hover:border-electric-lime/20"
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-electric-lime/10 shrink-0 mt-0.5">
                <benefit.icon className="w-4 h-4 text-electric-lime" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{benefit.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Monthly */}
          <button
            onClick={() => checkoutMutation.mutate('monthly')}
            disabled={checkoutMutation.isPending}
            className="relative group rounded-2xl bg-[#141414] border border-[rgba(255,255,255,0.08)] p-5 text-left transition-all hover:border-electric-lime/30 hover:shadow-[0_0_20px_rgba(189,255,0,0.08)] disabled:opacity-50"
          >
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
              Monthly
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-white">$20</span>
              <span className="text-sm text-muted-foreground">/mo</span>
            </div>
            <div className="mt-4">
              <span className="inline-flex items-center justify-center w-full rounded-full border border-white/20 text-white font-semibold py-2.5 text-sm transition-all group-hover:border-electric-lime/40 group-hover:text-electric-lime">
                {checkoutMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Get Started'
                )}
              </span>
            </div>
          </button>

          {/* Yearly */}
          <button
            onClick={() => checkoutMutation.mutate('yearly')}
            disabled={checkoutMutation.isPending}
            className="relative group rounded-2xl bg-[#141414] border border-electric-lime/20 p-5 text-left transition-all hover:border-electric-lime/40 hover:shadow-[0_0_20px_rgba(189,255,0,0.12)] disabled:opacity-50"
          >
            {/* Best value tag */}
            <div className="absolute -top-2.5 right-4">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#BDFF00] text-black text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5">
                <Sparkles className="w-3 h-3" />
                Save 17%
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
              Yearly
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-white">$199</span>
              <span className="text-sm text-muted-foreground">/yr</span>
            </div>
            <div className="mt-3">
              <span className="inline-flex items-center justify-center w-full rounded-full bg-[#BDFF00] text-black font-semibold py-2.5 text-sm transition-all group-hover:brightness-110 group-hover:shadow-[0_0_15px_rgba(189,255,0,0.3)]">
                {checkoutMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Get Started'
                )}
              </span>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Active subscription
  return (
    <div className="space-y-4">
      {/* Active status card */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0f0f0f] border border-electric-lime/20 p-5 sm:p-8">
        {/* Lime accent line at top */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-electric-lime to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] h-16 bg-electric-lime/5 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-electric-lime/10 border border-electric-lime/20 shrink-0">
            <ProBadge size="md" showTooltip={false} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-white font-fabio tracking-wide">
                CardCade Pro
              </h2>
              <span className="inline-flex items-center rounded-full bg-electric-lime/10 border border-electric-lime/20 text-electric-lime text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
                Active
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">You're enjoying all Pro benefits</p>
          </div>
        </div>

        {/* Plan details */}
        <div className="relative mt-5 rounded-xl bg-[#141414] border border-[rgba(255,255,255,0.06)] p-4 space-y-3">
          <div className="flex justify-between items-center text-sm gap-2">
            <span className="text-muted-foreground shrink-0">Plan</span>
            <span className="text-white font-medium capitalize text-right">
              {subscriptionData.plan}
              {isMonthly ? ' — $20/mo' : ' — $199/yr'}
            </span>
          </div>
          {subscriptionData.currentPeriodEnd && (
            <div className="flex justify-between items-center text-sm gap-2">
              <span className="text-muted-foreground shrink-0">Next billing</span>
              <span className="text-white font-medium text-right">
                {format(new Date(subscriptionData.currentPeriodEnd), 'MMM d, yyyy')}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="relative flex flex-col gap-3 mt-5">
          {isMonthly && (
            <div className="relative">
              <div className="absolute -top-2.5 right-4 z-10">
                <span className="inline-flex items-center gap-1 rounded-full bg-white text-black text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 shadow-md">
                  <Sparkles className="w-3 h-3" />
                  Save 17%
                </span>
              </div>
              <button
                onClick={() => upgradeMutation.mutate()}
                disabled={upgradeMutation.isPending}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#BDFF00] text-black font-semibold py-3 px-5 text-sm transition-all hover:brightness-110 hover:shadow-[0_0_15px_rgba(189,255,0,0.3)] disabled:opacity-50"
              >
                {upgradeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowUpCircle className="w-4 h-4" />
                )}
                Upgrade to Yearly
              </button>
            </div>
          )}

          <a
            href="mailto:info@streambet.tv?subject=Cancel CardCade Pro Subscription"
            className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-white/10 text-muted-foreground hover:text-white/70 hover:border-white/20 text-sm py-2.5 px-4 transition-colors"
          >
            <Mail className="w-4 h-4" />
            Cancel Subscription
          </a>
        </div>
      </div>
    </div>
  );
};
