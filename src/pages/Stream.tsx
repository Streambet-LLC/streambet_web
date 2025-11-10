
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useStreamData } from '@/hooks/useStreamData';
import { StreamContent } from '@/components/stream/StreamContent';
import { MainLayout } from '@/components/layout';
import { useAuthContext } from '@/contexts/AuthContext';
import { useBettingContext } from '@/contexts/BettingContext';

const Stream = () => {
  const { id } = useParams();
  const streamId = id;

  // Get session from AuthContext
  const { session, isLoading: isSessionLoading } = useAuthContext();

  // Get stream data
  const { data: stream, refetch } = useStreamData(streamId!);

  // Initialize betting context with the active stream id so queries run without opening Quick Pick
  const { setActiveStreamId } = useBettingContext();
  useEffect(() => {
    if (streamId) {
      setActiveStreamId(streamId);
    }
    return () => {
      // Clear on unmount or route change
      setActiveStreamId(null);
    };
  }, [streamId, setActiveStreamId]);

  return (
    <MainLayout showFooter={false}>
      <StreamContent
        streamId={streamId}
        session={session}
        stream={stream?.data}
        refetchStream={() => refetch()}
      />
    </MainLayout>
  );
};

export default Stream;
