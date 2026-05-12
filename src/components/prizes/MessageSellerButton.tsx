import { MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface MessageSellerButtonProps {
  itemId: string;
  itemName: string;
  /** Seller user id — required to start a direct conversation. */
  sellerId: string;
  /** Display name shown in the New Message dialog. */
  sellerName?: string | null;
  /** Seller's @username, used to build the item deep-link in the prefill. */
  shopUsername?: string | null;
  overlay?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Floating action button that opens the inbox's New Message dialog with
 * the seller, subject, and an item-context message pre-filled. Lives next
 * to ShareItemButton + WatchButton on a PrizeCard so buyers can quickly
 * ask about a specific listing without losing the item context.
 */
export default function MessageSellerButton({
  itemId,
  itemName,
  sellerId,
  sellerName,
  shopUsername,
  overlay = false,
  size = 'md',
  className,
}: MessageSellerButtonProps) {
  const navigate = useNavigate();
  const { session } = useAuthContext();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session) {
      toast({
        title: 'Sign in to message sellers',
        description: 'You need an account to start a conversation.',
      });
      navigate('/login');
      return;
    }

    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : '';
    const itemUrl = shopUsername
      ? `${origin}/shop/${encodeURIComponent(shopUsername)}?highlight=${encodeURIComponent(itemId)}`
      : `${origin}/shop?highlight=${encodeURIComponent(itemId)}`;

    const subject = `Question about: ${itemName}`;
    const message = `Hi! I have a question about your listing "${itemName}":\n${itemUrl}\n\n`;

    const params = new URLSearchParams({
      seller: sellerId,
      subject,
      message,
    });
    if (sellerName) params.set('sellerName', sellerName);

    navigate(`/inbox?${params.toString()}`);
  };

  const dim = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8';
  const icon = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Message seller about this item"
      title="Message seller about this item"
      className={cn(
        'inline-flex items-center justify-center rounded-full transition-colors',
        dim,
        overlay
          ? 'bg-black/55 text-white backdrop-blur hover:bg-black/75'
          : 'bg-muted text-foreground hover:bg-muted/80',
        className
      )}
    >
      <MessageSquare className={icon} />
    </button>
  );
}
