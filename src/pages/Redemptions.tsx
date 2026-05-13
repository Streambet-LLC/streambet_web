import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { usePrizeTiers } from '@/hooks/usePrizeConfig';
import { AlertCircle, Loader2, Info } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { prizeAPI } from '@/integrations/api/client';
import { toast } from '@/hooks/use-toast';
import {
  PrizesByCategory,
  PrizeCategoryType,
  Prize as PrizeDisplay,
} from '@/components/prizes/PrizesByCategory';
import PrizeCheckoutModal from '@/components/prizes/PrizeCheckoutModal';
import { PrizeBrand } from '@/types/prize';
import { resolvePrizeImages } from '@/components/prizes/prizeImageUtils';

export default function Redemptions() {
  const { data: tiers, isLoading } = usePrizeTiers();
  const { session } = useAuthContext();
  const [selectedPrizeForCheckout, setSelectedPrizeForCheckout] = useState<{
    id: string;
    name: string;
    amount: number;
    shippingCostUsd?: number;
    isInPerson?: boolean;
  } | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedBrand = (searchParams.get('brand')?.split(',')[0] as PrizeBrand) ?? null;

  const userCadeCoins = session?.walletBalanceCadeCoin || 0;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const orderId = params.get('orderId');
    const acceptCounter = params.get('acceptCounter');

    if (acceptCounter) {
      if (!session) {
        toast({
          title: 'Sign in required',
          description: 'Please sign in to accept this counter offer.',
          variant: 'destructive',
        });
        params.delete('acceptCounter');
        const next = new URL(window.location.href);
        next.search = params.toString();
        window.history.replaceState({}, '', next.pathname + (next.search ? `?${next.search}` : ''));
        return;
      }

      prizeAPI
        .acceptCounterOffer(acceptCounter)
        .then((response: any) => {
          if (response.stripeSessionUrl) {
            window.location.href = response.stripeSessionUrl;
          } else {
            toast({
              title: 'Error',
              description: 'Failed to create checkout session.',
              variant: 'destructive',
            });
          }
        })
        .catch(() => {
          toast({
            title: 'Error',
            description: 'Failed to accept counter offer. Please try again.',
            variant: 'destructive',
          });
        });
      return;
    }

    if (!status) {
      return;
    }

    if (status === 'success' && orderId) {
      prizeAPI
        .confirmPrizeOrder(orderId)
        .then(() => {
          toast({
            title: 'Payment successful',
            description: 'Your prize order is confirmed and will be processed for shipping.',
          });
        })
        .catch(() => {
          toast({
            title: 'Payment processing',
            description: 'We are confirming your payment. Please check back shortly.',
          });
        });
    } else if (status === 'cancel') {
      toast({
        title: 'Payment canceled',
        description: 'Your payment was canceled. No charges were made.',
        variant: 'destructive',
      });
    }

    params.delete('status');
    params.delete('orderId');
    const next = new URL(window.location.href);
    next.search = params.toString();
    window.history.replaceState({}, '', next.pathname + (next.search ? `?${next.search}` : ''));
  }, [session]);

  const mapCategory = (prize: any): PrizeCategoryType => {
    if (prize.category) return prize.category;
    return 'slab';
  };

  const allPrizes: PrizeDisplay[] = useMemo(() => {
    const filtered = (tiers || [])
      .filter(prize => prize.stock > 0 && prize.showOnRedemptions !== false)
      .map(prize => {
        const { imageUrls, coverImageIndex, coverImageUrl } = resolvePrizeImages(prize);

        return {
          id: prize.id,
          name: prize.name,
          description: prize.description || undefined,
          imageUrl: coverImageUrl,
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
          coverImageIndex,
          category: mapCategory(prize),
          grade: (prize as any).grade || null,
          amount: typeof prize.amount === 'number' && !isNaN(prize.amount) ? prize.amount : 0,
          stock: prize.stock,
          purchaseOption: prize.purchaseOption,
          brand: prize.brand,
          displayOrder: prize.displayOrderRedemptions ?? 999,
          isProOnly: prize.isProOnly ?? false,
          proEarlyAccessUntil: prize.proEarlyAccessUntil ?? null,
          viewCount: prize.viewCount ?? 0,
          watcherCount: prize.watcherCount ?? 0,
          isWatching: prize.isWatching ?? false,
          ebayMarketLastCalculatedAt: prize.ebayMarketLastCalculatedAt ?? null,
          shippingCostUsd: prize.shippingCostUsd,
          isInPerson: prize.isInPerson,
        };
      });

    // Check if purchase option sorting is enabled (use first prize's setting)
    const usePurchaseSort = tiers?.[0]?.sortByPurchaseOptionRedemptions ?? false;

    if (usePurchaseSort) {
      // Sort by purchaseOption first, then displayOrder
      const sorted = filtered.sort((a, b) => {
        const purchaseOrder = { both: 0, buy_only: 1, offers_only: 2 };
        const aPurchase = purchaseOrder[a.purchaseOption] ?? 3;
        const bPurchase = purchaseOrder[b.purchaseOption] ?? 3;
        if (aPurchase !== bPurchase) return aPurchase - bPurchase;
        return (a.displayOrder ?? 999) - (b.displayOrder ?? 999);
      });
      return sorted;
    } else {
      // Sort by displayOrder only
      return filtered.sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
    }
  }, [tiers]);

  const displayPrizes = selectedBrand
    ? allPrizes.filter(prize => prize.brand === selectedBrand)
    : allPrizes;

  return (
    <MainLayout>
      {/* Info Banner */}
      <Card className="mb-6 bg-[#11151d] border-[#2A2F3A]">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Info className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <h3 className="text-lg font-semibold text-white">How Prizes Work</h3>
              <div className="space-y-2 text-sm text-[#FFFFFFBF]">
                <p>
                  You've earned CadeCoins by playing! Now redeem them for sealed wax and trading
                  card products.
                </p>
                <p>
                  You can pay with 100% CadeCoins, 100% USD, or any mix of both. All items ship
                  directly to you.
                </p>
              </div>
              {session && (
                <div className="mt-4 pt-4 border-t border-[#2A2F3A]">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#FFFFFFBF]">Your Balance:</span>
                    <span className="font-bold text-primary">
                      {userCadeCoins.toLocaleString()} CadeCoins
                    </span>
                    <span className="text-green-500 font-semibold">
                      = ${(userCadeCoins / 50).toFixed(2)} USD
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <>
          {displayPrizes.length === 0 && selectedBrand === null ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Coming soon!</p>
            </div>
          ) : (
            <PrizesByCategory
              prizes={displayPrizes}
              cardVariant="redemption"
              selectedBrand={selectedBrand}
              onBrandChange={brand => {
                const p = new URLSearchParams(searchParams);
                brand ? p.set('brand', brand) : p.delete('brand');
                setSearchParams(p);
              }}
              onPrizeClick={prize =>
                setSelectedPrizeForCheckout({
                  id: prize.id,
                  name: prize.name,
                  amount: prize.amount ?? 0,
                  shippingCostUsd: prize.shippingCostUsd,
                  isInPerson: prize.isInPerson,
                })
              }
            />
          )}
        </>
      )}

      {/* Checkout Modal */}
      {selectedPrizeForCheckout && (
        <PrizeCheckoutModal
          isOpen={!!selectedPrizeForCheckout}
          onClose={() => setSelectedPrizeForCheckout(null)}
          prizeId={selectedPrizeForCheckout.id}
          prizeName={selectedPrizeForCheckout.name}
          prizeAmount={selectedPrizeForCheckout.amount}
          userCadeCoins={userCadeCoins}
          shippingCostUsd={selectedPrizeForCheckout.shippingCostUsd}
          isInPerson={selectedPrizeForCheckout.isInPerson}
        />
      )}
    </MainLayout>
  );
}
