import { StreamPlayer } from '@/components/StreamPlayer';
import BetTokens from './BetTokens';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/integrations/api/client';
import LockTokens from './LockTokens';
import { useEffect, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { BettingRoundStatus, CurrencyType, StreamStatus } from '@/enums';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrencyContext } from '@/contexts/CurrencyContext';
import Chat from './Chat';
import { FabioBoldStyle } from '@/utils/font';
import { useBettingStatusContext } from '@/contexts/BettingStatusContext';
import { formatDateTime, getConnectionErrorMessage, getImageLink } from '@/utils/helper';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface StreamContentProps {
  streamId: string;
  session: any;
  stream: any;
  refreshKey?: number;
  refetchStream: VoidFunction;
}

export const StreamContent = ({ 
  streamId, 
  session, 
  stream, 
  refreshKey,
  refetchStream
}: StreamContentProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currency } = useCurrencyContext();
  const { socketConnect } = useBettingStatusContext();
  const { isConnected: isNetworkConnected } = useNetworkStatus();
  const [betId, setBetId] = useState<string | undefined>();
  const [placedBet, setPlaceBet] = useState(true); // show BetTokens when true, LockTokens when false
  const [resetKey, setResetKey] = useState(0); // Add resetKey state
  const [totalPot, setTotalPot] = useState(0); 
  const [totalPotGoldCoins, setTotalPotGoldCoins] = useState(undefined);
  const [totalPotSweepCoins, setTotalPotSweepCoins] = useState(undefined);
  const [potentialWinnings, setPotentialWinnings] = useState(0); 
  const [selectedAmount, setSelectedAmount] = useState(0); 
  const [selectedWinner, setSelectedWinner] = useState<string | undefined>("");
  const [updatedSliderMax, setUpdatedSliderMax] = useState({
    goldCoins: undefined,
    sweepCoins: undefined,
  }); 
  const [isEditing, setIsEditing] = useState(false);  //indicate if it's an editing state
  const [lockedOptions, setLockedOptions] = useState<boolean>(false);  // Track if bet is locked in BetTokens,tsx
  const [lockedBet, setLockedBet] = useState<boolean>(false); // Track if bet is locked in LockTokens.tsx
  const [loading, setLoading] = useState<boolean>(false);    // Loader state when data is being fetched from socket           
  const [winnerOption, setWinnerOption] = useState<boolean>(); 
  // Socket reference
  const [showWinnerAnimation, setShowWinnerAnimation] = useState(false);
  // Track if last update came from socket then no need to execute getRoundData useEffect
  const [hasSocketUpdate, setHasSocketUpdate] = useState(false);
  const [isUserWinner, setIsUserWinner] = useState(false);
  const [isUserLoser, setIsUserLoser] = useState(false);
  const [viewerCount, setViewerCount] = useState(null);
  const [updatedCurrency, setUpdatedCurrency] = useState<CurrencyType | undefined>();   //currency type from socket update
  const [messageList, setMessageList] = useState<any>();
  const [roundDetails, setRoundDetails] = useState<any>();
  const queryClient = useQueryClient();

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isStreamScheduled = stream?.status === StreamStatus.SCHEDULED;
  const isStreamEnded = stream?.status === StreamStatus.ENDED;

  const getRoundsData = (roundsData?: any) => {
    const roundDetailsData = roundsData && roundsData?.length ? roundsData 
      : (stream?.roundDetails || []);
    const createdIndex = roundDetailsData?.findIndex((round) => 
      round?.roundStatus === BettingRoundStatus.CREATED);
    const updatedRounds = roundDetailsData?.filter((round, index) => 
      round?.roundStatus !== BettingRoundStatus.OPEN && (createdIndex !== -1 ? 
        index <= createdIndex : true));
    return updatedRounds;
  };

  useEffect(() => {
    setRoundDetails(getRoundsData());
  }, [stream]);

  // Function to setup socket event listeners
  const setupSocketEventListeners = (socketInstance: any) => {
    if (!socketInstance) return;
    
    const resetBetData = () => {
      setTotalPotGoldCoins(undefined);
      setTotalPotSweepCoins(undefined);
      setPlaceBet(true);
      setBetId(undefined);
      setUpdatedSliderMax({
        goldCoins: undefined,
        sweepCoins: undefined,
      });
      setLockedOptions(false);
      setLockedBet(false);
      setUpdatedCurrency(undefined);
      refetchBettingData();
      refetchRoundData();
      setIsEditing(false);
    };

    const processPlacedBet = (update) => {
      console.log('update process bet placed', update);
      queryClient.prefetchQuery({ queryKey: ['session'] }); // To recall me api that will update currency amount near to toggle
      const isSweepCoins = (updatedCurrency || currency) === CurrencyType.SWEEP_COINS;
      setPotentialWinnings(isSweepCoins ? update?.potentialSweepCoinWinningAmount : update?.potentialGoldCoinWinningAmount);
      setBetId(update?.bet?.id);
      setUpdatedSliderMax({
        goldCoins: update?.updatedWalletBalance?.goldCoins || undefined,
        sweepCoins: update?.updatedWalletBalance?.sweepCoins || undefined,
      });
      setSelectedAmount(update?.amount);
      setSelectedWinner(update?.selectedWinner);
      setIsEditing(false);
      setPlaceBet(false);
      if (update?.message) {
        toast({
          description: update.message,
          variant: 'default',
        });
      }
    };
  
    const handler = (update: any) => {
      console.log('bettingUpdate', update);
      setTotalPotSweepCoins(update?.totalBetsSweepCoinAmount);
      setTotalPotGoldCoins(update?.totalBetsGoldCoinAmount);
      setLoading(false);
      setHasSocketUpdate(true);
    };

    // For all users
    socketInstance.on('bettingUpdate', handler);

    socketInstance.on('viewerCountUpdate', (count) => { 
      console.log('viewerCountUpdate', count);
      setViewerCount(count);
    });
    
    socketInstance.on('potentialAmountUpdate', (data) => {
      console.log('potentialAmountUpdate', data);
      const isSweepCoins = (updatedCurrency || currency) === CurrencyType.SWEEP_COINS;
      setPotentialWinnings(isSweepCoins ? data?.potentialSweepCoinWinningAmount : data?.potentialGoldCoinWinningAmount);
    });

    socketInstance.on('bettingLocked', (data) => {
      console.log('bettingLocked', data);
      setLockedOptions(data?.lockedStatus)
      setLockedBet(data?.lockedStatus);
    });

    socketInstance.on('winnerDeclared', (data) => {
      console.log('winner declared', data);
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
      // Check if current session user is a loser
      if (Array.isArray(data?.losers) && session?.id) {
        const found = data.losers.some((l: any) => l.userId === session.id);
        setIsUserLoser(found);
      } else {
        setIsUserLoser(false);
      }
      // Hide the animation after 5 seconds
      setTimeout(() => {
        setShowWinnerAnimation(false);
      }, 5000);
      setResetKey(prev => prev + 1);
      queryClient.prefetchQuery({ queryKey: ['session'] });
      refetchStream();
    });

    socketInstance.on('betPlaced', (update) => {
      console.log('betPlaced', update);
      if(update?.bet?.userId === session?.id) {
        processPlacedBet(update);
      }
    });

    socketInstance.on('betOpened', (update) => {
      console.log('betOpened', update);
      toast({
        description:"New betting options available!",
        variant: 'default',
      });
      resetBetData();
    });

    socketInstance.on('betCancelledByAdmin', (update) => {
      queryClient.prefetchQuery({ queryKey: ['session'] });
      toast({
        description:"Current betting round cancelled by admin.",
        variant: 'destructive',
        duration: 4000,
      });
      resetBetData();
      refetchStream();
    });

    socketInstance.on('betCancelled', (update) => {
      console.log(update,'betCancelled')
       if(update?.bet?.userId === session?.id) {
          queryClient.prefetchQuery({ queryKey: ['session'] });
          setUpdatedSliderMax({
            goldCoins: update?.updatedWalletBalance?.goldCoins || 0,
            sweepCoins: update?.updatedWalletBalance?.sweepCoins || 0,
          });
          if (update?.message){
          toast({
            description:update?.message,
            variant: 'default',
          });
        }
          resetBetData();
    }
    });

    socketInstance.on('betEdited', (update) => {
      console.log('betEdited',update)
      if(update?.bet?.userId === session?.id) {
        processPlacedBet(update);
      }
    });
    
    socketInstance.on('newMessage', (update) => {
      setMessageList(update)
    });

    socketInstance.on('roundUpdated', (roundsData) => {
      console.log('roundUpdated', roundsData);
      setRoundDetails(getRoundsData(roundsData));
    });

    socketInstance.on('streamEnded', (update) => {
      toast({
        description:"Stream has ended.",
        variant: 'destructive',
        duration: 10000,
      });
      navigate('/');
    });

    // Handle disconnection events
    socketInstance.on('disconnect', (reason: string) => {
      console.log('Socket disconnected:', reason);
      if (reason !== 'io client disconnect') {
        // Only attempt reconnection if it wasn't an intentional disconnect
        api.socket.joinStream(streamId, socketConnect);
      
      }
    });

    socketInstance.on('connect_error', (error: any) => {
      console.log('Socket connection error:', error);
      api.socket.joinStream(streamId, socketConnect);
      setLoading(false);
    });
  };

  useEffect(() => {
    if(socketConnect){
    api.socket.joinStream(streamId, socketConnect);
    
    // Setup event listeners
    setupSocketEventListeners(socketConnect);
    }
  
   
  }, [streamId,socketConnect]);

  useEffect (()=> () => {
      // Cleanup ping-pong intervals
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      api.socket.leaveStream(streamId, socketConnect);

      if (socketConnect) {
            socketConnect?.off('bettingUpdate');
            socketConnect?.off('potentialAmountUpdate');
            socketConnect?.off('bettingLocked');
            socketConnect?.off('winnerDeclared');
            socketConnect?.off('newMessage');
            socketConnect?.off('streamEnded');
            socketConnect?.off('betPlaced');
            socketConnect?.off('betEdited');
            socketConnect?.off('betOpened');
            socketConnect?.off('betCancelled');
            socketConnect?.off('betCancelledByAdmin');
            socketConnect?.off('viewerCountUpdate');
            socketConnect?.off('roundUpdated');
      }
    },
  [])

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
    setTotalPot(currency === CurrencyType.SWEEP_COINS ? totalPotSweepCoins ?? (bettingData?.roundTotalBetsSweepCoinAmount || 0) : totalPotGoldCoins ?? (bettingData?.roundTotalBetsGoldCoinAmount || 0));
    setLockedOptions(bettingData?.bettingRounds?.[0]?.status === BettingRoundStatus.LOCKED);
  },[bettingData, currency, totalPotSweepCoins, totalPotGoldCoins]);

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
    console.log('getRoundData', getRoundData);
    if (hasSocketUpdate) return;
    if (getRoundData) {
      setPlaceBet(false);
      setPotentialWinnings(getRoundData?.currencyType === CurrencyType.GOLD_COINS ? getRoundData?.potentialGoldCoinAmt : getRoundData?.potentialSweepCoinAmt);
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
    if (socketConnect) {
      setUpdatedCurrency(data.currencyType as CurrencyType);
      socketConnect.emit('placeBet', {
        bettingVariableId: data.bettingVariableId,
        amount: data.amount,
        currencyType: data.currencyType,
      });
      
    } else {
      toast({
        description: getConnectionErrorMessage({ isOnline: isNetworkConnected }),
        variant: 'destructive',
      });
      setLoading(false);
    }
  }

   // Mutation to edit a bet
  const editBetSocket = (data: { newBettingVariableId: string; newAmount: number; newCurrencyType: string }) => {
    setLoading(true);
    if (socketConnect && socketConnect.connected) {
      setUpdatedCurrency(data.newCurrencyType as CurrencyType);
      socketConnect.emit('editBet', {
        betId: betId ?? getRoundData?.betId,
        newBettingVariableId: data.newBettingVariableId,
        newAmount: data.newAmount,
        newCurrencyType: data.newCurrencyType,
      });
      
    } else {
      toast({
        description: getConnectionErrorMessage({ isOnline: isNetworkConnected }),
        variant: 'destructive',
      });
    }
  }

