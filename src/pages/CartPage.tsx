import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  Store,
  Package,
  AlertTriangle,
  ArrowLeft,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
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
} from '@/hooks/useCart';
import { useAuthContext } from '@/contexts/AuthContext';
import { SellerGroup, CartItem as CartItemType, RemovedItem } from '@/types/cart';
import CartCheckoutPanel from '@/components/cart/CartCheckoutPanel';
import { useToast } from '@/hooks/use-toast';
import { MainLayout } from '@/components/layout';
import { getThumbnailUrl } from '@/utils/helper';

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

  const [removedNotifications, setRemovedNotifications] = useState<RemovedItem[]>([]);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const openLightbox = (item: CartItemType) => {
    const urls = getAllItemImageUrls(item);
    if (urls.length === 0) return;
    const coverIdx = item.prizeConfiguration.itemImages?.findIndex(img => img.isCover) ?? 0;
    setLightboxImages(urls);
    setLightboxIndex(coverIdx >= 0 ? coverIdx : 0);
    setLightboxOpen(true);
  };

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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <ShoppingCart className="h-6 w-6" />
            <h1 className="text-2xl font-bold">
              Your Cart
              {cartSummary && cartSummary.cartTotals.itemCount > 0 && (
                <span className="text-muted-foreground font-normal ml-2">
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
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Empty Cart
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
                />
              ))}
            </div>

            {/* Right column: Cart summary / checkout */}
            <div className="lg:col-span-1">
              <CartCheckoutPanel cartSummary={cartSummary!} />
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
}: {
  group: SellerGroup;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  isUpdating: boolean;
  onImageClick: (item: CartItemType) => void;
}) => {
  const navigate = useNavigate();
  const isCardCade = group.sellerId === null;

  return (
    <Card className="overflow-hidden">
      {/* Seller header */}
      <div
        className="flex items-center gap-3 px-4 py-3 bg-muted/50 border-b cursor-pointer hover:bg-muted/70 transition-colors"
        onClick={() => {
          if (!isCardCade) {
            // Navigate to seller shop — would need username, but we don't have it in the group.
            // For now just skip
          }
        }}
      >
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
          />
        ))}
      </CardContent>

      {/* Seller subtotal */}
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
}: {
  item: CartItemType;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  isUpdating: boolean;
  onImageClick: (item: CartItemType) => void;
}) => {
  const prize = item.prizeConfiguration;
  const priceUsd = Number(prize.amount) / 50; // 50 CadeCoins = $1
  const itemTotal = priceUsd * item.quantity;
  const imageUrl = getItemImageUrl(item);

  return (
    <div className="flex gap-4 p-4">
      {/* Image */}
      <div
        className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0 cursor-pointer"
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

      {/* Details */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm truncate">{prize.name}</h3>
        {prize.brand && (
          <Badge variant="outline" className="mt-1 text-xs capitalize">
            {prize.brand.replace('_', ' ')}
          </Badge>
        )}
        <p className="text-sm text-muted-foreground mt-1">${priceUsd.toFixed(2)} each</p>
      </div>

      {/* Quantity controls & price */}
      <div className="flex flex-col items-end gap-2">
        <span className="font-semibold text-sm">${itemTotal.toFixed(2)}</span>

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
  );
};

export default CartPage;
