import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, Home, Clock, ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { cartAPI, type CartCheckoutSummary } from '@/integrations/api/client';
import { getImageLink } from '@/utils/helper';

export default function CartCheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  const [summary, setSummary] = useState<CartCheckoutSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    // The webhook finalizes orders asynchronously, so retry a few times in case
    // we land here a beat before it runs.
    const fetchWithRetry = async (attempt = 0): Promise<void> => {
      try {
        const data = await cartAPI.getCheckoutSummary(sessionId);
        if (cancelled) return;
        if (data.orderCount === 0 && attempt < 3) {
          setTimeout(() => fetchWithRetry(attempt + 1), 1500);
          return;
        }
        setSummary(data);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setLoading(false);
      }
    };
    fetchWithRetry();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const isAch = summary?.isPaymentProcessing === true;
  const formatPrice = (amount: number) => `$${amount.toFixed(2)}`;

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-4 py-12">
        <Card className="overflow-hidden">
          {/* Header */}
          <div
            className={`px-6 py-8 text-center ${isAch ? 'bg-sky-600' : 'bg-green-600'}`}
          >
            {isAch ? (
              <Clock className="h-14 w-14 text-white mx-auto mb-3" />
            ) : (
              <CheckCircle2 className="h-14 w-14 text-white mx-auto mb-3" />
            )}
            <h1 className="text-2xl font-bold text-white">
              {isAch ? 'Payment Processing' : 'Purchase Successful!'}
            </h1>
            <p className="text-white/90 mt-1">
              {isAch
                ? 'Your bank payment (ACH) is settling — usually 3–5 business days.'
                : `Thank you for your order${
                    summary && summary.orderCount > 1 ? 's' : ''
                  }`}
            </p>
          </div>

          <CardContent className="p-6 space-y-6">
            {summary && summary.items.length > 0 ? (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShoppingBag className="h-4 w-4" />
                  {summary.orderCount} item{summary.orderCount === 1 ? '' : 's'} purchased
                </div>

                <div className="divide-y rounded-lg border">
                  {summary.items.map(item => (
                    <div key={item.orderId} className="flex gap-3 items-center p-3">
                      {item.itemImage ? (
                        <img
                          src={getImageLink(item.itemImage, true)}
                          alt={item.itemName}
                          className="w-14 h-14 object-cover rounded-md border flex-shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-md border bg-muted flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.itemName}</div>
                        {item.sellerName && (
                          <div className="text-xs text-muted-foreground truncate">
                            Sold by {item.sellerName}
                          </div>
                        )}
                      </div>
                      <div className="text-sm font-semibold whitespace-nowrap">
                        {formatPrice(item.usdCharged > 0 ? item.usdCharged : item.totalPrice)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between border-t pt-4">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold">{formatPrice(summary.total)}</span>
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  {isAch
                    ? "We'll notify the seller(s) to ship once your payment clears. You'll get tracking by email."
                    : "Your order is confirmed. You'll receive tracking information by email once it ships."}
                </p>
              </>
            ) : (
              <p className="text-center text-muted-foreground">
                Your payment was received! Check your orders for details.
              </p>
            )}

            <div className="flex flex-col gap-3">
              <Button onClick={() => navigate('/')} variant="default" className="w-full">
                <Home className="mr-2 h-4 w-4" />
                Return Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
