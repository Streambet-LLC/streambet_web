import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  Store,
  AlertTriangle,
  ArrowLeft,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Tag,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  useCartSummary,
  useUpdateCartItem,
  useRemoveCartItem,
  useClearCart,
  useSubmitBundleOffer,
} from '@/hooks/useCart';
import { useAuthContext } from '@/contexts/AuthContext';
import { SellerGroup, CartItem as CartItemType, RemovedItem, ShippingAddressForm } from '@/types/cart';
import CartCheckoutPanel from '@/components/cart/CartCheckoutPanel';
import { useToast } from '@/hooks/use-toast';
import { MainLayout } from '@/components/layout';
import { getThumbnailUrl } from '@/utils/helper';
import { useQuery } from '@tanstack/react-query';
import { prizeAPI } from '@/integrations/api/client';

const formatCents = (cents: number) => {
  return `$${(cents / 100).toFixed(2)}`;
};

const getItemImageUrl = (item: CartItemType): string => {
  const prize = item.prizeConfiguration;
  if (prize.itemImages && prize.itemImages.length > 0) {
    const cover = prize.itemImages.find(img => img.isCover);
    return getThumbnailUrl(cover?.imageUrl || prize.itemImages[0].imageUrl);
  }
  return getThumbnailUrl(prize.imageUrl);
};

const getAllItemImageUrls = (item: CartItemType): string[] => {
  const prize = item.prizeConfiguration;
  if (prize.itemImages && prize.itemImages.length > 0) {
    return prize.itemImages.map(img => getThumbnailUrl(img.imageUrl));
  }
  if (prize.imageUrl) {
    return [getThumbnailUrl(prize.imageUrl)];
  }
  return [];
};

