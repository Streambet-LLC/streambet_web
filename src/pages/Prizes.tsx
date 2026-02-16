import { MainLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { usePrizeTiers } from "@/hooks/usePrizeConfig"
import { AlertCircle, Loader2, ShoppingCart } from 'lucide-react';
import { getThumbnailUrl } from '@/utils/helper';
import FeaturedBetCard from '@/components/FeaturedBetCard';
import { Button } from '@/components/ui/button';
import PrizeCheckoutModal from '@/components/prizes/PrizeCheckoutModal';
import { useEffect, useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { prizeAPI } from '@/integrations/api/client';
import { toast } from '@/hooks/use-toast';

export default function Prizes() {
  const { data: tiers, isLoading } = usePrizeTiers();
  const { session } = useAuthContext();
  const [selectedPrizeForCheckout, setSelectedPrizeForCheckout] = useState<{
    id: string;
    name: string;
    amount: number;
  } | null>(null);

  const userCadeCoins = session?.walletBalanceCadeCoin || 0;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const orderId = params.get('orderId');

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
  }, []);

  return (
    <MainLayout>
      <h2 className="text-xl font-semibold">Prizes</h2>
      <h2 className="text-sm text-gray-500 mb-4">
        Purchase prizes with CadeCoins or USD, or a combination of both! Exchange rate: 50 coins =
        $1
      </h2>
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : tiers.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Coming soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tiers
            .sort((a, b) => a.prizeTier - b.prizeTier)
            .map(tier => (
              <FeaturedBetCard key={tier.id}>
                <div className="p-6 flex flex-col h-full">
                  {/* Content section */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                      {tier.prizeTier}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{tier.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {tier.amount.toLocaleString('en-US')} coins • $
                        {(tier.amount / 50).toFixed(2)} USD
                      </p>
                    </div>
                  </div>
                  {tier.description && (
                    <p className="text-sm text-muted-foreground mb-4">{tier.description}</p>
                  )}

                  {/* Image section */}
                  {tier.imageUrl && (
                    <div className="w-full aspect-[16/9] border-t pt-2 md:pt-4">
                      <img
                        src={getThumbnailUrl(tier.imageUrl)}
                        alt={tier.name}
                        className="w-full h-full rounded object-cover"
                      />
                    </div>
                  )}

                  {/* Purchase Button */}
                  <Button
                    className="mt-4 w-full gap-2"
                    onClick={() =>
                      setSelectedPrizeForCheckout({
                        id: tier.id,
                        name: tier.name,
                        amount: tier.amount,
                      })
                    }
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Buy Now
                  </Button>
                </div>
              </FeaturedBetCard>
            ))}
        </div>
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
        />
      )}
    </MainLayout>
  );
}
