
import { useParams } from 'react-router-dom';
import { useStreamData } from '@/hooks/useStreamData';
import { StreamContent } from '@/components/stream/StreamContent';
import { MainLayout } from '@/components/layout';
import { useAuthContext } from '@/contexts/AuthContext';

const Stream = () => {
  const { id } = useParams();
  const streamId = id;

  // Get session from AuthContext
  const { session, isLoading: isSessionLoading } = useAuthContext();

  // Get stream data
  const { data: stream, refetch } = useStreamData(streamId!);

  return (
    <MainLayout showFooter={false}>
      <StreamContent
        streamId={streamId}
        session={session}
        stream={stream?.data}
      />
    </MainLayout>
  );
};

export default Stream;