const CartPage = () => {
  const navigate = useNavigate();
  const { session } = useAuthContext();
  const { toast } = useToast();
  const { data: cartSummary, isLoading, error } = useCartSummary(!!session);
  const updateCartItem = useUpdateCartItem();
  const removeCartItem = useRemoveCartItem();
  const clearCart = useClearCart();
  const submitBundleOffer = useSubmitBundleOffer();

  const [removedNotifications, setRemovedNotifications] = useState<RemovedItem[]>([]);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Offer mode state: track which items the user wants to make offers on
  const [itemModes, setItemModes] = useState<Record<string, 'buy' | 'offer'>>({});
  const [offerPrices, setOfferPrices] = useState<Record<string, string>>({});
  const [offerMessages, setOfferMessages] = useState<Record<string, string>>({});

  // Shipping address state (shared between checkout and offer submission)
  const { data: userAddress } = useQuery({
    queryKey: ['userAddress'],
    queryFn: async () => {
      const response = await prizeAPI.getMyAddress();
      return response;
    },
    enabled: !!session,
  });

  const [shippingAddress, setShippingAddress] = useState<ShippingAddressForm>({
    firstName: '',
    lastName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
  });

  useEffect(() => {
    if (userAddress) {
      setShippingAddress(prev => ({
        ...prev,
        firstName: userAddress.firstName || '',
        lastName: userAddress.lastName || '',
        addressLine1: userAddress.address || '',
        addressLine2: userAddress.address2 || '',
        city: userAddress.city || '',
        state: userAddress.state || '',
        zipCode: userAddress.zipCode || '',
        country: 'United States',
      }));
    }
  }, [userAddress]);

  const updateAddressField = (field: keyof ShippingAddressForm, value: string) => {
    setShippingAddress(prev => ({ ...prev, [field]: value }));
  };

  // Initialize item modes based on purchaseOption
  useEffect(() => {
    if (cartSummary) {
      setItemModes(prev => {
        const next = { ...prev };
        for (const group of cartSummary.sellerGroups) {
          for (const item of group.items) {
            const opt = item.prizeConfiguration.purchaseOption;
            // offers_only items must always be in offer mode
            if (opt === 'offers_only') {
              next[item.id] = 'offer';
            } else if (opt === 'buy_only') {
              // buy_only items must always be in buy mode
              next[item.id] = 'buy';
            } else if (!(item.id in next)) {
              // Default to 'buy' for 'both' and undefined/null
              next[item.id] = 'buy';
            }
          }
        }
        return next;
      });
    }
  }, [cartSummary]);

  const openLightbox = (item: CartItemType) => {
    const urls = getAllItemImageUrls(item);
    if (urls.length === 0) return;
    const coverIdx = item.prizeConfiguration.itemImages?.findIndex(img => img.isCover) ?? 0;
    setLightboxImages(urls);
    setLightboxIndex(coverIdx >= 0 ? coverIdx : 0);
    setLightboxOpen(true);
  };

  const toggleItemMode = (itemId: string) => {
    setItemModes(prev => ({
      ...prev,
      [itemId]: prev[itemId] === 'offer' ? 'buy' : 'offer',
    }));
  };

  const setOfferPrice = (itemId: string, price: string) => {
    setOfferPrices(prev => ({ ...prev, [itemId]: price }));
  };

  const validateAddress = (): boolean => {
    if (
      !shippingAddress.firstName ||
      !shippingAddress.lastName ||
      !shippingAddress.addressLine1 ||
      !shippingAddress.city ||
      !shippingAddress.state ||
      !shippingAddress.zipCode
    ) {
      toast({
        title: 'Missing address',
        description: 'Please fill in all required shipping fields before submitting.',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const handleSubmitOffer = (sellerId: string, itemIds: string[], totalAmount: number) => {
    if (!validateAddress()) return;

    submitBundleOffer.mutate({
      cartItemIds: itemIds,
      offerAmount: totalAmount,
      offerNotes: offerMessages[sellerId] || undefined,
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
    });
  };

  // Check if any items are in offer mode (for checkout panel info)
  const hasOfferItems = useMemo(() => {
    if (!cartSummary) return false;
    return cartSummary.sellerGroups.some(group =>
      group.items.some(item => (itemModes[item.id] || 'buy') === 'offer')
    );
  }, [cartSummary, itemModes]);

  // Show notifications for items that were removed due to stock issues
  useEffect(() => {
    if (cartSummary?.removedItems && cartSummary.removedItems.length > 0) {
      setRemovedNotifications(cartSummary.removedItems);
    }
  }, [cartSummary?.removedItems]);

  if (!session) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <ShoppingCart className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Your Cart</h1>
          <p className="text-muted-foreground mb-6">Please log in to view your cart.</p>
          <Button onClick={() => navigate('/login')}>Log In</Button>
        </div>
      </MainLayout>
    );
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-16">
          <div className="flex items-center gap-3 mb-8">
            <ShoppingCart className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Your Cart</h1>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <AlertTriangle className="mx-auto h-16 w-16 text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Error loading cart</h1>
          <p className="text-muted-foreground">Please try again later.</p>
        </div>
      </MainLayout>
    );
  }

  const isEmpty = !cartSummary || !cartSummary.cartTotals || cartSummary.cartTotals.itemCount === 0;

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Removed items notifications */}
        {removedNotifications.length > 0 && (
          <div className="mb-6 space-y-2">
            {removedNotifications.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                  <span className="text-sm">
                    <strong>{item.name}</strong> was removed: {item.reason}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() =>
                    setRemovedNotifications(prev => prev.filter(n => n.id !== item.id))
                  }
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
              <h1 className="text-lg sm:text-2xl font-bold">
                Your Cart
                {cartSummary && cartSummary.cartTotals.itemCount > 0 && (
                  <span className="hidden sm:inline text-muted-foreground font-normal ml-2 text-2xl">
                    ({cartSummary.cartTotals.itemCount}{' '}
                    {cartSummary.cartTotals.itemCount === 1 ? 'item' : 'items'})
                  </span>
                )}
              </h1>
            </div>

            {!isEmpty && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive shrink-0"
                  >
                    <Trash2 className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Empty Cart</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Empty your cart?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove all items from your cart. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => clearCart.mutate()}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Empty Cart
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {cartSummary && cartSummary.cartTotals.itemCount > 0 && (
            <p className="sm:hidden text-sm text-muted-foreground mt-1 ml-12">
              {cartSummary.cartTotals.itemCount}{' '}
              {cartSummary.cartTotals.itemCount === 1 ? 'item' : 'items'} in cart
            </p>
          )}
        </div>

        {/* Empty state */}
        {isEmpty ? (
          <div className="text-center py-16">
            <ShoppingCart className="mx-auto h-20 w-20 text-muted-foreground/40 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">Browse the shop to find items you love!</p>
            <Button onClick={() => navigate('/')}>
              <Store className="h-4 w-4 mr-2" />
              Continue Shopping
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column: Cart items grouped by seller */}
            <div className="lg:col-span-2 space-y-6">
              {cartSummary!.sellerGroups.map(group => (
                <SellerGroupCard
                  key={group.sellerId || 'cardcade'}
                  group={group}
                  onUpdateQuantity={(itemId, qty) =>
                    updateCartItem.mutate({ cartItemId: itemId, quantity: qty })
                  }
                  onRemoveItem={itemId => removeCartItem.mutate(itemId)}
                  isUpdating={updateCartItem.isPending || removeCartItem.isPending}
                  onImageClick={openLightbox}
                  itemModes={itemModes}
                  offerPrices={offerPrices}
                  onToggleMode={toggleItemMode}
                  onOfferPriceChange={setOfferPrice}
                  offerMessage={offerMessages[group.sellerId || 'cardcade'] || ''}
                  onOfferMessageChange={(msg: string) =>
                    setOfferMessages(prev => ({
                      ...prev,
                      [group.sellerId || 'cardcade']: msg,
                    }))
                  }
                  onSubmitOffer={(itemIds, totalAmount) =>
                    handleSubmitOffer(group.sellerId || 'cardcade', itemIds, totalAmount)
                  }
                  isSubmittingOffer={submitBundleOffer.isPending}
                />
              ))}
            </div>

            {/* Right column: Cart summary / checkout */}
            <div className="lg:col-span-1">
              <CartCheckoutPanel
                cartSummary={cartSummary!}
                shippingAddress={shippingAddress}
                onUpdateAddressField={updateAddressField}
                hasOfferItems={hasOfferItems}
              />
            </div>
          </div>
        )}
      </div>

      {/* Image Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogTitle className="sr-only">Item Image</DialogTitle>
        <DialogContent
          className="max-w-[95vw] max-h-[95vh] p-4 border-0 bg-transparent flex items-center justify-center"
          aria-describedby={undefined}
          hideCloseButton={true}
        >
          <div className="relative">
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute -top-3 -right-3 z-50 rounded-full border border-[#7AFF14] bg-black/80 p-2 transition-colors hover:bg-black focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Close image"
            >
              <X className="h-5 w-5 text-white" />
            </button>

            <div className="flex items-center justify-center gap-3">
              {lightboxImages.length > 1 && (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-10 w-10 shrink-0 border border-[#7AFF14]"
                  onClick={() =>
                    setLightboxIndex(prev => (prev === 0 ? lightboxImages.length - 1 : prev - 1))
                  }
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}

              <img
                src={lightboxImages[lightboxIndex]}
                alt="Item image"
                className="block max-h-[85vh] max-w-[calc(95vw-7rem)] object-contain rounded-lg select-none"
                onError={e => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />

              {lightboxImages.length > 1 && (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-10 w-10 shrink-0 border border-[#7AFF14]"
                  onClick={() =>
                    setLightboxIndex(prev => (prev === lightboxImages.length - 1 ? 0 : prev + 1))
                  }
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              )}
            </div>

            {lightboxImages.length > 1 && (
              <div className="absolute -bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/70 px-3 py-1">
                {lightboxImages.map((_, index) => (
                  <button
                    key={`lightbox-dot-${index}`}
                    type="button"
                    onClick={() => setLightboxIndex(index)}
                    className={`h-2 w-2 rounded-full border border-[#7AFF14] transition-all ${
                      index === lightboxIndex ? 'bg-white' : 'bg-transparent'
                    }`}
                    aria-label={`Go to image ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

// Seller group card component
const SellerGroupCard = ({
  group,
  onUpdateQuantity,
  onRemoveItem,
  isUpdating,
  onImageClick,
  itemModes,
  offerPrices,
  onToggleMode,
  onOfferPriceChange,
  offerMessage,
  onOfferMessageChange,
  onSubmitOffer,
  isSubmittingOffer,
}: {
  group: SellerGroup;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  isUpdating: boolean;
  onImageClick: (item: CartItemType) => void;
  itemModes: Record<string, 'buy' | 'offer'>;
  offerPrices: Record<string, string>;
  onToggleMode: (itemId: string) => void;
  onOfferPriceChange: (itemId: string, price: string) => void;
  offerMessage: string;
  onOfferMessageChange: (msg: string) => void;
  onSubmitOffer: (itemIds: string[], totalAmount: number) => void;
  isSubmittingOffer: boolean;
}) => {
  const isCardCade = group.sellerId === null;

  const offerItems = group.items.filter(item => (itemModes[item.id] || 'buy') === 'offer');
  const buyItems = group.items.filter(item => (itemModes[item.id] || 'buy') === 'buy');

  const totalOfferAmount = offerItems.reduce((sum, item) => {
    const price = parseFloat(offerPrices[item.id] || '0');
    return sum + price * item.quantity;
  }, 0);

  return (
    <Card className="overflow-hidden">
      {/* Seller header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/50 border-b">
        <Store className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold text-sm">{group.shopName}</span>
        <Badge variant="secondary" className="ml-auto text-xs">
          {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
        </Badge>
      </div>

      <CardContent className="p-0 divide-y">
        {group.items.map(item => (
          <CartItemRow
            key={item.id}
            item={item}
            onUpdateQuantity={onUpdateQuantity}
            onRemoveItem={onRemoveItem}
            isUpdating={isUpdating}
            onImageClick={onImageClick}
            mode={itemModes[item.id] || 'buy'}
            canToggle={
              !item.prizeConfiguration.purchaseOption ||
              item.prizeConfiguration.purchaseOption === 'both'
            }
            onToggleMode={() => onToggleMode(item.id)}
            offerPrice={offerPrices[item.id] || ''}
            onOfferPriceChange={price => onOfferPriceChange(item.id, price)}
          />
        ))}
      </CardContent>

      {/* Buy items subtotal */}
      {buyItems.length > 0 && (
        <div className="px-4 py-3 bg-muted/30 border-t space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCents(group.itemSubtotalCents)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span>{formatCents(group.shippingCents)}</span>
          </div>
          {group.buyerFeeCents > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Processing fee (3%)</span>
              <span>{formatCents(group.buyerFeeCents)}</span>
            </div>
          )}
          <Separator className="my-1" />
          <div className="flex justify-between font-semibold text-sm">
            <span>Seller Total</span>
            <span>{formatCents(group.totalCents)}</span>
          </div>
        </div>
      )}

      {/* Offer submission section */}
      {offerItems.length > 0 && (
        <div className="px-4 py-4 border-t space-y-3 bg-blue-500/5">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-semibold">
              Offer for {offerItems.length} {offerItems.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div className="space-y-1 text-sm">
            {offerItems.map(item => {
              const perItem = parseFloat(offerPrices[item.id] || '0');
              return (
                <div key={item.id} className="flex justify-between text-muted-foreground">
                  <span className="truncate mr-2">
                    {item.prizeConfiguration.name}
                    {item.quantity > 1 && ` × ${item.quantity}`}
                  </span>
                  <span>{perItem > 0 ? `$${(perItem * item.quantity).toFixed(2)}` : '—'}</span>
                </div>
              );
            })}
            <Separator className="my-1" />
            <div className="flex justify-between font-semibold">
              <span>Total offer</span>
              <span>{totalOfferAmount > 0 ? `$${totalOfferAmount.toFixed(2)}` : '—'}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              <span>Message to seller (optional)</span>
            </div>
            <Textarea
              placeholder="Add a note about your offer..."
              value={offerMessage}
              onChange={e => onOfferMessageChange(e.target.value)}
              className="text-sm h-16 resize-none"
            />
          </div>

          <Button
            onClick={() =>
              onSubmitOffer(
                offerItems.map(i => i.id),
                totalOfferAmount
              )
            }
            disabled={totalOfferAmount <= 0 || isSubmittingOffer}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmittingOffer ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Tag className="h-4 w-4 mr-2" />
                Submit Offer{totalOfferAmount > 0 ? ` — $${totalOfferAmount.toFixed(2)}` : ''}
              </>
            )}
          </Button>
        </div>
      )}
    </Card>
  );
};

