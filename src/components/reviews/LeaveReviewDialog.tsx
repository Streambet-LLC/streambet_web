import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import api from '@/integrations/api/client';
import { ReviewableOrderSide } from '@/types/review';
import StarRating from './StarRating';

const MAX_COMMENT_LENGTH = 2000;

interface LeaveReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
  /** Invalidate this query key after a successful save/delete so caller lists refresh. */
  invalidateQueryKeys?: unknown[][];
  /** Called after a successful create/update/delete. */
  onMutated?: () => void;
}

/**
 * Unified review dialog used for both buyers (reviewing sellers) and sellers
 * (reviewing buyers). It looks up the current user's side for the given
 * order and renders a create / edit / delete UI accordingly.
 */
const LeaveReviewDialog: React.FC<LeaveReviewDialogProps> = ({
  open,
  onOpenChange,
  orderId,
  invalidateQueryKeys = [],
  onMutated,
}) => {
  const queryClient = useQueryClient();

  const { data: side, isLoading } = useQuery({
    enabled: open && !!orderId,
    queryKey: ['review-for-order', orderId],
    queryFn: () => api.review.getReviewForOrder(orderId as string),
  });

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  // Sync local form state whenever the source side record changes / dialog opens.
  useEffect(() => {
    if (!open) return;
    if (side?.existingReview) {
      setRating(side.existingReview.rating);
      setComment(side.existingReview.comment ?? '');
    } else {
      setRating(0);
      setComment('');
    }
  }, [open, side?.existingReview?.id, side?.existingReview?.rating, side?.existingReview?.comment]);

  const reviewableAtLabel = useMemo(() => {
    if (!side?.reviewableAt) return null;
    const d = new Date(side.reviewableAt);
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }, [side?.reviewableAt]);

  const runInvalidations = () => {
    for (const key of invalidateQueryKeys) {
      queryClient.invalidateQueries({ queryKey: key });
    }
    queryClient.invalidateQueries({ queryKey: ['my-reviewable-orders'] });
    queryClient.invalidateQueries({ queryKey: ['review-for-order', orderId] });
    onMutated?.();
  };

  const createMutation = useMutation({
    mutationFn: () =>
      api.review.createReview({
        orderId: orderId as string,
        rating,
        comment: comment.trim(),
      }),
    onSuccess: () => {
      toast({ title: 'Review submitted', description: 'Thanks for your feedback!' });
      runInvalidations();
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({
        title: 'Could not submit review',
        description: err?.response?.data?.message || err?.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      const existing = side?.existingReview;
      if (!existing) throw new Error('No existing review');
      return api.review.updateReview(existing.id, {
        rating,
        comment: comment.trim(),
      });
    },
    onSuccess: () => {
      toast({ title: 'Review updated' });
      runInvalidations();
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({
        title: 'Could not update review',
        description: err?.response?.data?.message || err?.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      const existing = side?.existingReview;
      if (!existing) throw new Error('No existing review');
      return api.review.deleteReview(existing.id);
    },
    onSuccess: () => {
      toast({ title: 'Review deleted' });
      runInvalidations();
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({
        title: 'Could not delete review',
        description: err?.response?.data?.message || err?.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const isSubmitting =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const existing = side?.existingReview;
  const canSubmit = rating >= 1 && rating <= 5;
  const canEdit = !existing || existing.canEdit;
  const canDelete = !!existing && existing.canDelete;

  const onSubmit = () => {
    if (!canSubmit || !side?.isReviewable || !canEdit) return;
    if (existing) updateMutation.mutate();
    else createMutation.mutate();
  };

  const headingTitle = side
    ? side.myRole === 'buyer'
      ? `Review ${side.counterparty.username}`
      : `Review buyer ${side.counterparty.username}`
    : 'Leave a review';

  const headingDescription = side
    ? side.myRole === 'buyer'
      ? 'Share how this purchase went. Your review will be public on the seller\u2019s shop.'
      : 'Share how this sale went. Your review will be public on the buyer\u2019s profile.'
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0D0D0D] border-[#23272F] text-white max-w-md sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">{headingTitle}</DialogTitle>
          {headingDescription && (
            <DialogDescription className="text-muted-foreground">
              {headingDescription}
            </DialogDescription>
          )}
        </DialogHeader>

        {isLoading || !side ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-[#bdff00]" />
          </div>
        ) : !side.isReviewable ? (
          <div className="py-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              Reviews unlock 24 hours after purchase. You&rsquo;ll be able to leave one{' '}
              {reviewableAtLabel ? (
                <span className="text-white">starting {reviewableAtLabel}.</span>
              ) : (
                'soon.'
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground w-20">Item</div>
              <div className="flex-1 truncate text-sm">{side.itemName || '—'}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground w-20">Rating</div>
              <StarRating
                value={rating}
                onChange={canEdit ? setRating : undefined}
                size={28}
                ariaLabel="Your rating"
              />
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-sm text-muted-foreground">Comment</div>
              <Textarea
                value={comment}
                onChange={e => setComment(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
                placeholder={
                  side.myRole === 'buyer'
                    ? 'How was the item, packaging, and communication?'
                    : 'How was payment, communication, and overall experience with this buyer?'
                }
                rows={4}
                disabled={!canEdit}
                className="bg-[#181A20] border-[#23272F] text-white placeholder:text-muted-foreground"
              />
              <div className="text-[11px] text-muted-foreground self-end">
                {comment.length}/{MAX_COMMENT_LENGTH}
              </div>
            </div>

            {existing && !canEdit && (
              <p className="text-xs text-muted-foreground">
                Your review is locked for editing (more than 7 days old), but it will remain visible
                on your profile.
              </p>
            )}

            <div className="flex items-center justify-between pt-2">
              {existing && canDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => deleteMutation.mutate()}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Delete
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={onSubmit}
                  disabled={!canSubmit || !canEdit || isSubmitting}
                  className="bg-[#bdff00] text-black hover:bg-[#a8e600]"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                  {existing ? 'Save changes' : 'Submit review'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LeaveReviewDialog;
