import { format } from 'date-fns';

/**
 * @param messageData
 * @returns message from API response
 *
 * Function used for getting message from API response of anything and returns message
 */
export const getMessage = (messageData: any) =>
  typeof messageData?.response?.data?.message === 'string'
    ? messageData?.response?.data?.message
    : typeof messageData?.response?.data?.message === 'object'
      ? messageData?.response?.data?.message?.[0]
      : typeof messageData === 'string'
        ? messageData
        : typeof messageData?.message === 'string'
          ? messageData.message
          : typeof messageData?.message === 'object'
            ? messageData.message?.[0]
            : null;

/**
 * Decode a JWT token
 * @param idToken - The JWT token to decode
 * @returns The decoded token
 */
export const decodeIdToken = (idToken: string) => {
  const base64Url = idToken.split('.')[1]; // Get the payload part
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/'); // Replace URL-safe characters
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  return JSON.parse(jsonPayload);
};

/**
 * @param url which is URL to image
 * @param isNotAvatar where the flag true indicate to return
 * default image based on avatar or not.
 * @returns s3bucket base appened url
 */
export function getImageLink(url: string | null | undefined, isNotAvatar?: boolean): string {
  return url?.includes('https') || url?.includes('blob:')
    ? url
    : url && !url?.includes('default')
      ? `${import.meta.env.VITE_S3_BASE_URL}/${url}`
      : isNotAvatar
        ? '/assets/no-image.svg'
        : '/avatar_placeholder_large.png';
};

export function formatDateTimeForISO(date: Date | null, time: string): string | undefined {
  if (!date || !time) return undefined;

  // Create a new date object with the selected date and time
  const dateTime = new Date(date);
  const [hours, minutes] = time.split(':');
  dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

  // Format as ISO 8601 string
  return dateTime.toISOString();
};

export function formatTime(dateString: string) {
  const date = new Date(dateString);
  const time = format(date, 'h:mm a');
  const timezone = date.toLocaleTimeString('en-US', { 
    timeZoneName: 'short' 
  }).split(' ').pop();
  return `${time} ${timezone}`;
};

export function formatDate(dateString: string) {
  const date = new Date(dateString);
  return format(date, 'EEEE, MMM do, yyyy');
};

export function formatDateTime(dateString: string) {
  const date = new Date(dateString);
  return format(date, 'EEEE, MMM do h:mm a');
};

// Check if the device is online
export const isOnline = (): boolean => {
  return navigator.onLine;
};

// Check if the error is related to network connectivity
export const isNetworkError = (error: any): boolean => {
  if (!isOnline()) {
    return true;
  }
  
  // Check for common network error patterns
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorCode = error?.code?.toLowerCase() || '';
  
  return (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('offline') ||
    errorCode.includes('net::') ||
    errorCode.includes('err_network') ||
    errorCode.includes('err_connection')
  );
};

// Get appropriate error message based on connection status
export const getConnectionErrorMessage = (error?: any, networkStatus?: { isOnline?: boolean }): string => {
  // Use provided network status or check current status
  const isCurrentlyOnline = networkStatus?.isOnline !== undefined ? networkStatus.isOnline : isOnline();
  
  if (!isCurrentlyOnline) {
    return 'No internet connection. Please check your network and try again.';
  }
  
  if (error && isNetworkError(error)) {
    return 'Connection lost. Please check your internet connection and try again.';
  }
  
  return 'Something went wrong. Please try again.';
};

/**
 * Count the number of words in a text string
 * Words are defined as sequences of characters separated by whitespace
 * Note: "Hello,world" is counted as 1 word (no space between)
 * @param {unknown} text - The text to count words in
 * @returns {number} The number of words
 * @example
 * countWords("Hello world") // returns 2
 * countWords("Hello,world") // returns 1
 */
export const countWords = (text: unknown): number => {
  // Runtime type validation
  if (typeof text !== 'string') return 0;
  
  // Return 0 if empty after trimming
  const trimmed = text.trim();
  if (!trimmed) return 0;
  
  // Split by whitespace - /\s+/ already yields non-empty tokens
  return trimmed.split(/\s+/).length;
};

/**
 * Check if text is within character and word limits
 * @param {string} text - The text to check
 * @param {number} maxCharacters - Maximum number of characters allowed
 * @param {number} maxWords - Maximum number of words allowed
 * @returns {{characterCount: number, wordCount: number, isCharacterLimitExceeded: boolean, isWordLimitExceeded: boolean, isWithinLimits: boolean}} Object with flags indicating if limits are exceeded
 */
export const checkTextLimits = (
  text: string,
  maxCharacters: number,
  maxWords: number
): {
  characterCount: number;
  wordCount: number;
  isCharacterLimitExceeded: boolean;
  isWordLimitExceeded: boolean;
  isWithinLimits: boolean;
} => {
  // Runtime validation for text
  if (typeof text !== 'string') {
    throw new TypeError('text must be a string');
  }
  
  // Runtime validation for maxCharacters
  if (typeof maxCharacters !== 'number' || !Number.isFinite(maxCharacters) || maxCharacters < 0) {
    throw new TypeError('maxCharacters must be a finite non-negative number');
  }
  
  // Runtime validation for maxWords
  if (typeof maxWords !== 'number' || !Number.isFinite(maxWords) || maxWords < 0) {
    throw new TypeError('maxWords must be a finite non-negative number');
  }
  
  const characterCount = text.length;
  const wordCount = countWords(text);
  const isCharacterLimitExceeded = characterCount > maxCharacters;
  const isWordLimitExceeded = wordCount > maxWords;
  
  return {
    characterCount,
    wordCount,
    isCharacterLimitExceeded,
    isWordLimitExceeded,
    isWithinLimits: !isCharacterLimitExceeded && !isWordLimitExceeded,
  };
};

/**
 * Check if text is within specified limits (for validation)
 * @param {string} text - The text to validate
 * @param {number} maxCharacters - Maximum number of characters allowed
 * @param {number} maxWords - Maximum number of words allowed
 * @returns {boolean} True if text is within both limits, false otherwise
 */
export const isWithinTextLimits = (
  text: string,
  maxCharacters: number,
  maxWords: number
): boolean => {
  const { isWithinLimits } = checkTextLimits(text, maxCharacters, maxWords);
  return isWithinLimits;
};
