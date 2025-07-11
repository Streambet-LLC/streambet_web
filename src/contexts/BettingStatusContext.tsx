import { createContext, useContext, useState, ReactNode } from 'react';
import { CurrencyType } from '@/enums';
import api from '@/integrations/api/client';

interface BettingStatusContextType {
  currency: CurrencyType;
  setCurrency: (currency: CurrencyType) => void;
}

const BettingStatusContext = createContext<BettingStatusContextType | undefined>(undefined);

export const BettingStatusProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrency] = useState<CurrencyType>(CurrencyType.FREE_TOKENS);

  const newSocket = api.socket.connect();

      newSocket.on('bettingLocked', (data) => {
        console.log('bettingLocked', data);
      });

  return (
    <BettingStatusContext.Provider value={{ currency, setCurrency }}>
      {children}
    </BettingStatusContext.Provider>
  );
};

export const useBettingStatusContext = () => {
  const context = useContext(BettingStatusContext);
  if (!context) {
    throw new Error('');
  }
  return context;
}; 
