import { useEffect, useRef } from 'react';
import { useBettingStatusContext } from '@/contexts/BettingStatusContext';
import Bugsnag from '@bugsnag/js';

/**
 * Custom hook to listen for stream promotion updates via WebSocket
 * and trigger a refetch callback when updates occur.
 * 
 * @param refetchCallback - Function to call when stream promotion is updated
 */
export const useStreamPromotionListener = (
  refetchCallback: () => void
) => {
  const { socketConnect } = useBettingStatusContext();
  const callbackRef = useRef(refetchCallback);

  // Keep ref up to date with the latest callback
  useEffect(() => {
    callbackRef.current = refetchCallback;
  });

  useEffect(() => {
    if (!socketConnect) return;

    const handleStreamPromotionUpdated = () => {
      callbackRef.current();
    };

    const handleSocketError = (error: any) => {
      console.error('Socket error:', error);
      Bugsnag.notify(error);
    };

    socketConnect.on('streamPromotionUpdated', handleStreamPromotionUpdated);
    socketConnect.on('error', handleSocketError);

    return () => {
      socketConnect.off('streamPromotionUpdated', handleStreamPromotionUpdated);
      socketConnect.off('error', handleSocketError);
    };
  }, [socketConnect]);
};
