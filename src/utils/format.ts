/**
 * Format a number as currency
 */
export const formatAmount = (amount: number, options?: Intl.NumberFormatOptions): string => {
  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  };

  return new Intl.NumberFormat('en-US', options || defaultOptions).format(amount);
};

/**
 * Format a number with abbreviated suffixes (K, M, B)
 */
export const formatCompactNumber = (num: number): string => {
  if (num < 1000) {
    return num.toString();
  } else if (num < 1000000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  } else if (num < 1000000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  } else {
    return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
};

/**
 * Format a date relative to now (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date: Date | string): string => {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  // Less than a minute
  if (seconds < 60) {
    return 'just now';
  }

  // Less than an hour
  if (seconds < 60 * 60) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  // Less than a day
  if (seconds < 60 * 60 * 24) {
    const hours = Math.floor(seconds / (60 * 60));
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }

  // Less than a week
  if (seconds < 60 * 60 * 24 * 7) {
    const days = Math.floor(seconds / (60 * 60 * 24));
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }

  // Format as date
  return then.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: now.getFullYear() !== then.getFullYear() ? 'numeric' : undefined,
  });
};

/**
 * Format a duration in seconds to MM:SS format
 */
export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Format a view count with proper pluralization
 */
export const formatViewCount = (count: number): string => {
  if (count === 0) return 'No views';
  if (count === 1) return '1 view';
  return `${formatCompactNumber(count)} views`;
};
