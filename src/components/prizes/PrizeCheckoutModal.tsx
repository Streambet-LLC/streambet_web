import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { prizeAPI } from '@/integrations/api/client';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { handleMutationError } from '@/lib/mutationHelpers';
import { roundDownCoinAmount } from '@/utils/format';
import type { PrizePurchaseRequest } from '@/types/prize';

interface PrizeCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  prizeId: string;
  prizeName: string;
  prizeAmount: number;
  userCadeCoins: number;
  allowCadeCoins?: boolean;
  isShopItem?: boolean; // If true, prizeAmount is in USD; if false/undefined, prizeAmount is in coins
}

const COINS_TO_USD = 50; // 50 coins = $1
const SHIPPING_FEE_USD = 5; // $5 shipping fee
const SHIPPING_FEE_COINS = SHIPPING_FEE_USD * COINS_TO_USD; // 250 coins
const SHIPPING_FEE_CENTS = SHIPPING_FEE_USD * 100;
const BUYER_FEE_PERCENT = 3; // 3% buyer service fee on USD payments

export default function PrizeCheckoutModal({
  isOpen,
  onClose,
  prizeId,
  prizeName,
  prizeAmount,
  userCadeCoins,
  allowCadeCoins = true,
  isShopItem = false,
}: PrizeCheckoutModalProps) {
  const queryClient = useQueryClient();

  // Amount is always in CadeCoins (50 coins = $1 USD)
  const prizeAmountInCoins = prizeAmount;
  const totalAmount = prizeAmountInCoins + SHIPPING_FEE_COINS;
  const itemLabel = isShopItem ? 'Item:' : 'Prize:';
  const displayItemPriceUsd = prizeAmount / COINS_TO_USD;

  // Calculate buyer fee (3%) on the item price only (excludes shipping)
  const getBuyerFeeUsd = (usdPortion: number) => {
    const transactionSubtotalCents = Math.round(usdPortion * 100);
    const itemSubtotalCents = Math.max(0, transactionSubtotalCents - SHIPPING_FEE_CENTS);
    const buyerFeeCents = Math.round(itemSubtotalCents * (BUYER_FEE_PERCENT / 100));
    return buyerFeeCents / 100;
  };

  const { data: userAddress, isLoading: isLoadingAddress } = useQuery({
    queryKey: ['userAddress'],
    queryFn: async () => {
      const response = await prizeAPI.getMyAddress();
      return response;
    },
    enabled: isOpen,
  });

  const [paymentMethod, setPaymentMethod] = useState<'coins' | 'usd' | 'combined'>(
    allowCadeCoins ? 'coins' : 'usd'
  );
  const [coinsAmount, setCoinsAmount] = useState(
    allowCadeCoins && userCadeCoins >= totalAmount ? totalAmount : 0
  );
  const [combinedCoinsAmount, setCombinedCoinsAmount] = useState(
    userCadeCoins >= totalAmount ? totalAmount : 0
  );
  const [usdAmount, setUsdAmount] = useState(0);

  const [formData, setFormData] = useState({
    addressLine1: '',
    addressLine2: undefined as string | undefined,
    city: '',
    state: '',
    zipCode: '',
    country: '',
  });

  useEffect(() => {
    if (userAddress) {
      setFormData({
        addressLine1: userAddress.address || '',
        addressLine2: userAddress.address2 || undefined,
        city: userAddress.city || '',
        state: userAddress.state || '',
        zipCode: userAddress.zipCode || '',
        country: 'United States',
      });
    }
  }, [userAddress]);

  useEffect(() => {
    if (allowCadeCoins) {
      setCoinsAmount(totalAmount);
      return;
    }

    setCoinsAmount(0);
    setCombinedCoinsAmount(0);
    setPaymentMethod('usd');
    setUsdAmount(parseFloat((totalAmount / COINS_TO_USD).toFixed(2)));
  }, [allowCadeCoins, totalAmount]);

  useEffect(() => {
    if (!allowCadeCoins) {
      setPaymentMethod('usd');
      setCombinedCoinsAmount(0);
      setUsdAmount(parseFloat((totalAmount / COINS_TO_USD).toFixed(2)));
      return;
    }

    const method = paymentMethod as string;
    if (method === 'coins') {
      setUsdAmount(0);
    } else if (method === 'usd') {
      setUsdAmount(parseFloat((totalAmount / COINS_TO_USD).toFixed(2)));
    } else if (method === 'combined') {
      const maxCoins = Math.min(userCadeCoins, totalAmount);
      setCombinedCoinsAmount(maxCoins);
      setUsdAmount(parseFloat(((totalAmount - maxCoins) / COINS_TO_USD).toFixed(2)));
    }
  }, [allowCadeCoins, paymentMethod, totalAmount, userCadeCoins]);

  const displayCoinsAmount =
    paymentMethod === 'combined'
      ? combinedCoinsAmount
      : paymentMethod === 'coins'
        ? coinsAmount
        : 0;
  const totalPrice = displayCoinsAmount / COINS_TO_USD + usdAmount;
  const hasEnoughCoins = userCadeCoins >= coinsAmount;
  const createOrderMutation = useMutation({
    mutationFn: (data: PrizePurchaseRequest) => prizeAPI.createPrizeOrder(data),
    onSuccess: response => {
      queryClient.invalidateQueries({ queryKey: ['userOrders'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['prizeTiers'] });

      if (response.stripeSessionUrl) {
        window.location.href = response.stripeSessionUrl;
      } else {
        toast({
          title: 'Success!',
          description: `Your ${prizeName} order has been created successfully.`,
        });
        handleClose();
      }
    },
    onError: error => handleMutationError(error, 'Failed to create order. Please try again.'),
  });

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.addressLine1 || !formData.city || !formData.state || !formData.zipCode) {
      toast({
        title: 'Error',
        description: 'Please fill in all required address fields',
        variant: 'destructive',
      });
      return;
    }

    if (paymentMethod === 'coins' && !hasEnoughCoins) {
      toast({
        title: 'Error',
        description: `Insufficient CadeCoins. You need ${coinsAmount}, but have ${userCadeCoins}`,
        variant: 'destructive',
      });
      return;
    }

    if (paymentMethod === 'combined' && (combinedCoinsAmount === 0 || usdAmount === 0)) {
      toast({
        title: 'Error',
        description: 'For combined payment, both coins and USD amounts must be greater than 0',
        variant: 'destructive',
      });
      return;
    }

    const finalCoinsAmount =
      paymentMethod === 'combined'
        ? combinedCoinsAmount
        : paymentMethod === 'coins'
          ? coinsAmount
          : 0;
    const finalTotalPrice = finalCoinsAmount / COINS_TO_USD + usdAmount;

    createOrderMutation.mutate({
      prizeConfigId: prizeId,
      shippingAddress: {
        addressLine1: formData.addressLine1,
        ...(formData.addressLine2 && { addressLine2: formData.addressLine2 }),
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        country: formData.country,
      },
      paymentMethod,
      coinsAmount: finalCoinsAmount,
      usdAmount,
      totalPrice: finalTotalPrice,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{prizeName} - Checkout</DialogTitle>
          <DialogDescription>
            {allowCadeCoins
              ? 'Complete your purchase with flexible payment options'
              : 'This seller accepts card payments only'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-muted p-4 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{itemLabel}</span>
                <span className="text-muted-foreground">${displayItemPriceUsd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping:</span>
                <span className="text-muted-foreground">${SHIPPING_FEE_USD.toFixed(2)}</span>
              </div>
              {(paymentMethod === 'usd' || paymentMethod === 'combined') && usdAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service Fee ({BUYER_FEE_PERCENT}%):</span>
                  <span className="text-muted-foreground">
                    ${getBuyerFeeUsd(usdAmount).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold border-t pt-2">
                <span>Total:</span>
                <span>
                  $
                  {(paymentMethod === 'usd' || paymentMethod === 'combined'
                    ? totalAmount / COINS_TO_USD + getBuyerFeeUsd(usdAmount)
                    : totalAmount / COINS_TO_USD
                  ).toFixed(2)}
                </span>
              </div>
            </div>
            {allowCadeCoins && (
              <p className="text-sm text-muted-foreground mt-3">
                Your Balance: {roundDownCoinAmount(userCadeCoins).toLocaleString('en-US')} CadeCoins
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold">Payment Method</Label>
            <div className="grid grid-cols-1 gap-3">
              {allowCadeCoins && (
                <label
                  className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                  style={{
                    borderColor:
                      paymentMethod === 'coins' ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                  }}
                >
                  <input
                    type="radio"
                    value="coins"
                    checked={paymentMethod === 'coins'}
                    onChange={e => setPaymentMethod(e.target.value as 'coins' | 'usd' | 'combined')}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium">CadeCoins Only</div>
                    <div className="text-sm text-muted-foreground">
                      {roundDownCoinAmount(coinsAmount).toLocaleString('en-US')} CadeCoins
                      {!hasEnoughCoins && (
                        <span className="text-red-500 ml-2">(Insufficient balance)</span>
                      )}
                    </div>
                  </div>
                </label>
              )}

              <label
                className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                style={{
                  borderColor:
                    paymentMethod === 'usd' ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                }}
              >
                <input
                  type="radio"
                  value="usd"
                  checked={paymentMethod === 'usd'}
                  onChange={e => setPaymentMethod(e.target.value as 'coins' | 'usd' | 'combined')}
                  className="mr-3"
                />
                <div className="flex-1">
                  <div className="font-medium">Credit/Debit Card (USD)</div>
                  <div className="text-sm text-muted-foreground">
                    ${(usdAmount + getBuyerFeeUsd(usdAmount)).toFixed(2)} USD
                  </div>
                </div>
              </label>

              {allowCadeCoins && (
                <label
                  className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                  style={{
                    borderColor:
                      paymentMethod === 'combined' ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                  }}
                >
                  <input
                    type="radio"
                    value="combined"
                    checked={paymentMethod === 'combined'}
                    onChange={e => setPaymentMethod(e.target.value as 'coins' | 'usd' | 'combined')}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium">CadeCoins + Card</div>
                    <div className="text-sm text-muted-foreground">
                      Split payment between coins and USD
                    </div>
                  </div>
                </label>
              )}
            </div>
          </div>

          {paymentMethod === 'combined' && (
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="coins">CadeCoins to Use</Label>
                <Input
                  id="coins"
                  type="number"
                  min="0"
                  max={Math.min(userCadeCoins, prizeAmount)}
                  value={combinedCoinsAmount}
                  onChange={e => {
                    const newCoinsAmount = Math.max(
                      0,
                      Math.min(
                        Math.floor(Number(e.target.value)),
                        Math.min(userCadeCoins, prizeAmount)
                      )
                    );
                    setCombinedCoinsAmount(newCoinsAmount);
                    const remaining = prizeAmount - newCoinsAmount;
                    setUsdAmount(parseFloat((remaining / COINS_TO_USD).toFixed(2)));
                  }}
                  placeholder="Amount in coins"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="usd">USD to Pay by Card</Label>
                  <span className="text-sm text-muted-foreground">${usdAmount.toFixed(2)}</span>
                </div>
                <Input
                  id="usd"
                  type="number"
                  min="0"
                  step="0.01"
                  value={usdAmount}
                  onChange={e => {
                    const remaining = totalAmount - combinedCoinsAmount;
                    const maxUSD = remaining / COINS_TO_USD;
                    setUsdAmount(Math.max(0, Math.min(Number(e.target.value), maxUSD)));
                  }}
                  placeholder="Amount in USD"
                />
              </div>

              <div className="pt-2 border-t">
                <div className="flex justify-between items-center font-semibold">
                  <span>Total:</span>
                  <span>
                    $
                    {(
                      combinedCoinsAmount / COINS_TO_USD +
                      usdAmount +
                      getBuyerFeeUsd(usdAmount)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <Label className="text-base font-semibold">Shipping Address</Label>

            {isLoadingAddress ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="ml-2">Loading address...</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address1">Street Address *</Label>
                  <Input
                    id="address1"
                    value={formData.addressLine1}
                    onChange={e => updateField('addressLine1', e.target.value)}
                    placeholder="123 Main St"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address2">Apartment, Suite, etc.</Label>
                  <Input
                    id="address2"
                    value={formData.addressLine2}
                    onChange={e => updateField('addressLine2', e.target.value)}
                    placeholder="Apt 4B"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={e => updateField('city', e.target.value)}
                      placeholder="New York"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State/Province *</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={e => updateField('state', e.target.value)}
                      placeholder="NY"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP/Postal Code *</Label>
                  <Input
                    id="zip"
                    value={formData.zipCode}
                    onChange={e => updateField('zipCode', e.target.value)}
                    placeholder="10001"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    type="text"
                    value="United States"
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">
                    We currently ship to the United States only
                  </p>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {paymentMethod === 'coins'
                      ? `Total: ${roundDownCoinAmount(coinsAmount).toLocaleString()} CadeCoins`
                      : paymentMethod === 'usd'
                        ? `Total: $${(totalPrice + getBuyerFeeUsd(usdAmount)).toFixed(2)} • Pay via card`
                        : paymentMethod === 'combined'
                          ? `Total: ${roundDownCoinAmount(combinedCoinsAmount).toLocaleString()} coins + $${(usdAmount + getBuyerFeeUsd(usdAmount)).toFixed(2)} card`
                          : ''}
                  </AlertDescription>
                </Alert>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    createOrderMutation.isPending ||
                    !formData.addressLine1 ||
                    !formData.city ||
                    !formData.state ||
                    !formData.zipCode ||
                    !formData.country ||
                    (paymentMethod === 'coins' && !hasEnoughCoins)
                  }
                >
                  {createOrderMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : paymentMethod === 'coins' && !hasEnoughCoins ? (
                    `Need ${roundDownCoinAmount(coinsAmount - userCadeCoins)} more CadeCoins!`
                  ) : paymentMethod === 'coins' ? (
                    `Complete Purchase - ${roundDownCoinAmount(coinsAmount).toLocaleString()} CadeCoins`
                  ) : paymentMethod === 'usd' ? (
                    `Complete Purchase - $${(usdAmount + getBuyerFeeUsd(usdAmount)).toFixed(2)}`
                  ) : (
                    `Complete Purchase - $${(combinedCoinsAmount / COINS_TO_USD + usdAmount + getBuyerFeeUsd(usdAmount)).toFixed(2)}`
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
