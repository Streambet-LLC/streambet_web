/**
 * Time remaining until next spin
 */
export interface TimeRemaining {
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * Response from GET /daily-spin/status
 * Indicates whether user can spin and timing information
 */
export interface SpinStatusResponse {
  canSpin: boolean;
  nextSpinAt: string; // ISO 8601 date string
  timeUntilNextSpin: TimeRemaining;
  lastSpinAt?: string; // ISO 8601 date string (optional, only if user has spun before)
}

/**
 * Response from POST /daily-spin/spin
 * Contains reward details and updated balances
 */
export interface SpinResultResponse {
  reward: number; // Amount of CadeCoins won (1, 2, 5, or 10)
  cadeCoinsBalance: number; // Updated CadeCoin balance
  lifetimeCoinsEarned: number; // Updated lifetime coins earned
  nextSpinAt: string; // ISO 8601 date string for next spin availability
  transactionId: string; // Transaction ID for this spin
}

/**
 * Reward configuration for frontend display
 */
export interface SpinReward {
  coins: number;
  probability: number; // Percentage (0-100)
}

/**
 * Reward tiers with probabilities
 * Used for display purposes in UI
 */
export const SPIN_REWARDS: readonly SpinReward[] = [
  { coins: 1, probability: 50 },
  { coins: 2, probability: 30 },
  { coins: 5, probability: 15 },
  { coins: 10, probability: 5 },
];
