// Utility functions for cleaning betting rounds data before sending to API

// Constant for temporary option IDs to prevent them from being sent to the database
export const TEMP_OPTION_PREFIX = 'TEMP_OPTION_';

export interface BettingOption {
  optionId?: string;
  option: string;
}

export interface BettingRound {
  roundId?: string;
  roundName: string;
  options: BettingOption[];
}

/**
 * Cleans temporary option IDs from betting rounds data
 * @param roundsData - The betting rounds data to clean
 * @returns Cleaned betting rounds data with temporary IDs removed and only required properties included
 */
export const cleanTemporaryIds = (roundsData: BettingRound[]): BettingRound[] => {
  return roundsData.map(round => ({
    // Only include the required properties for the API
    roundId: round.roundId,
    roundName: round.roundName,
    options: round.options.map(option => {
      // Remove only temporary option IDs, keep real ones and other properties
      if (option.optionId && option.optionId.startsWith(TEMP_OPTION_PREFIX)) {
        // Remove the temporary optionId, keep other properties
        const { optionId, ...cleanOption } = option;
        return cleanOption;
      }
      // Keep the option as is if it has a real optionId or no optionId
      return option;
    })
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
export const getCleanedRounds = (rounds: BettingRound[]): BettingRound[] => {
  return cleanTemporaryIds(rounds);
};
