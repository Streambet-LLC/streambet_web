import { StreamPlayer } from '@/components/StreamPlayer';
import { BettingInterface } from '@/components/BettingInterface';
import { CommentSection } from '@/components/CommentSection';
import { StreamDetails } from '@/components/stream/StreamDetails';
import BetTokens from './BetTokens';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/integrations/api/client';
import LockTokens from './LockTokens';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { BettingRoundStatus, CurrencyType } from '@/enums';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrencyContext } from '@/contexts/CurrencyContext';
import Chat from './Chat';
import { FabioBoldStyle } from '@/utils/font';

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
  const [betId, setBetId] = useState<string | undefined>();
  const [placedBet, setPlaceBet] = useState(true); // show BetTokens when true, LockTokens when false
  const [resetKey, setResetKey] = useState(0); // Add resetKey state
  const [totalPot, setTotalPot] = useState(0); 
  const [totalPotTokens, setTotalPotTokens] = useState(undefined);
  const [totalPotCoins, setTotalPotCoins] = useState(undefined);
  const [potentialWinnings, setPotentialWinnings] = useState(0); 
  const [selectedAmount, setSelectedAmount] = useState(0); 
  const [selectedWinner, setSelectedWinner] = useState<string | undefined>("");
  const [updatedSliderMax, setUpdatedSliderMax] = useState({
    freeTokens: undefined,
    streamCoins: undefined,
  }); 
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
  const [updatedCurrency, setUpdatedCurrency] = useState<CurrencyType | undefined>();   //currency type from socket update
  const queryClient = useQueryClient();

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
  const { data: bettingData, refetch: refetchBettingData, isFetching: fetchingBettingData} = useQuery({
    queryKey: ['bettingData', streamId, session?.id],
    queryFn: async () => {
      if (!session?.id) return null;
      const data = await api.betting.getBettingData(streamId, session.id);
      return data?.data;
    },
    enabled: !!session?.id,
  });

  useEffect(() => {
    setTotalPot(currency === CurrencyType.STREAM_COINS ? totalPotCoins ?? (bettingData?.roundTotalBetsCoinAmount || 0) : totalPotTokens ?? (bettingData?.roundTotalBetsTokenAmount || 0));
    setLockedOptions(bettingData?.bettingRounds?.[0]?.status === BettingRoundStatus.LOCKED);
  },[bettingData, currency, totalPotCoins, totalPotTokens]);

  useEffect(() => {
    if (!socket) return; // Only add listener if socket is available

    const resetBetData = () => {
      setTotalPotTokens(undefined);
      setTotalPotCoins(undefined);
      setPlaceBet(true);
      setBetId(undefined);
      setUpdatedSliderMax({
        freeTokens: undefined,
        streamCoins: undefined,
      });
      setLockedOptions(false);
      setLockedBet(false);
      setUpdatedCurrency(undefined);
      refetchBettingData();
      refetchRoundData();
      setIsEditing(false);
    };

    const processPlacedBet = (update) => {
      queryClient.prefetchQuery({ queryKey: ['session'] }); // To recall me api that will update currency amount near to toggle
      const isStreamCoins = (updatedCurrency || currency) === CurrencyType.STREAM_COINS;
      setPotentialWinnings(isStreamCoins ? update?.potentialCoinWinningAmount : update?.potentialTokenWinningAmount);
      setBetId(update?.bet?.id);
      setUpdatedSliderMax({
        freeTokens: update?.updatedWalletBalance?.freeTokens || undefined,
        streamCoins: update?.updatedWalletBalance?.streamCoins || undefined,
      });
      setSelectedAmount(update?.amount);
      setSelectedWinner(update?.selectedWinner);
      setIsEditing(false);
      setPlaceBet(false);
      toast({
        description:"Bet placed successfuly",
        variant: 'default',
      });
    };
  
    const handler = (update: any) => {
      console.log('bettingUpdate', update);
      setTotalPotCoins(update?.totalBetsCoinAmount);
      setTotalPotTokens(update?.totalBetsTokenAmount);
      setLoading(false);
      setHasSocketUpdate(true);
    };

    // For all users
    socket.on('bettingUpdate', handler);
    
    socket.on('potentialAmountUpdate', (data) => {
      console.log('potentialAmountUpdate', data);
      const isStreamCoins = (updatedCurrency || currency) === CurrencyType.STREAM_COINS;
      setPotentialWinnings(isStreamCoins ? data?.potentialCoinWinningAmount : data?.potentialTokenWinningAmount);
    });

    socket.on('bettingLocked', (data) => {
      console.log('bettingLocked', data);
      setLockedOptions(data?.locked)
      setLockedBet(data?.locked);
    });

    socket.on('winnerDeclared', (data) => { 
      toast({
        title: 'Round Closed',
        description: `${data?.winnerName} has selected as winning bet option!`,
        duration: 7000,
      });
      resetBetData();
      setWinnerOption(data?.winnerName);
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
      setResetKey(prev => prev + 1);
      queryClient.prefetchQuery({ queryKey: ['session'] }); 
    });

    socket.on('betPlaced', (update) => {
      console.log('betPlaced', update);
      processPlacedBet(update);
    });

    socket.on('betOpened', (update) => {
      console.log('betOpened', update);
      toast({
        description:"New betting options available!",
        variant: 'default',
      });
      resetBetData();
    });

    socket.on('betCancelledByAdmin', (update) => {
      console.log('betCancelledByAdmin', update);
      queryClient.prefetchQuery({ queryKey: ['session'] });
      toast({
        description:"Current betting round cancelled by admin.",
        variant: 'destructive',
        duration: 6000,
      });
      resetBetData();
    });

    socket.on('betCancelled', (update) => {
      console.log('betCancelled', update);
      queryClient.prefetchQuery({ queryKey: ['session'] });
      setUpdatedSliderMax({
        freeTokens: update?.updatedWalletBalance?.freeTokens || 0,
        streamCoins: update?.updatedWalletBalance?.streamCoins || 0,
      });
      toast({
        description:"Bet cancelled",
        variant: 'default',
      });
      resetBetData();
    });

    socket.on('betEdited', (update) => {
      console.log('betEdited', update);
      processPlacedBet(update);
    });

    socket.on('streamEnded', (update) => {
      console.log('streamEnded', update);
      toast({
        description:"Stream has ended.",
        variant: 'destructive',
        duration: 10000,
      });
      navigate('/');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, toast]);

  // Query to get selected betting round data
  const { data: getRoundData, refetch: refetchRoundData} = useQuery({
      queryKey: ['selectedRoundData',bettingData?.bettingRounds?.[0]?.id],
      queryFn: async () => {
        const data = bettingData?.bettingRounds?.[0]?.id ? await api.betting.getBettingRoundData(bettingData?.bettingRounds?.[0]?.id) : null;
        return data?.data;
      },
      enabled: !!bettingData?.id,
  });

  useEffect(() => {
    if (hasSocketUpdate) return;
    if (getRoundData) {
      setPlaceBet(false);
      setPotentialWinnings(getRoundData?.currencyType === CurrencyType.FREE_TOKENS ? getRoundData?.potentialFreeTokenAmt : getRoundData?.potentialCoinAmt);
      setSelectedAmount(getRoundData?.betAmount);
      setSelectedWinner(getRoundData?.optionName);
      setLockedBet(getRoundData?.status === BettingRoundStatus.LOCKED);
      setUpdatedCurrency(getRoundData?.currencyType)
    } else
    {
      setPlaceBet(true);
    }
  }, [getRoundData, hasSocketUpdate]);


  // Mutation to place a bet
  const placedBetSocket = (data: { bettingVariableId: string; amount: number; currencyType: string }) => {
    setLoading(true);
    console.log('Placing bet via socket:', data);
    if (socket) {
      setUpdatedCurrency(data.currencyType as CurrencyType);
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
      setUpdatedCurrency(data.newCurrencyType as CurrencyType);
      socket.emit('editBet', {
        betId: betId ?? getRoundData?.betId,
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
        setPlaceBet(true);
        refetchBettingData();
        setResetKey(prev => prev + 1); // Increment resetKey on cancel
      } else {
        toast({
          description: 'Socket not connected. Please try again.',
          variant: 'destructive',
        });
      }
    }


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-screen">

      
      <div className="lg:col-span-2 space-y-6">
        <StreamPlayer 
        showInfo
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
                className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Paper blast from left side */}
                <motion.div
                  className="absolute left-0 top-1/2 transform -translate-y-1/2"
                  initial={{ x: -100, rotate: -45 }}
                  animate={{ x: 50, rotate: 0 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 200, 
                    damping: 15,
                    delay: 0.2
                  }}
                >
                  <div className="w-16 h-20 bg-yellow-400 transform rotate-12 shadow-lg"></div>
                  <div className="w-12 h-16 bg-blue-400 transform -rotate-6 shadow-lg mt-2"></div>
                  <div className="w-14 h-18 bg-red-400 transform rotate-8 shadow-lg mt-1"></div>
                </motion.div>

                {/* Paper blast from right side */}
                <motion.div
                  className="absolute right-0 top-1/2 transform -translate-y-1/2"
                  initial={{ x: 100, rotate: 45 }}
                  animate={{ x: -50, rotate: 0 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 200, 
                    damping: 15,
                    delay: 0.2
                  }}
                >
                  <div className="w-16 h-20 bg-green-400 transform -rotate-12 shadow-lg"></div>
                  <div className="w-12 h-16 bg-purple-400 transform rotate-6 shadow-lg mt-2"></div>
                  <div className="w-14 h-18 bg-orange-400 transform -rotate-8 shadow-lg mt-1"></div>
                </motion.div>

                {/* Center congratulations text */}
                <motion.div
                  className="relative z-10 bg-gradient-to-r from-lime-400 to-green-500 text-black text-3xl font-bold px-10 py-6 rounded-xl shadow-xl"
                  initial={{ scale: 0.8, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0, y: 20 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 300, 
                    damping: 20,
                    delay: 0.1
                  }}
                >
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ 
                      duration: 0.5,
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                  >
                    🎉 Congratulations!! You are a winner! 🎉
                  </motion.div>
                </motion.div>

                {/* Additional floating confetti */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 bg-yellow-300 rounded-full"
                      style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                      }}
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ 
                        y: [0, -30, 0],
                        opacity: [0, 1, 0],
                        rotate: [0, 360]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.2
                      }}
                    />
                  ))}
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
              updatedSliderMax={updatedSliderMax}
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
              updatedBetId={betId}
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
        <div className="relative mx-auto rounded-[16px] shadow-lg p-5" style={{ backgroundColor:'rgba(24, 24, 24, 1)' }}>
          <div className='all-center flex justify-center items-center h-[100px] mt-8'>
          <img
              src="/icons/nobettingData.svg"
              alt="lock left"
              className="w-[100%] h-[100%] object-contain"
            />
          </div>
           <p className="text-2xl text-[rgba(255, 255, 255, 1)] text-center pt-4 pb-4" style={FabioBoldStyle}>No betting options available</p>

          </div>}


        {/* <div className="lg:hidden mt-4">
          <CommentSection session={session} streamId={streamId} showInputOnly={true} />
        </div> */}
      </div>

      <div className="lg:col-span-1 flex flex-col h-full">
        <div className="flex-1 h-full sticky top-24">
          {/* <CommentSection session={session} streamId={streamId} showInputOnly={false} /> */}
          <Chat/>
        </div>
      </div>
    </div>
  );
};