// Individual cart item row
const CartItemRow = ({
  item,
  onUpdateQuantity,
  onRemoveItem,
  isUpdating,
  onImageClick,
  mode,
  canToggle,
  onToggleMode,
  offerPrice,
  onOfferPriceChange,
}: {
  item: CartItemType;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  isUpdating: boolean;
  onImageClick: (item: CartItemType) => void;
  mode: 'buy' | 'offer';
  canToggle: boolean;
  onToggleMode: () => void;
  offerPrice: string;
  onOfferPriceChange: (price: string) => void;
}) => {
  const prize = item.prizeConfiguration;
  const priceUsd = Number(prize.amount) / 50; // 50 CadeCoins = $1
  const isOffer = mode === 'offer';
  const offerPriceNum = parseFloat(offerPrice) || 0;
  const itemTotal = isOffer ? offerPriceNum * item.quantity : priceUsd * item.quantity;
  const imageUrl = getItemImageUrl(item);

  return (
    <div className={`p-3 sm:p-4 transition-colors ${isOffer ? 'bg-blue-500/5' : ''}`}>
      <div className="flex gap-3 sm:gap-4">
        {/* Image */}
        <div
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0 cursor-pointer"
          onClick={() => onImageClick(item)}
        >
          <img
            src={imageUrl}
            alt={prize.name}
            className="w-full h-full object-cover"
            onError={e => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
        </div>

        {/* Details + controls */}
        <div className="flex-1 min-w-0">
          {/* Name + total price */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-sm line-clamp-2 leading-tight">{prize.name}</h3>
            <span className="font-semibold text-sm whitespace-nowrap flex-shrink-0">
              {isOffer && offerPriceNum > 0
                ? `$${itemTotal.toFixed(2)}`
                : isOffer
                  ? '—'
                  : `$${itemTotal.toFixed(2)}`}
            </span>
          </div>

          {prize.brand && (
            <Badge variant="outline" className="mt-1 text-xs capitalize">
              {prize.brand.replace('_', ' ')}
            </Badge>
          )}

          {/* Mode toggle — shown for items that support both buying and offers */}
          {canToggle && (
            <div className="flex items-center gap-0 mt-2">
              <button
                onClick={() => {
                  if (mode !== 'buy') onToggleMode();
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-l-md border transition-colors ${
                  mode === 'buy'
                    ? 'bg-[#7AFF14]/20 text-[#7AFF14] border-[#7AFF14]/40'
                    : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                }`}
              >
                Buy
              </button>
              <button
                onClick={() => {
                  if (mode !== 'offer') onToggleMode();
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-r-md border-r border-t border-b transition-colors ${
                  mode === 'offer'
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                    : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                }`}
              >
                Offer
              </button>
            </div>
          )}

          {/* Offer-only badge (only for items explicitly set to offers_only) */}
          {prize.purchaseOption === 'offers_only' && !canToggle && (
            <Badge
              variant="secondary"
              className="mt-2 text-xs bg-blue-500/10 text-blue-400 border-blue-500/30"
            >
              Offer Only
            </Badge>
          )}

          {/* Buy-only badge */}
          {prize.purchaseOption === 'buy_only' && (
            <Badge
              variant="secondary"
              className="mt-2 text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
            >
              Buy Only
            </Badge>
          )}

          {/* Price display */}
          {isOffer ? (
            <div className="mt-1.5">
              <p className="text-xs text-muted-foreground line-through">
                ${priceUsd.toFixed(2)} listed
              </p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs text-muted-foreground">$</span>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={offerPrice}
                  onChange={e => onOfferPriceChange(e.target.value)}
                  className="h-7 w-20 sm:w-24 text-sm"
                  placeholder="Your offer"
                />
                <span className="text-xs text-muted-foreground">each</span>
              </div>
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              ${priceUsd.toFixed(2)} each
            </p>
          )}

          {/* Quantity controls + Remove */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  if (item.quantity > 1) {
                    onUpdateQuantity(item.id, item.quantity - 1);
                  }
                }}
                disabled={item.quantity <= 1 || isUpdating}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                disabled={item.quantity >= prize.stock || isUpdating}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
              onClick={() => onRemoveItem(item.id)}
              disabled={isUpdating}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
