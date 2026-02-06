import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import api from '@/integrations/api/client';
import { getConnectionErrorMessage } from '@/utils/helper';
import Bugsnag from '@bugsnag/js';
import type { Socket } from 'socket.io-client';

interface BetEventUpdate {
  bet?: {
    roundId?: string;
  };
}

interface UseStreamSocketEventsProps {
  streamId: string | null;
  socketConnect: Socket | null;
  onDataUpdate: () => void;
  context?: 'stream' | 'nonvideo';
}

/**
 * Custom hook to handle socket event listeners for bet-related events
 */
export const useStreamSocketEvents = ({
  streamId,
  socketConnect,
  onDataUpdate,
  context = 'stream',
}: UseStreamSocketEventsProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const onDataUpdateRef = useRef(onDataUpdate);
  const lastErrorToastRef = useRef<number>(0);

  // Keep the callback ref updated
  useEffect(() => {
    onDataUpdateRef.current = onDataUpdate;
  }, [onDataUpdate]);

  useEffect(() => {
    if (!socketConnect || !streamId) return;

    const handleBetEvent = (eventName: string, update: BetEventUpdate) => {
      if (import.meta.env.DEV) {
        console.log(eventName, update);
      }
      const roundId = update?.bet?.roundId;
      if (roundId) {
        queryClient.invalidateQueries({ queryKey: ['pick-timeline', roundId] });
      }
      onDataUpdateRef.current();
    };

    const setupSocketEventListeners = () => {
      if (!socketConnect) return;

      // Bet event listeners
      socketConnect.on('betPlaced', (update: BetEventUpdate) => handleBetEvent('betPlaced', update));
      socketConnect.on('betEdited', (update: BetEventUpdate) => handleBetEvent('betEdited', update));
      socketConnect.on('betCancelled', (update: BetEventUpdate) => handleBetEvent('betCancelled', update));
      socketConnect.on('betCancelledByAdmin', (update: BetEventUpdate) => handleBetEvent('betCancelledByAdmin', update));

      // Handle disconnection events
      socketConnect.on('disconnect', (reason: string) => {
        Bugsnag.leaveBreadcrumb('Socket disconnected', { reason, streamId, context });
        // Socket.IO will automatically attempt to reconnect with exponential backoff
      });

      // Handle reconnection events
      socketConnect.on('reconnect', (attemptNumber: number) => {
        if (import.meta.env.DEV) {
          console.log('Socket reconnected after', attemptNumber, 'attempts');
        }
        Bugsnag.leaveBreadcrumb('Socket reconnected', { attemptNumber, streamId, context });
        // Refetch data after successful reconnection
        onDataUpdateRef.current();
      });

      socketConnect.on('reconnect_attempt', (attemptNumber: number) => {
        if (import.meta.env.DEV) {
          console.log('Socket reconnection attempt', attemptNumber);
        }
      });

      socketConnect.on('reconnect_failed', () => {
        Bugsnag.notify(new Error('Socket reconnection failed'), (event) => {
          event.severity = 'error';
          event.context = `${context} Socket`;
          event.addMetadata('socket', { streamId });
        });
        
        toast({
          description: 'Unable to reconnect. Please refresh the page.',
          variant: 'destructive',
          duration: 10000,
        });
      });

      socketConnect.on('connect_error', (error: Error & { type?: string }) => {
        const now = Date.now();
        // Throttle error toasts to once every 5 seconds
        if (now - lastErrorToastRef.current > 5000) {
          lastErrorToastRef.current = now;
          
          Bugsnag.notify(new Error('Socket connection error'), (event) => {
            event.severity = 'warning';
            event.context = `${context} Socket`;
            event.addMetadata('socket', { 
              streamId, 
              errorMessage: error?.message,
              errorType: error?.type 
            });
          });
          
          toast({
            description: getConnectionErrorMessage(),
            variant: 'destructive',
          });
        }
      });
    };

    // Join stream and setup listeners
    api.socket.joinStream(streamId, socketConnect);
    setupSocketEventListeners();

    // Cleanup on unmount
    return () => {
      if (socketConnect) {
        api.socket.leaveStream(streamId, socketConnect);
        socketConnect.off('betPlaced');
        socketConnect.off('betEdited');
        socketConnect.off('betCancelled');
        socketConnect.off('betCancelledByAdmin');
        socketConnect.off('disconnect');
        socketConnect.off('reconnect');
        socketConnect.off('reconnect_attempt');
        socketConnect.off('reconnect_failed');
        socketConnect.off('connect_error');
      }
    };
  }, [streamId, socketConnect, queryClient, toast, context]);
};
