import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useStreamData } from '@/hooks/useStreamData';
import { NonVideoContent } from '@/components/nonvideo';
import { MainLayout } from '@/components/layout';
import { useAuthContext } from '@/contexts/AuthContext';
import { useBettingContext } from '@/contexts/BettingContext';

const NonVideo = () => {
  const { id } = useParams();
  const nonVideoId = id;

  // Get session from AuthContext
  const { session, isLoading: isSessionLoading } = useAuthContext();

  // Get non-video data (uses same endpoint as streams)
  const { data: nonVideo, refetch } = useStreamData(nonVideoId!);

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

  return (
    <MainLayout showFooter={false}>
      <NonVideoContent
        nonVideoId={nonVideoId}
        session={session}
        nonVideo={nonVideo?.data}
      />
    </MainLayout>
  );
};

export default NonVideo;
