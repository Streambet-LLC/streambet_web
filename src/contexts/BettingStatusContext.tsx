import { createContext, useContext, useState, ReactNode, useRef, useEffect } from 'react';
import { CurrencyType } from '@/enums';
import api from '@/integrations/api/client';
import { useAuthContext } from './AuthContext';
import { useToast } from '@/hooks/use-toast';

interface BettingStatusContextType {
  currency: CurrencyType;
  setCurrency: (currency: CurrencyType) => void;
}

const BettingStatusContext = createContext<BettingStatusContextType | undefined>(undefined);

export const BettingStatusProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrency] = useState<CurrencyType>(CurrencyType.FREE_TOKENS);
  const [socket, setSocket] = useState<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { session } = useAuthContext()
  const { toast } = useToast();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

 const handleSocketReconnection = () => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    reconnectAttemptsRef.current++;

    // Clear existing socket
    if (socket) {
      socket.off('pong');
      socket.disconnect();
    }

    // Create new socket connection
    const newSocket = api.socket.connect();
    if (newSocket) {
      setSocket(newSocket);
      api.socket.joinCommonStream(newSocket);
      // Reset reconnection attempts on successful connection
      newSocket.on('connect', () => {
        console.log('Common Socket reconnected successfully');
        reconnectAttemptsRef.current = 0;
      });

    } else {
      // Retry reconnection after delay
      reconnectTimeoutRef.current = setTimeout(() => {
        handleSocketReconnection();
      }, 3000);
    }
  };

    const setupSocketEventListeners = (socketInstance: any) => {
      if (!socketInstance) return;

    // Handle disconnection events
      socketInstance.on('botMessage', (update: any) => {
        console.log('all botMessages', update);
          toast({
          description:update?.message,
          variant: 'default',
        });
      });
  
      socketInstance.on('connect_error', (error: any) => {
        console.log('Socket connection error:', error);
        handleSocketReconnection();
      });
    };
  
    useEffect(() => {
      console.log(session,'context session')
      if(session){
      const newSocket = api.socket.connect();
      console.log(newSocket,'newSocket in betting context')
      api.socket.joinCommonStream(newSocket);
      setSocket(newSocket);
      // Setup event listeners
      setupSocketEventListeners(newSocket);
      }
      else{
        api.socket.disconnect();
      }
    
      // return () => {
      //   // Cleanup ping-pong intervals
      //   if (reconnectTimeoutRef.current) {
      //     clearTimeout(reconnectTimeoutRef.current);
      //   }
      //   api.socket.disconnect();
      //   setSocket(null);
      // };
    }, [session]);


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
