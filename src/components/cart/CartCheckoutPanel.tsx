import { useState } from 'react';
import { CreditCard, Loader2, Truck, Info, Tag, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useCartCheckout, useValidateDiscountCode } from '@/hooks/useCart';
import { CartSummary, ShippingAddressForm, ValidateDiscountCodeResponse } from '@/types/cart';
import { useToast } from '@/hooks/use-toast';

const formatCents = (cents: number) => {
  return `$${(cents / 100).toFixed(2)}`;
};

const COINS_TO_USD = 50; // 50 coins = $1

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
  const validateDiscount = useValidateDiscountCode();

  const [discountInput, setDiscountInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<ValidateDiscountCodeResponse | null>(null);

  const handleApplyDiscount = () => {
    const code = discountInput.trim();
    if (!code) return;
    validateDiscount.mutate(code, {
      onSuccess: result => {
        if (result.valid) {
          setAppliedDiscount(result);
          toast({
            title: 'Discount applied!',
            description: result.message,
          });
        } else {
          setAppliedDiscount(null);
          toast({
            title: 'Invalid discount code',
            description: result.message,
            variant: 'destructive',
          });
        }
      },
    });
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountInput('');
  };

  // Find cheapest item price across all seller groups for cheapest_item scope
  const cheapestItemCents = cartSummary.sellerGroups.reduce<number | undefined>(
    (min, group) =>
      group.items.reduce((m, item) => {
        const unitCents = Math.round((Number(item.prizeConfiguration.amount) / COINS_TO_USD) * 100);
        return m === undefined || unitCents < m ? unitCents : m;
      }, min),
    undefined
  );

  // Calculate discount
  let discountCents = 0;
  if (appliedDiscount?.valid) {
    const baseCents =
      appliedDiscount.scope === 'cheapest_item' && cheapestItemCents !== undefined
        ? cheapestItemCents
        : cartSummary.cartTotals.itemSubtotalCents;

    if (appliedDiscount.discountType === 'percent' && appliedDiscount.discountPercent) {
      discountCents = Math.round(baseCents * (appliedDiscount.discountPercent / 100));
    } else if (
      appliedDiscount.discountType === 'fixed_amount' &&
      appliedDiscount.discountAmountCents
    ) {
      discountCents = Math.min(appliedDiscount.discountAmountCents, baseCents);
    }
  }

  const adjustedTotalCents = cartSummary.cartTotals.totalCents - discountCents;

  const handleCheckout = () => {
    if (
      !shippingAddress.firstName ||
      !shippingAddress.lastName ||
      !shippingAddress.addressLine1 ||
      !shippingAddress.city ||
      !shippingAddress.state ||
      !shippingAddress.zipCode
    ) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required shipping fields.',
        variant: 'destructive',
      });
      return;
    }

    checkout.mutate({
      shippingAddress: {
        firstName: shippingAddress.firstName,
        lastName: shippingAddress.lastName,
        addressLine1: shippingAddress.addressLine1,
        addressLine2: shippingAddress.addressLine2 || undefined,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zipCode: shippingAddress.zipCode,
        country: shippingAddress.country,
      },
      ...(appliedDiscount?.valid && appliedDiscount.code
        ? { discountCode: appliedDiscount.code }
        : {}),
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
              Shipping
              {cartTotals.shippingCents > 0 && (
                <span className="block text-xs">
                  ({sellerCount} {sellerCount === 1 ? 'seller' : 'sellers'})
                </span>
              )}
            </span>
            {cartTotals.shippingCents === 0 ? (
              <span className="text-emerald-500 font-medium">Free Shipping</span>
            ) : (
              <span>{formatCents(cartTotals.shippingCents)}</span>
            )}
          </div>
          {cartTotals.buyerFeeCents > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Processing fee (3%)</span>
              <span>{formatCents(cartTotals.buyerFeeCents)}</span>
            </div>
          )}
          {discountCents > 0 && (
            <div className="flex justify-between text-sm text-green-500">
              <span className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                Discount ({appliedDiscount?.code})
              </span>
              <span>−{formatCents(discountCents)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>{formatCents(adjustedTotalCents)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Discount Code */}
      <Card>
        <CardContent className="pt-4 pb-4">
          {appliedDiscount?.valid ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-green-500">
                <Check className="h-4 w-4" />
                <span className="font-medium">{appliedDiscount.code}</span>
                <span className="text-muted-foreground">— {appliedDiscount.message}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleRemoveDiscount}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={discountInput}
                onChange={e => setDiscountInput(e.target.value.toUpperCase())}
                placeholder="Discount code"
                className="h-8 text-sm uppercase"
                onKeyDown={e => e.key === 'Enter' && handleApplyDiscount()}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 shrink-0"
                onClick={handleApplyDiscount}
                disabled={validateDiscount.isPending || !discountInput.trim()}
              >
                {validateDiscount.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  'Apply'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Offer items info */}
      {hasOfferItems && (
        <div className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
          <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Items set to <strong className="text-blue-400">Make Offer</strong> will not be included
            in checkout. Submit offers from each seller&apos;s card, then proceed to checkout for
            remaining buy items.
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label htmlFor="firstName" className="text-xs">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                value={shippingAddress.firstName}
                onChange={e => onUpdateAddressField('firstName', e.target.value)}
                placeholder="John"
                required
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="lastName" className="text-xs">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lastName"
                value={shippingAddress.lastName}
                onChange={e => onUpdateAddressField('lastName', e.target.value)}
                placeholder="Doe"
                required
                className="h-8 text-sm"
              />
            </div>
          </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
