import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  CarouselDots,
} from '@/components/ui/carousel';
import _ from 'lodash';
import { getThumbnailUrl } from '@/utils/helper';
import { Link } from 'react-router-dom';
import { getSolscanTxUrl } from '@/integrations/solana/cluster';

interface OrderItemDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: {
    id: string;
    createdAt?: string;
    totalPrice?: number;
    paymentMethod?: string;
    /**
     * Stripe Checkout method actually used (card vs us_bank_account / ACH).
     * Lets the dialog label ACH explicitly instead of bundling everything
     * under "USD".
     */
    stripePaymentMethod?: 'card' | 'us_bank_account' | null;
    /** Solana transaction signature when paymentMethod === 'crypto'. */
    cryptoTxSignature?: string;
    status?: string;
    username?: string;
    /** 'auction' for items sold through the auction flow. */
    saleType?: string;
    /** Total bid count when this item was an auction. Null otherwise. */
    auctionBidCount?: number | null;
    prizeConfig?: {
      name?: string;
      category?: string;
      image?: string;
      images?: string[];
      sellerUsername?: string;
    };
  } | null;
  /** Whether this is a sale (seller view) vs a purchase (buyer view) */
  variant?: 'purchase' | 'sale';
}

const OrderItemDetailDialog = ({
  open,
  onOpenChange,
  transaction,
  variant = 'purchase',
}: OrderItemDetailDialogProps) => {
  if (!transaction) return null;

  const prize = transaction.prizeConfig;
  const itemName = prize?.name || 'Unknown Item';
  const category = prize?.category;

  // Build resolved image list: prefer images array, fall back to single image
  const resolvedImages: string[] = [];
  if (prize?.images && prize.images.length > 0) {
    prize.images.forEach(img => {
      const url = getThumbnailUrl(img);
      if (url && !resolvedImages.includes(url)) resolvedImages.push(url);
    });
  }
  if (resolvedImages.length === 0 && prize?.image) {
    const fallback = getThumbnailUrl(prize.image);
    if (fallback) resolvedImages.push(fallback);
  }

  const hasMultipleImages = resolvedImages.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#0D0D0D] border-[#191D24]">
        <DialogHeader>
          <DialogTitle className="text-white">{itemName}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {variant === 'purchase' ? 'Purchase' : 'Sale'} details
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Item image(s) */}
          {resolvedImages.length > 0 ? (
            hasMultipleImages ? (
              <Carousel opts={{ loop: true }} className="w-full">
                <CarouselContent className="ml-0">
                  {resolvedImages.map((url, idx) => (
                    <CarouselItem key={idx} className="pl-0">
                      <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-[#181A20] border border-[#23272F]">
                        <img
                          src={url}
                          alt={`${itemName} - ${idx + 1}`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-2 bg-black/60 border-0 text-white hover:bg-black/80" />
                <CarouselNext className="right-2 bg-black/60 border-0 text-white hover:bg-black/80" />
                <CarouselDots className="py-2 relative" />
              </Carousel>
            ) : (
              <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-[#181A20] border border-[#23272F]">
                <img
                  src={resolvedImages[0]}
                  alt={itemName}
                  className="w-full h-full object-contain"
                />
              </div>
            )
          ) : (
            <div className="w-full aspect-[4/3] rounded-lg bg-[#181A20] border border-[#23272F] flex items-center justify-center">
              <span className="text-muted-foreground text-sm">No image available</span>
            </div>
          )}

          {/* Details */}
          <div className="flex flex-col gap-2">
            {category && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Category</span>
                <span className="text-sm font-medium text-white capitalize">{category}</span>
              </div>
            )}

            {variant === 'purchase' && prize?.sellerUsername && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Seller</span>
                <Link
                  to={`/shop/${prize.sellerUsername}`}
                  className="text-sm font-medium text-[#7AFF14] hover:underline"
                  onClick={() => onOpenChange(false)}
                >
                  {prize.sellerUsername}
                </Link>
              </div>
            )}

            {variant === 'sale' && transaction.username && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Buyer</span>
                <span className="text-sm font-medium text-white">{transaction.username}</span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Date</span>
              <span className="text-sm font-medium text-white">
                {transaction.createdAt
                  ? new Date(transaction.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Amount</span>
              <span className="text-sm font-semibold" style={{ color: '#7AFF14' }}>
                {(() => {
                  const total = transaction.totalPrice ?? 0;
                  if (transaction.paymentMethod === 'crypto') {
                    return `${total.toFixed(2)} USDC`;
                  }
                  // ACH = Stripe usd/combined order funded by us_bank_account.
                  const isAch =
                    (transaction.paymentMethod === 'usd' ||
                      transaction.paymentMethod === 'combined') &&
                    transaction.stripePaymentMethod === 'us_bank_account';
                  if (isAch) {
                    const prefix =
                      transaction.paymentMethod === 'combined' ? 'ACH + COINS' : 'ACH';
                    return `${prefix} ${total.toFixed(2)}`;
                  }
                  if (
                    transaction.paymentMethod === 'usd' ||
                    transaction.paymentMethod === 'combined'
                  ) {
                    return `${transaction.paymentMethod.toUpperCase()} ${total.toFixed(2)}`;
                  }
                  return `${transaction.paymentMethod?.toUpperCase() ?? ''} ${
                    transaction.totalPrice?.toLocaleString() ?? ''
                  }`;
                })()}
              </span>
            </div>

            {transaction.cryptoTxSignature && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">On-chain tx</span>
                <a
                  href={getSolscanTxUrl(transaction.cryptoTxSignature)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-[#7AFF14] hover:underline"
                  title={transaction.cryptoTxSignature}
                >
                  {transaction.cryptoTxSignature.slice(0, 6)}…
                  {transaction.cryptoTxSignature.slice(-6)}
                </a>
              </div>
            )}

            {/* Auction-only: show how many bids were placed on this item. */}
            {transaction.saleType === 'auction' &&
              typeof transaction.auctionBidCount === 'number' && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Bids</span>
                  <span className="text-sm font-medium text-white">
                    {transaction.auctionBidCount}
                  </span>
                </div>
              )}

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className="px-2 py-1 rounded text-sm font-medium bg-[#23272F] text-white">
                {_.startCase(transaction.status)}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderItemDetailDialog;
