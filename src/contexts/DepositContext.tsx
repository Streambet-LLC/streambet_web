import { createContext, useContext, useState, ReactNode } from 'react';

interface DepositContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DepositContext = createContext<DepositContextType | undefined>(undefined);

export const DepositProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);

  return (
    <DepositContext.Provider value={{ open, setOpen }}>
      {children}
    </DepositContext.Provider>
  );
};

export const useDepositContext = () => {
  const context = useContext(DepositContext);
  if (!context) {
    throw new Error('useDepositContext must be used within a DepositProvider');
  }
  return context;
}; 
