import { PRESET_PERCENTAGES } from './constants';

interface PresetAmount {
  percentage: number;
  value: number;
}

interface CalculatePresetAmountsParams {
  maxBetLimit: number;
  walletBalance: number;
  currentBetAmount: number;
}

/**
 * Calculates preset betting amounts based on available balance and limits
 * @param maxBetLimit - Maximum allowed bet amount
 * @param walletBalance - User's current wallet balance
 * @param currentBetAmount - Amount already bet (for edit mode)
 * @returns Array of preset amounts with their percentages, filtered to exclude zero values
 */
export function calculatePresetAmounts({
  maxBetLimit,
  walletBalance,
  currentBetAmount,
}: CalculatePresetAmountsParams): PresetAmount[] {
  const totalAvailableBalance = Math.min(walletBalance + currentBetAmount, maxBetLimit);

  // Filter out buttons with zero value to prevent showing "0 tokens"
  return PRESET_PERCENTAGES.map(percentage => {
    const calculatedValue = totalAvailableBalance * percentage;
    const flooredValue = Math.floor(calculatedValue);
    return { percentage, value: flooredValue };
  }).filter(item => item.value > 0);
}

/**
 * Validates and constrains bet amount input
 * @param inputValue - Raw input string from user
 * @param maxValue - Maximum allowed value (slider max)
 * @returns Validated and constrained bet amount, or null if input should be blocked
 */
export function validateBetAmount(inputValue: string, maxValue: number): number | null {
  // Block if more than 3 decimal places
  if (inputValue.includes('.')) {
    const decimalPart = inputValue.split('.')[1];
    if (decimalPart && decimalPart.length > 3) {
      return null;
    }
  }

  // Valid input - apply normal constraints
  return Math.max(0, Math.min(Number(inputValue) || 0, maxValue));
}

/**
 * Converts slider percentage to bet amount
 * @param percentage - Slider percentage value (0-100)
 * @param maxAmount - Maximum amount (slider max)
 * @returns Rounded bet amount with 3 decimal places precision
 */
export function percentageToAmount(percentage: number, maxAmount: number): number {
  const calculatedAmount = maxAmount * (percentage / 100);
  // Round to 3 decimal places to avoid floating point precision issues
  return Math.round(calculatedAmount * 1000) / 1000;
}

/**
 * Generates dynamic gradient background for bet slider
 * @param betAmount - Current bet amount
 * @param maxAmount - Maximum amount (slider max)
 * @returns CSS gradient string for slider background
 */
export function getSliderBackground(betAmount: number, maxAmount: number): string {
  if (maxAmount <= 0) {
    return 'var(--dark-surface)';
  }

  const percentage = (betAmount / maxAmount) * 100;
  return `linear-gradient(to right, var(--slider-start) 0%, var(--slider-mid) ${percentage}%, var(--dark-surface) ${percentage}%)`;
}
