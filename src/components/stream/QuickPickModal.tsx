import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import BetTokens from './BetTokens';
import LockTokens from './LockTokens';
import { CurrencyType } from '@/enums';
import { useAuthContext } from '@/contexts/AuthContext';
import { useBettingStatusContext } from '@/contexts/BettingStatusContext';
import { useBettingContext } from '@/contexts/BettingContext';
import { useQuickPickModal } from '@/hooks/useQuickPickModal';
import { transformForBetTokens, transformForLockTokens } from '@/utils/bettingTransformers';
import { SignInPrompt, NoBettingData } from './QuickPickModalComponents';
import { useToast } from '@/hooks/use-toast';

interface QuickPickModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  streamId: string;
  roundId: string;
  streamName?: string;
}

export const QuickPickModal = ({
  open,
  onOpenChange,
  streamId,
  roundId,
  streamName,
}: QuickPickModalProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session } = useAuthContext();
  const { socketConnect } = useBettingStatusContext();
  const { setActiveStreamId, setRoundId } = useBettingContext();

  // Set active stream when modal opens, clear when it closes
  useEffect(() => {
    if (open && streamId) {
      setRoundId(roundId);
      setActiveStreamId(streamId);

      // Cleanup: clear active stream when modal closes
      return () => {
        setActiveStreamId(null);
      };
    }
  }, [open, streamId, roundId, setActiveStreamId]);

  // Custom hook handles all betting logic and computed values
  const {
    activeRound,
    userBet,
    isLoading,
    isEditing,
    resetKey,
    showBetTokens,
    totalPot,
    updatedSliderMax,
    hasActiveBetting,
    handlePlaceBet,
    handleEditBet,
    handleCancelBet,
    handleStartEdit,
    handleCancelEdit,
  } = useQuickPickModal();

  // Wrapper functions to match BetTokens/LockTokens expected interface
  const placedBetSocket = (data: {
    bettingVariableId: string;
    amount: number;
    currencyType: string;
  }) => {
    handlePlaceBet(data.bettingVariableId, data.amount, data.currencyType);
  };

  const editBetSocket = (data: {
    newBettingVariableId: string;
    newAmount: number;
    newCurrencyType: string;
  }) => {
    // Check that betId exists before attempting to edit
    if (!userBet.betId) {
      console.error('Cannot edit pick: betId is missing');
      toast({
        description: 'Unable to edit pick. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    handleEditBet(userBet.betId, data.newBettingVariableId, data.newAmount, data.newCurrencyType);
  };

  const cancelBetSocket = (data: { betId: string; currencyType: string }) => {
    handleCancelBet(data.betId, data.currencyType);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-3xl max-h-[95vh] overflow-y-auto bg-[#0f0f0f] border-2 border-[#BDFF00] p-4 sm:p-6 gap-2">
        <DialogTitle className="sr-only">
          {streamName ? `${streamName} - Quick Pick` : 'Quick Pick'}
        </DialogTitle>
        <DialogDescription className="sr-only">Place your pick on this stream</DialogDescription>

        {activeRound && (
          <div className="mb-2">
            <h2 className="text-white text-lg sm:text-xl font-semibold text-center">
              {activeRound.name}
            </h2>
          </div>
        )}

        {!session ? (
          <SignInPrompt
            onClose={() => onOpenChange(false)}
            onSignIn={() => {
              onOpenChange(false);
              navigate(`/login?redirect=/`);
            }}
          />
        ) : !hasActiveBetting ? (
          <NoBettingData />
        ) : showBetTokens ? (
          <BetTokens
            session={session}
            bettingData={transformForBetTokens(activeRound)}
            updatedSliderMax={updatedSliderMax}
            placeBet={placedBetSocket}
            editBetMutation={editBetSocket}
            getRoundData={transformForLockTokens(userBet)}
            resetKey={resetKey}
            totalPot={totalPot}
            lockedOptions={activeRound.isLocked}
            loading={isLoading}
            selectedAmount={userBet.amount}
            selectedWinner={userBet.selectedOption}
            isEditing={isEditing}
            updatedCurrency={userBet.currencyType}
            lockedBet={userBet.isLocked}
            handleEditBack={handleCancelEdit}
          />
        ) : (
          <LockTokens
            updatedCurrency={userBet.currencyType || CurrencyType.GOLD_COINS}
            isStreamScheduled={false}
            updatedBetId={userBet.betId || undefined}
            bettingData={transformForBetTokens(activeRound)}
            cancelBet={cancelBetSocket}
            getRoundData={transformForLockTokens(userBet)}
            handleBetEdit={handleStartEdit}
            resetKey={resetKey}
            potentialWinnings={userBet.potentialWinnings}
            selectedAmount={userBet.amount}
            selectedWinner={userBet.selectedOption}
            socket={socketConnect}
            lockedBet={userBet.isLocked}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
