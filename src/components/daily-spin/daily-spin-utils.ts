import { TimeRemaining } from '@/types/daily-spin';

/**
 * Format countdown time without leading zeros
 * Hides hours when under 1 hour
 * 
 * @param time - TimeRemaining object with hours, minutes, seconds
 * @returns Formatted string (e.g., "2h 30m 15s" or "45m 30s" or "10s")
 */
export const formatCountdownTime = (time: TimeRemaining): string => {
  if (time.hours > 0) {
    return `${time.hours}h ${time.minutes}m ${time.seconds}s`;
  } else if (time.minutes > 0) {
    return `${time.minutes}m ${time.seconds}s`;
  } else {
    return `${time.seconds}s`;
  }
};

/**
 * Format reset time as localized time string
 * 
 * @param dateString - ISO 8601 date string
 * @returns Formatted time string (e.g., "3:45 PM")
 */
export const formatResetTime = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};
