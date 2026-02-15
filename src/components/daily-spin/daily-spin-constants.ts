// Daily Spin Animation and Timing Constants
// Centralized configuration for all spin wheel timing and animations

export const SPIN_ANIMATION_DURATION = 5200; // 5.2 seconds for wheel spin animation
export const REWARD_DISPLAY_DELAY = 5300; // 5.3 seconds delay before showing reward display
export const REWARD_RESET_DURATION = 10000; // 10 seconds total before resetting reward display (keeps it visible for ~4.7s)

// Color palettes
export const WHEEL_SEGMENT_COLORS = ['#8B0000', '#20B2AA', '#2E8B57', '#483D8B'];
export const RIM_NEON_COLORS = ['#FF0080', '#00FFFF', '#FF00FF', '#00FF00'];

// Display name for the currency
export const CURRENCY_NAME = 'CADECOINS';

// Wheel calculations (based on SPIN_REWARDS length of 4)
export const SEGMENT_SIZE = 360 / 4; // 90 degrees per segment (360 / number of rewards)
