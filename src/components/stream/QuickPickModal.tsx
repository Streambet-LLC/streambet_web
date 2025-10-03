import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import api from '@/integrations/api/client';
import BetTokens from './BetTokens';
import LockTokens from './LockTokens';
import { BettingRoundStatus, CurrencyType } from '@/enums';
import { useCurrencyContext } from '@/contexts/CurrencyContext';
import { useBettingStatusContext } from '@/contexts/BettingStatusContext';
import { getConnectionErrorMessage } from '@/utils/helper';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useBettingSocket } from '@/hooks/useBettingSocket';

interface QuickPickModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  streamId: string;
  streamName?: string;
  session: any;
}

export const QuickPickModal = ({
  open,
  onOpenChange,
  streamId,
  streamName,
  session,
}: QuickPickModalProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currency } = useCurrencyContext();
  const { socketConnect } = useBettingStatusContext();
  const { isConnected: isNetworkConnected } = useNetworkStatus();
  const queryClient = useQueryClient();

  // States
  const [betId, setBetId] = useState<string | undefined>();
  const [placedBet, setPlaceBet] = useState<boolean>(true);
  const [resetKey, setResetKey] = useState(0);
  const [totalPot, setTotalPot] = useState<number>(0);
  const [totalPotGoldCoins, setTotalPotGoldCoins] = useState<number | undefined>(undefined);
  const [totalPotSweepCoins, setTotalPotSweepCoins] = useState<number | undefined>(undefined);
  const [potentialWinnings, setPotentialWinnings] = useState<number>(0);
  const [selectedAmount, setSelectedAmount] = useState<number>(0);
  const [selectedWinner, setSelectedWinner] = useState<string | undefined>('');
  const [updatedSliderMax, setUpdatedSliderMax] = useState<{
    goldCoins?: number;
    sweepCoins?: number;
  }>({ goldCoins: undefined, sweepCoins: undefined });
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [lockedOptions, setLockedOptions] = useState<boolean>(false);
  const [lockedBet, setLockedBet] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [updatedCurrency, setUpdatedCurrency] = useState<CurrencyType | undefined>();

  // Ref for isEdit
  const isEditRef = useRef(false);

  // Queries
  const {
    data: bettingData,
    refetch: refetchBettingData,
  } = useQuery({
    queryKey: ['bettingData', streamId, session?.id],
    queryFn: async () => {
      if (!session?.id) return null;
      const resp = await api.betting.getBettingData(streamId, session.id);
      return resp?.data ?? null;
    },
    enabled: !!session?.id && open,
  });

  const {
    data: getRoundData,
    refetch: refetchRoundData,
  } = useQuery({
    queryKey: ['selectedRoundData', bettingData?.bettingRounds?.[0]?.id],
    queryFn: async () => {
      const roundId = bettingData?.bettingRounds?.[0]?.id;
      if (!roundId) return null;
      const resp = await api.betting.getBettingRoundData(roundId);
      return resp?.data ?? null;
    },
    enabled: !!bettingData?.id && open,
  });

  // Derive lockedOptions & totalPot when bettingData or currency or totals change
  useEffect(() => {
    const isSweep = currency === CurrencyType.SWEEP_COINS;
    const fallbackPot =
      isSweep
        ? bettingData?.roundTotalBetsSweepCoinAmount ?? 0
        : bettingData?.roundTotalBetsGoldCoinAmount ?? 0;

    setTotalPot(isSweep ? (totalPotSweepCoins ?? fallbackPot) : (totalPotGoldCoins ?? fallbackPot));
    setLockedOptions(bettingData?.bettingRounds?.[0]?.status === BettingRoundStatus.LOCKED);
  }, [bettingData, currency, totalPotGoldCoins, totalPotSweepCoins]);

  // Sync round data initially (unless we’ve already had a socket update)
  useEffect(() => {
    if (!getRoundData) {
      setPlaceBet(true);
      return;
    }
    if (!isEditRef.current) {
      setPlaceBet(false);
    }
    const isSweep = getRoundData.currencyType === CurrencyType.SWEEP_COINS;
    setPotentialWinnings(
      isSweep ? getRoundData.potentialSweepCoinAmt : getRoundData.potentialGoldCoinAmt,
    );
    setSelectedAmount(getRoundData.betAmount);
    setSelectedWinner(getRoundData.optionName);
    setLockedBet(getRoundData.status === BettingRoundStatus.LOCKED);
    setUpdatedCurrency(getRoundData.currencyType);
  }, [getRoundData]);

  // Handler callbacks (memoized)
  const placedBetSocket = useCallback(
    (data: { bettingVariableId: string; amount: number; currencyType: string }) => {
      setLoading(true);
      if (socketConnect && socketConnect.connected) {
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
    },
    [socketConnect, toast, isNetworkConnected],
  );

  const editBetSocket = useCallback(
    (data: { newBettingVariableId: string; newAmount: number; newCurrencyType: string }) => {
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
        setLoading(false);
      }
    },
    [socketConnect, betId, getRoundData, toast, isNetworkConnected],
  );

  const cancelBetSocket = useCallback(
    (data: { betId: string; currencyType: string }) => {
      isEditRef.current = false;
      if (socketConnect && socketConnect.connected) {
        socketConnect.emit('cancelBet', {
          betId: data.betId,
          currencyType: data.currencyType,
        });
        setIsEditing(false);
        setPlaceBet(true);
        refetchBettingData();
        setResetKey((prev) => prev + 1);
      } else {
        toast({
          description: getConnectionErrorMessage({ isOnline: isNetworkConnected }),
          variant: 'destructive',
        });
      }
    },
    [socketConnect, refetchBettingData, toast, isNetworkConnected],
  );

  const handleBetEdit = useCallback(() => {
    isEditRef.current = true;
    setLoading(false);
    setIsEditing(true);
    setPlaceBet(true);
    refetchRoundData();
  }, [refetchRoundData]);

  const handleEditBack = useCallback(() => {
    setIsEditing(false);
    setPlaceBet(false);
  }, []);

  // Setup socket listeners & updates via custom hook
  useBettingSocket({
    socket: socketConnect,
    open,
    streamId,
    session,
    currency,
    updatedCurrency,
    setStateHandlers: {
      setTotalPotSweepCoins,
      setTotalPotGoldCoins,
      setSelectedAmount,
      setSelectedWinner,
      setPotentialWinnings,
      setLockedOptions,
      setLockedBet,
      setIsEditing,
      setResetKey,
      setUpdatedCurrency,
      setUpdatedSliderMax,
      setPlaceBet,
      setLoading,
      setBetId,
    },
    refetchBettingData,
    refetchRoundData,
  });

  // Reset function
  const resetBetData = useCallback(() => {
    setTotalPotGoldCoins(undefined);
    setTotalPotSweepCoins(undefined);
    setPlaceBet(true);
    setBetId(undefined);
    setUpdatedSliderMax({ goldCoins: undefined, sweepCoins: undefined });
    setLockedOptions(false);
    setLockedBet(false);
    setUpdatedCurrency(undefined);
    setIsEditing(false);
    setLoading(false);
    refetchBettingData();
    refetchRoundData();
  }, [refetchBettingData, refetchRoundData]);

  // Render UI
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-3xl max-h-[95vh] overflow-y-auto bg-[#0f0f0f] border-2 border-[#BDFF00] p-4 sm:p-6 gap-2">
        {streamName && (
          <div className="mb-2">
            <h2 className="text-white text-lg sm:text-xl font-semibold text-center">
              {streamName}
            </h2>
          </div>
        )}
        {!session ? (
          <div className="bg-[#181818] p-6 sm:p-8 rounded-[16px] flex flex-col items-center space-y-4 w-full mx-auto">
            <h2 className="text-white text-xl font-semibold">Sign in to play</h2>
            <button
              className="w-full bg-[#BDFF00] text-black font-medium py-3 rounded-full hover:bg-[#9AE600] transition"
              onClick={() => {
                onOpenChange(false);
                navigate(`/login?redirect=/`);
              }}
            >
              Sign in
            </button>
          </div>
        ) : bettingData?.bettingRounds && bettingData.bettingRounds.length ? (
          placedBet ? (
            <BetTokens
              session={session}
              bettingData={bettingData}
              updatedSliderMax={updatedSliderMax}
              placeBet={placedBetSocket}
              editBetMutation={editBetSocket}
              getRoundData={getRoundData}
              resetKey={resetKey}
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
              isStreamScheduled={false}
              updatedBetId={betId}
              bettingData={bettingData}
              cancelBet={cancelBetSocket}
              getRoundData={getRoundData}
              handleBetEdit={handleBetEdit}
              resetKey={resetKey}
              potentialWinnings={potentialWinnings}
              selectedAmount={selectedAmount}
              selectedWinner={selectedWinner}
              socket={socketConnect}
              lockedBet={lockedBet}
            />
          )
        ) : (
          <div
            className="relative mx-auto rounded-[16px] shadow-lg p-5 h-[240px]"
            style={{ backgroundColor: 'rgba(24, 24, 24, 1)' }}
          >
            <div className="all-center flex justify-center items-center h-[100px] mt-8">
              <img
                src="/icons/nobettingData.svg"
                alt="no betting data"
                className="w-[100%] h-[100%] object-contain"
              />
            </div>
            <p className="text-2xl text-[rgba(255, 255, 255, 1)] text-center pt-4 pb-4 font-bold">
              No picking options available
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
