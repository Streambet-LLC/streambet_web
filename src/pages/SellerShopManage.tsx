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
import { useState, useRef, useEffect } from 'react';
import { api } from '@/integrations/api/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, Upload, ShoppingCart, DollarSign, Pencil, X } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useImageCropper } from '@/hooks/useImageCropper';
import PhotoCropper from '@/components/PhotoCropper';
import { PrizeBrand } from '@/types/prize';
import { CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image upload hook
  const imageUpload = useImageCropper({
    checkNSFW: false,
    onError: error => setImageError(error),
  });

  const [isDragging, setIsDragging] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageLayout, setImageLayout] = useState<'single' | 'double'>('single');
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

  const [form, setForm] = useState({
    name: '',
    description: '',
    imageUrl: '',
    amount: 0,
    stock: 1,
    purchaseOption: 'buy_only' as 'buy_only' | 'offers_only' | 'both',
    brand: 'other' as PrizeBrand,
    displayOrderShop: 1,
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
    enabled: !!session?.isSeller,
  });

  const { data: shopData } = useQuery({
    queryKey: ['seller-shop-manage', session?.user?.username],
    queryFn: async () => {
      if (!session?.user?.username) return null;
      return await api.prize.getShopItemsByUsername(session.user.username);
    },
    enabled: !!session?.user?.username,
    staleTime: 5 * 60 * 1000,
  });

  const { data: purchasedOrders = [], isLoading: isPurchasedOrdersLoading } = useQuery<
    SellerPurchasedOrder[]
  >({
    queryKey: ['seller-shop-orders-manage'],
    queryFn: () => api.prize.getMyShopOrders(),
    enabled: !!session?.isSeller,
  });

  const { data: offersResponse, isLoading: isOffersLoading } = useQuery<{
    data: SellerOfferOrder[];
    total: number;
  }>({
    queryKey: ['seller-shop-offers-manage'],
    queryFn: () => api.prize.getMyShopOffers({ status: 'all' }),
    enabled: !!session?.isSeller,
  });

  const offers = offersResponse?.data || [];

  // Sync shop settings when session updates or editing mode changes
  useEffect(() => {
    if (session?.user) {
      // Try to get shop name from multiple sources
      let displayNameValue = '';

      // First check session.shopName
      if (session?.shopName) {
        displayNameValue = session.shopName;
      }
      // Then try session.user.displayName
      else if (session?.user?.displayName) {
        displayNameValue = session.user.displayName;
      }
      // Then try items[0]?.shop?.displayName
      else if (items?.length > 0 && items[0]?.shop?.displayName) {
        displayNameValue = items[0].shop.displayName;
      }
      // Then try shopData
      else if (shopData?.shop?.displayName) {
        displayNameValue = shopData.shop.displayName;
      }
      // Fall back to username
      else {
        displayNameValue = session?.user?.username || '';
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
  }, [session, shopData, items, isEditingShopName]);

  // Show onboarding modal if seller hasn't completed onboarding
  useEffect(() => {
    if (session?.isSeller && !session?.sellerOnboardingCompleted) {
      setShowOnboardingModal(true);
    }
  }, [session?.isSeller, session?.sellerOnboardingCompleted]);

  const handleImageUpload = async (): Promise<string> => {
    if (!imageUpload.selectedFile) {
      return form.imageUrl; // Return existing URL if no new file
    }

    try {
      setIsUploading(true);
      const response = await api.auth.uploadImage(imageUpload.selectedFile, 'thumbnail');
      const url = response?.data?.Key;

      if (!url || typeof url !== 'string') {
        throw new Error('Invalid upload response: missing image URL');
      }

      return url;
    } catch (error) {
      throw error; // Re-throw to be caught by createItem mutation
    } finally {
      setIsUploading(false);
    }
  };

  const createItem = useMutation({
    mutationFn: async () => {
      const imageUrl = await handleImageUpload();
      // Convert USD to CadeCoins (50 coins = $1) before sending to API
      const amountInCoins = form.purchaseOption === 'offers_only'
        ? Math.max(1, form.amount)
        : Math.round(form.amount * 50);
      const payload = {
        ...form,
        imageUrl,
        amount: amountInCoins,
        category: 'slab' as const, // All shop items are slabs
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
        displayOrderShop: 1,
      });
      imageUpload.clearImage();
      setImageError(null);
      setImageLayout('single');
      setEditingItemId(null);
      queryClient.invalidateQueries({ queryKey: ['seller-shop-items-manage'] });
      queryClient.invalidateQueries({ queryKey: ['seller-shop-items', session?.user?.username] });
      queryClient.invalidateQueries({ queryKey: ['seller-shops'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: editingItemId ? 'Failed to update item.' : 'Failed to add item to shop.',
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
    mutationFn: (payload: {
      shopName: string;
      socials: {
        instagram: string;
        twitch: string;
        kick: string;
        youtube: string;
        tiktok: string;
      };
    }) => {
      return api.user.updateProfile(payload);
    },
    onSuccess: data => {
      toast({ title: 'Success', description: 'Shop settings updated successfully.' });
      setIsEditingShopName(false);
      queryClient.invalidateQueries({ queryKey: ['session'] });
      queryClient.invalidateQueries({ queryKey: ['seller-shops'] });
      queryClient.invalidateQueries({ queryKey: ['seller-shop-items', session?.user?.username] });
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

  // Drag and drop handlers
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      imageUpload.handleFileSelect(file);
      setForm(p => ({ ...p, imageUrl: '' })); // Clear URL when file is uploaded
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      imageUpload.handleFileSelect(file);
      setForm(p => ({ ...p, imageUrl: '' })); // Clear URL when file is dropped
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleEditItem = (item: any) => {
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
      displayOrderShop: item.displayOrderShop || 1,
    });
    imageUpload.clearImage();
    setImageError(null);
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
      displayOrderShop: 1,
    });
    imageUpload.clearImage();
    setImageError(null);
    setImageLayout('single');
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
    const data = await api.creator.generateAccountLink();
    window.location.replace(data.data);
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

  if (!session?.isSeller) {
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
        {/* Shop Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle>Shop Settings</CardTitle>
          </CardHeader>
          <CardContent>
            {!isEditingShopName ? (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Shop Name</p>
                  <p className="text-lg font-semibold mt-1">
                    {shopName ||
                      session?.user?.shopName ||
                      (session?.user?.username ? `${session.user.username}'s Shop` : 'Your Shop')}
                  </p>

                  <div className="mt-3 space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Social Links</p>
                    {Object.values(session?.socials || {}).some(Boolean) ? (
                      <div className="text-sm text-muted-foreground space-y-1">
                        {session?.socials?.instagram && (
                          <p>Instagram: {session.socials.instagram}</p>
                        )}
                        {session?.socials?.twitch && <p>Twitch: {session.socials.twitch}</p>}
                        {session?.socials?.kick && <p>Kick: {session.socials.kick}</p>}
                        {session?.socials?.youtube && <p>YouTube: {session.socials.youtube}</p>}
                        {session?.socials?.tiktok && <p>TikTok: {session.socials.tiktok}</p>}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No social links set yet.</p>
                    )}
                  </div>

                  {session?.sellerTradingExperience && (
                    <div className="mt-3 space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Cards Experience</p>
                      <p className="text-sm text-muted-foreground">
                        {session.sellerTradingExperience}
                      </p>
                    </div>
                  )}

                  {(session?.city || session?.state || session?.country) && (
                    <div className="mt-3 space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Location</p>
                      <p className="text-sm text-muted-foreground">
                        {session?.country ||
                          [session?.city, session?.state].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsEditingShopName(true)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Customize
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>Shop Name</Label>
                  <Input
                    placeholder={`${session?.user?.username}'s Shop`}
                    value={shopName}
                    onChange={e => setShopName(e.target.value)}
                    maxLength={255}
                  />
                  <p className="text-xs text-muted-foreground">Leave empty to use your username</p>
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
                      onChange={e => setShopSocials(prev => ({ ...prev, twitter: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>YouTube</Label>
                    <Input
                      placeholder="https://youtube.com/@username"
                      value={shopSocials.youtube}
                      onChange={e => setShopSocials(prev => ({ ...prev, youtube: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>TikTok</Label>
                    <Input
                      placeholder="https://tiktok.com/@username"
                      value={shopSocials.tiktok}
                      onChange={e => setShopSocials(prev => ({ ...prev, tiktok: e.target.value }))}
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
                      // Try to get shop name from multiple sources
                      let displayNameValue = '';
                      if (session?.shopName) {
                        displayNameValue = session.shopName;
                      } else if (session?.user?.displayName) {
                        displayNameValue = session.user.displayName;
                      } else if (items?.length > 0 && items[0]?.shop?.displayName) {
                        displayNameValue = items[0].shop.displayName;
                      } else if (shopData?.shop?.displayName) {
                        displayNameValue = shopData.shop.displayName;
                      } else {
                        displayNameValue = session?.user?.username || '';
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
            <div className="mt-10">
              <Button
                onClick={() => {
                  handleGenerateAccountLink();
                }}
              >
                Stripe Connect Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {session.stripeAccountConnected ? (
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
                    <Label>Image Layout</Label>
                    <Select
                      value={imageLayout}
                      onValueChange={(value: 'single' | 'double') => setImageLayout(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select image layout" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single Slab (4" × 6.5")</SelectItem>
                        <SelectItem value="double">Double Slab (8" × 6.5")</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Choose single for one side, or double for front & back side-by-side
                    </p>
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
                      value={form.displayOrderShop}
                      onChange={e =>
                        setForm(p => ({ ...p, displayOrderShop: Number(e.target.value) || 0 }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Lower numbers show first (e.g. 1 shows before 2).
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-base font-medium">Item Image</Label>
                    <div className="grid gap-3">
                      {/* Image Upload Area */}
                      <div
                        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                          isDragging
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={handleUploadClick}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileInputChange}
                          className="hidden"
                        />
                        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-sm font-medium mb-1 text-primary">Click to upload</p>
                        <p className="text-xs text-muted-foreground mb-1">or drag and drop</p>
                        <p className="text-xs text-muted-foreground">
                          JPEG, PNG, or WebP
                          <br />
                          Aspect ratio 8:13 • 1200×1950px
                        </p>
                      </div>

                      {/* Image Cropper */}
                      {imageUpload.fileToCrop && (
                        <PhotoCropper
                          file={imageUpload.fileToCrop}
                          onClose={imageUpload.cancelCrop}
                          onCrop={imageUpload.handleCropComplete}
                          cropperProps={{
                            aspect: imageLayout === 'double' ? 2 / 1 : 8 / 13,
                          }}
                          resizerProps={{
                            maxWidth: imageLayout === 'double' ? 1600 : 1200,
                            maxHeight: imageLayout === 'double' ? 800 : 1950,
                            compressFormat: 'JPEG',
                            quality: 90,
                          }}
                        />
                      )}

                      {/* Image Error */}
                      {imageError && (
                        <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
                          <p className="text-sm text-destructive">{imageError}</p>
                        </div>
                      )}

                      {/* Image URL Input (Alternative) */}
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">
                            Or use URL
                          </span>
                        </div>
                      </div>

                      <Input
                        placeholder="https://example.com/image.jpg"
                        value={form.imageUrl}
                        onChange={e => {
                          const url = e.target.value;
                          setForm(p => ({ ...p, imageUrl: url }));
                          // Clear uploaded file when URL is entered
                          if (url && imageUpload.selectedFile) {
                            imageUpload.clearImage();
                          }
                        }}
                        disabled={!!imageUpload.selectedFile || !!imageUpload.previewUrl}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={() => createItem.mutate()}
                    disabled={
                      createItem.isPending ||
                      !form.name ||
                      (form.purchaseOption !== 'offers_only' && form.amount <= 0) ||
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
                            {imageUpload.previewUrl || form.imageUrl ? (
                              <img
                                src={imageUpload.previewUrl || form.imageUrl}
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
                          ${item.amount} USD • Stock {item.stock}
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
            <Card>
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
                        <p className="text-xs italic text-muted-foreground">"{order.offerNotes}"</p>
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
            <Card>
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
          </>
        ) : (
          <>
            <p className=" text-red-500">
              Please complete Stripe Connection and wait for your account to be verified before you
              can add products
            </p>
          </>
        )}

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
                <Select value={shippingCarrier || 'none'} onValueChange={(val) => setShippingCarrier(val === 'none' ? '' : val)}>
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
      </div>
    </MainLayout>
  );
}
