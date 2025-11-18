import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import BetCard from '../BetCard';
import { useQuery } from '@tanstack/react-query';
import api from '@/integrations/api/client';
import { Skeleton } from '../ui/skeleton';
import { useStreamPromotionListener } from '@/hooks/useStreamPromotionListener';
import { useMemo } from 'react';
import { PRIORITY_STREAMS } from '@/utils/constants';
import { sortByPriorityPairs } from '@/utils/helper';
import { BetCard as BetCardType } from '@/types/bet';

export default function HomePromotedBets() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['homepage-promoted-bets'],
    queryFn: async () => {
      const response = await api.bets.getPromotedBets();

      return response.data;
    },
  });

  // Listen for stream promotion updates
  useStreamPromotionListener(refetch);

  const sortedData = useMemo(() => {
    if (!data) return [];
    return sortByPriorityPairs(data as BetCardType[], PRIORITY_STREAMS);
  }, [data]);

  if (!data) return;

  return (
    <>
      <div className="text-2xl font-bold pl-2">Featured Streams</div>
      <Carousel className="flex-1 w-full">
        <CarouselContent className="flex-1">
          {isLoading ? (
            <Skeleton className="flex-1 w-full h-64 rounded-none" />
          ) : (
            sortedData?.map((bet, i) => (
              <CarouselItem key={i}>
                <BetCard {...bet} />
              </CarouselItem>
            ))
          )}
        </CarouselContent>
        <div className="flex items-center justify-between pt-4">
          <CarouselPrevious
            className="relative top-0 left-0 translate-y-[unset] translate-x-[unset]"
            size="lg"
          />
          <CarouselDots className="relative" />
          <CarouselNext
            className="relative top-0 left-0 translate-y-[unset] translate-x-[unset]"
            size="lg"
          />
        </div>
      </Carousel>
    </>
  );
}
