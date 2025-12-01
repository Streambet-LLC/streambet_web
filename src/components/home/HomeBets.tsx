import BetCard from '../BetCard';
import { useInfiniteQuery } from '@tanstack/react-query';
import api from '@/integrations/api/client';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { Loader2 } from 'lucide-react';
import { useStreamPromotionListener } from '@/hooks/useStreamPromotionListener';
import { useEffect, useMemo, useState } from 'react';
import { PRIORITY_STREAMS } from '@/utils/constants';
import { sortByPriorityPairs } from '@/utils/helper';
import { QuickPickModal } from '../stream/QuickPickModal';

export default function HomeBets({ filters }: { filters: any }) {
  const [displayCount, setDisplayCount] = useState(24);
  const [quickPickOpen, setQuickPickOpen] = useState(false);
  const [quickPickModalSettings, setQuickPickModalSettings] = useState({
    streamId: null,
    roundId: null,
    streamName: null,
    selectedOption: null,
  });
  const { data, hasNextPage, fetchNextPage, isLoading, isFetchingNextPage, refetch } =
    useInfiniteQuery({
      queryKey: ['homepage-bets', filters],
      queryFn: async ({ pageParam }) => {
        const response = await api.bets.getBets({ page: pageParam });

        return response;
      },
      initialPageParam: 1,
      getNextPageParam: lastPage => (lastPage.hasNextPage ? lastPage.page + 1 : undefined),
    });

  // Auto-fetch all pages in background for proper sorting
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Get all bets and sort by priority pairs
  const sortedBets = useMemo(() => {
    const allBets = data?.pages.map(({ data: bets }) => bets || [])?.flat() || [];
    return sortByPriorityPairs(allBets, PRIORITY_STREAMS);
  }, [data]);

  // Display only first N items (client-side pagination)
  const displayedBets = sortedBets.slice(0, displayCount);
  const hasMore = displayCount < sortedBets.length;

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + 24);
  };

  // Listen for stream promotion updates
  useStreamPromotionListener(refetch);

  if (!data) return;

  return (
    <>
      <div className="text-2xl font-bold pl-2">All Streams</div>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isLoading
            ? Array(24)
                .fill('')
                .map((_, i) => <Skeleton key={i} className="w-full h-64" />)
            : displayedBets.map((bet, i) => (
                <BetCard
                  key={i}
                  {...bet}
                  setQuickPick={(streamId, roundId, streamName, selectedOption) => {
                    setQuickPickModalSettings({
                      streamId,
                      streamName,
                      roundId,
                      selectedOption,
                    });
                    setQuickPickOpen(true);
                  }}
                />
              ))}
        </div>
        {hasMore && (
          <Button
            disabled={isLoading}
            variant="outline"
            className="mx-auto"
            onClick={handleLoadMore}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" />
                Loading
              </>
            ) : (
              'Load More'
            )}
          </Button>
        )}
      </div>
      {quickPickOpen && (
        <QuickPickModal
          open={quickPickOpen}
          onOpenChange={setQuickPickOpen}
          streamId={quickPickModalSettings.streamId}
          roundId={quickPickModalSettings.roundId}
          streamName={quickPickModalSettings.streamName}
          selectedOption={quickPickModalSettings.selectedOption}
        />
      )}
    </>
  );
}
