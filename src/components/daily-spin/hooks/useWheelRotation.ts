import { useState, useEffect, useCallback } from 'react';
import { SPIN_REWARDS } from '@/types/daily-spin';
import { SEGMENT_SIZE } from '../daily-spin-constants';

/**
 * Custom hook to manage wheel rotation logic
 * Handles target rotation calculation, continuous spinning animation, and final landing position
 */
export function useWheelRotation(
  reward: number | undefined,
  isSpinning: boolean,
  prefersReducedMotion: boolean | null
) {
  const [rotation, setRotation] = useState(0);

  const computeTargetRotation = useCallback((rewardAmount: number, currentRotation: number) => {
    const idx = SPIN_REWARDS.findIndex((r) => r.coins === rewardAmount);
    if (idx === -1) return currentRotation;

    // Calculate the current center position of this segment in the wheel
    const segmentCenter = idx * SEGMENT_SIZE + SEGMENT_SIZE / 2;
    
    // Pointer is fixed at top (270° in SVG coordinates)
    const pointerAngle = 270;
    
    // Account for current wheel rotation
    const currentSegmentPosition = (segmentCenter + (currentRotation % 360)) % 360;
    
    // Calculate how much more to rotate to bring segment to pointer
    let additionalRotation = pointerAngle - currentSegmentPosition;
    
    // Normalize to positive angle
    if (additionalRotation < 0) {
      additionalRotation += 360;
    }

    // Tiny jitter inside the segment so it looks more real
    const maxJitter = Math.min(8, SEGMENT_SIZE * 0.18);
    const jitter = (Math.random() * 2 - 1) * maxJitter;

    // Many spins plus landing angle
    const spins = 6 * 360;

    // Apply rotation (current position + spins + angle to target + jitter)
    return currentRotation + spins + additionalRotation + jitter;
  }, []);

  // When a reward arrives, set the final rotation
  useEffect(() => {
    if (reward && !isSpinning) {
      setRotation((prev) => computeTargetRotation(reward, prev));
    }
  }, [reward, isSpinning, computeTargetRotation]);

  // Continuous spinning during loading phase
  useEffect(() => {
    if (isSpinning && !prefersReducedMotion) {
      const interval = setInterval(() => {
        setRotation((prev) => prev + 30);
      }, 50);
      return () => clearInterval(interval);
    }
  }, [isSpinning, prefersReducedMotion]);

  return rotation;
}
