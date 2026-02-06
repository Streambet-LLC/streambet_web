import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useStreamData } from '@/hooks/useStreamData';
import { NonVideoContent } from '@/components/nonvideo';
import { MainLayout } from '@/components/layout';
import { useBettingContext } from '@/contexts/BettingContext';

const NonVideo = () => {
  const { id: nonVideoId } = useParams();

  // Get non-video data (uses same endpoint as streams)
  const { data: nonVideo, refetch } = useStreamData(nonVideoId ?? '', !!nonVideoId);

  // Initialize betting context with the active stream id
  const { setActiveStreamId } = useBettingContext();
  
  useEffect(() => {
    if (nonVideoId) {
      setActiveStreamId(nonVideoId);
    }
    return () => {
      // Clear on unmount or route change
      setActiveStreamId(null);
    };
  }, [nonVideoId, setActiveStreamId]);

  if (!nonVideoId) {
    return (
      <MainLayout showFooter={false}>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Non-video ID not found</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showFooter={false}>
      <NonVideoContent
        nonVideoId={nonVideoId}
        nonVideo={nonVideo?.data}
        refetchNonVideo={refetch}
      />
    </MainLayout>
  );
};

export default NonVideo;
