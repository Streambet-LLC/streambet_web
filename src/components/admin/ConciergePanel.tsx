import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, HeadphonesIcon, UserCheck, Clock } from 'lucide-react';
import api from '@/integrations/api/client';
import { ConciergeRequest } from '@/types/subscription';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export const ConciergePanel = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery<ConciergeRequest[]>({
    queryKey: ['admin-concierge-requests'],
    queryFn: async () => {
      const res = await api.concierge.getAllRequests();
      return res.data;
    },
  });

  const claimMutation = useMutation({
    mutationFn: (requestId: string) => api.concierge.claimRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-concierge-requests'] });
      toast({
        title: 'Concierge request claimed',
        description: 'The user will be notified with your name as their concierge.',
      });
    },
    onError: () => {
      toast({
        title: 'Failed to claim request',
        description: 'This request may have already been claimed.',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const pendingRequests = requests?.filter(r => r.status === 'pending') ?? [];
  const claimedRequests = requests?.filter(r => r.status === 'claimed') ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <HeadphonesIcon className="h-6 w-6 text-yellow-400" />
        <h2 className="text-xl font-bold text-white">Concierge Requests</h2>
        {pendingRequests.length > 0 && (
          <span className="bg-yellow-500/20 text-yellow-400 text-xs font-bold px-2 py-1 rounded-full">
            {pendingRequests.length} pending
          </span>
        )}
      </div>

      {(!requests || requests.length === 0) && (
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardContent className="py-12 text-center text-gray-400">
            <HeadphonesIcon className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>No concierge requests yet.</p>
            <p className="text-sm mt-1">
              Pro sellers can request a concierge from their shop management page.
            </p>
          </CardContent>
        </Card>
      )}

      {pendingRequests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Pending Requests
          </h3>
          {pendingRequests.map(request => (
            <ConciergeRequestCard
              key={request.id}
              request={request}
              onClaim={() => claimMutation.mutate(request.id)}
              isClaiming={claimMutation.isPending}
            />
          ))}
        </div>
      )}

      {claimedRequests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Claimed Requests
          </h3>
          {claimedRequests.map(request => (
            <ConciergeRequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </div>
  );
};

interface ConciergeRequestCardProps {
  request: ConciergeRequest;
  onClaim?: () => void;
  isClaiming?: boolean;
}

const ConciergeRequestCard = ({ request, onClaim, isClaiming }: ConciergeRequestCardProps) => {
  const isPending = request.status === 'pending';
  const isClaimed = request.status === 'claimed';

  return (
    <Card
      className={cn(
        'bg-[#1A1A1A] border-gray-800 transition-all',
        isPending && 'border-yellow-500/30 hover:border-yellow-500/50'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center',
                isPending ? 'bg-yellow-500/20' : 'bg-green-500/20'
              )}
            >
              {isPending ? (
                <Clock className="h-5 w-5 text-yellow-400" />
              ) : (
                <UserCheck className="h-5 w-5 text-green-400" />
              )}
            </div>
            <div>
              <p className="text-white font-medium">{request.user?.username || 'Unknown User'}</p>
              <p className="text-sm text-gray-400">
                Requested {format(new Date(request.createdAt), 'MMM d, yyyy h:mm a')}
              </p>
              {isClaimed && request.claimedByName && (
                <p className="text-sm text-green-400 mt-1">
                  Claimed by {request.claimedByName}
                  {request.claimedAt &&
                    ` · ${format(new Date(request.claimedAt), 'MMM d, yyyy h:mm a')}`}
                </p>
              )}
              {isClaimed && request.user && (
                <div className="mt-2 text-sm text-gray-400 space-y-0.5">
                  {request.user.name && (
                    <p>
                      <span className="text-gray-500">Name:</span> {request.user.name}
                    </p>
                  )}
                  {request.user.email && (
                    <p>
                      <span className="text-gray-500">Email:</span>{' '}
                      <a
                        href={`mailto:${request.user.email}`}
                        className="text-blue-400 hover:underline"
                      >
                        {request.user.email}
                      </a>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {isPending && onClaim && (
            <Button
              onClick={onClaim}
              disabled={isClaiming}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
            >
              {isClaiming ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <HeadphonesIcon className="h-4 w-4 mr-2" />
              )}
              Claim
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
