import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import BetTokens from './BetTokens';
import LockTokens from './LockTokens';
import { CurrencyType } from '@/enums';
import { useCurrencyContext } from '@/contexts/CurrencyContext';
import { useBettingStatusContext } from '@/contexts/BettingStatusContext';
import { useQuickPickModal } from '@/hooks/useQuickPickModal';
import { transformForBetTokens, transformForLockTokens } from '@/utils/bettingTransformers';
import { SignInPrompt, NoBettingData } from './QuickPickModalComponents';

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
  streamName,
  session,
}: QuickPickModalProps) => {
  const navigate = useNavigate();
  const { currency } = useCurrencyContext();
  const { socketConnect } = useBettingStatusContext();
  
  // Custom hook handles all betting logic
  const {
    activeRound,
    userBet,
    isLoading,
    updatedBalance,
    isEditing,
    resetKey,
    showBetTokens,
    handlePlaceBet,
    handleEditBet,
    handleCancelBet,
    handleStartEdit,
    handleCancelEdit,
  } = useQuickPickModal();

  // Calculate total pot based on currency
  const isSweep = currency === CurrencyType.SWEEP_COINS;
  const totalPot = isSweep ? activeRound.totalSweepCoins : activeRound.totalGoldCoins;

  // Wrapper functions to match BetTokens/LockTokens expected interface
  const placedBetSocket = (data: { bettingVariableId: string; amount: number; currencyType: string }) => {
    handlePlaceBet(data.bettingVariableId, data.amount, data.currencyType);
  };

  const editBetSocket = (data: { newBettingVariableId: string; newAmount: number; newCurrencyType: string }) => {
    handleEditBet(userBet.betId!, data.newBettingVariableId, data.newAmount, data.newCurrencyType);
  };

  const cancelBetSocket = (data: { betId: string; currencyType: string }) => {
    handleCancelBet(data.betId, data.currencyType);
  };

  const hasActiveBetting = activeRound.bettingVariables && activeRound.bettingVariables.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-3xl max-h-[95vh] overflow-y-auto bg-[#0f0f0f] border-2 border-[#BDFF00] p-4 sm:p-6 gap-2">
        <DialogTitle className="sr-only">
          {streamName ? `${streamName} - Quick Pick` : 'Quick Pick Betting'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Place your bet on this stream
        </DialogDescription>
        
        {streamName && (
          <div className="mb-2">
            <h2 className="text-white text-lg sm:text-xl font-semibold text-center">
              {streamName}
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
            updatedSliderMax={updatedBalance}
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
            updatedCurrency={userBet.currencyType as any}
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