// Function to handle bet edit
  const handleBetEdit = () => {
    setIsEditing(true);
    setPlaceBet(true); // Show BetTokens (edit mode)
    refetchRoundData(); // when canceling and placcing bet,then editing we need to refetch round data
  }

  // Cancel bet mutation
    const cancelBetSocket = (data: { betId: string; currencyType: string }) => {
      if (socketConnect && socketConnect.connected) {
        socketConnect.emit('cancelBet', {
          betId:data?.betId,
          currencyType: data.currencyType,
        });
        setIsEditing(false);
        setPlaceBet(true);
        refetchBettingData();
        setResetKey(prev => prev + 1); // Increment resetKey on cancel
      } else {
        toast({
          description: getConnectionErrorMessage({ isOnline: isNetworkConnected }),
          variant: 'destructive',
        });
      }
    }

 // Mutation to send a message
  const sendMessageSocket = (data: { message: string;imageURL:string;}) => {
    if (socketConnect && socketConnect.connected) {
      socketConnect.emit('sendChatMessage', {
        streamId: streamId,
        message: data?.message,
        imageURL:data?.imageURL,
        timestamp: new Date(),
      });
      
    } else {
      toast({
        description: getConnectionErrorMessage({ isOnline: isNetworkConnected }),
        variant: 'destructive',
      });
    }
  }


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-screen h-full">

      
      <div className="lg:col-span-2 space-y-6 max-h-[100vh] h-full">
      <div className="relative">
            {isStreamScheduled || isStreamEnded ? <div className="relative aspect-video rounded-lg overflow-hidden">
              {isStreamScheduled && stream?.thumbnailUrl && (
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{
                    backgroundImage: `url(${getImageLink(encodeURIComponent(stream.thumbnailUrl))})`,
                    opacity: 0.3
                  }}
                />
              )}
              {/* Fallback black background if no thumbnail */}
              {!stream?.thumbnailUrl && (
                <div className="absolute inset-0 bg-black" />
              )}
              <div className={`relative z-10 px-2 w-full h-full flex items-center border border-primary justify-center text-white ${isStreamScheduled ? 'text-md' : 'text-2xl'} font-bold rounded-lg`}>
                {isStreamScheduled ? `Stream '${stream?.name}' scheduled on ${formatDateTime(stream?.scheduledStartTime)}.` : 'Stream has ended.'}
              </div>
            </div> : <StreamPlayer showInfo streamId={streamId} />}
          </div>

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

              {showWinnerAnimation && isUserLoser && (
                <motion.div
                  className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center overflow-hidden p-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Subtle raining lines to suggest a loss (mobile-friendly) */}
                  <motion.div className="absolute inset-0 pointer-events-none">
                    {[...Array(12)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-[2px] h-6 sm:h-8 bg-blue-400/70 rounded-full"
                        style={{ left: `${Math.random() * 100}%`, top: -20 }}
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: '120%', opacity: [0, 1, 0.3, 0] }}
                        transition={{ duration: 2 + (i % 4) * 0.2, repeat: Infinity, delay: i * 0.12, ease: 'easeIn' }}
                      />
                    ))}
                  </motion.div>

                  {/* Center message */}
                  <motion.div
                    className="relative z-10 bg-zinc-900/80 backdrop-blur text-white text-xl sm:text-2xl md:text-3xl font-bold px-6 py-4 sm:px-8 sm:py-5 rounded-xl shadow-xl border border-zinc-700"
                    initial={{ scale: 0.9, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  >
                    <motion.div className='leading-[80px]'
                      animate={{ x: [0, -4, 4, 0] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      This bet didn’t go your way 😕 <br />But the next one might be yours!
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
          </AnimatePresence>

        {/* Only show BetTokens/LockTokens if bettingRounds is not null/empty */}
        {!isStreamEnded && bettingData?.bettingRounds && bettingData.bettingRounds.length  ? (
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
              lockedBet={lockedBet}
            />
          ) : (
              <LockTokens
              updatedCurrency={updatedCurrency}
              isStreamScheduled={isStreamScheduled}
              updatedBetId={betId}
              bettingData={bettingData}
              cancelBet={cancelBetSocket}
              getRoundData={getRoundData}
              handleBetEdit={handleBetEdit}
              resetKey={resetKey} // Pass resetKey to LockTokens if needed
              potentialWinnings={potentialWinnings}
              selectedAmount={selectedAmount}
              selectedWinner={selectedWinner}
              socket={socketConnect}
              lockedBet={lockedBet}
            />
          )
        ) : (
          session != null && (<>
            {roundDetails?.length === 0 ? <div className="relative mx-auto rounded-[16px] shadow-lg p-5 h-[240px]" style={{ backgroundColor:'rgba(24, 24, 24, 1)' }}>
              <div className='all-center flex justify-center items-center h-[100px] mt-8'>
                <img
                  src="/icons/nobettingData.svg"
                  alt="lock left"
                  className="w-[100%] h-[100%] object-contain"
                />
              </div>
              <p className="text-2xl text-[rgba(255, 255, 255, 1)] text-center pt-4 pb-4" style={FabioBoldStyle}>No betting options available</p>
            </div> : <div className="flex gap-4 p-6 rounded-[16px] shadow-lg overflow-x-auto overflow-y-hidden flex-nowrap" style={{ backgroundColor:'rgba(24, 24, 24, 1)' }}>

            {roundDetails?.map(
              round => {
              const isRoundClosed = round?.roundStatus === BettingRoundStatus.CLOSED;
              const isRoundCreated = round?.roundStatus === BettingRoundStatus.CREATED;
              const isRoundCancelled = round?.roundStatus === BettingRoundStatus.CANCELLED;
              const isRoundLocked = round?.roundStatus === BettingRoundStatus.LOCKED;
              
              if (isRoundClosed) {
                return (
                  <div className="flex flex-col justify-center items-center bg-black rounded-2xl w-80 h-48 shrink-0">
                    <p className="text-white font-semibold text-lg">{round?.roundName}</p>
                    <div className="flex flex-col items-center gap-2 mt-2">
                      <p className="text-white font-bold">{round?.winningOption?.[0]?.variableName} as winner</p>
                      <span className="text-white text-sm font-medium">won {round?.winningOption?.[0]?.totalGoldCoinAmt} gold coins</span>
                      <span className="text-white text-sm font-medium">and {round?.winningOption?.[0]?.totalSweepCoinAmt} sweep coins</span>
                    </div>
                  </div>
                )} else if (isRoundCancelled) {
                return (
                  <div className="flex flex-col justify-center items-center bg-black rounded-2xl w-80 h-48 shrink-0">
                    <p className="text-white font-semibold text-lg">{round?.roundName} cancelled</p>
                  </div>
                )} else if (isRoundLocked) {
                return (
                <div className="flex justify-center items-center bg-black rounded-2xl w-80 h-48 shadow-[0_0_20px_#a3e635] shrink-0">
                  <p className="text-white font-medium">{round?.roundName} is locked</p>
                </div>
                )} else if (isRoundCreated) {
                  return (
                  <div className="flex justify-center items-center bg-black rounded-2xl w-80 h-48 border border-[#BDFF00] shadow-[0_0_20px_#a3e635] shrink-0">
                    <p className="text-white font-medium">{round?.roundName} is coming up!</p>
                  </div>
                  )}
              })
            }
            </div>}
          </>
          )
        )}


      </div>

      <div className="lg:col-span-1 flex flex-col mb-5 h-full">
        <div className="flex-1 h-full sticky top-24 md:max-w-[320px]">
          <div className="border p-4 mb-3 border-zinc-700 rounded-[16px]">
            <h2 className="text-lg font-semibold leading-tight pt-2 pb-2">
              {stream?.name}
            </h2>

            <p className="text-sm mt-1 leading-6 font-semibold" style={{ color: 'rgba(96, 96, 96, 1)' }}>
              {stream?.description || '-NA-'}
            </p>

            <div className="flex items-center gap-1 mt-3 text-sm">
              <img src="/icons/person.svg" alt="coin" className="w-4 h-4" />
              <span>{viewerCount ?? (stream?.viewerCount || 0)} watching</span>
            </div>
          </div>
        <div className={session == null ? "pointer-events-none blur-[1px] select-none" : ""}>
          <Chat
            isDisabled={isStreamEnded}
            sendMessageSocket={sendMessageSocket}
            newSocketMessage={messageList}
            session={session}
            streamId={streamId}
         />
        </div>
        </div>
      </div>
    </div>
  );
};
