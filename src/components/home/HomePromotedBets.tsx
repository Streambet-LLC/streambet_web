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
import { QuickPickModal } from '../stream/QuickPickModal';
import { useStreamPromotionListener } from '@/hooks/useStreamPromotionListener';
import { PRIORITY_STREAMS } from '@/utils/constants';
import { sortByPriorityPairs } from '@/utils/helper';
import { BetCard as BetCardType } from '@/types/bet';
import { useState, useMemo } from 'react';

export default function HomePromotedBets() {
  const [quickPickOpen, setQuickPickOpen] = useState(false);
  const [quickPickModalSettings, setQuickPickModalSettings] = useState({
    streamId: null,
    roundId: null,
    streamName: null,
  });
    
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
      <div className="rounded-lg p-6 -mx-4 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#BDFF00]/20 via-zinc-900 via-40% to-background">
        <Carousel 
          className="flex-1 w-full"
          opts={{
            align: 'start',
            loop: false,
            slidesToScroll: 1,
            containScroll: 'trimSnaps'
          }}
        >
          <CarouselContent className="flex-1">
            {isLoading ? (
              <>
                {Array.from({ length: 3 }).map((_, i) => (
                  <CarouselItem 
                    key={i}
                    className="basis-full md:basis-1/2 lg:basis-1/3 pl-4"
                  >
                    <Skeleton className="w-full h-64 rounded-lg" />
                  </CarouselItem>
                ))}
              </>
            ) : (
              sortedData?.map((bet) => (
                <CarouselItem 
                  key={bet.roundId}
                  className="basis-full md:basis-1/2 lg:basis-1/3 pl-4"
                >
                  <BetCard
                    {...bet}
                    setQuickPick={(streamId, roundId, streamName) => {
                      setQuickPickModalSettings({
                        streamId,
                        streamName,
                        roundId,
                      });
                      setQuickPickOpen(true);
                    }}
                  />
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
      </div>
      {quickPickOpen && (
        <QuickPickModal
          open={quickPickOpen}
          onOpenChange={setQuickPickOpen}
          streamId={quickPickModalSettings.streamId}
          roundId={quickPickModalSettings.roundId}
          streamName={quickPickModalSettings.streamName}
        />
      )}
    </>
  );
}
