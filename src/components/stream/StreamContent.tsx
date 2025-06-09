import { StreamPlayer } from '@/components/StreamPlayer';
import { BettingInterface } from '@/components/BettingInterface';
import { CommentSection } from '@/components/CommentSection';
import { StreamDetails } from '@/components/stream/StreamDetails';

interface StreamContentProps {
  streamId: string;
  session: any;
  stream: any;
  refreshKey: number;
}

export const StreamContent = ({ streamId, session, stream, refreshKey }: StreamContentProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <StreamPlayer streamId={streamId} />

        {/* Stream Details component with real-time viewer tracking */}
        {stream && (
          <StreamDetails
            key={`stream-details-${streamId}-${Date.now()}`}
            stream={stream}
            streamId={streamId}
          />
        )}

        <BettingInterface
          key={`betting-${session?.user?.id}-${streamId}-${refreshKey}-${Date.now()}`}
          session={session}
          stream={stream}
          streamId={streamId}
        />

        <div className="lg:hidden mt-4">
          <CommentSection session={session} streamId={streamId} showInputOnly={true} />
        </div>
      </div>

      <div className="lg:col-span-1 flex flex-col h-full">
        <div className="flex-1 h-full sticky top-24">
          <CommentSection session={session} streamId={streamId} showInputOnly={false} />
        </div>
      </div>
    </div>
  );
};
