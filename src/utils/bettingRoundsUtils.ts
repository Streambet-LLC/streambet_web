// Utility functions for cleaning betting rounds data before sending to API

// Constant for temporary option IDs to prevent them from being sent to the database
export const TEMP_OPTION_PREFIX = 'TEMP_OPTION_';
import { formatDateTimeForISO } from './helper';
import { BetRoundType, BettingCategory, PickMechanism } from '@/enums';

export interface BettingOption {
  optionId?: string;
  option: string;
}

export interface BettingRound {
  roundId?: string;
  roundName: string;
  lockDate?: Date | null;
  lockTime?: string;
  lockTimezone?: string;
  category?: BettingCategory;
  options: BettingOption[];
  betRoundType?: BetRoundType;
  mechanism?: PickMechanism;
}

/**
 * Represents the betting round data structure for API payloads
 * lockDate is converted to ISO string format for backend compatibility
 */
export interface BettingRoundPayload {
  roundId?: string;
  betRoundType?: string;
  roundName: string;
  lockDate?: string | null;
  category?: string;
  options: BettingOption[];
  mechanism?: string;
}

/**
 * Converts API response betting rounds to UI model format
 * @param apiRounds - Betting rounds from API with ISO string dates
 * @returns Betting rounds with Date objects for UI consumption
 */
export const deserializeRounds = (apiRounds: any[]): BettingRound[] => {
  return apiRounds.map(round => {
    // Destructure to separate processed fields from the rest
    const {
      lockDate: apiLockDate,
      category: apiCategory,
      mechanism: apiMechanism,
      ...restRound
    } = round;

    let lockDate = null;
    let lockTime = undefined;
    let lockTimezone = undefined;

    // Extract date, time, and timezone from lockDate timestamp (if it exists)
    if (apiLockDate) {
      try {
        const date = new Date(apiLockDate);

        // Validate the date is valid
        if (!isNaN(date.getTime())) {
          lockDate = date;

          // Extract time in HH:mm format
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          lockTime = `${hours}:${minutes}`;

          // Get timezone from the date (user's local timezone)
          lockTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        }
      } catch (error) {
        // If date parsing fails, leave all values as null/undefined
        console.error('Error parsing lockDate:', error);
      }
    }

    return {
      ...restRound,
      lockDate,
      lockTime,
      lockTimezone,
      category: apiCategory as BettingCategory,
      mechanism: apiMechanism as PickMechanism,
    };
  });
};

/**
 * Cleans temporary option IDs from betting rounds data
 * @param roundsData - The betting rounds data to clean
 * @returns Cleaned betting rounds data with temporary IDs removed and only required properties included
 */
export const cleanTemporaryIds = (roundsData: BettingRound[]): BettingRoundPayload[] => {
  return roundsData.map(round => ({
    // Only include the required properties for the API
    roundId: round.roundId,
    roundName: round.roundName,
    // Convert date/time/timezone to UTC ISO string using the same helper as stream scheduling
    lockDate:
      round.lockDate && round.lockTime
        ? formatDateTimeForISO(round.lockDate, round.lockTime, round.lockTimezone)
        : null,
    category: round.category,
    betRoundType: round.betRoundType,
    mechanism: round.mechanism,
    options: round.options.map(option => {
      // Remove only temporary option IDs, keep real ones and other properties
      if (option.optionId && option.optionId.startsWith(TEMP_OPTION_PREFIX)) {
        // Remove the temporary optionId, keep other properties
        const { optionId, ...cleanOption } = option;
        return cleanOption;
      }
      // Keep the option as is if it has a real optionId or no optionId
      return option;
    }),
  }));
};

/**
 * Checks if an option ID is temporary
 * @param optionId - The option ID to check
 * @returns True if the option ID is temporary
 */
export const isTemporaryOptionId = (optionId?: string): boolean => {
  return optionId ? optionId.startsWith(TEMP_OPTION_PREFIX) : false;
};

/**
 * Gets cleaned rounds for API calls (removes temporary IDs)
 * Use this function before sending data to the database to prevent temporary IDs from being saved
 * @param rounds - The betting rounds data to clean
 * @returns Cleaned betting rounds data
 */
export const getCleanedRounds = (rounds: BettingRound[]): BettingRoundPayload[] => {
  return cleanTemporaryIds(rounds);
};

/**
 * Appends numeric counters to duplicate option names within a round
 * @param options - Array of betting options
 * @returns New array with counters added to duplicate names
 * @example ["Red", "Red", "Red"] → ["Red (1)", "Red (2)", "Red (3)"]
 * @example ["Red", "Blue", "Red"] → ["Red (1)", "Blue", "Red (2)"]
 * @example ["red", "Red", "RED"] → ["red (1)", "Red (2)", "RED (3)"]
 */
export const appendCountersToDuplicates = (options: BettingOption[]): BettingOption[] => {
  // Group options by normalized name (case-insensitive, trimmed)
  const nameGroups = new Map<string, number[]>();

  options.forEach((option, index) => {
    const normalizedName = option.option.toLowerCase().trim();
    if (!nameGroups.has(normalizedName)) {
      nameGroups.set(normalizedName, []);
    }
    nameGroups.get(normalizedName)!.push(index);
  });

  // Create result array with counters added to duplicates
  const result = [...options];

  nameGroups.forEach((indices) => {
    // Only add counters if there are duplicates (more than 1)
    if (indices.length > 1) {
      indices.forEach((index, counter) => {
        result[index] = {
          ...result[index],
          option: `${result[index].option} (${counter + 1})`
        };
      });
    }
  });

  return result;
};
