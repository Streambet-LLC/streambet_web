
import { useParams } from 'react-router-dom';
import { useStreamData } from '@/hooks/useStreamData';
import { StreamContent } from '@/components/stream/StreamContent';
import { Navigation } from '@/components/Navigation';
import { useAuthContext } from '@/contexts/AuthContext';

const Stream = () => {
  const { id } = useParams();
  const streamId = id;

  // Get session from AuthContext
  const { session, isLoading: isSessionLoading } = useAuthContext();

  // Get stream data
  const { data: stream, refetch } = useStreamData(streamId!);


  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container pt-24 pb-8">
        <StreamContent
          streamId={streamId}
          session={session}
          stream={stream?.data}
        />
      </main>
    </div>
  );
};

export default Stream;
