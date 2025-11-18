import BetCard from '../BetCard';
import { useInfiniteQuery } from '@tanstack/react-query';
import api from '@/integrations/api/client';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { Loader2 } from 'lucide-react';

export default function HomeBets({
  filters
} : {
  filters: any;
}) {
  const { data, hasNextPage, fetchNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['homepage-bets', filters],
    queryFn: async ({ pageParam }) => {
      const response = await api.bets.getBets({ page: pageParam });

      return response;
    },
    initialPageParam: 1,
    getNextPageParam: lastPage => (lastPage.hasNextPage ? lastPage.page + 1 : undefined),
  });

  const bets = data?.pages.map(({ data: bets }) => bets || [])?.flat() || [];

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
            : bets?.map((bet, i) => <BetCard key={i} {...bet} />)}
        </div>
        {hasNextPage && (
          <Button
            disabled={isLoading}
            variant="outline"
            className="mx-auto"
            onClick={() => fetchNextPage()}
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
    </>
  );
}
