import { createContext, useContext, useState, ReactNode, useRef, useEffect } from 'react';
import { CurrencyType } from '@/enums';
import api from '@/integrations/api/client';
import { useAuthContext } from './AuthContext';
import { useToast } from '@/hooks/use-toast';

interface BettingStatusContextType {
  socketConnect:any;
  setSocketConect: (socketConnect: any) => void;
  handleSocketReconnection: () => void;
}

const BettingStatusContext = createContext<BettingStatusContextType | undefined>(undefined);

export const BettingStatusProvider = ({ children }: { children: ReactNode }) => {

  const [socketConnect, setSocketConect] = useState<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { session, isFetching } = useAuthContext()
  const { toast } = useToast();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 1;

 const handleSocketReconnection = () => {
  console.log("Reconnecting socket")
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    reconnectAttemptsRef.current++;

    // Clear existing socket
    if (socketConnect) {
      socketConnect.off('pong');
    }

    // Create new socket connection
    const newSocket = api.socket.connect();
    if (newSocket) {
      setSocketConect(newSocket);
      api.socket.joinCommonStream(newSocket);
      // Reset reconnection attempts on successful connection
      newSocket.on('connect', () => {
        console.log('Common Socket reconnected successfully');
        reconnectAttemptsRef.current = 0;
      });

    } else {
      // Retry reconnection after delay
      // reconnectTimeoutRef.current = setTimeout(() => {
      //   handleSocketReconnection();
      // }, 3000);
    }
  };

    const setupSocketEventListeners = (socketInstance: any) => {
      if (!socketInstance) return;
      socketInstance?.off('botMessage');
      socketInstance?.off('connect_error');

    // Handle disconnection events
      socketInstance.on('botMessage', (update: any) => {
        console.log('all botMessages', update);
          toast({
          title: update?.title,
          description:update?.message,
          variant: 'default',
        });
      });
  
      socketInstance.on('connect_error', (error: any) => {
        console.log('debug123=Socket connection error:', error);
        handleSocketReconnection();
      });

      socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log('debug123=Trying to reconnect...', attemptNumber);
    });
    
    socketInstance.on('reconnect_error', (err) => {
      console.error('debug123=Reconnect error:', err);
    });
    
    socketInstance.on('reconnect_failed', () => {
      console.log('debug123=Reconnection failed');
    });
    };
  
    useEffect(() => {
      if (!isFetching) {
      if(session){
        if(!socketConnect){
          console.log('Adding new socket');
          const newSocket = api.socket.connect();
          api.socket.joinCommonStream(newSocket);
          setSocketConect(newSocket);
          // Setup event listeners
          setupSocketEventListeners(newSocket);
        }
      }
      else {
        api.socket.disconnect();
        setSocketConect(null);
      }
    }
    
      return () => {
        // Cleanup ping-pong intervals
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        if (socketConnect) {
          socketConnect.off('botMessage');
          socketConnect.off('connect_error');
          socketConnect.disconnect();
        }
        setSocketConect(null);
      };

    }, [session, isFetching]);


  return (
    <BettingStatusContext.Provider value={{ socketConnect, setSocketConect,handleSocketReconnection }}>
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
