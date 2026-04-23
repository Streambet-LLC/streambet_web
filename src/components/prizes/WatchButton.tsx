import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { prizeAPI } from '@/integrations/api/client';

export interface WatchButtonProps {
  itemId: string;
  /** Initial value from the parent payload. Optimistically updated locally. */
  initialIsWatching?: boolean;
  /** Initial watcher count. The button optionally renders the live count. */
  initialWatcherCount?: number;
  /** Render the count label next to the heart. */
  showCount?: boolean;
  /** Visual size; "sm" suits card overlays, "md" suits modal headers. */
  size?: 'sm' | 'md';
  /**
   * If true, render as a transparent overlay button (used on the prize
   * card thumbnail). Otherwise renders as a plain inline button.
   */
  overlay?: boolean;
  className?: string;
}

/**
 * Heart-style toggle that adds/removes an item from the current user's
 * watchlist. Anonymous users are prompted to log in.
 */
export const WatchButton = ({
  itemId,
  initialIsWatching = false,
  initialWatcherCount = 0,
  showCount = false,
  size = 'sm',
  overlay = false,
  className,
}: WatchButtonProps) => {
  const { session } = useAuthContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isWatching, setIsWatching] = useState<boolean>(initialIsWatching);
  const [watcherCount, setWatcherCount] = useState<number>(initialWatcherCount);

  const mutation = useMutation({
    mutationFn: async (next: boolean) => {
      return next ? prizeAPI.watchItem(itemId) : prizeAPI.unwatchItem(itemId);
    },
    onMutate: (next: boolean) => {
      // Optimistic update.
      setIsWatching(next);
      setWatcherCount(prev => Math.max(0, prev + (next ? 1 : -1)));
    },
    onSuccess: data => {
      // Reconcile against authoritative server count.
      if (typeof data?.watcherCount === 'number') {
        setWatcherCount(data.watcherCount);
      }
      if (typeof data?.watching === 'boolean') {
        setIsWatching(data.watching);
      }
      // Refresh any list that includes this item so other surfaces stay in sync.
      queryClient.invalidateQueries({ queryKey: ['shop-items'] });
      queryClient.invalidateQueries({ queryKey: ['seller-shops'] });
      queryClient.invalidateQueries({ queryKey: ['seller-shop'] });
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
    onError: (_err, next) => {
      // Roll back optimistic update.
      setIsWatching(!next);
      setWatcherCount(prev => Math.max(0, prev + (next ? -1 : 1)));
      toast({
        title: 'Could not update watchlist',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    // Always stop propagation so clicking the heart on a card never
    // also opens the card's detail/checkout modal.
    e.stopPropagation();
    e.preventDefault();

    if (!session) {
      toast({
        title: 'Sign in to watch items',
        description: 'Create a free account or log in to save items.',
      });
      navigate('/login');
      return;
    }
    if (mutation.isPending) return;
    mutation.mutate(!isWatching);
  };

  const sizeClasses = size === 'md' ? 'h-10 w-10' : 'h-8 w-8';
  const iconSize = size === 'md' ? 'h-5 w-5' : 'h-4 w-4';

  const baseClasses = overlay
    ? 'flex items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/75'
    : 'flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm transition hover:bg-accent';

  return (
    <button
      type="button"
      aria-pressed={isWatching}
      aria-label={isWatching ? 'Remove from watchlist' : 'Add to watchlist'}
      onClick={handleClick}
      disabled={mutation.isPending}
      className={cn(
        baseClasses,
        overlay ? sizeClasses : '',
        mutation.isPending && 'opacity-70',
        className
      )}
    >
      <Heart
        className={cn(
          iconSize,
          'transition-colors',
          isWatching ? 'fill-rose-500 text-rose-500' : 'text-current'
        )}
      />
      {showCount && (
        <span className="text-xs font-medium tabular-nums">{watcherCount}</span>
      )}
    </button>
  );
};

export default WatchButton;
