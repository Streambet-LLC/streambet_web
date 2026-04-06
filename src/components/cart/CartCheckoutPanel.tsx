import { CreditCard, Loader2, Truck, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useCartCheckout } from '@/hooks/useCart';
import { CartSummary, ShippingAddressForm } from '@/types/cart';
import { useToast } from '@/hooks/use-toast';

const formatCents = (cents: number) => {
  return `$${(cents / 100).toFixed(2)}`;
};

interface CartCheckoutPanelProps {
  cartSummary: CartSummary;
  shippingAddress: ShippingAddressForm;
  onUpdateAddressField: (field: keyof ShippingAddressForm, value: string) => void;
  hasOfferItems: boolean;
}

export default function CartCheckoutPanel({
  cartSummary,
  shippingAddress,
  onUpdateAddressField,
  hasOfferItems,
}: CartCheckoutPanelProps) {
  const { toast } = useToast();
  const checkout = useCartCheckout();

  const handleCheckout = () => {
    if (
      !shippingAddress.addressLine1 ||
      !shippingAddress.city ||
      !shippingAddress.state ||
      !shippingAddress.zipCode
    ) {
      toast({
        title: 'Missing address',
        description: 'Please fill in all required shipping address fields.',
        variant: 'destructive',
      });
      return;
    }

    checkout.mutate({
      shippingAddress: {
        addressLine1: shippingAddress.addressLine1,
        addressLine2: shippingAddress.addressLine2 || undefined,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zipCode: shippingAddress.zipCode,
        country: shippingAddress.country,
      },
    });
  };

  const { cartTotals, sellerGroups } = cartSummary;
  const sellerCount = sellerGroups.length;

  return (
    <div className="space-y-4 sticky top-20">
      {/* Order Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Items ({cartTotals.itemCount})</span>
            <span>{formatCents(cartTotals.itemSubtotalCents)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Shipping ({sellerCount} {sellerCount === 1 ? 'seller' : 'sellers'} × $5.00)
            </span>
            <span>{formatCents(cartTotals.shippingCents)}</span>
          </div>
          {cartTotals.buyerFeeCents > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Processing fee (3%)</span>
              <span>{formatCents(cartTotals.buyerFeeCents)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>{formatCents(cartTotals.totalCents)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Offer items info */}
      {hasOfferItems && (
        <div className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
          <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Items set to <strong className="text-blue-400">Make Offer</strong> will not
            be included in checkout. Submit offers from each seller&apos;s card, then
            proceed to checkout for remaining buy items.
          </p>
        </div>
      )}

      {/* Shipping Address */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Shipping Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="address1" className="text-xs">
              Address Line 1 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="address1"
              value={shippingAddress.addressLine1}
              onChange={e => onUpdateAddressField('addressLine1', e.target.value)}
              placeholder="123 Main St"
              required
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="address2" className="text-xs">
              Address Line 2
            </Label>
            <Input
              id="address2"
              value={shippingAddress.addressLine2}
              onChange={e => onUpdateAddressField('addressLine2', e.target.value)}
              placeholder="Apt, Suite, etc."
              className="h-8 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="city" className="text-xs">
                City <span className="text-destructive">*</span>
              </Label>
              <Input
                id="city"
                value={shippingAddress.city}
                onChange={e => onUpdateAddressField('city', e.target.value)}
                placeholder="City"
                required
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="state" className="text-xs">
                State <span className="text-destructive">*</span>
              </Label>
              <Input
                id="state"
                value={shippingAddress.state}
                onChange={e => onUpdateAddressField('state', e.target.value)}
                placeholder="State"
                required
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="zip" className="text-xs">
                ZIP Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="zip"
                value={shippingAddress.zipCode}
                onChange={e => onUpdateAddressField('zipCode', e.target.value)}
                placeholder="12345"
                required
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="country" className="text-xs">
                Country
              </Label>
              <Input
                id="country"
                value={shippingAddress.country}
                disabled
                className="h-8 text-sm bg-muted"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checkout Button */}
      <Button
        className="w-full h-12 text-base font-semibold"
        onClick={handleCheckout}
        disabled={checkout.isPending || cartTotals.itemCount === 0}
      >
        {checkout.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4 mr-2" />
            Proceed to Checkout
          </>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        You will be redirected to Stripe for secure payment.
      </p>
    </div>
  );
}
