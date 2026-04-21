import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  /** Current rating (1-5). Use 0 for unrated. */
  value: number;
  /** If set, component is interactive and calls onChange when a star is clicked. */
  onChange?: (value: number) => void;
  /** Pixel size of each star. */
  size?: number;
  /** Additional wrapper classes. */
  className?: string;
  /** When true, interaction is disabled even if onChange is provided. */
  disabled?: boolean;
  /** Optional screen-reader label. */
  ariaLabel?: string;
}

/**
 * Compact 1-5 star rating component. Purely display when `onChange` is not
 * supplied; otherwise it becomes a button group with hover preview.
 */
const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  size = 20,
  className,
  disabled,
  ariaLabel,
}) => {
  const interactive = typeof onChange === 'function' && !disabled;
  const [hover, setHover] = React.useState(0);

  const display = hover > 0 ? hover : value;

  return (
    <div
      className={cn('inline-flex items-center gap-1', className)}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={ariaLabel ?? `Rating ${value} out of 5`}
      onMouseLeave={() => interactive && setHover(0)}
    >
      {[1, 2, 3, 4, 5].map(n => {
        const filled = n <= display;
        const Icon = (
          <Star
            width={size}
            height={size}
            className={cn('transition-colors', filled ? 'text-[#bdff00]' : 'text-[#3a3a3a]')}
            fill={filled ? '#bdff00' : 'transparent'}
            strokeWidth={1.5}
          />
        );
        if (!interactive) {
          return (
            <span key={n} aria-hidden="true">
              {Icon}
            </span>
          );
        }
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(0)}
            onClick={() => onChange?.(n)}
            className="p-0.5 rounded hover:scale-110 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-[#bdff00]"
          >
            {Icon}
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;
