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
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Pagination, Navigation, Autoplay } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

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

  if (!data) return null;

  return (
    <>
      
      {isLoading ? (
        <Skeleton className="flex-1 w-full h-64 rounded-none" />
      ) : (
        <Swiper
          effect={'coverflow'}
          grabCursor={true}
          centeredSlides={true}
          slidesPerView={'auto'}
          coverflowEffect={{
            rotate: 50,
            stretch: 0,
            depth: 100,
            modifier: 1,
            slideShadows: true,
          }}
          pagination={{
            clickable: true,
          }}
          navigation={true}
          autoplay={{
            delay: 15000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          loop={true}
          speed={600}
          modules={[EffectCoverflow, Pagination, Navigation, Autoplay]}
          className="featured-bets-swiper"
          role="region"
          aria-labelledby="featured-streams-heading"
        >
          {sortedData.map((bet) => (
            <SwiperSlide key={`${bet.streamId}-${bet.roundId}`}>
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
            </SwiperSlide>
          ))}
        </Swiper>
      )}
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
