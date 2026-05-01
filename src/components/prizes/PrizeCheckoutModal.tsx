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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Info, Check, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { prizeAPI } from '@/integrations/api/client';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { handleMutationError } from '@/lib/mutationHelpers';
import { roundDownCoinAmount } from '@/utils/format';
import { useValidateDiscountCode } from '@/hooks/useCart';
import type { PrizePurchaseRequest } from '@/types/prize';
import type { ValidateDiscountCodeResponse } from '@/types/cart';
import { CryptoCheckoutButton } from '@/components/crypto/CryptoCheckoutButton';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { buyerWaiverPda } from '@/integrations/solana/pdas';
import { cryptoAPI } from '@/integrations/api/cryptoAPI';

type PaymentMethod = 'coins' | 'usd' | 'combined' | 'crypto';

interface PrizeCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  prizeId: string;
  prizeName: string;
  prizeAmount: number;
  userCadeCoins: number;
  allowCadeCoins?: boolean;
  isShopItem?: boolean; // If true, prizeAmount is in USD; if false/undefined, prizeAmount is in coins
  sellerCryptoEnabled?: boolean; // If true, show 'Pay with USDC' option
}

const COINS_TO_USD = 50; // 50 coins = $1
const SHIPPING_FEE_USD = 5; // $5 shipping fee
const SHIPPING_FEE_COINS = SHIPPING_FEE_USD * COINS_TO_USD; // 250 coins
const SHIPPING_FEE_CENTS = SHIPPING_FEE_USD * 100;
const BUYER_FEE_PERCENT = 3; // 3% buyer service fee on USD payments
// On-chain buyer fee charged by the marketplace contract (basis points).
// Mirrors `BUYER_FEE_BPS` in cardcade-contracts (default 50 = 0.5%).
// Waivable per-buyer via `grant_buyer_waiver` (admin-only PDA).
const CRYPTO_BUYER_FEE_BPS = 50;

