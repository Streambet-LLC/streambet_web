import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/integrations/api/client';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Trash2,
  ShoppingCart,
  DollarSign,
  Pencil,
  X,
  Camera,
  HeadphonesIcon,
} from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { PrizeBrand, PrizeConfiguration } from '@/types/prize';
import { CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { SellerOnboardingModal } from '@/components/seller/SellerOnboardingModal';
import { SearchInput } from '@/components/ui/SearchInput';
import { ItemImageGallery, type ItemImageInput } from '@/components/items/ItemImageGallery';
import { getThumbnailUrl } from '@/utils/helper';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface SellerOfferOrder {
  id: string;
  status: string;
  offerAmount?: number;
  counterOfferAmount?: number;
  offerNotes?: string;
  totalPrice: number;
  createdAt: string;
  user?: {
    username: string;
    email: string;
  };
  prizeConfig?: {
    name: string;
    category: string;
  };
}

interface SellerPurchasedOrder {
  id: string;
  status: 'paid' | 'shipped' | 'delivered';
  totalPrice: number;
  usdCharged: number;
  coinsDeducted: number;
  trackingNumber?: string;
  shippingCarrier?: string;
  shippedAt?: string;
  createdAt: string;
  user?: {
    username: string;
    email: string;
    address?: string;
    city?: string;
    state?: string;
  };
  prizeConfiguration?: {
    name: string;
    imageUrl?: string;
    category: string;
  };
}

export default function SellerShopManage() {
  const { session } = useAuthContext();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // CardCade mode: admins managing the CardCade virtual shop
  const isCardCadeMode = searchParams.get('shop') === 'cardcade' && session?.role === 'admin';

  const [isUploading, setIsUploading] = useState(false);
  const [itemImages, setItemImages] = useState<ItemImageInput[]>([]);
  const [coverImageIndex, setCoverImageIndex] = useState(0);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<SellerOfferOrder | null>(null);
  const [isCounterDialogOpen, setIsCounterDialogOpen] = useState(false);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterNotes, setCounterNotes] = useState('');
  const [shopName, setShopName] = useState(
    () => session?.shopName || session?.user?.username || ''
  );
  const [shopSocials, setShopSocials] = useState({
    instagram: session?.socials?.instagram || '',
    twitter: session?.socials?.twitter || '',
    youtube: session?.socials?.youtube || '',
    tiktok: session?.socials?.tiktok || '',
  });
  const [sellerTradingExperience, setSellerTradingExperience] = useState(
    () => session?.sellerTradingExperience || ''
  );
  const [city, setCity] = useState(() => session?.city || '');
  const [state, setState] = useState(() => session?.state || '');
  const [country, setCountry] = useState(() => session?.country || '');
  const [isEditingShopName, setIsEditingShopName] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [shopProfileImageUrl, setShopProfileImageUrl] = useState<string | null>(null);
  const [shopProfileImageFile, setShopProfileImageFile] = useState<File | null>(null);
  const shopProfileImageInputRef = React.useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    imageUrl: '',
    amount: 0,
    stock: 1,
    purchaseOption: 'buy_only' as 'buy_only' | 'offers_only' | 'both',
    brand: 'other' as PrizeBrand,
    sellerDisplayOrderShop: 1,
    isProOnly: false,
  });

  const [selectedPurchasedOrder, setSelectedPurchasedOrder] = useState<SellerPurchasedOrder | null>(
    null
  );
  const [isShipDialogOpen, setIsShipDialogOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingCarrier, setShippingCarrier] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['seller-shop-items-manage'],
    queryFn: () => api.prize.getMyShopItems(),
    enabled: !!session?.isSeller && !isCardCadeMode,
  });

  const { data: shopData } = useQuery({
    queryKey: ['seller-shop-manage', isCardCadeMode ? 'cardcade' : session?.user?.username],
    queryFn: async () => {
      if (isCardCadeMode) {
        return await api.prize.getShopItemsByUsername('cardcade');
      }
      if (!session?.user?.username) return null;
      return await api.prize.getShopItemsByUsername(session.user.username);
    },
    enabled: isCardCadeMode || !!session?.user?.username,
    staleTime: 5 * 60 * 1000,
  });

  // Load CardCade shop settings from admin API
  const { data: cardcadeSettings } = useQuery({
    queryKey: ['cardcade-shop-settings'],
    queryFn: () => api.prize.getShopSettings('cardcade'),
    enabled: isCardCadeMode,
    staleTime: 5 * 60 * 1000,
  });

  const { data: purchasedOrders = [], isLoading: isPurchasedOrdersLoading } = useQuery<
    SellerPurchasedOrder[]
  >({
    queryKey: ['seller-shop-orders-manage'],
    queryFn: () => api.prize.getMyShopOrders(),
    enabled: !!session?.isSeller && !isCardCadeMode,
  });

  const { data: offersResponse, isLoading: isOffersLoading } = useQuery<{
    data: SellerOfferOrder[];
    total: number;
  }>({
    queryKey: ['seller-shop-offers-manage'],
    queryFn: () => api.prize.getMyShopOffers({ status: 'all' }),
    enabled: !!session?.isSeller && !isCardCadeMode,
  });

  const offers = offersResponse?.data || [];

  // Sync shop settings when session updates or editing mode changes
  useEffect(() => {
    if (isCardCadeMode) {
      // Don't overwrite state while the user is actively editing
      if (isEditingShopName) return;
      // In CardCade mode, load from the shop settings API (or show defaults while loading)
      setShopName(cardcadeSettings?.displayName || "CardCade's Shop");
      setShopSocials({
        instagram: cardcadeSettings?.socials?.instagram || '',
        twitter: cardcadeSettings?.socials?.twitter || '',
        youtube: cardcadeSettings?.socials?.youtube || '',
        tiktok: cardcadeSettings?.socials?.tiktok || '',
      });
      setSellerTradingExperience(cardcadeSettings?.sellerTradingExperience || '');
      setCity(cardcadeSettings?.city || '');
      setState(cardcadeSettings?.state || '');
      setCountry(cardcadeSettings?.country || '');
      setShopProfileImageUrl(cardcadeSettings?.profileImageUrl || null);
      setShopProfileImageFile(null);
      return; // Never fall through to session data in CardCade mode
    }
    if (session?.user) {
      // Don't overwrite state while the user is actively editing
      if (isEditingShopName) return;
      // Try to get shop name from multiple sources
      let displayNameValue = '';

      // First check session.shopName
      if (session?.shopName) {
        displayNameValue = session.shopName;
      }
      // Then try shopData
      else if (shopData?.shop?.displayName) {
        displayNameValue = shopData.shop.displayName;
      }
      // Fall back to username
      else {
        displayNameValue = session?.user?.shopName || session?.user?.username || '';
      }

      setShopName(displayNameValue);

      setShopSocials({
        instagram: session?.socials?.instagram || '',
        twitter: session?.socials?.twitter || '',
        youtube: session?.socials?.youtube || '',
        tiktok: session?.socials?.tiktok || '',
      });
      setSellerTradingExperience(session?.sellerTradingExperience || '');
      setCity(session?.city || '');
      setState(session?.state || '');
      setCountry(session?.country || '');
    }
  }, [session, shopData, items, isEditingShopName, isCardCadeMode, cardcadeSettings]);

  // Show onboarding modal if seller hasn't completed onboarding
  useEffect(() => {
    if (session?.isSeller && !session?.sellerOnboardingCompleted) {
      setShowOnboardingModal(true);
    }
  }, [session?.isSeller, session?.sellerOnboardingCompleted]);

  const resolveImagePayload = async (): Promise<{
    imageUrls: string[];
    coverImageIndex: number;
    coverImageUrl?: string;
  }> => {
    if (!itemImages.length) {
      throw new Error('Please upload at least one item image.');
    }

    try {
      setIsUploading(true);

      const imageUrls = await Promise.all(
        itemImages.map(async image => {
          if (image.isNew && image.file) {
            const response = await api.auth.uploadImage(image.file, 'thumbnail');
            const uploadedUrl = response?.data?.Key;

            if (!uploadedUrl || typeof uploadedUrl !== 'string') {
              throw new Error('Invalid upload response: missing image URL');
            }

            return uploadedUrl;
          }

          return image.imageUrl;
        })
      );

      const normalizedCoverIndex = Math.min(
        Math.max(coverImageIndex, 0),
        Math.max(imageUrls.length - 1, 0)
      );

      return {
        imageUrls,
        coverImageIndex: normalizedCoverIndex,
        coverImageUrl: imageUrls[normalizedCoverIndex],
      };
    } finally {
      setIsUploading(false);
    }
  };

  const createItem = useMutation({
    mutationFn: async () => {
      const imagePayload = await resolveImagePayload();

      // Convert USD to CadeCoins (50 coins = $1) before sending to API
      const amountInCoins =
        form.purchaseOption === 'offers_only'
          ? Math.max(1, form.amount)
          : Math.round(form.amount * 50);

      const payload = {
        ...form,
        imageUrl: imagePayload.coverImageUrl,
        imageUrls: imagePayload.imageUrls,
        coverImageIndex: imagePayload.coverImageIndex,
        amount: amountInCoins,
        category: 'slab' as const, // All shop items are slabs
        isProOnly: form.isProOnly,
      };

      if (editingItemId) {
        // Update existing item
        return api.prize.updateMyShopItem(editingItemId, payload);
      } else {
        // Create new item
        return api.prize.createMyShopItem(payload);
      }
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: editingItemId ? 'Item updated successfully.' : 'Item added to your shop.',
      });
      setForm({
        name: '',
        description: '',
        imageUrl: '',
        amount: 0,
        stock: 1,
        purchaseOption: 'buy_only',
        brand: 'other',
        sellerDisplayOrderShop: 1,
        isProOnly: false,
      });
      setItemImages([]);
      setCoverImageIndex(0);
      setEditingItemId(null);
      queryClient.invalidateQueries({ queryKey: ['seller-shop-items-manage'] });
      queryClient.invalidateQueries({ queryKey: ['seller-shop-items', session?.user?.username] });
      queryClient.invalidateQueries({ queryKey: ['seller-shops'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description:
          error?.message ||
          (editingItemId ? 'Failed to update item.' : 'Failed to add item to shop.'),
        variant: 'destructive',
      });
    },
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => api.prize.deleteMyShopItem(id),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Item removed from your shop.' });
      queryClient.invalidateQueries({ queryKey: ['seller-shop-items-manage'] });
      queryClient.invalidateQueries({ queryKey: ['seller-shop-items', session?.user?.username] });
      queryClient.invalidateQueries({ queryKey: ['seller-shops'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to remove item.',
        variant: 'destructive',
      });
    },
  });

  const counterOfferMutation = useMutation({
    mutationFn: (data: { orderId: string; counterOfferAmount: number; offerNotes?: string }) =>
      api.prize.counterMyShopOffer(data.orderId, data),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Counter offer sent successfully.' });
      queryClient.invalidateQueries({ queryKey: ['seller-shop-offers-manage'] });
      setIsCounterDialogOpen(false);
      setSelectedOffer(null);
      setCounterAmount('');
      setCounterNotes('');
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to send counter offer.',
        variant: 'destructive',
      });
    },
  });

  const acceptOfferMutation = useMutation({
    mutationFn: (orderId: string) => api.prize.acceptMyShopOffer(orderId),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Offer accepted. Checkout link sent to buyer.',
      });
      queryClient.invalidateQueries({ queryKey: ['seller-shop-offers-manage'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to accept offer.',
        variant: 'destructive',
      });
    },
  });

  const rejectOfferMutation = useMutation({
    mutationFn: (orderId: string) => api.prize.rejectMyShopOffer(orderId),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Offer rejected.' });
      queryClient.invalidateQueries({ queryKey: ['seller-shop-offers-manage'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to reject offer.',
        variant: 'destructive',
      });
    },
  });

  const updateShopSettingsMutation = useMutation({
    mutationFn: async (payload: {
      shopName: string;
      socials: {
        instagram: string;
        twitter: string;
        youtube: string;
        tiktok: string;
        twitch?: string;
        kick?: string;
      };
      sellerTradingExperience?: string;
      city?: string;
      state?: string;
      country?: string;
      profileImageUrl?: string | null;
    }) => {
      if (isCardCadeMode) {
        // Upload profile image first if a new file was selected
        let profileImageUrl = payload.profileImageUrl;
        if (shopProfileImageFile) {
          const response = await api.auth.uploadImage(shopProfileImageFile, 'avatar');
          profileImageUrl = response?.data?.Key;
        }
        return api.prize.updateShopSettings('cardcade', { ...payload, profileImageUrl });
      }
      return api.user.updateProfile(payload);
    },
    onSuccess: data => {
      toast({ title: 'Success', description: 'Shop settings updated successfully.' });
      setIsEditingShopName(false);
      setShopProfileImageFile(null);
      if (isCardCadeMode) {
        queryClient.invalidateQueries({ queryKey: ['cardcade-shop-settings'] });
        queryClient.invalidateQueries({ queryKey: ['seller-shop-manage', 'cardcade'] });
        queryClient.invalidateQueries({ queryKey: ['seller-shops'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['session'] });
        queryClient.invalidateQueries({ queryKey: ['seller-shops'] });
        queryClient.invalidateQueries({ queryKey: ['seller-shop-items', session?.user?.username] });
      }
    },
    onError: error => {
      toast({
        title: 'Error',
        description: 'Failed to update shop settings.',
        variant: 'destructive',
      });
    },
  });

  const markAsShippedMutation = useMutation({
    mutationFn: (data: { orderId: string; trackingNumber?: string; shippingCarrier?: string }) =>
      api.prize.markMyOrderAsShipped(data.orderId, {
        trackingNumber: data.trackingNumber,
        shippingCarrier: data.shippingCarrier,
      }),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Order marked as shipped. Buyer has been notified.',
      });
      queryClient.invalidateQueries({ queryKey: ['seller-shop-orders-manage'] });
      setIsShipDialogOpen(false);
      setSelectedPurchasedOrder(null);
      setTrackingNumber('');
      setShippingCarrier('');
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to mark order as shipped.',
        variant: 'destructive',
      });
    },
  });

  const handleOpenShipDialog = (order: SellerPurchasedOrder) => {
    setSelectedPurchasedOrder(order);
    setTrackingNumber(order.trackingNumber || '');
    setShippingCarrier(order.shippingCarrier || '');
    setIsShipDialogOpen(true);
  };

  const handleSubmitShip = () => {
    if (!selectedPurchasedOrder) return;
    markAsShippedMutation.mutate({
      orderId: selectedPurchasedOrder.id,
      trackingNumber: trackingNumber || undefined,
      shippingCarrier: shippingCarrier || undefined,
    });
  };

  const handleEditItem = (item: PrizeConfiguration) => {
    const existingImageUrls =
      item.imageUrls && item.imageUrls.length > 0
        ? item.imageUrls
        : item.imageUrl
          ? [item.imageUrl]
          : [];

    const existingCoverIndex =
      item.itemImages?.findIndex(image => image.isCover) ?? (existingImageUrls.length > 0 ? 0 : -1);

    const mappedImages: ItemImageInput[] = existingImageUrls.map((imageUrl, index) => ({
      id: `existing-${item.id}-${index}`,
      imageUrl,
      isNew: false,
    }));

    setEditingItemId(item.id);
    setForm({
      name: item.name || '',
      description: item.description || '',
      imageUrl: item.imageUrl || '',
      // Convert CadeCoins back to USD for display (50 coins = $1)
      amount: item.amount ? Math.round(item.amount / 50) : 0,
      stock: item.stock || 0,
      purchaseOption: item.purchaseOption || 'buy_only',
      brand: item.brand || 'other',
      sellerDisplayOrderShop: item.sellerDisplayOrderShop ?? item.displayOrderShop ?? 1,
      isProOnly: item.isProOnly ?? false,
    });
    setItemImages(mappedImages);
    setCoverImageIndex(existingCoverIndex >= 0 ? existingCoverIndex : 0);
    // Scroll to top on mobile, form is already visible on desktop
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setForm({
      name: '',
      description: '',
      imageUrl: '',
      amount: 0,
      stock: 1,
      purchaseOption: 'buy_only',
      brand: 'other',
      sellerDisplayOrderShop: 1,
      isProOnly: false,
    });
    setItemImages([]);
    setCoverImageIndex(0);
  };

  const handleOpenCounterDialog = (order: SellerOfferOrder) => {
    setSelectedOffer(order);
    setCounterAmount(order.offerAmount?.toString() || '');
    setCounterNotes('');
    setIsCounterDialogOpen(true);
  };

  const handleSubmitCounter = () => {
    if (!selectedOffer) return;

    const amount = parseFloat(counterAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid counter offer amount',
        variant: 'destructive',
      });
      return;
    }

    if (amount === selectedOffer.offerAmount) {
      toast({
        title: 'Validation Error',
        description: "Counter offer amount must be different from the buyer's offer",
        variant: 'destructive',
      });
      return;
    }

    counterOfferMutation.mutate({
      orderId: selectedOffer.id,
      counterOfferAmount: amount,
      offerNotes: counterNotes || undefined,
    });
  };

  const getOfferStatusClass = (status: string) => {
    switch (status) {
      case 'offer_made':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'countered':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'offer_accepted':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'paid':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const handleGenerateAccountLink = async () => {
    if (session.stripeAccountConnected) {
      window.open('https://dashboard.stripe.com', '_blank');
    } else {
      const data = await api.creator.generateAccountLink();
      window.location.replace(data.data);
    }
  };

  // Filter shop items based on search query
  const filteredItems = items.filter(item => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const matchesName = item.name?.toLowerCase().includes(query);
    const matchesDescription = item.description?.toLowerCase().includes(query);
    const matchesBrand = item.brand?.toLowerCase().includes(query);
    const matchesAmount = item.amount?.toString().includes(query);

    return matchesName || matchesDescription || matchesBrand || matchesAmount;
  });

  const coverPreviewImage = itemImages[coverImageIndex];
  const livePreviewImageSrc = coverPreviewImage
    ? coverPreviewImage.imageUrl.startsWith('blob:')
      ? coverPreviewImage.imageUrl
      : getThumbnailUrl(coverPreviewImage.imageUrl)
    : form.imageUrl
      ? getThumbnailUrl(form.imageUrl)
      : '';

  if (!session?.isSeller && !isCardCadeMode) {
    return (
      <MainLayout>
        <Card>
          <CardHeader>
            <CardTitle>Seller shop access required</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Your account is not approved as a seller yet.
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Shop Settings + Concierge Row */}
        <div
          className={`grid gap-6 ${session?.isProSubscriber && !isCardCadeMode ? 'grid-cols-1 lg:grid-cols-[1fr,320px]' : 'grid-cols-1'}`}
        >
          {/* Shop Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle>{isCardCadeMode ? 'CardCade Shop Settings' : 'Shop Settings'}</CardTitle>
            </CardHeader>
            <CardContent>
              {!isEditingShopName ? (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {isCardCadeMode && (
                      <Avatar className="h-16 w-16 shrink-0">
                        <AvatarImage
                          src={
                            shopProfileImageUrl ? getThumbnailUrl(shopProfileImageUrl) : undefined
                          }
                        />
                        <AvatarFallback className="text-xl font-bold">C</AvatarFallback>
                      </Avatar>
                    )}
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Shop Name</p>
                      <p className="text-lg font-semibold mt-1">
                        {shopName ||
                          (isCardCadeMode
                            ? "CardCade's Shop"
                            : session?.user?.shopName ||
                              (session?.user?.username
                                ? `${session.user.username}'s Shop`
                                : 'Your Shop'))}
                      </p>

                      <div className="mt-3 space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Social Links</p>
                        {Object.values(isCardCadeMode ? shopSocials : session?.socials || {}).some(
                          Boolean
                        ) ? (
                          <div className="text-sm text-muted-foreground space-y-1">
                            {(isCardCadeMode
                              ? shopSocials.instagram
                              : session?.socials?.instagram) && (
                              <p>
                                Instagram:{' '}
                                {isCardCadeMode
                                  ? shopSocials.instagram
                                  : session?.socials?.instagram}
                              </p>
                            )}
                            {(isCardCadeMode ? shopSocials.twitter : session?.socials?.twitter) && (
                              <p>
                                Twitter:{' '}
                                {isCardCadeMode ? shopSocials.twitter : session?.socials?.twitter}
                              </p>
                            )}
                            {!isCardCadeMode && session?.socials?.twitch && (
                              <p>Twitch: {session.socials.twitch}</p>
                            )}
                            {!isCardCadeMode && session?.socials?.kick && (
                              <p>Kick: {session.socials.kick}</p>
                            )}
                            {(isCardCadeMode ? shopSocials.youtube : session?.socials?.youtube) && (
                              <p>
                                YouTube:{' '}
                                {isCardCadeMode ? shopSocials.youtube : session?.socials?.youtube}
                              </p>
                            )}
                            {(isCardCadeMode ? shopSocials.tiktok : session?.socials?.tiktok) && (
                              <p>
                                TikTok:{' '}
                                {isCardCadeMode ? shopSocials.tiktok : session?.socials?.tiktok}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No social links set yet.</p>
                        )}
                      </div>

                      {(isCardCadeMode
                        ? sellerTradingExperience
                        : session?.sellerTradingExperience) && (
                        <div className="mt-3 space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">
                            Cards Experience
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {isCardCadeMode
                              ? sellerTradingExperience
                              : session?.sellerTradingExperience}
                          </p>
                        </div>
                      )}

                      {(isCardCadeMode
                        ? city || state || country
                        : session?.city || session?.state || session?.country) && (
                        <div className="mt-3 space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">Location</p>
                          <p className="text-sm text-muted-foreground">
                            {isCardCadeMode
                              ? country || [city, state].filter(Boolean).join(', ')
                              : session?.country ||
                                [session?.city, session?.state].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setIsEditingShopName(true)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Customize
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {isCardCadeMode && (
                    <div className="grid gap-2">
                      <Label>Shop Profile Image</Label>
                      <div className="flex items-center gap-4">
                        <div
                          className="relative cursor-pointer group"
                          onClick={() => shopProfileImageInputRef.current?.click()}
                        >
                          <Avatar className="h-20 w-20">
                            <AvatarImage
                              src={
                                shopProfileImageFile
                                  ? URL.createObjectURL(shopProfileImageFile)
                                  : shopProfileImageUrl
                                    ? getThumbnailUrl(shopProfileImageUrl)
                                    : undefined
                              }
                            />
                            <AvatarFallback className="text-2xl font-bold">C</AvatarFallback>
                          </Avatar>
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => shopProfileImageInputRef.current?.click()}
                          >
                            {shopProfileImageUrl || shopProfileImageFile
                              ? 'Change Image'
                              : 'Upload Image'}
                          </Button>
                          {(shopProfileImageUrl || shopProfileImageFile) && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => {
                                setShopProfileImageUrl(null);
                                setShopProfileImageFile(null);
                              }}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                        <input
                          ref={shopProfileImageInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setShopProfileImageFile(file);
                            }
                            e.target.value = '';
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Recommended: Square image, at least 200x200px
                      </p>
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label>Shop Name</Label>
                    <Input
                      placeholder={`${session?.user?.username}'s Shop`}
                      value={shopName}
                      onChange={e => setShopName(e.target.value)}
                      maxLength={255}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to use your username
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label>Instagram</Label>
                      <Input
                        placeholder="https://instagram.com/username"
                        value={shopSocials.instagram}
                        onChange={e =>
                          setShopSocials(prev => ({ ...prev, instagram: e.target.value }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Twitter</Label>
                      <Input
                        placeholder="https://twitter.com/username"
                        value={shopSocials.twitter}
                        onChange={e =>
                          setShopSocials(prev => ({ ...prev, twitter: e.target.value }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>YouTube</Label>
                      <Input
                        placeholder="https://youtube.com/@username"
                        value={shopSocials.youtube}
                        onChange={e =>
                          setShopSocials(prev => ({ ...prev, youtube: e.target.value }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>TikTok</Label>
                      <Input
                        placeholder="https://tiktok.com/@username"
                        value={shopSocials.tiktok}
                        onChange={e =>
                          setShopSocials(prev => ({ ...prev, tiktok: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Cards Experience</Label>
                    <Textarea
                      placeholder="e.g., 5 years, selling locally and online, focus on vintage cards..."
                      value={sellerTradingExperience}
                      onChange={e => setSellerTradingExperience(e.target.value)}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Share your experience trading or selling cards
                    </p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-3">
                    <div className="grid gap-2">
                      <Label>City</Label>
                      <Input
                        placeholder="e.g., New York"
                        value={city}
                        onChange={e => setCity(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>State</Label>
                      <Input
                        placeholder="e.g., NY"
                        value={state}
                        onChange={e => setState(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Country</Label>
                      <Input
                        placeholder="e.g., USA"
                        value={country}
                        onChange={e => setCountry(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditingShopName(false);
                        setShopProfileImageFile(null);
                        if (isCardCadeMode && cardcadeSettings) {
                          setShopProfileImageUrl(cardcadeSettings.profileImageUrl || null);
                          setShopName(cardcadeSettings.displayName || "CardCade's Shop");
                          setShopSocials({
                            instagram: cardcadeSettings.socials?.instagram || '',
                            twitter: cardcadeSettings.socials?.twitter || '',
                            youtube: cardcadeSettings.socials?.youtube || '',
                            tiktok: cardcadeSettings.socials?.tiktok || '',
                          });
                          setSellerTradingExperience(
                            cardcadeSettings.sellerTradingExperience || ''
                          );
                          setCity(cardcadeSettings.city || '');
                          setState(cardcadeSettings.state || '');
                          setCountry(cardcadeSettings.country || '');
                        } else {
                          // Try to get shop name from multiple sources
                          let displayNameValue = '';
                          if (session?.shopName) {
                            displayNameValue = session.shopName;
                          } else if (shopData?.shop?.displayName) {
                            displayNameValue = shopData.shop.displayName;
                          } else {
                            displayNameValue =
                              session?.user?.shopName || session?.user?.username || '';
                          }
                          setShopName(displayNameValue);

                          setShopSocials({
                            instagram: session?.socials?.instagram ?? '',
                            twitter: session?.socials?.twitter ?? '',
                            youtube: session?.socials?.youtube ?? '',
                            tiktok: session?.socials?.tiktok ?? '',
                          });
                          setSellerTradingExperience(session?.sellerTradingExperience ?? '');
                          setCity(session?.city ?? '');
                          setState(session?.state ?? '');
                          setCountry(session?.country ?? '');
                        }
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        updateShopSettingsMutation.mutate({
                          shopName,
                          socials: shopSocials,
                          sellerTradingExperience,
                          city,
                          state,
                          country,
                          ...(isCardCadeMode
                            ? { profileImageUrl: shopProfileImageUrl ?? undefined }
                            : {}),
                        })
                      }
                      disabled={updateShopSettingsMutation.isPending}
                    >
                      {updateShopSettingsMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* CardCade Pro Concierge - side panel */}
          {session?.isProSubscriber && !isCardCadeMode && <ConciergeCard />}
        </div>

        {!isCardCadeMode && session.stripeAccountConnected ? (
          <>
            {' '}
            {/* Mobile: Preview at top, Desktop: Side-by-side layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-6">
              {/* Form Section */}
              <Card className="order-2 lg:order-1">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{editingItemId ? 'Edit Shop Item' : 'Add Item'}</CardTitle>
                      {editingItemId && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Update the details for your shop item
                        </p>
                      )}
                    </div>
                    {editingItemId && (
                      <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Name *</Label>
                    <Input
                      placeholder="e.g., Charizard PSA 10"
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Price (USD) {form.purchaseOption !== 'offers_only' ? '*' : ''}</Label>
                      <Input
                        type="number"
                        min={1}
                        placeholder="0"
                        value={form.amount}
                        onChange={e =>
                          setForm(p => ({ ...p, amount: Number(e.target.value) || 0 }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0 = unlimited"
                        value={form.stock}
                        onChange={e => setForm(p => ({ ...p, stock: Number(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Purchase Option *</Label>
                    <Select
                      value={form.purchaseOption}
                      onValueChange={(value: 'buy_only' | 'offers_only' | 'both') =>
                        setForm(p => ({ ...p, purchaseOption: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select purchase option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buy_only">Buy Only</SelectItem>
                        <SelectItem value="offers_only">Offers Only</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Card Type *</Label>
                    <Select
                      value={form.brand}
                      onValueChange={(value: PrizeBrand) => setForm(p => ({ ...p, brand: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select brand" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pokemon">Pokémon</SelectItem>
                        <SelectItem value="one_piece">One Piece</SelectItem>
                        <SelectItem value="sports">Sports Cards</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Item description..."
                      value={form.description}
                      onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Display Order</Label>
                    <Input
                      type="number"
                      placeholder="1"
                      value={form.sellerDisplayOrderShop}
                      onChange={e =>
                        setForm(p => ({
                          ...p,
                          sellerDisplayOrderShop: Number(e.target.value) || 0,
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Lower numbers show first (e.g. 1 shows before 2).
                    </p>
                  </div>

                  {session?.isProSubscriber && (
                    <div className="flex items-center justify-between rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium text-yellow-400">
                          CardCade Pro Exclusive
                        </Label>
                        <p className="text-xs text-gray-400">
                          Only CardCade Pro members can purchase this item.
                        </p>
                      </div>
                      <Switch
                        checked={form.isProOnly}
                        onCheckedChange={checked => setForm(p => ({ ...p, isProOnly: checked }))}
                      />
                    </div>
                  )}

                  <div className="space-y-2.5">
                    <ItemImageGallery
                      images={itemImages}
                      coverIndex={coverImageIndex}
                      onImagesChange={setItemImages}
                      onCoverIndexChange={setCoverImageIndex}
                      maxImages={7}
                      disabled={isUploading || createItem.isPending}
                    />
                    <p className="text-xs text-muted-foreground">
                      Drag to reorder photos. Use the star button to choose cover photo.
                    </p>
                    <p className="rounded-md border border-[#D4FF00]/40 bg-[#D4FF00]/10 px-3 py-2 text-xs font-semibold text-[#D4FF00]">
                      Please lookup the cert number for your slab to see if there are high
                      resolution photos of it. If so, right click images, save to downloads, and
                      upload those photos here.
                    </p>
                  </div>

                  <Button
                    onClick={() => createItem.mutate()}
                    disabled={
                      createItem.isPending ||
                      !form.name ||
                      (form.purchaseOption !== 'offers_only' && form.amount <= 0) ||
                      itemImages.length === 0 ||
                      isUploading
                    }
                    className="w-full"
                  >
                    {createItem.isPending || isUploading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    {isUploading ? 'Uploading...' : editingItemId ? 'Update Item' : 'Add Item'}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Seller shop purchases are USD-only. CadeCoins are disabled for these items.
                  </p>
                </CardContent>
              </Card>

              {/* Live Preview Section */}
              <div className="order-1 lg:order-2 lg:sticky lg:top-6 lg:h-fit">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Live Preview</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      This is how your item will appear in the shop
                    </p>
                  </CardHeader>
                  <CardContent>
                    {/* Prize Card Preview */}
                    <div className="max-w-[280px] mx-auto">
                      <Card
                        className={cn(
                          'flex flex-col overflow-hidden rounded-xl',
                          'relative bg-card-grid-bg border border-card-grid-border shadow-[0px_2px_8px_0px_rgba(0,0,0,0.5)]'
                        )}
                      >
                        <CardHeader className="p-0 relative">
                          {/* Prize Image */}
                          <div className="relative w-full aspect-[4/5] overflow-hidden bg-muted flex items-center justify-center p-2">
                            {livePreviewImageSrc ? (
                              <img
                                src={livePreviewImageSrc}
                                alt="Prize preview"
                                className="w-full h-full object-contain"
                                onError={e => {
                                  e.currentTarget.src = '/placeholder.svg';
                                }}
                              />
                            ) : (
                              <div className="text-muted-foreground text-sm text-center">
                                No image
                              </div>
                            )}

                            {/* Stock Badge */}
                            {form.stock === 0 && (
                              <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground px-2 py-1 rounded text-xs font-semibold">
                                Out of Stock
                              </div>
                            )}
                          </div>
                        </CardHeader>

                        <CardContent className="p-3 flex-1 flex flex-col gap-1.5">
                          {/* Prize Name */}
                          <h3 className="font-semibold text-sm line-clamp-2 leading-tight">
                            {form.name || 'Item Name'}
                          </h3>

                          {/* Description */}
                          {form.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {form.description}
                            </p>
                          )}

                          {/* Price */}
                          <div className="mt-auto pt-1">
                            {form.purchaseOption !== 'offers_only' ? (
                              <span className="text-xl font-bold text-primary">
                                ${form.amount ? form.amount.toFixed(2) : '0.00'}
                              </span>
                            ) : (
                              <div className="text-sm font-semibold text-muted-foreground">
                                Offers Only
                              </div>
                            )}
                          </div>

                          {/* Stock Count */}
                          {typeof form.stock === 'number' && (
                            <p className="text-[10px] text-muted-foreground">
                              Stock: {form.stock} {form.stock === 1 ? 'item' : 'items'}
                            </p>
                          )}
                        </CardContent>

                        <CardFooter className="p-3 pt-0 flex gap-2">
                          {(form.purchaseOption === 'buy_only' ||
                            form.purchaseOption === 'both') && (
                            <Button
                              variant="default"
                              size="sm"
                              className="flex-1 bg-primary text-black hover:bg-primary/90 h-8 text-xs pointer-events-none"
                              disabled
                            >
                              <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
                              Buy Now
                            </Button>
                          )}
                          {(form.purchaseOption === 'offers_only' ||
                            form.purchaseOption === 'both') && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 gap-1.5 bg-transparent border-[#D4FF00] text-[#D4FF00] h-8 text-xs pointer-events-none"
                              disabled
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              Make Offer
                            </Button>
                          )}
                        </CardFooter>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4">
                  <CardTitle>Live Listings</CardTitle>
                  <SearchInput
                    id="shop-items-search"
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={setSearchQuery}
                    width="md"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading items...
                  </div>
                ) : items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items yet.</p>
                ) : filteredItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items match your search.</p>
                ) : (
                  filteredItems.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between border rounded-md p-3"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          ${item.amount ? Math.round(item.amount / 50) : 0} USD • Stock {item.stock}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditItem(item)}
                          disabled={deleteItem.isPending}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteItem.mutate(item.id)}
                          disabled={deleteItem.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle>Offer Management</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Review, counter, accept, or reject offers on your shop items.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isOffersLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading offers...
                    </div>
                  ) : offers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No offers yet.</p>
                  ) : (
                    offers.map(order => (
                      <div key={order.id} className="border rounded-md p-3 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="font-medium">
                              {order.prizeConfig?.name || 'Shop Item'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Buyer: {order.user?.username || 'Unknown'} • Offer: $
                              {order.offerAmount?.toFixed(2) || '0.00'}
                            </div>
                            {order.counterOfferAmount ? (
                              <div className="text-xs text-muted-foreground">
                                Countered at: ${order.counterOfferAmount.toFixed(2)}
                              </div>
                            ) : null}
                          </div>
                          <Badge className={cn('border', getOfferStatusClass(order.status))}>
                            {order.status.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                        </div>

                        {order.offerNotes ? (
                          <p className="text-xs italic text-muted-foreground">
                            "{order.offerNotes}"
                          </p>
                        ) : null}

                        {order.status === 'offer_made' ? (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              onClick={() => acceptOfferMutation.mutate(order.id)}
                              disabled={acceptOfferMutation.isPending}
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenCounterDialog(order)}
                              disabled={counterOfferMutation.isPending}
                            >
                              Counter
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => rejectOfferMutation.mutate(order.id)}
                              disabled={rejectOfferMutation.isPending}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : order.status === 'countered' ? (
                          <div className="text-xs text-muted-foreground">
                            Waiting for buyer response to counter offer.
                          </div>
                        ) : order.status === 'offer_accepted' ? (
                          <div className="text-xs text-muted-foreground">
                            Accepted. Buyer has been emailed a checkout link.
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle>Purchased Items</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Items that have been purchased by buyers. Mark them as shipped once sent.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isPurchasedOrdersLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading purchases...
                    </div>
                  ) : purchasedOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No purchases yet.</p>
                  ) : (
                    purchasedOrders.map(order => (
                      <div key={order.id} className="border rounded-md p-3 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="font-medium">
                              {order.prizeConfiguration?.name || 'Shop Item'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Buyer: {order.user?.username || 'Unknown'} • Ordered:{' '}
                              {new Date(order.createdAt).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {order.user?.address && (
                                <>
                                  {order.user.address}
                                  {order.user.city && `, ${order.user.city}`}
                                  {order.user.state && ` ${order.user.state}`}
                                </>
                              )}
                            </div>
                          </div>
                          <Badge className={cn('border', getOfferStatusClass(order.status))}>
                            {order.status === 'paid'
                              ? 'Pending Shipment'
                              : order.status === 'shipped'
                                ? 'Shipped'
                                : 'Delivered'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Total: </span>
                            <span className="font-medium">
                              ${order.totalPrice?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                          {order.trackingNumber && (
                            <div>
                              <span className="text-muted-foreground">Tracking: </span>
                              <span className="font-medium">{order.trackingNumber}</span>
                            </div>
                          )}
                          {order.shippingCarrier && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Carrier: </span>
                              <span className="font-medium">{order.shippingCarrier}</span>
                            </div>
                          )}
                        </div>

                        {order.status === 'paid' ? (
                          <Button
                            size="sm"
                            onClick={() => handleOpenShipDialog(order)}
                            className="w-full"
                          >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Mark as Shipped
                          </Button>
                        ) : (
                          <div className="text-xs text-muted-foreground">
                            {order.shippedAt && (
                              <>Shipped on: {new Date(order.shippedAt).toLocaleDateString()}</>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : !isCardCadeMode ? (
          <p className="text-red-500">
            Please complete Stripe Onboarding and wait for your account to be verified before you
            can add products. This usually occurs within 1 hour after onboarding.
          </p>
        ) : null}

        {!isCardCadeMode && (
          <>
            <SellerOnboardingModal
              open={showOnboardingModal}
              onOpenChange={setShowOnboardingModal}
              onComplete={() => {
                setShowOnboardingModal(false);
                queryClient.invalidateQueries({ queryKey: ['auth-context'] });
              }}
            />

            <Dialog open={isCounterDialogOpen} onOpenChange={setIsCounterDialogOpen}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Counter Offer</DialogTitle>
                  <DialogDescription>
                    {selectedOffer ? (
                      <span>
                        Buyer offered ${selectedOffer.offerAmount?.toFixed(2) || '0.00'} for{' '}
                        {selectedOffer.prizeConfig?.name || 'this item'}.
                      </span>
                    ) : (
                      'Make a counter offer for this item.'
                    )}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="counterAmount">Counter Amount (USD)</Label>
                    <Input
                      id="counterAmount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={counterAmount}
                      onChange={e => setCounterAmount(e.target.value)}
                      placeholder="Enter counter amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="counterNotes">Notes (Optional)</Label>
                    <Textarea
                      id="counterNotes"
                      value={counterNotes}
                      onChange={e => setCounterNotes(e.target.value)}
                      placeholder="Optional note for buyer"
                      maxLength={500}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCounterDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmitCounter} disabled={counterOfferMutation.isPending}>
                    {counterOfferMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...
                      </>
                    ) : (
                      'Send Counter Offer'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isShipDialogOpen} onOpenChange={setIsShipDialogOpen}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Mark as Shipped</DialogTitle>
                  <DialogDescription>
                    {selectedPurchasedOrder ? (
                      <span>
                        Update shipping information for{' '}
                        {selectedPurchasedOrder.prizeConfiguration?.name || 'this item'}
                      </span>
                    ) : (
                      'Add tracking information for this shipment.'
                    )}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="trackingNumber">Tracking Number (Optional)</Label>
                    <Input
                      id="trackingNumber"
                      type="text"
                      value={trackingNumber}
                      onChange={e => setTrackingNumber(e.target.value)}
                      placeholder="e.g., 1Z999AA10123456784"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shippingCarrier">Shipping Carrier (Optional)</Label>
                    <Select
                      value={shippingCarrier || 'none'}
                      onValueChange={val => setShippingCarrier(val === 'none' ? '' : val)}
                    >
                      <SelectTrigger id="shippingCarrier">
                        <SelectValue placeholder="Select carrier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="FedEx">FedEx</SelectItem>
                        <SelectItem value="UPS">UPS</SelectItem>
                        <SelectItem value="USPS">USPS</SelectItem>
                        <SelectItem value="DHL">DHL</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsShipDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmitShip} disabled={markAsShippedMutation.isPending}>
                    {markAsShippedMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Marking...
                      </>
                    ) : (
                      'Mark as Shipped'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </MainLayout>
  );
}

/**
 * ConciergeCard - Displayed for pro sellers to request a concierge
 */
function ConciergeCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: myRequest, isLoading } = useQuery({
    queryKey: ['my-concierge-request'],
    queryFn: async () => {
      const res = await api.concierge.getMyRequest();
      return res.data ?? null;
    },
  });

  const requestMutation = useMutation({
    mutationFn: () => api.concierge.createRequest(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-concierge-request'] });
      toast({
        title: 'Concierge Requested!',
        description: 'A concierge will be assigned to you shortly.',
      });
    },
    onError: () => {
      toast({
        title: 'Request Failed',
        description: 'You may already have an active concierge request.',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) return null;

  const isPending = myRequest?.status === 'pending' || requestMutation.isSuccess;
  const isClaimed = myRequest?.status === 'claimed';

  return (
    <Card className="border-yellow-500/30 bg-gradient-to-b from-yellow-500/5 to-transparent h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-yellow-400 text-base">
          <HeadphonesIcon className="h-5 w-5" />
          Pro Concierge
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isClaimed ? (
          <div className="space-y-2">
            <p className="text-sm text-green-400 font-medium">
              ✓ Your concierge is {myRequest.claimedByName}
            </p>
            <p className="text-xs text-gray-400">They will be reaching out to you shortly.</p>
          </div>
        ) : isPending ? (
          <div className="space-y-3">
            <p className="text-sm text-yellow-400 font-medium">⏳ Concierge Request Pending</p>
            <p className="text-xs text-gray-400">
              We&apos;re assigning a concierge to help you. Sit tight!
            </p>
            <Button
              disabled
              className="w-full bg-yellow-500/20 text-yellow-400/60 border border-yellow-500/20 cursor-not-allowed"
            >
              <HeadphonesIcon className="h-4 w-4 mr-2" />
              Request Pending
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-300">
              Get a dedicated concierge to help you maximize your shop&apos;s potential.
            </p>
            <Button
              onClick={() => requestMutation.mutate()}
              disabled={requestMutation.isPending}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
            >
              <HeadphonesIcon className="h-4 w-4 mr-2" />
              {requestMutation.isPending ? 'Requesting...' : 'Request Concierge'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
