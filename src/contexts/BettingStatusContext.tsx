import { createContext, useContext, useState, ReactNode, useRef, useEffect } from 'react';
import api from '@/integrations/api/client';
import { useAuthContext } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { BanknoteArrowUp, Coins } from 'lucide-react';

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
  const queryClient = useQueryClient();

    // This function is not used as reconnection is handled in the socket connection logic in client.ts
    const handleSocketReconnection = () => {
    };

    const setupSocketEventListeners = (socketInstance: any) => {
      if (!socketInstance) return;
      socketInstance?.off('botMessage');
      socketInstance?.off('purchaseSettled');
      socketInstance?.off('withdrawSuccess');
      socketInstance?.off('withdrawFailed');
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

      // Handle purchase event
      socketInstance.on('purchaseSettled', (update: any) => {
        queryClient.invalidateQueries({ queryKey: ['session'] });
        toast({
          id: 'purchase-completed',
          title: 'Purchase Complete!',
          description: 
            <div className='break-keep'>
              You received
              {" "} 
              <span className='font-bold'>
                {update?.coinPackage.goldCoins}
              </span>
              {" "} 
              <span className='text-[#B4FF39]'>
                Gold Coins
              </span> 
              {" "} 
              and
              {" "} 
              <span className='font-bold'>
                {update?.coinPackage.sweepCoins}
              </span>
              {" "} 
              <span className='text-green-500'>
                Sweep Coins
              </span> 
              !
            </div>,
          variant: 'default',
          duration: 7000,
        });
      });

      // Handle withdraw failed event
      socketInstance.on('withdrawSuccess', (update: any) => {
        queryClient.invalidateQueries({ queryKey: ['session'] });
        toast({
          id: 'withdraw-success',
          title: 'Withdraw Success',
          description: 
            <div className='break-keep'>
              Withdrawal of 
              {" "} 
              <span className='font-bold'>
                {update?.sweepCoins}
              </span>
              {" "} 
              <span className='text-green-500'>
                Sweep Coins
              </span> 
              {" "}
              was successful!
            </div>,
          variant: 'default',
          duration: 7000,
        });
      });

      // Handle withdraw failed event
      socketInstance.on('withdrawFailed', (update: any) => {
        queryClient.invalidateQueries({ queryKey: ['session'] });
        toast({
          id: 'withdraw-failed',
          title: 'Withdraw Failed',
          description: 
            <div className='break-keep'>
              Withdrawal of 
              {" "} 
              <span className='font-bold'>
                {update?.sweepCoins}
              </span>
              {" "} 
              <span className='text-green-500'>
                Sweep Coins 
              </span> 
              {" "}
              failed. Your sweep coins has been refunded.
            </div>,
          variant: 'default',
          duration: 7000,
        });
      });

      // Handle refetch event for profile state update
      socketInstance.on('refetchEvent', (update: any) => {
        console.log('refetchEvent', update);
        queryClient.invalidateQueries({ queryKey: ['session'] });
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
          const newSocket = api.socket.connect();
          
          // Join common stream only after socket is connected
          newSocket.on('connect', () => {
            api.socket.joinCommonStream(newSocket);
          });
          
          // Re-join on reconnection (socket automatically leaves all rooms on disconnect)
          newSocket.on('reconnect', () => {
            api.socket.joinCommonStream(newSocket);
          });
          
          // If already connected, join immediately
          if (newSocket.connected) {
            api.socket.joinCommonStream(newSocket);
          }
          
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
          socketConnect.off('purchaseSettled');
          socketConnect.off('refetchEvent');
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
