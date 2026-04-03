import { createContext, useContext, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/integrations/api/client';

interface Session {
  id: string;
  walletBalanceCoin?: number;
  walletBalanceToken?: number;
  maxSweepCoinsBet?: number;
  maxGoldCoinsBet?: number;
  maxCadeCoinsBet?: number;
  isSeller?: boolean;
  isProSubscriber?: boolean;
  user?: {
    id: string;
    email: string;
    username: string;
    role?: string;
    is_new_user?: boolean;
    shopName?: string;
  };
  [key: string]: any;
}

interface AuthContextType {
  session: Session | null;
  refetchSession: () => Promise<any>;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  getBettingLimits: () => { maxSweepCoinsBet: number; maxGoldCoinsBet: number; maxCadeCoinsBet: number; };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {

  const { 
    data: session, 
    refetch: refetchSession, 
    isLoading,
    isFetching,
    isError 
  } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await api.auth.getSession();
      return data;
    },
  });

  const getBettingLimits = () => ({
    maxSweepCoinsBet: session?.maxSweepCoinsBet || 0,
    maxGoldCoinsBet: session?.maxGoldCoinsBet || 0,
    maxCadeCoinsBet: session?.maxCadeCoinsBet || 0,
  });

  const value: AuthContextType = {
    session: session || null,
    refetchSession,
    isLoading,
    isFetching,
    isError,
    getBettingLimits,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}; 