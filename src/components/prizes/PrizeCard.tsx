import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { getThumbnailUrl } from '@/utils/helper';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ShoppingCart, DollarSign, Expand } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Prize } from './PrizesByCategory';
import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import FeaturedBetCard from '../FeaturedBetCard';

interface PrizeCardProps {
  prize: Prize;
  onClick: (prize: Prize) => void;
  onOfferClick?: (prize: Prize) => void;
  isFeatured?: boolean;
  /** 'shop' = stag-style portrait card (default); 'redemption' = prod-style landscape card */
  variant?: 'shop' | 'redemption';
  hideButtons?: boolean;
}

export default function PrizeCard({
  prize,
  onClick,
  onOfferClick,
  isFeatured = false,
  variant = 'shop',
  hideButtons = false,
}: PrizeCardProps) {
  const [showImageModal, setShowImageModal] = useState(false);

  const priceInUSD = prize.amount
    ? (prize.amount / 50).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '0.00';
  const canBuy = prize.purchaseOption === 'buy_only' || prize.purchaseOption === 'both';
  const canOffer = prize.purchaseOption === 'offers_only' || prize.purchaseOption === 'both';
  const isOutOfStock = !prize.stock || prize.stock === 0;

  const imageUrl = prize.imageUrl ? getThumbnailUrl(prize.imageUrl) : '/placeholder.svg';

  // ── Redemption variant (prod-style landscape card) ───────────────────────
  if (variant === 'redemption') {
    return (
      <FeaturedBetCard>
        <div className="p-6 flex flex-col h-full">
          {prize.imageUrl && (
            <div className="w-full border-t pt-2 md:pt-4">
              <img
                src={imageUrl}
                alt={prize.name}
                className="w-full rounded object-contain max-h-64"
                loading="lazy"
              />
            </div>
          )}
          <h3 className="font-semibold text-lg mb-1 mt-2">{prize.name}</h3>
          {prize.description && (
            <p className="text-sm text-muted-foreground mb-2">{prize.description}</p>
          )}
          {typeof prize.amount === 'number' && canBuy && (
            <p className="text-sm text-muted-foreground mb-2">
              {prize.amount.toLocaleString('en-US')} coins • ${(prize.amount / 50).toFixed(2)} USD
            </p>
          )}
          {typeof prize.stock === 'number' && (
            <p className="text-xs text-muted-foreground mb-4">
              Stock: {prize.stock} {prize.stock === 1 ? 'item' : 'items'}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-2 mt-auto">
            {!hideButtons && canBuy && (
              <Button
                className="flex-1 gap-2"
                type="button"
                tabIndex={0}
                disabled={isOutOfStock}
                onClick={e => {
                  e.stopPropagation();
                  onClick(prize);
                }}
              >
                <ShoppingCart className="w-4 h-4" />
                Buy Now
              </Button>
            )}
            {!hideButtons && canOffer && onOfferClick && (
              <Button
                variant="outline"
                className="flex-1 gap-2 bg-transparent border-[#D4FF00] text-[#D4FF00] hover:bg-[#D4FF00]/10 hover:text-[#D4FF00]"
                type="button"
                tabIndex={0}
                disabled={isOutOfStock}
                onClick={e => {
                  e.stopPropagation();
                  onOfferClick(prize);
                }}
              >
                <DollarSign className="w-4 h-4" />
                Make Offer
              </Button>
            )}
          </div>
        </div>
      </FeaturedBetCard>
    );
  }

  // ── Shop variant (default stag-style portrait card) ──────────────────────
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="group h-full"
    >
      <Card
        className={cn(
          'h-full flex flex-col overflow-hidden transition-all duration-200 rounded-xl cursor-pointer',
          'relative bg-card-grid-bg border border-card-grid-border shadow-[0px_2px_8px_0px_rgba(0,0,0,0.5)]',
          'hover:border-card-grid-border-hover hover:shadow-[0px_4px_16px_0px_rgba(189,255,0,0.1)]',
          isOutOfStock && 'opacity-60'
        )}
      >
        <CardHeader className="p-0 relative">
          {/* Prize Image */}
          <div
            className="relative w-full aspect-[4/5] overflow-hidden bg-muted group/image cursor-pointer flex items-center justify-center p-2"
            onClick={() => setShowImageModal(true)}
          >
            <img
              src={imageUrl}
              alt={prize.name}
              className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
            />

            {/* Expand to Fullscreen Button */}
            <div className="absolute top-2 left-2 z-10 bg-black/60 rounded-md p-1.5 hover:bg-black/80 transition-colors pointer-events-none opacity-0 group-hover/image:opacity-100">
              <Expand className="h-4 w-4 text-white" aria-hidden="true" />
            </div>

            {/* Stock Badge */}
            {isOutOfStock && (
              <Badge variant="destructive" className="absolute top-2 right-2 font-semibold">
                Out of Stock
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-3 flex-1 flex flex-col gap-1.5">
          {/* Prize Name */}
          <h3 className="font-semibold text-sm line-clamp-2 leading-tight">{prize.name}</h3>

          {/* Description */}
          {prize.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">{prize.description}</p>
          )}

          {/* Price */}
          <div className="mt-auto pt-1">
            {canBuy ? (
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-primary">${priceInUSD}</span>
                <span className="text-[10px] text-muted-foreground">
                  ({prize.amount?.toLocaleString()} coins)
                </span>
              </div>
            ) : (
              <div className="text-sm font-semibold text-muted-foreground">Offers Only</div>
            )}
          </div>

          {/* Stock Count */}
          {typeof prize.stock === 'number' && (
            <p className="text-[10px] text-muted-foreground">
              Stock: {prize.stock} {prize.stock === 1 ? 'item' : 'items'}
            </p>
          )}
        </CardContent>

        <CardFooter className="p-3 pt-0 flex gap-2">
          {!hideButtons && canBuy && (
            <Button
              variant="default"
              size="sm"
              className="flex-1 bg-primary text-black hover:bg-primary/90 h-8 text-xs"
              onClick={e => {
                e.stopPropagation();
                onClick(prize);
              }}
              disabled={isOutOfStock}
            >
              <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
              Buy Now
            </Button>
          )}
          {!hideButtons && canOffer && onOfferClick && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5 bg-transparent border-[#D4FF00] text-[#D4FF00] hover:bg-[#D4FF00]/10 hover:text-[#D4FF00] h-8 text-xs"
              onClick={e => {
                e.stopPropagation();
                onOfferClick(prize);
              }}
              disabled={isOutOfStock}
            >
              <DollarSign className="w-3.5 h-3.5" />
              Make Offer
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Fullscreen Image Modal */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogTitle className="sr-only">Prize Image</DialogTitle>
        <DialogContent
          className="max-w-[95vw] max-h-[95vh] p-4 border-0 bg-transparent flex items-center justify-center"
          aria-describedby={undefined}
        >
          <img
            src={imageUrl}
            alt={prize.name}
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
          />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
