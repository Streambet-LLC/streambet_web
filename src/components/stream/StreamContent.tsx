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
import { BettingRoundStatus, CurrencyType } from '@/enums';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrencyContext } from '@/contexts/CurrencyContext';

interface StreamContentProps {
  streamId: string;
  session: any;
  stream: any;
  refreshKey?: number;
}

export const StreamContent = ({ streamId, session, stream, refreshKey }: StreamContentProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currency } = useCurrencyContext();
  const [placedBet, setPlaceBet] = useState(true); // show BetTokens when true, LockTokens when false
  const [resetKey, setResetKey] = useState(0); // Add resetKey state
  const [totalPot, setTotalPot] = useState(0); 
  const [potentialWinnings, setPotentialWinnings] = useState(0); 
  const [selectedAmount, setSelectedAmount] = useState(0); 
  const [selectedWinner, setSelectedWinner] = useState<string | undefined>(""); 
  const [isEditing, setIsEditing] = useState(false);  //indicate if it's an editing state
  const [lockedOptions, setLockedOptions] = useState<boolean>(false);  // Track if bet is locked in BetTokens,tsx
  const [lockedBet, setLockedBet] = useState<boolean>(false); // Track if bet is locked in LockTokens.tsx
  const [loading, setLoading] = useState<boolean>(false);    // Loader state when data is being fetched from socket           
  const [winnerOption, setWinnerOption] = useState<boolean>(); 
  // Socket reference
  const [socket, setSocket] = useState<any>(null);
  const [showWinnerAnimation, setShowWinnerAnimation] = useState(false);
  // Track if last update came from socket then no need to execute getRoundData useEffect
  const [hasSocketUpdate, setHasSocketUpdate] = useState(false);
  const [isUserWinner, setIsUserWinner] = useState(false);
  const [updatedCurrency, setUpdatedCurrency] = useState();   //currency type from socket update

  console.log(currency,'currency')

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

  console.log(currency,CurrencyType?.FREE_TOKENS,'currency in bettingData')

  useEffect(() => {
    setTotalPot(currency === CurrencyType?.FREE_TOKENS && !isEditing ?  bettingData?.roundTotalBetsTokenAmount : currency === CurrencyType?.STREAM_COINS && !isEditing?bettingData?.roundTotalBetsCoinAmount:null);
    setLockedOptions(bettingData?.bettingRounds?.[0]?.status === BettingRoundStatus.LOCKED)
  },[bettingData,currency])



  useEffect(() => {
    if (!socket) return; // Only add listener if socket is available
  
    const handler = (update: any) => {
      console.log(update, 'update in bettingUpdate');
      setTotalPot(CurrencyType?.FREE_TOKENS === update?.currencyType ? update?.totalBetsTokenAmount :  CurrencyType?.STREAM_COINS === update?.currencyType ? update?.totalBetsCoinAmount : null);
      setUpdatedCurrency(update?.currencyType)
      setPotentialWinnings(update?.potentialTokenWinningAmount);
      setSelectedAmount(update?.amount)
      setSelectedWinner(update?.selectedWinner);
      setLoading(false);
      setIsEditing(false);
      setPlaceBet(false)
      toast({
        description:"Bet placed successfuly",
        variant: 'default',
      });
      setHasSocketUpdate(true);
    };
    socket.on('bettingUpdate', handler);

    socket.on('bettingLocked', (data) => {
      setLockedOptions(data?.locked)
      setLockedBet(data?.locked);
      
      console.log(data, 'bettingLocked in bettingUpdate');

    })

    socket.on('winnerDeclared', (data) => {
      console.log(data,'winnerDeclared')
      setWinnerOption(data?.winnerName)
      setShowWinnerAnimation(true);
      // Check if current session user is a winner
      if (Array.isArray(data?.winners) && session?.id) {
        const found = data.winners.some((w: any) => w.userId === session.id);
        setIsUserWinner(found);
      } else {
        setIsUserWinner(false);
      }
      // Hide the animation after 5 seconds
      setTimeout(() => {
        setShowWinnerAnimation(false);
      }, 5000);
    })
  
    // Clean up the listener when socket or component unmounts
    // return () => {
    //   socket.off('bettingUpdate', handler);
    // };
  }, [socket, toast]);



  console.log(totalPot,'totalPot in bettingData')

    // Query to get selected betting round data
  const { data: getRoundData, refetch: refetchRoundData} = useQuery({
      queryKey: ['selectedRoundData',bettingData?.bettingRounds?.[0]?.id],
      queryFn: async () => {
        const data = await api.betting.getBettingRoundData(bettingData?.bettingRounds?.[0]?.id);
        return data?.data;
      },
      enabled: !!bettingData?.id,
    });

  useEffect(() => {
    if (hasSocketUpdate) return;
    if (getRoundData !== undefined) {
      setPlaceBet(false);
      setPotentialWinnings(getRoundData?.potentialFreeTokenAmt);
      setSelectedAmount(getRoundData?.betAmount);
      setSelectedWinner(getRoundData?.optionName);
      setLockedBet(getRoundData?.status === BettingRoundStatus.LOCKED)
      setUpdatedCurrency(getRoundData?.currencyType)
    }
  }, [getRoundData, hasSocketUpdate]);



  // Mutation to place a bet
  const placedBetSocket = (data: { bettingVariableId: string; amount: number; currencyType: string }) => {
    setLoading(true);
    console.log('Placing bet via socket:', data);
    if (socket) {
      socket.emit('placeBet', {
        bettingVariableId: data.bettingVariableId,
        amount: data.amount,
        currencyType: data.currencyType,
      });
      
    } else {
      toast({
        description: 'Socket not connected. Please try again.',
        variant: 'destructive',
      });
    }
  }

  

   // Mutation to edit a bet
  const editBetSocket = (data: { newBettingVariableId: string; newAmount: number; newCurrencyType: string }) => {
    setLoading(true);
    if (socket) {
      console.log('Placing edit bet via socket:', data);
      socket.emit('editBet', {
        betId:getRoundData?.betId,
        newBettingVariableId: data.newBettingVariableId,
        newAmount: data.newAmount,
        newCurrencyType: data.newCurrencyType,
      });
      
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
    // refetchRoundData();
    // refetchBettingData();
    // setSelectedAmount(getRoundData?.betAmount);
    // setSelectedWinner(getRoundData?.optionName);
    // setPotentialWinnings(getRoundData?.potentialFreeTokenAmt);
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

          <AnimatePresence>
             {showWinnerAnimation && isUserWinner && ( 
              <motion.div
                className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="bg-gradient-to-r from-lime-400 to-green-500 text-black text-3xl font-bold px-10 py-6 rounded-xl shadow-xl"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                 Congratulations!! You are a winner!
                </motion.div>
              </motion.div>
              )} 
          </AnimatePresence>

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
              selectedAmount={selectedAmount}
              selectedWinner={selectedWinner}
              isEditing={isEditing}
              updatedCurrency={updatedCurrency}
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
