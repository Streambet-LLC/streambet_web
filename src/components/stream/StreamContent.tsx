import { StreamPlayer } from '@/components/StreamPlayer';
import { BettingInterface } from '@/components/BettingInterface';
import { CommentSection } from '@/components/CommentSection';
import { StreamDetails } from '@/components/stream/StreamDetails';
import BetTokens from './BetTokens';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/integrations/api/client';
import LockTokens from './LockTokens';
import { useEffect, useState } from 'react';
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

// Query to get the betting data for the stream
  const { data: bettingData, refetch: refetchBettingData} = useQuery({
    queryKey: ['bettingData', streamId, session?.id],
    queryFn: async () => {
      if (!session?.id) return null;
      const data = await api.betting.getBettingData(streamId, session.id);
      return data?.data;
    },
    enabled: !!session?.id,
  });

  // Query to get selected betting round data
  const { data: getRoundData, refetch: refetchRoundData} = useQuery({
    queryKey: ['selectedRoundData'],
    queryFn: async () => {
      const data = await api.betting.getBettingRoundData(bettingData?.bettingRounds?.[0]?.id);
      return data?.data;
    },
    enabled: !!bettingData?.bettingRounds?.[0]?.id,
  });

// Show bet tokens if a bet is placed
  useEffect(() => {
    if (getRoundData?.betAmount !== null && getRoundData?.betAmount !== undefined) {
      setPlaceBet(true);
    }
  }, [getRoundData]);

  console.log(getRoundData, 'getRoundData');

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
      refetchRoundData()
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

   // Mutation to edit a bet
   const editBetMutation = useMutation({
    mutationFn: async ({ newBettingVariableId, newAmount, newCurrencyType }: { newBettingVariableId: string; newAmount: number; newCurrencyType: string }) => {
      return await api.betting.EditBet({
        betId:getRoundData?.betId,
        newBettingVariableId,
        newAmount,
        newCurrencyType
      });
    },
    onSuccess: () => {
      refetchRoundData()
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

  const handleBetEdit = ()=>{
    setPlaceBet(false);
    refetchRoundData();
  }

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


        {/* Only show BetTokens/LockTokens if bettingRounds is not null/empty */}
        {bettingData?.bettingRounds && bettingData.bettingRounds.length > 0 ? (
          !placedBet ? (
            <BetTokens
              session={session}
              bettingData={bettingData}
              placeBet={(data) => placeBetMutation.mutate(data)}
              editBetMutation={(data) => editBetMutation.mutate(data)}
              getRoundData={getRoundData}
            />
          ) : (
            <LockTokens
              bettingData={bettingData}
              cancelBet={(data) => cancelBetMutation.mutate(data)}
              getRoundData={getRoundData}
              handleBetEdit={handleBetEdit}
            />
          )
        ) : 
        <div className="relative mx-auto rounded-[16px] shadow-lg" style={{ border: '0.62px solid #2C2C2C' }}>
          <div className='all-center flex justify-center items-center h-[100px] mt-8'>
          <img
              src="/icons/nobettingData.svg"
              alt="lock left"
              className="w-[100%] h-[100%] object-contain"
            />
          </div>
           <p className="text-2xl font-bold text-[#FFFFFF] text-center pt-4 pb-4">No betting options available</p>

          </div>}

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
