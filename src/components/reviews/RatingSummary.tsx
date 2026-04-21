import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import api from '@/integrations/api/client';
import { ReviewListRole } from '@/types/review';
import StarRating from './StarRating';

interface RatingSummaryProps {
  /** Username whose stats to fetch + link to. */
  username: string;
  /**
   * Which side to display:
   *  - 'as_seller' shows reviews left by buyers about them (use on shop page)
   *  - 'as_buyer'  shows reviews left by sellers about them (use on profile)
   */
  side: Extract<ReviewListRole, 'as_buyer' | 'as_seller'>;
  /** Visual size; controls star and label sizing. */
  size?: 'sm' | 'md' | 'lg';
  /** When true, the entire badge is a Link to the dedicated reviews page. */
  linkToReviews?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { star: 12, text: 'text-xs', count: 'text-[11px]' },
  md: { star: 16, text: 'text-sm', count: 'text-xs' },
  lg: { star: 20, text: 'text-base', count: 'text-sm' },
};

/**
 * Compact average + count badge that fetches /reviews/user/:username/stats
 * and displays the requested side. Click navigates to the public reviews page.
 */
const RatingSummary: React.FC<RatingSummaryProps> = ({
  username,
  side,
  size = 'sm',
  linkToReviews = true,
  className,
}) => {
  const { data, isLoading } = useQuery({
    enabled: !!username,
    queryKey: ['review-stats', username],
    queryFn: () => api.review.getUserStats(username),
    staleTime: 60_000,
  });

  if (isLoading || !data) return null;

  const stats = side === 'as_seller' ? data.asSeller : data.asBuyer;
  const sizes = sizeMap[size];

  const noReviews = stats.count === 0;

  const inner = (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md',
        linkToReviews && 'transition-colors hover:bg-[#bdff00]/5 px-1.5 py-0.5 -mx-1.5 -my-0.5',
        className
      )}
      title={
        noReviews
          ? side === 'as_seller'
            ? 'No seller reviews yet'
            : 'No buyer reviews yet'
          : `${stats.average.toFixed(1)} from ${stats.count} review${stats.count === 1 ? '' : 's'}`
      }
    >
      <StarRating value={Math.round(stats.average)} size={sizes.star} />
      {noReviews ? (
        <span className={cn('text-muted-foreground', sizes.count)}>No reviews yet</span>
      ) : (
        <>
          <span className={cn('font-semibold text-white', sizes.text)}>
            {stats.average.toFixed(1)}
          </span>
          <span className={cn('text-muted-foreground', sizes.count)}>({stats.count})</span>
        </>
      )}
    </span>
  );

  if (!linkToReviews) return inner;

  return (
    <Link
      to={`/users/${encodeURIComponent(username)}/reviews?role=${side}`}
      className="inline-flex"
      onClick={e => e.stopPropagation()}
    >
      {inner}
    </Link>
  );
};

export default RatingSummary;
