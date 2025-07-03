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
import { BettingRoundStatus } from '@/enums';


interface StreamContentProps {
  streamId: string;
  session: any;
  stream: any;
  refreshKey?: number;
}

export const StreamContent = ({ streamId, session, stream, refreshKey }: StreamContentProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [placedBet, setPlaceBet] = useState(true);
  const [resetKey, setResetKey] = useState(0); // Add resetKey state
  const [totalPot, setTotalPot] = useState(0); 
  const [potentialWinnings, setPotentialWinnings] = useState(0); 
  const [selectedAmount, setSelectedAmount] = useState(0); 
  const [selectedWinner, setSelectedWinner] = useState<string | undefined>(""); 
  const [isEditing, setIsEditing] = useState(false);
  const [lockedOptions, setLockedOptions] = useState<boolean>(false);  // Track if bet is locked in BetTokens,tsx
  const [lockedBet, setLockedBet] = useState<boolean>(false); 
  const [loading, setLoading] = useState<boolean>(false);            // Track if bet is locked in LockTokens.tsx

  // Socket reference
  const [socket, setSocket] = useState<any>(null);

  

  useEffect(() => {
    const newSocket = api.socket.connect();
    setSocket(newSocket);
    api.socket.joinStream(streamId, newSocket);
  
    return () => {
      api.socket.leaveStream(streamId, newSocket);
      api.socket.disconnect();
      setSocket(null);
    };
  }, [streamId]);

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

  useEffect(() => {
    setTotalPot(bettingData?.roundTotalBetsTokenAmount);
    setLockedOptions(bettingData?.bettingRounds?.[0]?.status === BettingRoundStatus.LOCKED)
  },[bettingData])

  useEffect(() => {
    console.log("check socket in bettingUpdate")
    if (!socket) return; // Only add listener if socket is available
  
    const handler = (update: any) => {
      console.log(update, 'update in bettingUpdate');
      setLoading(true)
      setTotalPot(update?.roundTotalBetsTokenAmount);
      setPotentialWinnings(update?.potentialTokenWinningAmount);
      setSelectedAmount(update?.amount)
      setSelectedWinner(update?.selectedWinner);
      setLoading(false);
    };
    socket.on('bettingUpdate', handler);

    socket.on('bettingLocked', (data) => {
      console.log(data, 'bettingLocked in bettingUpdate');

    })
  
    // Clean up the listener when socket or component unmounts
    // return () => {
    //   socket.off('bettingUpdate', handler);
    // };
  }, [socket]);

  // Query to get selected betting round data
  const { data: getRoundData, refetch: refetchRoundData} = useQuery({
    queryKey: ['selectedRoundData',bettingData?.bettingRounds?.[0]?.id],
    queryFn: async () => {
      const data = await api.betting.getBettingRoundData(bettingData?.bettingRounds?.[0]?.id);
      return data?.data;
    },
    enabled: !!bettingData?.id,
  });

  // Show bet tokens if a bet is placed
  useEffect(() => {
    if (getRoundData !== undefined && !isEditing) {
      setPlaceBet(false);
      setPotentialWinnings(getRoundData?.potentialFreeTokenAmt);
      setSelectedAmount(getRoundData?.betAmount);
      setSelectedWinner(getRoundData?.optionName);
      setLockedBet(getRoundData?.status === BettingRoundStatus.LOCKED)
    }
  }, [getRoundData, isEditing]);



  // Mutation to place a bet
  const placedBetSocket = (data: { bettingVariableId: string; amount: number; currencyType: string }) => {
    console.log('Placing bet via socket:', data);
    if (socket) {
      socket.emit('placeBet', {
        bettingVariableId: data.bettingVariableId,
        amount: data.amount,
        currencyType: data.currencyType,
      });
      if(!loading){
        setIsEditing(false);
        setPlaceBet(false)
        toast({
          description:"Bet placed successfuly",
          variant: 'default',
        });
      }
      
    } else {
      toast({
        description: 'Socket not connected. Please try again.',
        variant: 'destructive',
      });
    }
  }

  

   // Mutation to edit a bet
  const editBetSocket = (data: { newBettingVariableId: string; newAmount: number; newCurrencyType: string }) => {
    if (socket) {
      console.log('Placing edit bet via socket:', data);
      socket.emit('editBet', {
        betId:getRoundData?.betId,
        newBettingVariableId: data.newBettingVariableId,
        newAmount: data.newAmount,
        newCurrencyType: data.newCurrencyType,
      });
      if(!loading){
      setIsEditing(false);
      setPlaceBet(false)
      toast({
        description:"Bet placed successfuly",
        variant: 'default',
      });
      }
    } else {
      toast({
        description: 'Socket not connected. Please try again.',
        variant: 'destructive',
      });
    }
  }

// Function to handle bet edit
  const handleBetEdit = () => {
    setIsEditing(true);
    setPlaceBet(true); // Show BetTokens (edit mode)
    refetchRoundData();
    refetchBettingData();
    setSelectedAmount(getRoundData?.betAmount);
    setSelectedWinner(getRoundData?.optionName);
    setPotentialWinnings(getRoundData?.potentialFreeTokenAmt);
  }

  // Cancel bet mutation
    const cancelBetSocket = (data: { betId: string; currencyType: string }) => {
      if (socket) {
        console.log('Placing cancel bet via socket:', data);
        socket.emit('cancelBet', {
          betId:data?.betId,
          currencyType: data.currencyType,
        });
        setIsEditing(false);
        setPlaceBet(true)
        refetchBettingData();
        setResetKey(prev => prev + 1); // Increment resetKey on cancel
        toast({
          description:"Bet cancled successfuly",
          variant: 'default',
        });
      } else {
        toast({
          description: 'Socket not connected. Please try again.',
          variant: 'destructive',
        });
      }
    }


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
          placedBet ? (
            <BetTokens
              session={session}
              bettingData={bettingData}
              placeBet={placedBetSocket} // Pass socket bet function
              editBetMutation={editBetSocket}
              getRoundData={getRoundData}
              resetKey={resetKey} // Pass resetKey to BetTokens
              totalPot={totalPot}
              lockedOptions={lockedOptions}
              loading={loading}
            />
          ) : (
            <LockTokens
              bettingData={bettingData}
              cancelBet={cancelBetSocket}
              getRoundData={getRoundData}
              handleBetEdit={handleBetEdit}
              resetKey={resetKey} // Pass resetKey to LockTokens if needed
              potentialWinnings={potentialWinnings}
              selectedAmount={selectedAmount}
              selectedWinner={selectedWinner}
              socket={socket}
              lockedBet={lockedBet}
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
