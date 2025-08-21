import { createContext, useContext, useState, ReactNode } from 'react';
import { CurrencyType } from '@/enums';

interface CurrencyContextType {
  currency: CurrencyType;
  setCurrency: (currency: CurrencyType) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrency] = useState<CurrencyType>(CurrencyType.GOLD_COINS);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrencyContext = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrencyContext must be used within a CurrencyProvider');
  }
  return context;
}; 
