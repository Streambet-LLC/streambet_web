interface CharacterCounterProps {
  /** Current text value */
  value: string;
  /** Maximum number of characters allowed */
  maxCharacters: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Character counter component that displays current/max characters
 * Turns red when the limit is reached
 * @param {string} value - The current text value
 * @param {number} maxCharacters - Maximum characters allowed
 * @param {string} className - Additional CSS classes
 * @returns {JSX.Element} Character counter display
 */
export const CharacterCounter = ({ value, maxCharacters, className = '' }: CharacterCounterProps) => {
  const currentLength = value.length;
  const isLimitReached = currentLength >= maxCharacters;

  return (
    <div
      className={`text-xs mt-1 text-right ${isLimitReached ? 'text-red-500' : 'text-[#667085]'} ${className}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`${currentLength} of ${maxCharacters} characters used${isLimitReached ? ', limit reached' : ''}`}
    >
      {currentLength}/{maxCharacters} characters
    </div>
  );
};
