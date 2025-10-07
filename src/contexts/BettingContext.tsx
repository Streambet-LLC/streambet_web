import { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';
import { BettingRoundStatus, CurrencyType } from '@/enums';
import { useBettingSocket } from '@/hooks/useBettingSocket';
import { useBettingStatusContext } from './BettingStatusContext';

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
  // Round State
  activeRound: ActiveRound;
  setActiveRound: React.Dispatch<React.SetStateAction<ActiveRound>>;
  
  // User's Current Bet
  userBet: UserBet;
  setUserBet: React.Dispatch<React.SetStateAction<UserBet>>;
  
  // UI State
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Available Balance (after real-time updates)
  updatedBalance: {
    goldCoins: number | undefined;
    sweepCoins: number | undefined;
  };
  setUpdatedBalance: React.Dispatch<React.SetStateAction<{
    goldCoins: number | undefined;
    sweepCoins: number | undefined;
  }>>;
  
  // Editing State
  isEditing: boolean;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Reset Key for UI updates
  resetKey: number;
  setResetKey: React.Dispatch<React.SetStateAction<number>>;
  
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
  streamId: string;
  session: any;
}

export const BettingProvider = ({ children, streamId, session }: BettingProviderProps) => {
  const { socketConnect } = useBettingStatusContext();
  
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
  
  // Updated Balance (from socket events)
  const [updatedBalance, setUpdatedBalance] = useState<{
    goldCoins: number | undefined;
    sweepCoins: number | undefined;
  }>({
    goldCoins: undefined,
    sweepCoins: undefined,
  });
  
  // Use socket hook to handle queries and socket events and pass setters to update state
  const { refetchBettingData, refetchRoundData } = useBettingSocket({
    streamId,
    session,
    socket: socketConnect,
    setActiveRound,
    setUserBet,
    setIsLoading,
    setIsEditing,
    setUpdatedBalance,
    setResetKey,
  });
  
  // Betting Actions
  const placeBet = useCallback((bettingVariableId: string, amount: number, currencyType: string) => {
    if (socketConnect && socketConnect.connected) {
      setIsLoading(true);
      socketConnect.emit('placeBet', {
        bettingVariableId,
        amount,
        currencyType,
      });
    }
  }, [socketConnect, setIsLoading]);
  
  const editBet = useCallback((betId: string, newBettingVariableId: string, newAmount: number, newCurrencyType: string) => {
    if (socketConnect && socketConnect.connected) {
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
  }, [socketConnect, setIsLoading]);
  
  const cancelBet = useCallback((betId: string, currencyType: string) => {
    if (socketConnect && socketConnect.connected) {
      socketConnect.emit('cancelBet', {
        betId,
        currencyType,
      });
      setIsEditing(false);
      refetchBettingData();
    }
  }, [socketConnect, refetchBettingData, setIsEditing]);
  
  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      activeRound,
      setActiveRound,
      userBet,
      setUserBet,
      isLoading,
      setIsLoading,
      updatedBalance,
      setUpdatedBalance,
      isEditing,
      setIsEditing,
      resetKey,
      setResetKey,
      refetchBettingData,
      refetchRoundData,
      placeBet,
      editBet,
      cancelBet,
    }),
    [
      activeRound,
      userBet,
      isLoading,
      updatedBalance,
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
