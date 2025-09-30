import { useState, useEffect } from 'react';
import { isOnline } from '@/utils/helper';

export const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState(isOnline());

  useEffect(() => {
    const handleOnline = () => {
      setIsConnected(true);
    };

    const handleOffline = () => {
      setIsConnected(false);
    };

    // Add event listeners for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isConnected };
};
