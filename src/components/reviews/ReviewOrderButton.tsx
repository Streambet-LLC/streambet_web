import React from 'react';
import { MessageSquarePlus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StarRating from './StarRating';
import { ReviewableOrderSide } from '@/types/review';

interface ReviewOrderButtonProps {
  /**
   * The side record for this order as returned by api.review.getMyReviewable().
   * If omitted/undefined, we render nothing (the current user cannot review
   * this order).
   */
  side?: ReviewableOrderSide | null;
  /** Fires with the orderId when clicked; parent should open the dialog. */
  onOpen: (orderId: string) => void;
  /** When true, button is laid out compact enough for a table cell. */
  dense?: boolean;
}

/**
 * Inline "Leave a review" / "Edit review" action used on order rows in both
 * the Purchases and Sales tabs. Stops propagation so it doesn't trigger the
 * row's own onClick (which opens OrderItemDetailDialog).
 */
const ReviewOrderButton: React.FC<ReviewOrderButtonProps> = ({ side, onOpen, dense }) => {
  if (!side) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpen(side.orderId);
  };

  if (!side.isReviewable && !side.existingReview) {
    return (
      <span
        className="text-[11px] text-muted-foreground italic"
        title={`Review unlocks ${new Date(side.reviewableAt).toLocaleString()}`}
      >
        Review pending
      </span>
    );
  }

  if (side.existingReview) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={
          'inline-flex items-center gap-1.5 rounded-md border border-[#23272F] px-2 py-1 text-xs ' +
          'hover:border-[#bdff00]/50 hover:bg-[#bdff00]/5 transition-colors'
        }
      >
        <StarRating value={side.existingReview.rating} size={12} />
        {!dense && (
          <span className="text-muted-foreground flex items-center gap-1">
            <Pencil className="w-3 h-3" /> Edit
          </span>
        )}
      </button>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleClick}
      className="h-7 px-2 text-xs border-[#bdff00]/40 text-[#bdff00] hover:bg-[#bdff00]/10 hover:text-[#bdff00]"
    >
      <MessageSquarePlus className="w-3.5 h-3.5 mr-1" />
      Leave review
    </Button>
  );
};

export default ReviewOrderButton;
