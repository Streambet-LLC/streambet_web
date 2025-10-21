import { checkTextLimits } from '@/utils/helper';

interface CharacterCounterProps {
  /** Current text value */
  value: string;
  /** Maximum number of characters allowed */
  maxCharacters: number;
  /** Additional CSS classes */
  className?: string;
}

interface CharacterWordCounterProps {
  /** Current text value */
  value: string;
  /** Maximum number of characters allowed */
  maxCharacters: number;
  /** Maximum number of words allowed */
  maxWords: number;
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
    >
      {currentLength}/{maxCharacters} characters
    </div>
  );
};

/**
 * Character and word counter component that displays current/max for both
 * Turns red when either limit is reached
 * @param {string} value - The current text value
 * @param {number} maxCharacters - Maximum characters allowed
 * @param {number} maxWords - Maximum words allowed
 * @param {string} className - Additional CSS classes
 * @returns {JSX.Element} Character and word counter display
 */
export const CharacterWordCounter = ({
  value,
  maxCharacters,
  maxWords,
  className = '',
}: CharacterWordCounterProps) => {
  const limits = checkTextLimits(value, maxCharacters, maxWords);
  const isLimitReached =
    limits.characterCount >= maxCharacters || limits.wordCount >= maxWords;

  return (
    <div
      className={`text-xs mt-1 text-right ${isLimitReached ? 'text-red-500' : 'text-[#667085]'} ${className}`}
    >
      {limits.characterCount}/{maxCharacters} characters • {limits.wordCount}/{maxWords} words
    </div>
  );
};
