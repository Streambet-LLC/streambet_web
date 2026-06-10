import { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/integrations/api/client';
import { identifyUser, resetMixpanel } from '@/lib/mixpanel';

interface Session {
  id: string;
  walletBalanceCoin?: number;
  walletBalanceToken?: number;
  maxSweepCoinsBet?: number;
  maxGoldCoinsBet?: number;
  maxCadeCoinsBet?: number;
  isSeller?: boolean;
  isProSubscriber?: boolean;
  auctionsEnabled?: boolean;
  cryptoPaymentsEnabled?: boolean;
  solanaWallet?: string | null;
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

  // Keep Mixpanel identity in lock-step with the session: identify when a
  // user is present (also re-runs on hard refresh once the session resolves),
  // and reset when they log out so the next visitor starts anonymous.
  const lastIdentifiedId = useRef<string | null>(null);
  useEffect(() => {
    const userId = session?.user?.id ?? null;
    if (userId && userId !== lastIdentifiedId.current) {
      identifyUser({
        id: userId,
        email: session?.user?.email,
        username: session?.user?.username,
        isSeller: session?.isSeller,
        role: session?.user?.role,
      });
      lastIdentifiedId.current = userId;
    } else if (!userId && lastIdentifiedId.current) {
      resetMixpanel();
      lastIdentifiedId.current = null;
    }
  }, [
    session?.user?.id,
    session?.user?.email,
    session?.user?.username,
    session?.user?.role,
    session?.isSeller,
  ]);

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