export default function PrizeCheckoutModal({
  isOpen,
  onClose,
  prizeId,
  prizeName,
  prizeAmount,
  userCadeCoins,
  allowCadeCoins = true,
  isShopItem = false,
  sellerCryptoEnabled = false,
}: PrizeCheckoutModalProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { publicKey: walletPublicKey, disconnect: disconnectWallet } = useWallet();
  const { connection } = useConnection();
  const cryptoWalletConnected = !!walletPublicKey;

  // Fetch the marketplace program id once so we can derive the buyer-waiver
  // PDA. Cheap (single GET) and cached across modal opens.
  const { data: cryptoConfig } = useQuery({
    queryKey: ['cryptoConfig'],
    queryFn: cryptoAPI.config,
    staleTime: 60 * 60 * 1000,
  });

  // Check on-chain whether the connected wallet has a BuyerWaiver PDA. If it
  // does, the contract charges 0% buyer fee for this user; otherwise the
  // standard 0.5% applies.
  const { data: cryptoBuyerFeeWaived = false } = useQuery({
    queryKey: ['cryptoBuyerWaiver', walletPublicKey?.toBase58(), cryptoConfig?.programId],
    enabled: !!walletPublicKey && !!cryptoConfig?.programId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!walletPublicKey || !cryptoConfig?.programId) return false;
      const programId = new PublicKey(cryptoConfig.programId);
      const [waiver] = buyerWaiverPda(programId, walletPublicKey);
      const info = await connection.getAccountInfo(waiver);
      return !!info;
    },
  });

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

  // Crypto total in USDC: item + shipping + on-chain buyer fee (0.5% on the
  // item price only, mirroring `pay_invoice` in the marketplace contract).
  // If the buyer holds a `BuyerWaiver` PDA, the fee is 0.
  const cryptoItemUsd = (totalAmount - SHIPPING_FEE_COINS) / COINS_TO_USD;
  const cryptoShippingUsd = SHIPPING_FEE_USD;
  const cryptoBuyerFeeUsd = cryptoBuyerFeeWaived
    ? 0
    : Math.round(cryptoItemUsd * 100 * (CRYPTO_BUYER_FEE_BPS / 10000)) / 100;
  const cryptoTotalUsd = cryptoItemUsd + cryptoShippingUsd + cryptoBuyerFeeUsd;

  const { data: userAddress, isLoading: isLoadingAddress } = useQuery({
    queryKey: ['userAddress'],
    queryFn: async () => {
      const response = await prizeAPI.getMyAddress();
      return response;
    },
    enabled: isOpen,
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    allowCadeCoins ? 'coins' : 'usd'
  );
  const [cryptoOrderId, setCryptoOrderId] = useState<string | null>(null);
  const [coinsAmount, setCoinsAmount] = useState(
    allowCadeCoins && userCadeCoins >= totalAmount ? totalAmount : 0
  );
  const [combinedCoinsAmount, setCombinedCoinsAmount] = useState(
    userCadeCoins >= totalAmount ? totalAmount : 0
  );
  const [usdAmount, setUsdAmount] = useState(0);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    addressLine1: '',
    addressLine2: undefined as string | undefined,
    city: '',
    state: '',
    zipCode: '',
    country: '',
  });

  useEffect(() => {
    if (userAddress) {
      setFormData(prev => ({
        ...prev,
        firstName: userAddress.firstName || '',
        lastName: userAddress.lastName || '',
        addressLine1: userAddress.address || '',
        addressLine2: userAddress.address2 || undefined,
        city: userAddress.city || '',
        state: userAddress.state || '',
        zipCode: userAddress.zipCode || '',
        country: 'United States',
      }));
    }
  }, [userAddress]);

  useEffect(() => {
    if (allowCadeCoins) {
      setCoinsAmount(totalAmount);
      return;
    }

    setCoinsAmount(0);
    setCombinedCoinsAmount(0);
    // Don't clobber a crypto selection — only force USD on initial mount
    // when no method has been picked yet.
    setPaymentMethod(prev => (prev === 'crypto' ? prev : 'usd'));
    setUsdAmount(parseFloat((totalAmount / COINS_TO_USD).toFixed(2)));
  }, [allowCadeCoins, totalAmount]);

  useEffect(() => {
    if (!allowCadeCoins) {
      // Shop item path: USD or crypto are both valid, leave the user's
      // selection alone. Just keep `usdAmount` in sync for display.
      setCombinedCoinsAmount(0);
      setUsdAmount(parseFloat((totalAmount / COINS_TO_USD).toFixed(2)));
      return;
    }

    const method = paymentMethod as string;
    if (method === 'coins') {
      setUsdAmount(0);
    } else if (method === 'usd' || method === 'crypto') {
      setUsdAmount(parseFloat((totalAmount / COINS_TO_USD).toFixed(2)));
    } else if (method === 'combined') {
      const maxCoins = Math.min(userCadeCoins, totalAmount);
      setCombinedCoinsAmount(maxCoins);
      setUsdAmount(parseFloat(((totalAmount - maxCoins) / COINS_TO_USD).toFixed(2)));
    }
  }, [allowCadeCoins, paymentMethod, totalAmount, userCadeCoins]);

  // --- Discount code state ---
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

  // Calculate discount cents (only applies to USD portion of item price, not shipping)
  const itemPriceCents = Math.round(displayItemPriceUsd * 100);
  let discountCents = 0;
  if (appliedDiscount?.valid) {
    const baseCents = appliedDiscount.scope === 'cheapest_item' ? itemPriceCents : itemPriceCents;

    if (appliedDiscount.discountType === 'percent' && appliedDiscount.discountPercent) {
      discountCents = Math.round(baseCents * (appliedDiscount.discountPercent / 100));
    } else if (
      appliedDiscount.discountType === 'fixed_amount' &&
      appliedDiscount.discountAmountCents
    ) {
      discountCents = Math.min(appliedDiscount.discountAmountCents, baseCents);
    }
  }
  const discountUsd = discountCents / 100;

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
      } else if (response.order?.paymentMethod === 'crypto') {
        // Switch the modal into 'awaiting on-chain payment' mode.
        setCryptoOrderId(response.order.id);
        toast({
          title: 'Order created',
          description: 'Complete the payment with your Solana wallet below.',
        });
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

    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.addressLine1 ||
      !formData.city ||
      !formData.state ||
      !formData.zipCode
    ) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
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
        firstName: formData.firstName,
        lastName: formData.lastName,
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
      ...(appliedDiscount?.valid && appliedDiscount.code
        ? { discountCode: appliedDiscount.code }
        : {}),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose} modal={false}>
      {/*
        modal={false} so the Solana wallet-adapter portal (Phantom/MetaMask
        picker) stays clickable. Manual dim overlay below preserves the
        modal look. We intentionally do NOT make it close-on-click so
        clicks bubbling up from the wallet picker don't dismiss checkout.
        Use the X button or Escape to close.
      */}
      {isOpen && <div className="fixed inset-0 z-40 bg-black/80" aria-hidden="true" />}
      <DialogContent
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto z-50"
        onInteractOutside={e => e.preventDefault()}
        onPointerDownOutside={e => e.preventDefault()}
      >
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
              {paymentMethod === 'crypto' && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Service Fee ({(CRYPTO_BUYER_FEE_BPS / 100).toFixed(2)}%):
                  </span>
                  <span className="text-muted-foreground">
                    {cryptoBuyerFeeWaived ? (
                      <span className="text-emerald-500">Waived</span>
                    ) : (
                      `$${cryptoBuyerFeeUsd.toFixed(2)}`
                    )}
                  </span>
                </div>
              )}
              {discountCents > 0 && (
                <div className="flex justify-between text-sm text-green-500">
                  <span>Discount:</span>
                  <span>-${discountUsd.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold border-t pt-2">
                <span>Total:</span>
                <span>
                  $
                  {(paymentMethod === 'usd' || paymentMethod === 'combined'
                    ? totalAmount / COINS_TO_USD + getBuyerFeeUsd(usdAmount) - discountUsd
                    : paymentMethod === 'crypto'
                      ? cryptoTotalUsd - discountUsd
                      : totalAmount / COINS_TO_USD - discountUsd
                  ).toFixed(2)}
                  {paymentMethod === 'crypto' && ' USDC'}
                </span>
              </div>
            </div>
            {allowCadeCoins && (
              <p className="text-sm text-muted-foreground mt-3">
                Your Balance: {roundDownCoinAmount(userCadeCoins).toLocaleString('en-US')} CadeCoins
              </p>
            )}
          </div>

          {/* Discount Code */}
          <div className="bg-muted p-4 rounded-lg">
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
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold">Payment Method</Label>
            {sellerCryptoEnabled ? (
              // When crypto is on the available method count grows to 3-4,
              // which makes the stacked-radio layout dominate the modal.
              // Collapse it into a single dropdown so the rest of the
              // checkout (totals, wallet hint, CTA) stays above the fold.
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              >
                <SelectTrigger className="w-full cursor-pointer">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {allowCadeCoins && (
                    <SelectItem
                      value="coins"
                      disabled={!hasEnoughCoins}
                      className="cursor-pointer"
                    >
                      <span className="font-medium">CadeCoins Only</span>
                      <span className="text-muted-foreground ml-2">
                        · {roundDownCoinAmount(coinsAmount).toLocaleString('en-US')} CC
                        {!hasEnoughCoins && ' (insufficient)'}
                      </span>
                    </SelectItem>
                  )}
                  <SelectItem value="usd" className="cursor-pointer">
                    <span className="font-medium">Credit/Debit Card (USD)</span>
                    <span className="text-muted-foreground ml-2">
                      · ${(usdAmount + getBuyerFeeUsd(usdAmount)).toFixed(2)}
                    </span>
                  </SelectItem>
                  {allowCadeCoins && (
                    <SelectItem value="combined" className="cursor-pointer">
                      <span className="font-medium">CadeCoins + Card</span>
                      <span className="text-muted-foreground ml-2">· split</span>
                    </SelectItem>
                  )}
                  <SelectItem value="crypto" className="cursor-pointer">
                    <span className="font-medium">Pay with USDC (Solana)</span>
                    <span className="text-muted-foreground ml-2">
                      · ${cryptoTotalUsd.toFixed(2)} USDC
                      {cryptoBuyerFeeWaived && ' (fee waived)'}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
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
                    onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
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
                  onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
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
                    onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
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

              {sellerCryptoEnabled && null /* handled by dropdown branch above */}
            </div>
            )}
          </div>

          {paymentMethod === 'crypto' && !cryptoWalletConnected && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p className="text-sm">
                  Connect a Solana wallet (Phantom, Solflare, etc.) to pay with USDC.
                </p>
                <WalletMultiButton />
              </AlertDescription>
            </Alert>
          )}

          {paymentMethod === 'crypto' && cryptoWalletConnected && !cryptoOrderId && (
            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <div>
                  Wallet connected:{' '}
                  <span className="font-mono text-xs">
                    {walletPublicKey?.toBase58().slice(0, 6)}…
                    {walletPublicKey?.toBase58().slice(-6)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Wrong wallet?</span>
                  <button
                    type="button"
                    className="underline hover:text-primary"
                    onClick={async () => {
                      try {
                        await disconnectWallet();
                      } catch {
                        /* ignore */
                      }
                    }}
                  >
                    Disconnect
                  </button>
                  <span className="text-muted-foreground">
                    or switch accounts inside your wallet extension, then click Pay with USDC again.
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {paymentMethod === 'combined' && (
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="coins">CadeCoins to Use</Label>
                <Input
                  id="coins"
                  type="number"
                  min="0"
                  max={Math.min(userCadeCoins, prizeAmount)}
                  value={combinedCoinsAmount || ''}
                  onChange={e => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setCombinedCoinsAmount(0);
                      setUsdAmount(parseFloat((prizeAmount / COINS_TO_USD).toFixed(2)));
                      return;
                    }
                    const newCoinsAmount = Math.max(
                      0,
                      Math.min(Math.floor(Number(raw)), Math.min(userCadeCoins, prizeAmount))
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
                  value={usdAmount || ''}
                  onChange={e => {
                    if (e.target.value === '') {
                      setUsdAmount(0);
                      return;
                    }
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={e => updateField('firstName', e.target.value)}
                      placeholder="John"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={e => updateField('lastName', e.target.value)}
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

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
                        : paymentMethod === 'crypto'
                          ? `Total: $${cryptoTotalUsd.toFixed(2)} USDC${
                              cryptoBuyerFeeWaived ? ' (buyer fee waived)' : ''
                            }`
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
                    !!cryptoOrderId ||
                    !formData.firstName ||
                    !formData.lastName ||
                    !formData.addressLine1 ||
                    !formData.city ||
                    !formData.state ||
                    !formData.zipCode ||
                    !formData.country ||
                    (paymentMethod === 'coins' && !hasEnoughCoins) ||
                    (paymentMethod === 'crypto' && !cryptoWalletConnected)
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
                  ) : paymentMethod === 'crypto' ? (
                    cryptoOrderId ? (
                      'Order created — pay below'
                    ) : !cryptoWalletConnected ? (
                      'Connect a Solana wallet to continue'
                    ) : (
                      `Create Order - $${cryptoTotalUsd.toFixed(2)} USDC`
                    )
                  ) : (
                    `Complete Purchase - $${(combinedCoinsAmount / COINS_TO_USD + usdAmount + getBuyerFeeUsd(usdAmount)).toFixed(2)}`
                  )}
                </Button>

                {paymentMethod === 'crypto' && cryptoOrderId && (
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-base font-semibold">Complete Payment</Label>
                    <p className="text-sm text-muted-foreground">
                      Connect your Solana wallet (Phantom recommended) and approve the USDC payment.
                    </p>
                    <CryptoCheckoutButton
                      orderId={cryptoOrderId}
                      onPaid={() => {
                        queryClient.invalidateQueries({ queryKey: ['userOrders'] });
                        queryClient.invalidateQueries({ queryKey: ['userProfile'] });
                        queryClient.invalidateQueries({ queryKey: ['prizeTiers'] });
                        queryClient.invalidateQueries({ queryKey: ['userAddress'] });
                        const targetOrderId = cryptoOrderId;
                        handleClose();
                        if (targetOrderId) {
                          navigate(`/purchase-success?orderId=${targetOrderId}&source=crypto`);
                        }
                      }}
                      className="w-full"
                    />
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
