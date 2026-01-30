import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import BetCard from '../BetCard';
import PromoCard from './PromoCard';
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
    selectedOption: null,
    description: null,
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

  // Extract promo cards and regular bets from response
  const promoCards = data?.promoCards || [];
  const regularBets = data?.bets || data || []; // Backwards compatible

  const sortedData = useMemo(() => {
    if (!regularBets || regularBets.length === 0) return [];
    return sortByPriorityPairs(regularBets as BetCardType[], PRIORITY_STREAMS);
  }, [regularBets]);

  return (
    <>
      {/* Promo Cards Carousel - Shows above featured carousel */}
      {isLoading ? (
        <div className="px-2 mb-6">
          <Skeleton className="w-full h-[200px] md:h-[150px] lg:min-h-[200px] rounded-lg" />
        </div>
      ) : promoCards && promoCards.length > 0 && (
        <div className="px-2 mb-6">
          <Carousel
            opts={{
              align: 'start',
              loop: true,
            }}
          >
            <CarouselContent>
              {promoCards.map((promo) => (
                <CarouselItem key={promo.streamId}>
                  <PromoCard
                    name={promo.name}
                    description={promo.description}
                    thumbnail={promo.thumbnail}
                    creator={promo.creator}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            {promoCards.length > 1 && (
              <div className="flex items-center justify-between pt-4">
                <CarouselPrevious
                  className="relative top-0 left-0 translate-y-[unset] translate-x-[unset] border-primary"
                  size="lg"
                />
                <CarouselDots className="relative" />
                <CarouselNext
                  className="relative top-0 left-0 translate-y-[unset] translate-x-[unset] border-primary"
                  size="lg"
                />
              </div>
            )}
          </Carousel>
        </div>
      )}
      
      <h2 className="text-2xl font-bold  px-2">Featured Picks:</h2>
      <div className="p-6 -mx-4">
        <Carousel
          className="flex-1 w-full"
          opts={{
            align: 'start',
            loop: true,
            slidesToScroll: 1,
            containScroll: 'trimSnaps',
          }}
        >
          <CarouselContent className="flex-1">
            {isLoading ? (
              <>
                {Array.from({ length: 4 }).map((_, i) => (
                  <CarouselItem key={i} className="basis-full md:basis-1/2 lg:basis-1/4 pl-4">
                    <Skeleton className="w-full h-64 rounded-lg" />
                  </CarouselItem>
                ))}
              </>
            ) : (
              sortedData?.map(bet => (
                <CarouselItem
                  key={bet.roundId}
                  className="basis-full md:basis-1/2 lg:basis-1/4 pl-4"
                >
                  <BetCard
                    {...bet}
                    isFeatured={true}
                    setQuickPick={(streamId, roundId, streamName, selectedOption, description) => {
                      setQuickPickModalSettings({
                        streamId,
                        streamName,
                        roundId,
                        selectedOption,
                        description,
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
              className="relative top-0 left-0 translate-y-[unset] translate-x-[unset] border-primary"
              size="lg"
            />
            <CarouselDots className="relative" />
            <CarouselNext
              className="relative top-0 left-0 translate-y-[unset] translate-x-[unset] border-primary"
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
          selectedOption={quickPickModalSettings.selectedOption}
          description={quickPickModalSettings.description}
        />
      )}
    </>
  );
}
