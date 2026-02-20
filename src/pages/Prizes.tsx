import { MainLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { usePrizeTiers } from '@/hooks/usePrizeConfig';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { prizeAPI } from '@/integrations/api/client';
import { toast } from '@/hooks/use-toast';
import {
  PrizesByCategory,
  PrizeCategoryType,
  Prize as PrizeDisplay,
} from '@/components/prizes/PrizesByCategory';
import PrizeCheckoutModal from '@/components/prizes/PrizeCheckoutModal';
import { title } from 'process';
import { deserialize } from 'v8';
import { Button } from '@/components/ui/button';
import { PrizeBrand } from '@/types/prize';

export default function Prizes() {
  const { data: tiers, isLoading } = usePrizeTiers();
  const { session } = useAuthContext();
  const [selectedPrizeForCheckout, setSelectedPrizeForCheckout] = useState<{
    id: string;
    name: string;
    amount: number;
  } | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<PrizeBrand | null>(null);

  const digitalRipsPartners = [
    {
      title: 'E-Pick',
      imageUrl: 'https://image.e-pick.xyz/_next/static/media/e-pick_logo.b6be4fc8.svg',
      link: 'https://e-pick.xyz',
      description: 'Rip open digital boxes with E-Pick and spin a daily wheel to earn coins!',
    },
    {
      title: 'Holos',
      imageUrl: 'https://holos-market.com/images/logo.png',
      link: 'https://holos-market.com/',
      description: 'Randomized TCG packs that you can redeem globally!',
    },
    {
      title: 'Packz',
      imageUrl: 'https://packz.io/assets/logos/packz/transparent.svg',
      link: 'https://packz.io/?aff=THECARDCADE',
      description:
        'Get a Sweat-Free Pack on your first rip which guarantees 100% buyback on pulls up to $100!',
    },
    {
      title: 'Collectibles',
      imageUrl: 'https://collectibles.com/_next/static/media/main_logo_dark.a689c4f4.svg',
      link: 'https://collectibles.com',
      description: 'Sign up and earn rewards for actions you do every day!',
    },
  ];

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

  const allPrizes: PrizeDisplay[] = (tiers || [])
    .filter(prize => prize.stock > 0)
    .map(prize => ({
      id: prize.id,
      name: prize.name,
      description: prize.description || undefined,
      imageUrl: prize.imageUrl || undefined,
      category: mapCategory(prize),
      amount: typeof prize.amount === 'number' && !isNaN(prize.amount) ? prize.amount : 0,
      stock: prize.stock,
      purchaseOption: prize.purchaseOption,
      brand: prize.brand,
    }));
  const displayPrizes = selectedBrand
    ? allPrizes.filter(prize => prize.brand === selectedBrand)
    : allPrizes;

  return (
    <MainLayout>
      <h2 className="text-xl font-semibold">Redemption</h2>
      <h2 className="text-sm text-gray-500 mb-4">
        Redeem items with CadeCoins or USD, or a combination of both!
      </h2>
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-6 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Filter by Brand:</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedBrand === null ? 'default' : 'outline'}
                onClick={() => setSelectedBrand(null)}
                className="rounded-full"
              >
                All Items
              </Button>
              <Button
                variant={selectedBrand === 'pokemon' ? 'default' : 'outline'}
                onClick={() => setSelectedBrand('pokemon')}
                className="rounded-full"
              >
                Pokémon
              </Button>
              <Button
                variant={selectedBrand === 'one_piece' ? 'default' : 'outline'}
                onClick={() => setSelectedBrand('one_piece')}
                className="rounded-full"
              >
                One Piece
              </Button>
              <Button
                variant={selectedBrand === 'sports' ? 'default' : 'outline'}
                onClick={() => setSelectedBrand('sports')}
                className="rounded-full"
              >
                Sports
              </Button>
            </div>
          </div>
          {displayPrizes.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Coming soon!</p>
            </div>
          ) : (
            <PrizesByCategory
              prizes={displayPrizes}
              onPrizeClick={prize =>
                setSelectedPrizeForCheckout({
                  id: prize.id,
                  name: prize.name,
                  amount: prize.amount ?? 0,
                })
              }
            />
          )}

          {/* <section className="mt-10 space-y-4">
            <div>
              <h3 className="text-2xl font-bold">Digital Rips</h3>
              <p className="text-sm text-gray-500">Step 1: Rip packs. Step 2: Cheer.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {digitalRipsPartners.map(partner => (
                <a
                  key={partner.title}
                  href={partner.link}
                  target="_blank"
                  rel="noreferrer"
                  className="block"
                >
                  <Card className="h-full hover:border-[#D4FF00] transition-colors">
                    <CardContent className="p-4 space-y-3">
                      <div className="w-full aspect-[16/10] overflow-hidden rounded-md">
                        <img
                          src={partner.imageUrl}
                          alt={partner.title}
                          className="h-full w-full object-contain"
                          loading="lazy"
                        />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-semibold">{partner.title}</h4>
                        <p className="text-sm text-muted-foreground">{partner.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </a>
              ))}
            </div>
          </section> */}
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
        />
      )}
    </MainLayout>
  );
}
