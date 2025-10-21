import { STREAM_LIMITS } from './constants';
import { isWithinTextLimits } from './helper';

/**
 * Validate stream title
 * @param title - The title to validate
 * @returns Error message string, or null if valid
 */
export const validateStreamTitle = (title: string): string | null => {
  if (!title) {
    return 'Title is required';
  }
  
  const trimmedLength = title.trim().length;
  if (
    trimmedLength < STREAM_LIMITS.TITLE_MIN_LENGTH ||
    trimmedLength > STREAM_LIMITS.TITLE_MAX_LENGTH
  ) {
    return `Title must be ${STREAM_LIMITS.TITLE_MIN_LENGTH}-${STREAM_LIMITS.TITLE_MAX_LENGTH} characters`;
  }
  
  return null;
};

/**
 * Validate stream description (optional field)
 * @param description - The description to validate
 * @returns Error message string, or null if valid
 */
export const validateStreamDescription = (description: string): string | null => {
  // Description is optional, so empty is valid
  if (!description || !description.trim()) {
    return null;
  }
  
  if (
    !isWithinTextLimits(
      description,
      STREAM_LIMITS.DESCRIPTION_MAX_CHARACTERS,
      STREAM_LIMITS.DESCRIPTION_MAX_WORDS
    )
  ) {
    return `Description must not exceed ${STREAM_LIMITS.DESCRIPTION_MAX_CHARACTERS} characters or ${STREAM_LIMITS.DESCRIPTION_MAX_WORDS} words`;
  }
  
  return null;
};
