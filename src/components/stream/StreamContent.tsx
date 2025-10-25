import { StreamPlayer } from '@/components/StreamPlayer';
import BetTokens from './BetTokens';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/integrations/api/client';
import LockTokens from '@/components/stream/LockTokens';
import { useEffect, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { BettingRoundStatus, CurrencyType, StreamStatus } from '@/enums';
import { useCurrencyContext } from '@/contexts/CurrencyContext';
import Chat from '@/components/stream/Chat';
import { FabioBoldStyle } from '@/utils/font';
import { useBettingStatusContext } from '@/contexts/BettingStatusContext';
import { formatDateTime, getConnectionErrorMessage, getImageLink } from '@/utils/helper';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAuthContext } from '@/contexts/AuthContext';
import { StreamHeader } from '@/components/stream/StreamHeader';
import { WinnerAnimation } from '@/components/stream/WinnerAnimation';

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
  refetchStream,
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
  const [selectedWinner, setSelectedWinner] = useState<string | undefined>('');
  const [updatedSliderMax, setUpdatedSliderMax] = useState({
    goldCoins: undefined,
    sweepCoins: undefined,
  });
  const [isEditing, setIsEditing] = useState(false); //indicate if it's an editing state
  const [lockedOptions, setLockedOptions] = useState<boolean>(false); // Track if bet is locked in BetTokens,tsx
  const [lockedBet, setLockedBet] = useState<boolean>(false); // Track if bet is locked in LockTokens.tsx
  const [loading, setLoading] = useState<boolean>(false); // Loader state when data is being fetched from socket
  const [winnerOption, setWinnerOption] = useState<boolean>();
  // Socket reference
  const [showWinnerAnimation, setShowWinnerAnimation] = useState(false);
  // Track if last update came from socket then no need to execute getRoundData useEffect
  const [hasSocketUpdate, setHasSocketUpdate] = useState(false);
  const [isUserWinner, setIsUserWinner] = useState(false);
  const [isUserLoser, setIsUserLoser] = useState(false);
  const [viewerCount, setViewerCount] = useState(null);
  const [updatedCurrency, setUpdatedCurrency] = useState<CurrencyType | undefined>(); //currency type from socket update
  const [messageList, setMessageList] = useState<any>();
  const [roundDetails, setRoundDetails] = useState<any>();
  const queryClient = useQueryClient();
  const { isFetching: isFetchingProfile } = useAuthContext();

  const [currentBettingRound, setCurrentBettingRound] = useState<{
    name: string;
    totalBets: number;
    totalBettor: number;
    options: {
      name: string;
      totalBets: number;
      totalBettor: number;
    }[];
  } | null>(null);

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currencyRef = useRef({ updatedCurrency, currency });
  const isEditRef = useRef(false);
  const horizontalScrollRef = useRef<HTMLDivElement>(null);
  const isStreamLive = stream?.status === StreamStatus.LIVE;
  const isStreamScheduled = stream?.status === StreamStatus.SCHEDULED;
  const isStreamEnded = stream?.status === StreamStatus.ENDED;

  // Function to scroll to the last card with smooth animation
  const scrollToLastCard = () => {
    if (horizontalScrollRef.current && roundDetails && roundDetails.length > 0) {
      setTimeout(() => {
        if (horizontalScrollRef.current) {
          horizontalScrollRef.current.scrollTo({
            left: horizontalScrollRef.current.scrollWidth,
            behavior: 'smooth',
          });
        }
      }, 100); // 100ms delay to ensure the last card is rendered
    }
  };

  const getRoundsData = (roundsData?: any) => {
    const roundDetailsData =
      roundsData && roundsData?.length ? roundsData : stream?.roundDetails || [];
    const createdIndex = roundDetailsData?.findIndex(
      round => round?.roundStatus === BettingRoundStatus.CREATED
    );
    const updatedRounds = roundDetailsData?.filter(
      (round, index) =>
        round?.roundStatus !== BettingRoundStatus.OPEN &&
        (createdIndex !== -1 ? index <= createdIndex : true)
    );
    return updatedRounds;
  };

  useEffect(() => {
    setRoundDetails(getRoundsData());
  }, [stream]);

  useEffect(() => {
    if (!isFetchingProfile) {
      refetchBettingData();
    }
  }, [isFetchingProfile]);

  // Scroll to top on mount to ensure StreamHeader is visible
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Effect to scroll to last card when roundDetails changes
  useEffect(() => {
    scrollToLastCard();
  }, [roundDetails]);

  useEffect(() => {
    // Keep ref updated with current values
    currencyRef.current = { updatedCurrency, currency };
  }, [updatedCurrency, currency]);

  // Function to setup socket event listeners
  const setupSocketEventListeners = (socketInstance: any) => {
    if (!socketInstance) return;

    const resetBetData = () => {
      // Clear all local betting state
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
      setIsEditing(false);
      setLoading(false);

      // Invalidate cached queries to fetch fresh data from server
      queryClient.invalidateQueries({ queryKey: ['bettingData', streamId, session?.id] });
      queryClient.invalidateQueries({ queryKey: ['selectedRoundData'] });
    };

    socketInstance.on('scheduledStreamUpdatedToLive', () => {
      console.log('scheduledStreamUpdatedToLive');
      refetchStream();
    });

    const processPlacedBet = update => {
      console.log('update process bet placed', update);
      queryClient.prefetchQuery({ queryKey: ['session'] }); // To recall me api that will update currency amount near to toggle
      // Use ref to get current values
      const { updatedCurrency: currentUpdatedCurrency, currency: currentCurrency } =
        currencyRef.current;
      const isSweepCoins = (currentUpdatedCurrency || currentCurrency) === CurrencyType.SWEEP_COINS;
      setPotentialWinnings(
        isSweepCoins
          ? update?.potentialSweepCoinWinningAmount
          : update?.potentialGoldCoinWinningAmount
      );
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

    socketInstance.on('viewerCountUpdated', count => {
      console.log('viewerCountUpdated', count);
      setViewerCount(count);
    });

    socketInstance.on('potentialAmountUpdate', data => {
      console.log('potentialAmountUpdate', data);
      // Use ref to get current values
      const { updatedCurrency: currentUpdatedCurrency, currency: currentCurrency } =
        currencyRef.current;
      const isSweepCoins = (currentUpdatedCurrency || currentCurrency) === CurrencyType.SWEEP_COINS;
      setPotentialWinnings(
        isSweepCoins ? data?.potentialSweepCoinWinningAmount : data?.potentialGoldCoinWinningAmount
      );
    });

    socketInstance.on('bettingLocked', data => {
      console.log('bettingLocked', data);
      setLockedOptions(data?.lockedStatus);
      setLockedBet(data?.lockedStatus);
    });

    socketInstance.on('winnerDeclared', data => {
      console.log('winner declared', data);
      toast({
        title: 'Round Closed',
        description: `${data?.winnerName} was selected as the winning Pick option!`,
        duration: 7000,
      });
      setWinnerOption(data?.winnerName);
      const { updatedCurrency: currentUpdatedCurrency, currency: currentCurrency } =
        currencyRef.current;
      const isSweepCoins = (currentUpdatedCurrency || currentCurrency) === CurrencyType.SWEEP_COINS;
      const isVoided = isSweepCoins ? data?.voided?.sweepCoin : data?.voided?.goldCoin;
      if (!isVoided) {
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
      }
      resetBetData();
      setResetKey(prev => prev + 1);
      queryClient.prefetchQuery({ queryKey: ['session'] });
      refetchStream();
    });

    socketInstance.on('betPlaced', update => {
      console.log('betPlaced', update);
      if (update?.bet?.userId === session?.id) {
        processPlacedBet(update);
      }
    });

    socketInstance.on('betOpened', update => {
      console.log('betOpened', update);
      toast({
        description: 'New Pick options available!',
        variant: 'default',
      });
      resetBetData();
    });

    socketInstance.on('betCancelledByAdmin', update => {
      queryClient.prefetchQuery({ queryKey: ['session'] });
      toast({
        description: 'Current round cancelled by admin.',
        variant: 'destructive',
        duration: 4000,
      });
      resetBetData();
      refetchStream();
    });

    socketInstance.on('betCancelled', update => {
      console.log(update, 'betCancelled');
      if (update?.bet?.userId === session?.id) {
        queryClient.prefetchQuery({ queryKey: ['session'] });
        setUpdatedSliderMax({
          goldCoins: update?.updatedWalletBalance?.goldCoins || 0,
          sweepCoins: update?.updatedWalletBalance?.sweepCoins || 0,
        });
        if (update?.message) {
          toast({
            description: update?.message,
            variant: 'default',
          });
        }
        resetBetData();
      }
    });

    socketInstance.on('betEdited', update => {
      console.log('betEdited', update);
      if (update?.bet?.userId === session?.id) {
        processPlacedBet(update);
      }
    });

    socketInstance.on('newMessage', update => {
      console.log('newMessage', update);
      setMessageList(update);
    });

    socketInstance.on('roundUpdated', roundsData => {
      console.log('roundUpdated', roundsData?.roundDetails);
      setRoundDetails(getRoundsData(roundsData?.roundDetails));
      // Scroll to last card after updating round details
      setTimeout(() => scrollToLastCard(), 100);
    });

    socketInstance.on('streamEnded', update => {
      toast({
        description: 'Stream has ended.',
        variant: 'destructive',
        duration: 10000,
      });
      navigate('/');
    });

    socketInstance.on('error', error => {
      toast({
        description: error?.message || 'An error occured. Refresh page and try again.',
        variant: 'destructive',
        duration: 7000,
      });
      setLoading(false);
-      if (error?.isForcedLogout) {
-        // Dispatch custom event for logout handling
-        window.dispatchEvent(new CustomEvent('vpnProxyDetected'));
-      }
+      if (false && error?.isForcedLogout) {
+        // Dispatch custom event for logout handling (disabled)
+        window.dispatchEvent(new CustomEvent('vpnProxyDetected'));
+      }
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
    if (socketConnect) {
      api.socket.joinStream(streamId, socketConnect);

      // Setup event listeners
      setupSocketEventListeners(socketConnect);
    }

    // Return cleanup function to remove event listeners and leave stream
    return () => {
      // Cleanup reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // Leave the stream
      api.socket.leaveStream(streamId, socketConnect);

      // Remove all event listeners
      if (socketConnect) {
        socketConnect.off('scheduledStreamUpdatedToLive');
        socketConnect.off('bettingUpdate');
        socketConnect.off('viewerCountUpdated');
        socketConnect.off('potentialAmountUpdate');
        socketConnect.off('bettingLocked');
        socketConnect.off('winnerDeclared');
        socketConnect.off('betPlaced');
        socketConnect.off('betOpened');
        socketConnect.off('betCancelledByAdmin');
        socketConnect.off('betCancelled');
        socketConnect.off('betEdited');
        socketConnect.off('newMessage');
        socketConnect.off('roundUpdated');
        socketConnect.off('streamEnded');
        socketConnect.off('disconnect');
        socketConnect.off('connect_error');
        socketConnect.off('error');
      }
    };
  }, [streamId, socketConnect]);

  // Query to get the betting data for the stream
  const {
    data: bettingData,
    refetch: refetchBettingData,
    isFetching: fetchingBettingData,
  } = useQuery({
    queryKey: ['bettingData', streamId, session?.id],
    queryFn: async () => {
      if (!session?.id) return null;
      const data = await api.betting.getBettingData(streamId, session.id);
      return data?.data;
    },
    enabled: !!session?.id,
  });

  useEffect(() => {
    setTotalPot(
      currency === CurrencyType.SWEEP_COINS
        ? (totalPotSweepCoins ?? (bettingData?.roundTotalBetsSweepCoinAmount || 0))
        : (totalPotGoldCoins ?? (bettingData?.roundTotalBetsGoldCoinAmount || 0))
    );
    setLockedOptions(bettingData?.bettingRounds?.[0]?.status === BettingRoundStatus.LOCKED);

    if (
      bettingData &&
      bettingData.bettingRounds.length > 0 &&
      bettingData.bettingRounds.at(0).status === 'open'
    ) {
      const betRound = bettingData.bettingRounds.at(0);

      setCurrentBettingRound({
        name: betRound.roundName,
        totalBets: betRound.bettingVariables.reduce(
          (sum, item) => sum + Number(item.totalBetsGoldCoinAmount),
          0
        ),
        totalBettor: betRound.bettingVariables.reduce(
          (sum, item) => sum + Number(item.betCountGoldCoin),
          0
        ),
        options: betRound.bettingVariables.map(item => {
          return {
            name: item.name,
            totalBets: item.totalBetsGoldCoinAmount,
            totalBettor: item.betCountGoldCoin,
          };
        }),
      });
    }
  }, [bettingData, currency, totalPotSweepCoins, totalPotGoldCoins]);

  // Query to get selected betting round data
  const { data: getRoundData, refetch: refetchRoundData } = useQuery({
    queryKey: ['selectedRoundData', bettingData?.bettingRounds?.[0]?.id],
    queryFn: async () => {
      const data = bettingData?.bettingRounds?.[0]?.id
        ? await api.betting.getBettingRoundData(bettingData?.bettingRounds?.[0]?.id)
        : null;
      return data?.data;
    },
    enabled: !!bettingData?.id,
  });

  useEffect(() => {
    if (hasSocketUpdate) return;
    if (getRoundData) {
      if (!isEditRef.current) {
        setPlaceBet(false);
      }
      setPotentialWinnings(
        getRoundData?.currencyType === CurrencyType.GOLD_COINS
          ? getRoundData?.potentialGoldCoinAmt
          : getRoundData?.potentialSweepCoinAmt
      );
      setSelectedAmount(getRoundData?.betAmount);
      setSelectedWinner(getRoundData?.optionName);
      setLockedBet(getRoundData?.status === BettingRoundStatus.LOCKED);
      setUpdatedCurrency(getRoundData?.currencyType);
    } else {
      setPlaceBet(true);
    }
  }, [getRoundData, hasSocketUpdate]);

  // Mutation to place a bet
  const placedBetSocket = (data: {
    bettingVariableId: string;
    amount: number;
    currencyType: string;
  }) => {
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
  };

  // Mutation to edit a bet
  const editBetSocket = (data: {
    newBettingVariableId: string;
    newAmount: number;
    newCurrencyType: string;
  }) => {
    setLoading(true);
    isEditRef.current = false;
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
  };

  // Function to handle bet edit
  const handleBetEdit = () => {
    isEditRef.current = true;
    setLoading(false);
    setIsEditing(true);
    setPlaceBet(true); // Show BetTokens (edit mode)
    refetchRoundData(); // when canceling and placing bet,then editing we need to refetch round data
  };

  // Function to undo bet edit
  const handleEditBack = () => {
    setIsEditing(false);
    setPlaceBet(false);
  };

  // Cancel bet mutation
  const cancelBetSocket = (data: { betId: string; currencyType: string }) => {
    isEditRef.current = false;
    if (socketConnect && socketConnect.connected) {
      socketConnect.emit('cancelBet', {
        betId: data?.betId,
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
  };

  // Mutation to send a message
  const sendMessageSocket = (data: { message: string; imageURL: string }) => {
    if (socketConnect && socketConnect.connected) {
      socketConnect.emit('sendChatMessage', {
        streamId: streamId,
        message: data?.message,
        imageURL: data?.imageURL,
        timestamp: new Date(),
      });
    } else {
      toast({
        description: getConnectionErrorMessage({ isOnline: isNetworkConnected }),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Stream Name and Description - Full Width Above Grid */}
      <StreamHeader 
        stream={stream}
        viewerCount={viewerCount}
      />

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-screen">
        <div className="lg:col-span-2 space-y-6 max-h-screen">
          <div className="relative">
            {isStreamScheduled ? (
              <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                {stream?.thumbnailUrl && (
                  <img
                    src={getImageLink(stream.thumbnailUrl)}
                    alt={stream?.name}
                    className="object-cover w-full h-full"
                  />
                )}
              </div>
            ) : isStreamEnded ? (
              <div className="aspect-video rounded-lg overflow-hidden bg-black border border-primary flex items-center justify-center px-2">
                <p className="text-white text-2xl font-bold">Stream has ended.</p>
              </div>
            ) : (
              <StreamPlayer showInfo streamId={streamId} />
            )}
          </div>

        {session == null && (
          <div className="bg-[#181818] p-4 rounded-[16px] flex flex-col items-center space-y-3 w-full mx-auto">
            <h2 className="text-white text-lg font-semibold">Sign in to play</h2>
            <button
              className="w-full bg-lime-400 text-black font-medium py-2 rounded-full hover:bg-lime-300 transition"
              onClick={() => navigate(`/login?redirect=/stream/${streamId}`)}
            >
              Sign in
            </button>
          </div>
        )}

        <WinnerAnimation 
          show={showWinnerAnimation}
          isWinner={isUserWinner}
          isLoser={isUserLoser}
          onClose={() => setShowWinnerAnimation(false)}
        />

        {/* Only show BetTokens/LockTokens if bettingRounds is not null/empty */}
        {!isStreamEnded && bettingData?.bettingRounds && bettingData.bettingRounds.length ? (
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
              handleEditBack={handleEditBack}
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
          session != null && (
            <>
              {roundDetails?.length === 0 ? (
                <div
                  className="relative mx-auto rounded-[16px] shadow-lg p-5 h-[240px]"
                  style={{ backgroundColor: 'rgba(24, 24, 24, 1)' }}
                >
                  <div className="all-center flex justify-center items-center h-[100px] mt-8">
                    <img
                      src="/icons/nobettingData.svg"
                      alt="lock left"
                      className="w-[100%] h-[100%] object-contain"
                    />
                  </div>
                  <p
                    className="text-2xl text-[rgba(255, 255, 255, 1)] text-center pt-4 pb-4"
                    style={FabioBoldStyle}
                  >
                    No Pick options available
                  </p>
                </div>
              ) : (
                <div
                  className="flex gap-4 p-6 rounded-[16px] shadow-lg overflow-x-auto overflow-y-hidden flex-nowrap"
                  style={{ backgroundColor: 'rgba(24, 24, 24, 1)' }}
                  ref={horizontalScrollRef}
                >
                  {roundDetails?.map(round => {
                    const isRoundClosed = round?.roundStatus === BettingRoundStatus.CLOSED;
                    const isRoundCreated = round?.roundStatus === BettingRoundStatus.CREATED;
                    const isRoundCancelled = round?.roundStatus === BettingRoundStatus.CANCELLED;
                    const isRoundLocked = round?.roundStatus === BettingRoundStatus.LOCKED;

                    if (isRoundClosed) {
                      return (
                        <div
                          key={round?.id}
                          className="flex flex-col justify-center items-center bg-black rounded-2xl w-80 h-48 shrink-0 px-2"
                        >
                          <p className="text-white font-semibold text-lg line-clamp-3">
                            {round?.roundName}
                          </p>
                          <div className="flex flex-col items-center gap-2 mt-2">
                            <p className="text-white font-bold">
                              {round?.winningOption?.[0]?.variableName} as winner
                            </p>
                            <span className="text-white text-sm font-medium">
                              won {round?.winningOption?.[0]?.totalGoldCoinAmt} gold coins
                            </span>
                            <span className="text-white text-sm font-medium">
                              and {round?.winningOption?.[0]?.totalSweepCoinAmt} Stream Coins
                            </span>
                          </div>
                        </div>
                      );
                    } else if (isRoundCancelled) {
                      return (
                        <div
                          key={round?.id}
                          className="flex flex-col justify-center items-center bg-black rounded-2xl w-80 h-48 shrink-0 px-2"
                        >
                          <p className="text-white font-semibold text-lg line-clamp-3">
                            {round?.roundName} cancelled
                          </p>
                        </div>
                      );
                    } else if (isRoundLocked) {
                      return (
                        <div
                          key={round?.id}
                          className="flex justify-center items-center bg-black rounded-2xl w-80 h-48 shadow-[0_0_20px_#a3e635] shrink-0 px-2"
                        >
                          <p className="text-white font-medium line-clamp-3">
                            {round?.roundName} is locked
                          </p>
                        </div>
                      );
                    } else if (isRoundCreated) {
                      return (
                        <div
                          key={round?.id}
                          className="flex justify-center items-center bg-black rounded-2xl w-80 h-48 border border-[#BDFF00] shadow-[0_0_20px_#a3e635] shrink-0 px-2"
                        >
                          <p className="text-white font-medium line-clamp-3">
                            {round?.roundName} is coming up!
                          </p>
                        </div>
                      );
                    }
                  })}
                </div>
              )}
            </>
          )
        )}
      </div>

      <div className="lg:col-span-1 flex flex-col h-full">
        <div className="flex-1 h-full space-y-6">
          <div className={session == null ? 'pointer-events-none blur-[1px] select-none' : ''}>
            <Chat
              isDisabled={isStreamEnded}
              sendMessageSocket={sendMessageSocket}
              newSocketMessage={messageList}
              session={session}
              streamId={streamId}
            />
          </div>
          {currentBettingRound && (
            <div className="border p-4 border-zinc-700 rounded-[16px]">
              <h2 className="text-lg font-semibold leading-tight pt-2 pb-2">
                Round: {currentBettingRound.name}
              </h2>
              <p
                className="text-sm font-semibold leading-tight pt-2 pb-2"
                style={{ color: '#BDFF00' }}
              >
                Total Pot: {currentBettingRound.totalBets} GOLD Coins (
                {currentBettingRound.totalBettor} Picks)
              </p>
              <ul className="mt-2 ml-5">
                {currentBettingRound.options.map((option, i) => (
                  <li key={i} className="text-sm" style={{ color: 'rgba(96, 96, 96, 1)' }}>
                    {option.name}: {option.totalBets} Gold ({option.totalBettor} Picks)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};
