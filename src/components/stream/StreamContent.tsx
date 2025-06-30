import { StreamPlayer } from '@/components/StreamPlayer';
import { BettingInterface } from '@/components/BettingInterface';
import { CommentSection } from '@/components/CommentSection';
import { StreamDetails } from '@/components/stream/StreamDetails';
import BetTokens from './BetTokens';
import { useNavigate } from 'react-router-dom';

interface StreamContentProps {
  streamId: string;
  session: any;
  stream: any;
  refreshKey?: number;
}

export const StreamContent = ({ streamId, session, stream, refreshKey }: StreamContentProps) => {
  const navigate = useNavigate();

  console.log(session,'session')
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <StreamPlayer 
        streamId={streamId} 
       />

       {session == null &&
      <div className="bg-[#181818] p-4 rounded-[16px] flex flex-col items-center space-y-3 w-full mx-auto">
        <h2 className="text-white text-lg font-semibold">Sign in to play</h2>
        <button
          className="w-full bg-lime-400 text-black font-medium py-2 rounded-full hover:bg-lime-300 transition"
          onClick={() => navigate(`/login?from=stream&id=${streamId}`)}
        >
          Sign in
        </button>
      </div>
        }

        {/* Stream Details component with real-time viewer tracking */}
        {/* {stream && (
          <StreamDetails
            key={`stream-details-${streamId}-${Date.now()}`}
            stream={stream}
            streamId={streamId}
          />
        )} */}

        <BetTokens
        session={session}/>

        {/* <BettingInterface
          key={`betting-${session?.id}-${streamId}-${refreshKey}-${Date.now()}`}
          session={session}
          stream={stream}
          streamId={streamId}
        /> */}

        {/* <div className="lg:hidden mt-4">
          <CommentSection session={session} streamId={streamId} showInputOnly={true} />
        </div> */}
      </div>

      <div className="lg:col-span-1 flex flex-col h-full">
        {/* <div className="flex-1 h-full sticky top-24">
          <CommentSection session={session} streamId={streamId} showInputOnly={false} />
        </div> */}
      </div>
    </div>
  );
};
