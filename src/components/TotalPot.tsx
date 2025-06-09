import { useTotalPotData } from '@/hooks/useTotalPotData';
import { useEffect, useState, useRef } from 'react';

interface TotalPotProps {
  streamId: string;
  initialTotalBets?: number;
  className?: string;
}

export const TotalPot = ({ streamId, initialTotalBets = 0, className = '' }: TotalPotProps) => {
  // Use our custom hook to handle all data fetching and real-time updates
  const { totalPot, userBet, refetchTotalPot } = useTotalPotData(streamId, initialTotalBets);

  // Add state for displayed value with a more stable debounce mechanism
  const [displayValue, setDisplayValue] = useState(totalPot || initialTotalBets);
  const previousValueRef = useRef<number | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stableValueRef = useRef<number>(initialTotalBets);
  const lastUpdateTimeRef = useRef<number>(0);

  console.log(
    `TotalPot render - totalPot: ${totalPot}, displayValue: ${displayValue}, initialTotalBets: ${initialTotalBets}`
  );

  // Update the displayed value with a more stable approach when it changes
  useEffect(() => {
    // Only update if the value has actually changed, is valid, and stable
    if (totalPot !== undefined && totalPot !== null && totalPot !== previousValueRef.current) {
      console.log('Total pot value changed from', previousValueRef.current, 'to', totalPot);
      previousValueRef.current = totalPot;

      // Clear any existing timeout
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      // Apply rate limiting to value updates (max once per 3 seconds)
      const now = Date.now();
      if (now - lastUpdateTimeRef.current > 3000) {
        lastUpdateTimeRef.current = now;

        // Use a debounce to prevent rapid flicker, and only update if value is stable or significantly different
        const significantChange =
          Math.abs((totalPot - stableValueRef.current) / Math.max(stableValueRef.current, 1)) >
          0.05;

        if (significantChange || totalPot === 0) {
          // Set a timeout to debounce rapid updates and wait for values to stabilize
          updateTimeoutRef.current = setTimeout(() => {
            console.log('Updating displayed total pot value to:', totalPot);
            stableValueRef.current = totalPot;
            setDisplayValue(totalPot);
          }, 500); // Slightly longer delay for more stability
        }
      }
    }

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [totalPot]);

  // Force refresh the total pot less frequently for better syncing
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Rate limit the refresh to prevent API hammering
      const now = Date.now();
      if (now - lastUpdateTimeRef.current > 15000) {
        // 15 seconds minimum between refreshes
        refetchTotalPot();
      }
    }, 20000); // Reduced refresh interval to prevent API hammering

    return () => clearInterval(intervalId);
  }, [refetchTotalPot]);

  // Force refresh immediately when component mounts and whenever streamId changes
  useEffect(() => {
    console.log('TotalPot component mounted or streamId changed, forcing immediate refresh');

    // Delay the initial refresh to prevent API hammering on page load
    const initialRefreshTimeout = setTimeout(() => {
      refetchTotalPot();

      // Also set the initial display value
      if (totalPot !== undefined && totalPot !== null) {
        setDisplayValue(totalPot);
      }
    }, 1000);

    return () => clearTimeout(initialRefreshTimeout);
  }, [refetchTotalPot, streamId, totalPot]);

  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 ${className}`}
      data-testid="total-pot"
    >
      <div className="flex items-center justify-center gap-2">
        <span className="text-2xl font-bold">Total Pot:</span>
        <span className="text-2xl font-bold text-[#c3f53b]">
          {displayValue.toFixed(0)} Free Coins
        </span>
      </div>
      {userBet && userBet.amount > 0 && (
        <div className="text-sm text-muted-foreground">
          (Includes your bet of {userBet.amount} Free Coins on {userBet.option})
        </div>
      )}
    </div>
  );
};
