import { MainLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, Home, Store } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { prizeAPI } from '@/integrations/api/client';
import { getImageLink } from '@/utils/helper';
import { toast } from '@/hooks/use-toast';

interface OrderDetails {
  orderId: string;
  status: string;
  itemName: string;
  itemImage: string | null;
  itemCategory: string | null;
  itemBrand: string | null;
  pricePaid: number;
  usdCharged: number;
  coinsDeducted: number;
  paymentMethod: string;
  seller: {
    username: string;
    name: string;
  } | null;
  createdAt: string;
}

export default function PurchaseSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    // Confirm the order (client-side backup to server-side webhook)
    prizeAPI
      .confirmPrizeOrder(orderId)
      .then(() => setConfirmed(true))
      .catch(() => {
        // Server-side webhook may have already confirmed it — that's fine
        setConfirmed(true);
      });

    // Fetch order details for display
    prizeAPI
      .getOrderSuccessDetails(orderId)
      .then((data: OrderDetails) => {
        setOrder(data);
        setLoading(false);
      })
      .catch(() => {
        toast({
          title: 'Could not load order details',
          description: 'Your payment was received. Check your orders for details.',
        });
        setLoading(false);
      });
  }, [orderId]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!orderId) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-muted-foreground">No order information found.</p>
          <Button onClick={() => navigate('/')}>
            <Home className="mr-2 h-4 w-4" />
            Return Home
          </Button>
        </div>
      </MainLayout>
    );
  }

  // Format price display
  const formatPrice = (amount: number) => `$${amount.toFixed(2)}`;

  const formatPaymentBreakdown = () => {
    if (!order) return '';
    if (order.paymentMethod === 'coins') {
      return `${order.coinsDeducted.toLocaleString()} CadeCoins`;
    }
    if (order.paymentMethod === 'combined' && order.coinsDeducted > 0) {
      return `${formatPrice(order.usdCharged)} + ${order.coinsDeducted.toLocaleString()} CadeCoins`;
    }
    return formatPrice(order.usdCharged);
  };

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-4 py-12">
        <Card className="overflow-hidden">
          {/* Success header */}
          <div className="bg-green-600 px-6 py-8 text-center">
            <CheckCircle2 className="h-14 w-14 text-white mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-white">Purchase Successful!</h1>
            <p className="text-green-100 mt-1">Thank you for your order</p>
          </div>

          <CardContent className="p-6 space-y-6">
            {order ? (
              <>
                {/* Item details */}
                <div className="flex gap-4 items-start">
                  {order.itemImage && (
                    <img
                      src={getImageLink(order.itemImage, true)}
                      alt={order.itemName}
                      className="w-24 h-24 object-cover rounded-lg border"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-lg truncate">{order.itemName}</h2>
                    {order.itemCategory && (
                      <p className="text-sm text-muted-foreground capitalize">
                        {order.itemCategory}
                        {order.itemBrand ? ` · ${order.itemBrand}` : ''}
                      </p>
                    )}
                    {order.seller && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Sold by{' '}
                        <span className="font-medium text-foreground">{order.seller.name}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Price breakdown */}
                <div className="border-t border-b py-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Paid</span>
                    <span className="font-semibold">{formatPrice(order.pricePaid)}</span>
                  </div>
                  {order.paymentMethod !== 'usd' && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Payment</span>
                      <span>{formatPaymentBreakdown()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Order ID</span>
                    <span className="font-mono text-xs">{order.orderId.slice(0, 8)}…</span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  Your order is confirmed and will be processed for shipping. You'll receive
                  tracking information by email once it ships.
                </p>
              </>
            ) : (
              <p className="text-center text-muted-foreground">
                Your payment was received! Check your orders for details.
              </p>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              <Button onClick={() => navigate('/')} variant="default" className="w-full">
                <Home className="mr-2 h-4 w-4" />
                Return Home
              </Button>

              {order?.seller && (
                <Button
                  onClick={() => navigate(`/shop/${order.seller!.username}`)}
                  variant="outline"
                  className="w-full"
                >
                  <Store className="mr-2 h-4 w-4" />
                  More From {order.seller.name}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
