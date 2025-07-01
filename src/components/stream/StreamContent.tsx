import { StreamPlayer } from '@/components/StreamPlayer';
import { BettingInterface } from '@/components/BettingInterface';
import { CommentSection } from '@/components/CommentSection';
import { StreamDetails } from '@/components/stream/StreamDetails';
import BetTokens from './BetTokens';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/integrations/api/client';
import LockTokens from './LockTokens';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface StreamContentProps {
  streamId: string;
  session: any;
  stream: any;
  refreshKey?: number;
}

export const StreamContent = ({ streamId, session, stream, refreshKey }: StreamContentProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
   const [placedBet, setPlaceBet] = useState(false);

   console.log(session, 'session inside StreamContent');

  const { data: bettingData, refetch: refetchBettingData} = useQuery({
    queryKey: ['bettingData'],
    queryFn: async () => {
      const data = await api.betting.getBettingData(streamId,session?.id);
      return data?.data;
    },
    // enabled: false,
  });

  // Mutation to place a bet
  const placeBetMutation = useMutation({
    mutationFn: async ({ bettingVariableId, amount, currencyType }: { bettingVariableId: string; amount: number; currencyType: string }) => {
      return await api.betting.placeBet({
        bettingVariableId,
        amount,
        currencyType,
      });
    },
    onSuccess: () => {
      setPlaceBet(true)
      toast({
        description:
          "Bet placed successfuly",
        variant: 'default',
      });
    },
    onError: (error:any) => {
      toast({
        description: error?.response?.data?.message,
        variant: 'destructive',
      });
    },
  });

  // Cancel bet mutation
   const cancelBetMutation = useMutation({
      mutationFn: async ({ betId, currencyType }: { betId: string; currencyType: string }) => {
        await api.betting.cancelUserBet({
          betId,
          currencyType,
        });
      },
      onSuccess: () => {
        setPlaceBet(false)
        toast({
          description:
            "Bet cancled successfuly",
          variant: 'default',
        });
      },
    });

  console.log(session,'session')
  console.log(bettingData, 'bettingData');
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
          onClick={() => navigate(`/login?redirect=/stream/${streamId}`)}
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


        {!placedBet  ? (
                <BetTokens
                session={session}
                bettingData={bettingData}
                placeBet={(data) => placeBetMutation.mutate(data)}
                />
        ):(

                <LockTokens
                bettingData={bettingData}
                cancelBet={(data) => cancelBetMutation.mutate(data)}/>
          )}  

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
