import { STREAM_LIMITS } from './constants';

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
  const trimmed = description.trim();
  if (!description || !trimmed) {
    return null;
  }
  
  if (trimmed.length > STREAM_LIMITS.DESCRIPTION_MAX_CHARACTERS) {
    return `Description must not exceed ${STREAM_LIMITS.DESCRIPTION_MAX_CHARACTERS} characters`;
  }
  
  return null;
};
