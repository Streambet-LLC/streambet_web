import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CurrencyType } from '@/enums';
import { getConnectionErrorMessage } from '@/utils/helper';
import { useToast } from '@/hooks/use-toast';

export function useBettingSocket({
  socket,
  open,
  streamId,
  session,
  currency,
  updatedCurrency,
  setStateHandlers,
  refetchBettingData,
  refetchRoundData,
}: {
  socket: any;
  open: boolean;
  streamId: string;
  session: any;
  currency: CurrencyType;
  updatedCurrency?: CurrencyType;
  setStateHandlers: {
    setTotalPotSweepCoins: (n: number) => void;
    setTotalPotGoldCoins: (n: number) => void;
    setSelectedAmount: (n: number) => void;
    setSelectedWinner: (s: string) => void;
    setPotentialWinnings: (n: number) => void;
    setLockedOptions: (b: boolean) => void;
    setLockedBet: (b: boolean) => void;
    setIsEditing: (b: boolean) => void;
    setResetKey: React.Dispatch<React.SetStateAction<number>>;
    setUpdatedCurrency: (c: CurrencyType) => void;
    setUpdatedSliderMax: (v: { goldCoins?: number; sweepCoins?: number }) => void;
    setPlaceBet: (b: boolean) => void;
    setLoading: (b: boolean) => void;
    setBetId: (s: string) => void;
  };
  refetchBettingData: () => void;
  refetchRoundData: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const currencyRef = useRef({ currency, updatedCurrency });
  const isEditRef = useRef(false);

  useEffect(() => {
    currencyRef.current = { currency, updatedCurrency };
  }, [currency, updatedCurrency]);

  useEffect(() => {
    if (!socket || !open) return;

    socket.emit('joinStream', streamId);

    const {
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
    } = setStateHandlers;

    const updatePot = (update: any) => {
      setTotalPotSweepCoins(update?.totalBetsSweepCoinAmount || 0);
      setTotalPotGoldCoins(update?.totalBetsGoldCoinAmount || 0);
      setLoading(false);
    };

    const updateWinnings = (data: any) => {
      const { updatedCurrency, currency } = currencyRef.current;
      const isSweep = (updatedCurrency || currency) === CurrencyType.SWEEP_COINS;
      setPotentialWinnings(
        isSweep ? data?.potentialSweepCoinWinningAmount : data?.potentialGoldCoinWinningAmount
      );
    };

    const processPlacedBet = (update: any) => {
      queryClient.invalidateQueries({ queryKey: ['session'] });

      const { updatedCurrency, currency } = currencyRef.current;
      const isSweep = (updatedCurrency || currency) === CurrencyType.SWEEP_COINS;

      setPotentialWinnings(
        isSweep ? update?.potentialSweepCoinWinningAmount : update?.potentialGoldCoinWinningAmount
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
        toast({ description: update.message });
      }
    };

    socket.on('bettingUpdate', updatePot);
    socket.on('potentialAmountUpdate', updateWinnings);

    socket.on('bettingLocked', (data) => {
      setLockedOptions(data?.lockedStatus);
      setLockedBet(data?.lockedStatus);
    });

    socket.on('winnerDeclared', (data) => {
      toast({
        title: 'Round Closed',
        description: `${data?.winnerName} has been selected as winning pick option!`,
        duration: 7000,
      });
      refetchBettingData();
      refetchRoundData();
      setResetKey((prev) => prev + 1);
      queryClient.invalidateQueries({ queryKey: ['session'] });
    });

    socket.on('betPlaced', (update) => {
      if (update?.bet?.userId === session?.id) processPlacedBet(update);
    });

    socket.on('betOpened', () => {
      toast({ description: 'New picking options available!' });
      refetchBettingData();
      refetchRoundData();
    });

    socket.on('betCancelledByAdmin', () => {
      toast({ description: 'Current picking round cancelled by admin.', variant: 'destructive' });
      queryClient.invalidateQueries({ queryKey: ['session'] });
      refetchBettingData();
    });

    socket.on('betCancelled', (update) => {
      if (update?.bet?.userId === session?.id) {
        queryClient.invalidateQueries({ queryKey: ['session'] });
        setUpdatedSliderMax({
          goldCoins: update?.updatedWalletBalance?.goldCoins || 0,
          sweepCoins: update?.updatedWalletBalance?.sweepCoins || 0,
        });
        if (update?.message) {
          toast({ description: update?.message });
        }
        refetchBettingData();
      }
    });

    socket.on('betEdited', (update) => {
      if (update?.bet?.userId === session?.id) processPlacedBet(update);
    });

    socket.on('error', (error) => {
      toast({
        description: error?.message || 'An error occurred. Please refresh and try again.',
        variant: 'destructive',
      });
      setLoading(false);
      if (error?.isForcedLogout) {
        window.dispatchEvent(new CustomEvent('vpnProxyDetected'));
      }
    });

    return () => {
      socket.emit('leaveStream', streamId);
      socket.off('bettingUpdate', updatePot);
      socket.off('potentialAmountUpdate', updateWinnings);
      socket.off('bettingLocked');
      socket.off('winnerDeclared');
      socket.off('betPlaced');
      socket.off('betOpened');
      socket.off('betCancelledByAdmin');
      socket.off('betCancelled');
      socket.off('betEdited');
      socket.off('error');
    };
  }, [socket, open, streamId, session?.id, updatedCurrency]);
}
