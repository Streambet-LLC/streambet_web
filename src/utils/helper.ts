import { format } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { load as nsfwjsLoad } from "nsfwjs";
import Bugsnag from '@bugsnag/js';

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

export function formatDateTimeForISO(date: Date | null, time: string, timezone?: string): string | undefined {
  if (!date || !time) return undefined;

  try {
    // Get the timezone to use (provided timezone or user's local timezone)
    const targetTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Create a date object with the selected date and time
    const dateTime = new Date(date);
    const [hours, minutes] = time.split(':');
    dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // Interpret the date/time as if it's in the target timezone, then convert to UTC
    const zonedDateTime = fromZonedTime(dateTime, targetTimezone);

    // Critical: Invalid timezone produces Invalid Date
    if (isNaN(zonedDateTime.getTime())) {
      const error = new Error(`Invalid timezone conversion: ${targetTimezone}`);
      
      // Log to Bugsnag with context for debugging
      Bugsnag.notify(error, (event) => {
        event.severity = 'warning';
        event.context = 'Stream Scheduling';
        event.addMetadata('timezone', {
          providedTimezone: timezone,
          resolvedTimezone: targetTimezone,
          date: date?.toISOString(),
          time: time,
        });
      });
      
      // Log for dev debugging
      console.error('Invalid timezone conversion:', {
        timezone: targetTimezone,
        date,
        time,
      });
      
      return undefined;
    }

    // Format as ISO 8601 string
    return zonedDateTime.toISOString();
  } catch (error) {
    // Unexpected errors - critical
    console.error('Unexpected error formatting date/time for ISO:', error);
    
    Bugsnag.notify(error instanceof Error ? error : new Error(String(error)), (event) => {
      event.severity = 'error';
      event.context = 'Stream Scheduling';
      event.addMetadata('input', {
        date: date?.toISOString(),
        time,
        timezone,
      });
    });
    
    return undefined;
  }
};

/**
 * Validates if a scheduled date/time is in the past after timezone conversion
 * @param date - The selected date
 * @param time - The selected time in HH:MM format
 * @param timezone - The IANA timezone identifier (e.g., 'America/New_York')
 * @returns true if the scheduled time is in the past, false otherwise
 */
export function isScheduledTimeInPast(date: Date | null, time: string, timezone: string): boolean {
  if (!date || !time) return false;
  
  // Use formatDateTimeForISO to get the UTC timestamp
  const scheduledTimeISO = formatDateTimeForISO(date, time, timezone);
  if (!scheduledTimeISO) return false;
  
  // Compare UTC timestamps - scheduled time must be in the future
  return new Date(scheduledTimeISO) <= new Date();
}

/**
 * Get timezone abbreviation for a given timezone and date
 * @param timezone - IANA timezone identifier (e.g., 'America/New_York')
 * @param date - Date object to check for DST
 * @returns Timezone abbreviation (e.g., 'EST', 'EDT', 'MST')
 */
export function getTimezoneAbbreviation(timezone: string, date: Date | null = null): string {
  if (!timezone) return '';
  
  try {
    const targetDate = date || new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short'
    });
    
    const parts = formatter.formatToParts(targetDate);
    const timeZonePart = parts.find(part => part.type === 'timeZoneName');
    return timeZonePart?.value || '';
  } catch {
    return '';
  }
}

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

export const isImageSFW = async (url: string) => {
  const canvas = new OffscreenCanvas(299, 299);
  const ctx = canvas.getContext("2d");
  const image = new Image();
  image.src = url;

  return new Promise((resolve, reject) => {
    image.onload = async () => {
      try {
        ctx.clearRect(0, 0, 299, 299);

        const wrh = image.naturalWidth / image.naturalHeight;

        let newWidth = 299;
        let newHeight = newWidth / wrh;

        if (newHeight > 299) {
          newHeight = 299;
          newWidth = newHeight * wrh;
        }

        ctx.drawImage(image, 0, 0, newWidth, newHeight);

        const imageData = ctx.getImageData(0, 0, 299, 299);
        const loadedModel = await nsfwjsLoad("/model/");
        const predictions = await loadedModel.classify(imageData);
        ctx.clearRect(0, 0, 299, 299);

        for (const prediction of predictions) {
          if ((prediction.className === "Porn" || prediction.className === "Hentai") && prediction.probability >= .05) {
            return resolve(false);
          }
        }

        return resolve(true);
      } catch (error) {
        return reject(error);
      }
    };
  });
}

/**
 * Sort items by priority creator/title pairs.
 * Matches require BOTH creator username AND betting round title to match.
 * Items matching pairs appear first in the order specified in the priority list.
 * Non-matching items appear after, maintaining their original order.
 * 
 * @param items - Array of betting rounds/streams with name and creator fields
 * @param priorityPairs - Array of {creatorUsername, bettingRoundTitle} pairs
 * @returns Sorted array with prioritized items first
 */
export const sortByPriorityPairs = <T extends { 
  name: string; 
  creator?: string | null 
}>(
  items: T[],
  priorityPairs: Array<{ creatorUsername: string; bettingRoundTitle: string }>
): T[] => {
  if (!priorityPairs || priorityPairs.length === 0) {
    return items; // No sorting if priority list is empty
  }

  // Create a map of "creator|title" -> priority index
  const priorityMap = new Map(
    priorityPairs.map((pair, index) => {
      const key = `${pair.creatorUsername.toLowerCase().trim()}|${pair.bettingRoundTitle.toLowerCase().trim()}`;
      return [key, index];
    })
  );
  
  return [...items].sort((a, b) => {
    const aKey = `${(a.creator || '').toLowerCase().trim()}|${(a.name || '').toLowerCase().trim()}`;
    const bKey = `${(b.creator || '').toLowerCase().trim()}|${(b.name || '').toLowerCase().trim()}`;
    
    const aPriority = priorityMap.get(aKey) ?? Infinity;
    const bPriority = priorityMap.get(bKey) ?? Infinity;
    
    // If both have priority, sort by priority index
    // If only one has priority, it comes first
    // If neither has priority, maintain original order (stable sort)
    return aPriority - bPriority;
  });
};
