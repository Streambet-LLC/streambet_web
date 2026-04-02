import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/integrations/api/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProBadge } from '@/components/pro/ProBadge';
import { Crown, ExternalLink, ArrowUpCircle, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import type { Subscription } from '@/types/subscription';

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
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isActive = subscriptionData?.status === 'active';
  const isMonthly = subscriptionData?.plan === 'monthly';

  // Not subscribed
  if (!isActive) {
    return (
      <Card className="border-yellow-600/30 bg-gradient-to-br from-[#1a1a2e] to-[#16213e]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-400">
            <Crown className="w-5 h-5 fill-yellow-400" />
            CardCade Pro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Unlock exclusive benefits with CardCade Pro:
          </p>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-yellow-400 mt-0.5">✦</span>
              48-hour early access to all new shop items
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400 mt-0.5">✦</span>
              Access to Pro-exclusive items
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400 mt-0.5">✦</span>
              Gold Pro badge on your profile
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400 mt-0.5">✦</span>
              Concierge support for sellers
            </li>
          </ul>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <Button
              onClick={() => checkoutMutation.mutate('monthly')}
              disabled={checkoutMutation.isPending}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              {checkoutMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Monthly — $20/mo
            </Button>
            <Button
              onClick={() => checkoutMutation.mutate('yearly')}
              disabled={checkoutMutation.isPending}
              variant="outline"
              className="border-yellow-600/50 text-yellow-400 hover:bg-yellow-600/10"
            >
              {checkoutMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Yearly — $199/yr
              <Badge
                variant="secondary"
                className="ml-2 text-[10px] bg-green-900/50 text-green-400"
              >
                Save 17%
              </Badge>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Active subscription
  return (
    <Card className="border-yellow-600/30 bg-gradient-to-br from-[#1a1a2e] to-[#16213e]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-400">
          <ProBadge size="md" showTooltip={false} />
          CardCade Pro
          <Badge className="bg-green-900/50 text-green-400 border-green-600/30 text-xs">
            Active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-400">
            <span>Plan</span>
            <span className="text-white capitalize">
              {subscriptionData.plan}
              {isMonthly ? ' — $20/mo' : ' — $199/yr'}
            </span>
          </div>
          {subscriptionData.currentPeriodEnd && (
            <div className="flex justify-between text-gray-400">
              <span>Next billing date</span>
              <span className="text-white">
                {format(new Date(subscriptionData.currentPeriodEnd), 'MMM d, yyyy')}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          {isMonthly && (
            <Button
              onClick={() => upgradeMutation.mutate()}
              disabled={upgradeMutation.isPending}
              variant="outline"
              className="border-yellow-600/50 text-yellow-400 hover:bg-yellow-600/10"
            >
              {upgradeMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ArrowUpCircle className="w-4 h-4 mr-2" />
              )}
              Upgrade to Yearly — Save 17%
            </Button>
          )}

          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-300" asChild>
            <a href="mailto:info@streambet.tv?subject=Cancel CardCade Pro Subscription">
              <Mail className="w-4 h-4 mr-2" />
              Cancel Subscription
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
