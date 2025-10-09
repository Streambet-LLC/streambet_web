import { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';
import { BettingRoundStatus, CurrencyType } from '@/enums';
import { useBettingSocket } from '@/hooks/useBettingSocket';
import { useBettingStatusContext } from './BettingStatusContext';
import { useAuthContext } from './AuthContext';

// Type definitions
export interface BettingVariable {
  id: string;
  name: string;
  optionName: string;
  [key: string]: any;
}

export interface ActiveRound {
  id: string | null;
  status: BettingRoundStatus;
  totalGoldCoins: number;
  totalSweepCoins: number;
  isLocked: boolean;
  bettingVariables?: BettingVariable[];
  walletGoldCoin?: number;
  walletSweepCoin?: number;
  userBetGoldCoins?: number;
  userBetSweepCoin?: number;
}

export interface UserBet {
  betId: string | null;
  amount: number;
  selectedOption: string;
  potentialWinnings: number;
  currencyType: CurrencyType | undefined;
  isLocked: boolean;
}

export interface BettingContextType {
  // Active Stream
  activeStreamId: string | null;
  setActiveStreamId: (streamId: string | null) => void;
  
  // Round State
  activeRound: ActiveRound;
  
  // User's Current Bet
  userBet: UserBet;
  
  // UI State
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  
  // Reset Key for UI updates
  resetKey: number;
  
  // Data Refresh Functions
  refetchBettingData: () => void;
  refetchRoundData: () => void;
  
  // Betting Actions
  placeBet: (bettingVariableId: string, amount: number, currencyType: string) => void;
  editBet: (betId: string, newBettingVariableId: string, newAmount: number, newCurrencyType: string) => void;
  cancelBet: (betId: string, currencyType: string) => void;
}

const BettingContext = createContext<BettingContextType | undefined>(undefined);

interface BettingProviderProps {
  children: ReactNode;
}

export const BettingProvider = ({ children }: BettingProviderProps) => {
  const { socketConnect } = useBettingStatusContext();
  const { session } = useAuthContext();
  
  // Active Stream ID
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);
  
  // Active Round State
  const [activeRound, setActiveRound] = useState<ActiveRound>({
    id: null,
    status: BettingRoundStatus.CLOSED,
    totalGoldCoins: 0,
    totalSweepCoins: 0,
    isLocked: false,
    bettingVariables: [],
    walletGoldCoin: undefined,
    walletSweepCoin: undefined,
    userBetGoldCoins: undefined,
    userBetSweepCoin: undefined,
  });
  
  // User Bet State
  const [userBet, setUserBet] = useState<UserBet>({
    betId: null,
    amount: 0,
    selectedOption: '',
    potentialWinnings: 0,
    currencyType: undefined,
    isLocked: false,
  });
  
  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  
  // Use socket hook to handle queries and socket events and pass setters to update state
  const { refetchBettingData, refetchRoundData } = useBettingSocket({
    streamId: activeStreamId,
    session,
    socket: socketConnect,
    setActiveRound,
    setUserBet,
    setIsLoading,
    setIsEditing,
    setResetKey,
  });
  
  // Betting Actions
  const placeBet = useCallback((bettingVariableId: string, amount: number, currencyType: string) => {
    if (socketConnect?.connected) {
      setIsLoading(true);
      socketConnect.emit('placeBet', {
        bettingVariableId,
        amount,
        currencyType,
      });
    }
  }, [socketConnect]);
  
  const editBet = useCallback((betId: string, newBettingVariableId: string, newAmount: number, newCurrencyType: string) => {
    if (socketConnect?.connected) {
      setIsLoading(true);
      socketConnect.emit('editBet', {
        betId,
        newBettingVariableId,
        newAmount,
        newCurrencyType,
      });
      // Don't set isEditing to false here - let the socket event handler do it after receiving the response
      // This ensures we have the updated potential winnings before switching back to LockTokens view
    }
  }, [socketConnect]);
  
  const cancelBet = useCallback((betId: string, currencyType: string) => {
    if (socketConnect?.connected) {
      socketConnect.emit('cancelBet', {
        betId,
        currencyType,
      });
      // Don't set isEditing to false here - let the socket event handler do it after receiving the response
      // This ensures consistent UI state management with editBet
      refetchBettingData();
    }
  }, [socketConnect, refetchBettingData]);
  
  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      activeStreamId,
      setActiveStreamId,
      activeRound,
      userBet,
      isLoading,
      setIsLoading,
      isEditing,
      setIsEditing,
      resetKey,
      refetchBettingData,
      refetchRoundData,
      placeBet,
      editBet,
      cancelBet,
    }),
    [
      activeStreamId,
      activeRound,
      userBet,
      isLoading,
      isEditing,
      resetKey,
      refetchBettingData,
      refetchRoundData,
      placeBet,
      editBet,
      cancelBet,
    ]
  );
  
  return (
    <BettingContext.Provider value={contextValue}>
      {children}
    </BettingContext.Provider>
  );
};

/**
 * Custom hook to access the BettingContext
 * Must be used within a BettingProvider
 */
export const useBettingContext = () => {
  const context = useContext(BettingContext);
  if (!context) {
    throw new Error('useBettingContext must be used within a BettingProvider');
  }
  return context;
};
