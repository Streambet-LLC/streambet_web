import { useState, useEffect } from 'react';
import { REWARD_DISPLAY_DELAY } from '../daily-spin-constants';

/**
 * Custom hook to manage reward display timing
 * Shows the reward after the spin completes and animation finishes
 */
export function useRewardDisplay(reward: number | undefined, isSpinning: boolean) {
  const [showReward, setShowReward] = useState(false);

  useEffect(() => {
    if (reward && !isSpinning) {
      const timer = setTimeout(() => setShowReward(true), REWARD_DISPLAY_DELAY);
      return () => clearTimeout(timer);
    } else {
      setShowReward(false);
    }
  }, [reward, isSpinning]);

  return showReward;
}
