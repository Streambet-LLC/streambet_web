import { useQuery } from '@tanstack/react-query';
import api from '@/integrations/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink, ShoppingBag, Store } from 'lucide-react';
import { getThumbnailUrl } from '@/utils/helper';
import _ from 'lodash';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { Link } from 'react-router-dom';

interface ProfileRecentPurchasesProps {
  username: string;
}

interface RecentPurchase {
  id: string;
  createdAt: string;
  status: string;
  prizeConfig: {
    name: string;
    category: string | null;
    image: string | null;
    images: string[];
    sellerUsername: string | null;
    sellerShopName: string | null;
  };
}

export default function ProfileRecentPurchases({ username }: ProfileRecentPurchasesProps) {
  const [selectedPurchase, setSelectedPurchase] = useState<RecentPurchase | null>(null);

  const { data: purchases, isLoading } = useQuery<RecentPurchase[]>({
    queryKey: ['profile-recent-purchases', username],
    queryFn: async () => {
      return await api.prize.getRecentPurchasesByUsername(username, 12);
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="mt-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5" />
          Recent Purchases
        </h2>
        <div className="text-center py-6 text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  if (!purchases || purchases.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <ShoppingBag className="w-5 h-5" />
        Recent Purchases
      </h2>

      <Carousel
        opts={{
          align: 'start',
          loop: false,
          skipSnaps: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-3">
          {purchases.map(purchase => {
            const imageUrl =
              purchase.prizeConfig.images?.[0] || purchase.prizeConfig.image || null;

            return (
              <CarouselItem
                key={purchase.id}
                className="pl-3 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6"
              >
                <Card
                  className="bg-[#181A20] border border-[#23272F] rounded-lg overflow-hidden hover:border-primary/30 transition-colors cursor-pointer group"
                  onClick={() => setSelectedPurchase(purchase)}
                >
                  <div className="aspect-square relative overflow-hidden bg-[#0D0D0D]">
                    {imageUrl ? (
                      <img
                        src={getThumbnailUrl(imageUrl)}
                        alt={purchase.prizeConfig.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <ShoppingBag className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-2.5">
                    <p className="text-xs font-medium text-white truncate">
                      {purchase.prizeConfig.name}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(purchase.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="text-[10px] text-primary font-medium">
                        {_.startCase(purchase.status)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        {purchases.length > 4 && (
          <>
            <CarouselPrevious className="-left-3 bg-[#181A20] border-[#23272F] hover:bg-[#23272F]" />
            <CarouselNext className="-right-3 bg-[#181A20] border-[#23272F] hover:bg-[#23272F]" />
          </>
        )}
      </Carousel>

      {/* Purchase Detail Dialog */}
      <Dialog
        open={!!selectedPurchase}
        onOpenChange={open => {
          if (!open) setSelectedPurchase(null);
        }}
      >
        <DialogContent className="sm:max-w-md bg-[#0D0D0D] border-[#23272F]">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedPurchase?.prizeConfig.name}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Purchased on{' '}
              {selectedPurchase
                ? new Date(selectedPurchase.createdAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })
                : ''}
            </DialogDescription>
          </DialogHeader>

          {selectedPurchase && (
            <div className="flex flex-col gap-4">
              {/* Item Image */}
              <div className="aspect-square w-full max-h-80 rounded-lg overflow-hidden bg-[#181A20] flex items-center justify-center">
                {(() => {
                  const img =
                    selectedPurchase.prizeConfig.images?.[0] ||
                    selectedPurchase.prizeConfig.image ||
                    null;
                  return img ? (
                    <img
                      src={getThumbnailUrl(img)}
                      alt={selectedPurchase.prizeConfig.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <ShoppingBag className="w-16 h-16 text-muted-foreground" />
                  );
                })()}
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="text-sm font-medium text-primary">
                  {_.startCase(selectedPurchase.status)}
                </span>
              </div>

              {/* Seller Info */}
              {selectedPurchase.prizeConfig.sellerUsername && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Sold by</span>
                  <Link
                    to={`/shop/${selectedPurchase.prizeConfig.sellerUsername}`}
                    className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    onClick={() => setSelectedPurchase(null)}
                  >
                    <Store className="w-3.5 h-3.5" />
                    {selectedPurchase.prizeConfig.sellerShopName ||
                      selectedPurchase.prizeConfig.sellerUsername}
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              )}

              {/* Visit Shop Button */}
              {selectedPurchase.prizeConfig.sellerUsername && (
                <Link
                  to={`/shop/${selectedPurchase.prizeConfig.sellerUsername}`}
                  className="w-full"
                  onClick={() => setSelectedPurchase(null)}
                >
                  <button
                    type="button"
                    className="w-full bg-primary text-black text-sm font-bold px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <Store className="w-4 h-4" />
                    Visit Shop
                  </button>
                </Link>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
