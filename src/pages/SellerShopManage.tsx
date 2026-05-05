import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import OrderItemDetailDialog from '@/components/OrderItemDetailDialog';
import ReviewOrderButton from '@/components/reviews/ReviewOrderButton';
import LeaveReviewDialog from '@/components/reviews/LeaveReviewDialog';
import StarRating from '@/components/reviews/StarRating';
import { ReviewableOrderSide } from '@/types/review';
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
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Search,
  ChevronLeft,
  ChevronRight,
  Receipt,
} from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  PrizeBrand,
  PrizeConfiguration,
  type PsaImportResult,
  type EbayListing,
} from '@/types/prize';
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
import { Checkbox } from '@/components/ui/checkbox';
import { SellerOnboardingModal } from '@/components/seller/SellerOnboardingModal';
import { SearchInput } from '@/components/ui/SearchInput';
import { ItemImageGallery, type ItemImageInput } from '@/components/items/ItemImageGallery';
import { IMAGE_UPLOAD_CONFIG } from '@/utils/imageUploadConstants';
import { getThumbnailUrl } from '@/utils/helper';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ebayFeatureConfig } from '@/config/ebay-feature';
import {
  PSA_RATE_LIMIT_MESSAGE,
  PSA_RATE_LIMIT_UNTIL_KEY,
  normalizePsaBrand,
  resolvePsaBrandFromImport,
  normalizeSlabGradeValue,
  parsePsaSlabGrade,
  getTomorrowStartMs,
  activatePsaRateLimitCooldown,
  clearPsaRateLimitCooldown,
  getStoredPsaRateLimitUntil,
  isPsaRateLimitActive,
} from '@/utils/psa-helpers';

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
  shippingAddress?: {
    firstName?: string;
    lastName?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  user?: {
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
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
  const canUseEbaySearch =
    ebayFeatureConfig.enabled &&
    (ebayFeatureConfig.accessMode === 'everyone' || session?.role === 'admin');

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
  // CardCade-only: platform-level crypto payout configuration. Backed by
  // shop_settings.crypto_payments_enabled / crypto_wallet_address. Lets
  // admins enable USDC checkout on CardCade items, which have no creator
  // user to read these flags from.
  const [cardcadeCryptoEnabled, setCardcadeCryptoEnabled] = useState(false);
  const [cardcadeCryptoWallet, setCardcadeCryptoWallet] = useState('');
  const [isEditingShopName, setIsEditingShopName] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [shopProfileImageUrl, setShopProfileImageUrl] = useState<string | null>(null);
  const [shopProfileImageFile, setShopProfileImageFile] = useState<File | null>(null);
  const shopProfileImageInputRef = React.useRef<HTMLInputElement>(null);
  const ordersRef = React.useRef<HTMLDivElement>(null);
  /** Per-Sold-Item refs so we can scroll directly to the requested order. */
  const soldItemRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const itemFormRef = React.useRef<HTMLDivElement>(null);
  const [psaCertNumber, setPsaCertNumber] = useState('');
  const [psaImportResult, setPsaImportResult] = useState<PsaImportResult | null>(null);
  const [psaRateLimitedUntil, setPsaRateLimitedUntil] = useState<number | null>(null);
  const [isGradeAutofillFailed, setIsGradeAutofillFailed] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    imageUrl: '',
    amount: 0,
    stock: 1,
    purchaseOption: 'both' as 'buy_only' | 'offers_only' | 'both',
    brand: 'pokemon' as PrizeBrand,
    category: 'slab' as 'raw' | 'slab' | 'sealed' | 'other',
    grade: '' as string,
    sellerDisplayOrderShop: 1,
    isProOnly: false,
    profileFeatured: false,
    saleType: 'fixed_price' as 'fixed_price' | 'auction',
    // Auction-only fields. Ignored unless saleType === 'auction'.
    auctionDurationDays: 3 as 1 | 3 | 5 | 7,
    auctionStartingPriceUsd: 0,
    auctionReservePriceUsd: 0,
    // Per-item shipping fee in USD. Defaults to $5 to match the
    // legacy hardcoded value; a value of 0 means Free Shipping.
    shippingCostUsd: 5,
    // In-person pickup. When true the item ships $0 and the buyer
    // is not asked for a shipping address at checkout/offer time.
    isInPerson: false,
  });

  useEffect(() => {
    const stored = getStoredPsaRateLimitUntil();
    if (!stored) {
      return;
    }

    setPsaRateLimitedUntil(stored);
  }, []);

  useEffect(() => {
    if (!psaRateLimitedUntil) {
      return;
    }

    if (Date.now() >= psaRateLimitedUntil) {
      setPsaRateLimitedUntil(null);
      clearPsaRateLimitCooldown();
    }
  }, [psaRateLimitedUntil]);

  const [selectedPurchasedOrder, setSelectedPurchasedOrder] = useState<SellerPurchasedOrder | null>(
    null
  );
  /** Order whose full transaction details are being shown in OrderItemDetailDialog. */
  const [selectedSaleTransaction, setSelectedSaleTransaction] =
    useState<SellerPurchasedOrder | null>(null);
  /** Order id to highlight (e.g. when arrived from /transactions or email). */
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);
  /** Order id whose review dialog is currently open. */
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
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

  // Reviewable-orders for the Sold Items list (seller side only).
  const { data: reviewableOrders } = useQuery({
    queryKey: ['my-reviewable-orders'],
    queryFn: () => api.review.getMyReviewable(),
    enabled: !!session?.isSeller && !isCardCadeMode,
    staleTime: 60_000,
  });
  const reviewSideByOrderId = useMemo(() => {
    const map = new Map<string, ReviewableOrderSide>();
    for (const s of reviewableOrders ?? []) {
      if (s.myRole === 'seller') map.set(s.orderId, s);
    }
    return map;
  }, [reviewableOrders]);

  // Sold-Items search + pagination (5 per page)
  const SOLD_ITEMS_PAGE_SIZE = 5;
  const [soldItemsSearch, setSoldItemsSearch] = useState('');
  const [soldItemsPage, setSoldItemsPage] = useState(1);

  const filteredPurchasedOrders = useMemo(() => {
    const q = soldItemsSearch.trim().toLowerCase();
    if (!q) return purchasedOrders;
    return purchasedOrders.filter(o => {
      const itemName = o.prizeConfiguration?.name?.toLowerCase() ?? '';
      const buyer =
        `${o.user?.firstName ?? ''} ${o.user?.lastName ?? ''} ${o.user?.username ?? ''} ${o.user?.email ?? ''}`.toLowerCase();
      const recipient =
        `${o.shippingAddress?.firstName ?? ''} ${o.shippingAddress?.lastName ?? ''}`.toLowerCase();
      const city = o.shippingAddress?.city?.toLowerCase() ?? '';
      const state = o.shippingAddress?.state?.toLowerCase() ?? '';
      const zip = o.shippingAddress?.zipCode?.toLowerCase() ?? '';
      const tracking = o.trackingNumber?.toLowerCase() ?? '';
      return (
        itemName.includes(q) ||
        buyer.includes(q) ||
        recipient.includes(q) ||
        city.includes(q) ||
        state.includes(q) ||
        zip.includes(q) ||
        tracking.includes(q)
      );
    });
  }, [purchasedOrders, soldItemsSearch]);

  const soldItemsPageCount = Math.max(
    1,
    Math.ceil(filteredPurchasedOrders.length / SOLD_ITEMS_PAGE_SIZE)
  );

  // Reset to page 1 whenever the search changes or the underlying data shrinks.
  useEffect(() => {
    setSoldItemsPage(1);
  }, [soldItemsSearch]);
  useEffect(() => {
    if (soldItemsPage > soldItemsPageCount) setSoldItemsPage(soldItemsPageCount);
  }, [soldItemsPage, soldItemsPageCount]);

  const paginatedPurchasedOrders = useMemo(() => {
    const start = (soldItemsPage - 1) * SOLD_ITEMS_PAGE_SIZE;
    return filteredPurchasedOrders.slice(start, start + SOLD_ITEMS_PAGE_SIZE);
  }, [filteredPurchasedOrders, soldItemsPage]);

  // When a specific order is highlighted (e.g. the user arrived from
  // /transactions or an email link), jump to the page that contains it so
  // the highlighted card is actually visible before we scroll to it.
  useEffect(() => {
    if (!highlightedOrderId) return;
    const idx = filteredPurchasedOrders.findIndex(o => o.id === highlightedOrderId);
    if (idx < 0) return;
    const targetPage = Math.floor(idx / SOLD_ITEMS_PAGE_SIZE) + 1;
    setSoldItemsPage(p => (p === targetPage ? p : targetPage));
  }, [highlightedOrderId, filteredPurchasedOrders]);

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
      setCardcadeCryptoEnabled(!!cardcadeSettings?.cryptoPaymentsEnabled);
      setCardcadeCryptoWallet(cardcadeSettings?.cryptoWalletAddress || '');
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

      const isAuction = form.saleType === 'auction';

      // Auction listings always sell as a single 1-of-1; the listing price
      // ("amount") is unused on the prize record itself because the price
      // is determined by bids. We still need to send a value the API
      // accepts, so we mirror the starting bid in CadeCoins for parity
      // with the existing fixed-price/offers flow.
      //
      // Convert USD → CadeCoins via integer cents to avoid floating-point
      // drift (e.g. 79.98 * 50 = 3998.9999999999995 in IEEE-754).
      // 1 CadeCoin = $0.02, so coins = round(cents / 2). Always returns
      // a whole-coin integer, which keeps the stored decimal column
      // clean and prevents fractional CadeCoin amounts from leaking in.
      const usdToWholeCoins = (usd: number): number => {
        const cents = Math.round((Number(usd) || 0) * 100);
        return Math.round(cents / 2);
      };

      const amountInCoins = isAuction
        ? Math.max(1, usdToWholeCoins(form.auctionStartingPriceUsd))
        : form.purchaseOption === 'offers_only'
          ? Math.max(1, form.amount)
          : usdToWholeCoins(form.amount);

      const payload = {
        ...form,
        imageUrl: imagePayload.coverImageUrl,
        imageUrls: imagePayload.imageUrls,
        coverImageIndex: imagePayload.coverImageIndex,
        amount: amountInCoins,
        category: form.category,
        grade: form.grade || null,
        isProOnly: form.isProOnly,
        profileFeatured: form.profileFeatured,
        // Auctions are always 1-of-1 and use the auction purchaseOption flow
        ...(isAuction
          ? {
              stock: 1,
              purchaseOption: 'buy_only' as const,
              saleType: 'auction' as const,
            }
          : { saleType: 'fixed_price' as const }),
      };

      // Strip the auction-only UI fields before sending — they aren't
      // part of the prize DTO and would just be ignored, but keeping
      // the wire payload clean helps when reading network logs.
      delete (payload as any).auctionDurationDays;
      delete (payload as any).auctionStartingPriceUsd;
      delete (payload as any).auctionReservePriceUsd;

      if (editingItemId) {
        // Update existing item — auction lifecycle is not editable here.
        // `saleType` is immutable after creation; the backend preserves
        // the existing value and (with `forbidNonWhitelisted: true` on
        // the global ValidationPipe) older API builds will 400 the
        // entire request if we leave it in the body. Strip it to keep
        // edits working for both fixed-price and auction listings.
        delete (payload as any).saleType;
        return api.prize.updateMyShopItem(editingItemId, payload);
      }

      const created = await api.prize.createMyShopItem(payload);

      // For auction-typed items we also need to create the actual
      // Auction record. The backend gates this on the seller having
      // `auctionsEnabled=true`, so a 403 here means the admin hasn't
      // flipped the flag yet (we already hide the UI in that case).
      if (isAuction) {
        await api.auction.createAsSeller({
          prizeConfigurationId: created.id,
          durationDays: form.auctionDurationDays,
          startingPriceUsd: form.auctionStartingPriceUsd,
          reservePriceUsd:
            form.auctionReservePriceUsd > 0 ? form.auctionReservePriceUsd : undefined,
        });
      }

      return created;
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
        brand: 'pokemon',
        category: 'slab',
        grade: '',
        sellerDisplayOrderShop: 1,
        isProOnly: false,
        profileFeatured: false,
        saleType: 'fixed_price',
        auctionDurationDays: 3,
        auctionStartingPriceUsd: 0,
        auctionReservePriceUsd: 0,
        shippingCostUsd: 5,
        isInPerson: false,
      });
      setItemImages([]);
      setCoverImageIndex(0);
      setEditingItemId(null);
      setIsGradeAutofillFailed(false);
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

  const psaImportMutation = useMutation({
    mutationFn: (certNumber: string) => api.prize.importPsaCert(certNumber),
    onSuccess: (result: PsaImportResult) => {
      if (result.rateLimitedUntilTomorrow) {
        const until = activatePsaRateLimitCooldown(result.rateLimitedUntil);
        setPsaRateLimitedUntil(until);
        toast({
          title: 'PSA import limited',
          description: PSA_RATE_LIMIT_MESSAGE,
          variant: 'destructive',
        });
      }

      setPsaImportResult(result);
      const parsedSlabGrade = parsePsaSlabGrade(result);

      const importedImages = result.imageUrls.map((imageUrl, index) => ({
        id: `psa-${result.certNumber}-${index}`,
        imageUrl,
        isNew: false,
      }));

      const brand = resolvePsaBrandFromImport(result);

      setForm(prev => ({
        ...prev,
        name: result.title || prev.name,
        description: prev.description,
        brand,
        category: 'slab',
        grade: parsedSlabGrade ?? prev.grade,
      }));

      if (parsedSlabGrade) {
        setIsGradeAutofillFailed(false);
      } else {
        setIsGradeAutofillFailed(true);
        toast({
          title: 'PSA grade not auto-selected',
          description:
            'We could not parse this PSA grade. Your current grade was kept. Please confirm or update the slab grade.',
          variant: 'destructive',
        });
      }

      if (importedImages.length > 0) {
        setItemImages(importedImages);
        setCoverImageIndex(Math.min(result.coverImageIndex, importedImages.length - 1));
      }

      toast({
        title: 'PSA import complete',
        description: result.hasImages
          ? 'Title, details, and images were filled from PSA.'
          : 'Title and details were filled from PSA. No images were available for this cert.',
      });
    },
    onError: (error: any) => {
      const statusCode = error?.response?.status;
      const errorCode = error?.response?.data?.errorCode;

      if (statusCode === 429 || errorCode === 'PSA_RATE_LIMITED') {
        const until = activatePsaRateLimitCooldown(error?.response?.data?.rateLimitedUntil);
        setPsaRateLimitedUntil(until);
        toast({
          title: 'PSA import limited',
          description: PSA_RATE_LIMIT_MESSAGE,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'PSA import failed',
        description:
          error?.response?.data?.message || error?.message || 'Unable to import PSA cert data.',
        variant: 'destructive',
      });
    },
  });

  const [ebayListings, setEbayListings] = React.useState<EbayListing[]>([]);
  const [selectedEbayListings, setSelectedEbayListings] = React.useState<Record<string, boolean>>(
    {}
  );
  const [ebayFetchLimit, setEbayFetchLimit] = React.useState(5);
  const [ebayRetryAfterSeconds, setEbayRetryAfterSeconds] = React.useState(0);
  const [ebayImageFile, setEbayImageFile] = React.useState<File | null>(null);
  const [ebayImagePreviewUrl, setEbayImagePreviewUrl] = React.useState<string | null>(null);
  const ebayImageInputRef = React.useRef<HTMLInputElement>(null);
  const ebayFetchLimitOptions = Array.from({ length: 10 }, (_, index) => (index + 1) * 5);
  const getEbayListingKey = (listing: EbayListing, index: number): string =>
    listing.itemWebUrl || `${listing.title || 'listing'}-${index}`;

  const setListingsAndSelections = (listings: EbayListing[]): void => {
    setEbayListings(listings);

    const nextSelections: Record<string, boolean> = {};
    listings.forEach((listing, index) => {
      nextSelections[getEbayListingKey(listing, index)] = true;
    });
    setSelectedEbayListings(nextSelections);
  };

  const fileToBase64 = async (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        resolve(result.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, ''));
      };
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.readAsDataURL(file);
    });

  useEffect(() => {
    if (ebayRetryAfterSeconds <= 0) return;

    const timeout = setTimeout(() => {
      setEbayRetryAfterSeconds(seconds => Math.max(seconds - 1, 0));
    }, 1000);

    return () => clearTimeout(timeout);
  }, [ebayRetryAfterSeconds]);

  useEffect(() => {
    if (!ebayImageFile) {
      setEbayImagePreviewUrl(null);
      return;
    }

    const previewUrl = URL.createObjectURL(ebayImageFile);
    setEbayImagePreviewUrl(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [ebayImageFile]);

  const clearEbaySearchState = (): void => {
    setEbayListings([]);
    setSelectedEbayListings({});
    setEbayImageFile(null);
    if (ebayImageInputRef.current) {
      ebayImageInputRef.current.value = '';
    }
  };

  const selectedListings = ebayListings.filter((listing, index) => {
    const listingKey = getEbayListingKey(listing, index);
    return selectedEbayListings[listingKey] ?? true;
  });

  const selectedPricedListings = selectedListings.filter(
    (listing): listing is EbayListing & { price: number } => listing.price !== null
  );

  const selectedAveragePrice =
    selectedPricedListings.length > 0
      ? selectedPricedListings.reduce((sum, listing) => sum + listing.price, 0) /
        selectedPricedListings.length
      : null;

  const highestFetchedPrice =
    selectedPricedListings.length > 0
      ? selectedPricedListings.reduce(
          (max, listing) => Math.max(max, listing.price),
          selectedPricedListings[0].price
        )
      : null;

  const lowestFetchedPrice =
    selectedPricedListings.length > 0
      ? selectedPricedListings.reduce(
          (min, listing) => Math.min(min, listing.price),
          selectedPricedListings[0].price
        )
      : null;

  const ebaySearchMutation = useMutation({
    mutationFn: ({ title, limit }: { title: string; limit: number }) =>
      api.prize.searchEbayListings(title, limit),
    onSuccess: listings => {
      setEbayRetryAfterSeconds(0);
      setListingsAndSelections(listings);

      if (listings.length === 0) {
        toast({
          title: 'No eBay listings found',
          description: 'Try a shorter or different title.',
        });
      }
    },
    onError: (error: any) => {
      const statusCode = error?.response?.status;
      const retryAfterRaw =
        error?.response?.data?.retryAfterSeconds ??
        error?.response?.data?.message?.retryAfterSeconds;

      if (statusCode === 429) {
        const retryAfterSeconds = Math.max(1, Number(retryAfterRaw || 3));
        setEbayRetryAfterSeconds(retryAfterSeconds);
        toast({
          title: 'eBay lookup cooldown active',
          description: `Please retry in ${retryAfterSeconds} second${retryAfterSeconds === 1 ? '' : 's'}.`,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'eBay search failed',
        description: error?.response?.data?.message || error?.message || 'Could not reach eBay.',
        variant: 'destructive',
      });
    },
  });

  const ebayImageSearchMutation = useMutation({
    mutationFn: ({ imageBase64, limit }: { imageBase64: string; limit: number }) =>
      api.prize.searchEbayListingsByImage(imageBase64, limit),
    onSuccess: listings => {
      setEbayRetryAfterSeconds(0);
      setListingsAndSelections(listings);

      if (listings.length === 0) {
        toast({ title: 'No eBay listings found', description: 'Try a clearer card image.' });
      }
    },
    onError: (error: any) => {
      const statusCode = error?.response?.status;
      const retryAfterRaw =
        error?.response?.data?.retryAfterSeconds ??
        error?.response?.data?.message?.retryAfterSeconds;

      if (statusCode === 429) {
        const retryAfterSeconds = Math.max(1, Number(retryAfterRaw || 3));
        setEbayRetryAfterSeconds(retryAfterSeconds);
        toast({
          title: 'eBay lookup cooldown active',
          description: `Please retry in ${retryAfterSeconds} second${retryAfterSeconds === 1 ? '' : 's'}.`,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'eBay image search failed',
        description:
          error?.response?.data?.message || error?.message || 'Could not search by image.',
        variant: 'destructive',
      });
    },
  });

  const handleEbayImageSearch = async (): Promise<void> => {
    if (!ebayImageFile) {
      toast({ title: 'Image required', description: 'Upload an image before searching.' });
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(ebayImageFile.type)) {
      toast({
        title: 'Unsupported image type',
        description: 'Use JPG, PNG, or WEBP.',
        variant: 'destructive',
      });
      return;
    }

    const maxBytes = 3 * 1024 * 1024;
    if (ebayImageFile.size > maxBytes) {
      toast({
        title: 'Image too large',
        description: 'Use an image smaller than 3MB.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const imageBase64 = await fileToBase64(ebayImageFile);
      setEbayListings([]);
      setSelectedEbayListings({});
      ebayImageSearchMutation.mutate({ imageBase64, limit: ebayFetchLimit });
    } catch {
      toast({
        title: 'Image read failed',
        description: 'Could not read the uploaded image. Try another file.',
        variant: 'destructive',
      });
    }
  };

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
      cryptoPaymentsEnabled?: boolean;
      cryptoWalletAddress?: string | null;
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

  // Auto-open ship dialog when arriving from email with orderId param.
  // Also highlight the matching order card and scroll to it. The ship
  // dialog only auto-opens when the order is still pending shipment ('paid')
  // — for already-shipped orders we just scroll/highlight (the seller can
  // still click "View transaction" / "Edit shipping" themselves).
  const emailOrderId = searchParams.get('orderId');
  useEffect(() => {
    if (!emailOrderId || purchasedOrders.length === 0) return;
    const order = purchasedOrders.find(o => o.id === emailOrderId);
    if (!order) return;
    setHighlightedOrderId(order.id);
    setTimeout(() => {
      const el = soldItemRefs.current.get(order.id);
      (el ?? ordersRef.current)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    if (order.status === 'paid') {
      handleOpenShipDialog(order);
    }
    // Auto-clear the highlight after a few seconds so it acts as a
    // pulse/hint rather than a permanent state.
    const t = setTimeout(() => setHighlightedOrderId(null), 4000);
    return () => clearTimeout(t);
  }, [emailOrderId, purchasedOrders]);

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
      // Convert CadeCoins back to USD for display (50 coins = $1).
      //
      // Self-heal legacy items whose stored coin value is one or two off
      // from a clean whole-dollar price. Historically the seller form
      // displayed `Math.round(amount / 50)` so a value of 3999 coins
      // ($79.98) showed as "$80" and the seller assumed that's what was
      // saved. After the rounding was tightened, the same item now
      // honestly reads as $79.98, but if the seller intended $80 we
      // should let them re-save the listing without having to retype
      // the price. So: snap to the nearest whole dollar when the raw
      // USD value is within $0.05 of one. Anything further away
      // (e.g., $99.50) is treated as intentional and preserved at full
      // cent precision.
      amount: (() => {
        if (!item.amount) return 0;
        const usdRaw = Number(item.amount) / 50;
        const usdRoundedDollar = Math.round(usdRaw);
        if (Math.abs(usdRaw - usdRoundedDollar) <= 0.05) {
          return usdRoundedDollar;
        }
        return Math.round(usdRaw * 100) / 100;
      })(),
      stock: item.stock || 0,
      purchaseOption: item.purchaseOption || 'buy_only',
      brand: item.brand || 'pokemon',
      category: (item.category as 'raw' | 'slab' | 'sealed' | 'other') || 'slab',
      grade: (item as any).grade || '',
      sellerDisplayOrderShop: item.sellerDisplayOrderShop ?? item.displayOrderShop ?? 1,
      isProOnly: item.isProOnly ?? false,
      profileFeatured: item.profileFeatured ?? false,
      saleType: ((item as any).saleType as 'fixed_price' | 'auction') || 'fixed_price',
      auctionDurationDays: 3,
      auctionStartingPriceUsd: 0,
      auctionReservePriceUsd: 0,
      shippingCostUsd:
        (item as any).shippingCostUsd != null ? Number((item as any).shippingCostUsd) : 5,
      isInPerson: (item as any).isInPerson ?? false,
    });
    setItemImages(mappedImages);
    setCoverImageIndex(existingCoverIndex >= 0 ? existingCoverIndex : 0);
    // Scroll to the edit form so the user can see where editing takes place
    // Use a short timeout to allow the form to render/update before scrolling
    setTimeout(() => {
      if (itemFormRef.current) {
        itemFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 0);
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setPsaImportResult(null);
    setIsGradeAutofillFailed(false);
    setForm({
      name: '',
      description: '',
      imageUrl: '',
      amount: 0,
      stock: 1,
      purchaseOption: 'both',
      brand: 'pokemon',
      category: 'slab',
      grade: '',
      sellerDisplayOrderShop: 1,
      isProOnly: false,
      profileFeatured: false,
      saleType: 'fixed_price',
      auctionDurationDays: 3,
      auctionStartingPriceUsd: 0,
      auctionReservePriceUsd: 0,
      shippingCostUsd: 5,
      isInPerson: false,
    });
    setItemImages([]);
    setCoverImageIndex(0);
  };

  // Auto-open the edit form when arriving with ?editItemId=<id> (e.g. from a
  // PrizeCard "Edit Item" link on the public shop page). Triggers once per id.
  const editItemIdParam = searchParams.get('editItemId');
  const handledEditParamRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (!editItemIdParam || items.length === 0) return;
    if (handledEditParamRef.current === editItemIdParam) return;
    if (editingItemId === editItemIdParam) {
      handledEditParamRef.current = editItemIdParam;
      return;
    }
    const item = items.find(i => i.id === editItemIdParam);
    if (item) {
      handledEditParamRef.current = editItemIdParam;
      handleEditItem(item);
    }
  }, [editItemIdParam, items, editingItemId]);

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

  const liveItems = filteredItems.filter(item => (item.stock ?? 0) > 0);
  const outOfStockItems = filteredItems.filter(item => (item.stock ?? 0) === 0);

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

                  {isCardCadeMode && (
                    <div className="grid gap-3 rounded-md border border-border/60 bg-muted/30 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="grid gap-1">
                          <Label className="text-sm font-semibold">
                            Accept USDC payments (Solana)
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            When enabled, buyers will see a “Pay with USDC” option at checkout for
                            CardCade items. Funds settle directly to the treasury wallet below.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 cursor-pointer"
                          checked={cardcadeCryptoEnabled}
                          onChange={e => setCardcadeCryptoEnabled(e.target.checked)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-xs">Treasury wallet address (Solana)</Label>
                        <Input
                          placeholder="e.g., 5jCkjBbs2or7v7gnM1XjK32fs99kC2R2f5jPuvU2K4ab"
                          value={cardcadeCryptoWallet}
                          onChange={e => setCardcadeCryptoWallet(e.target.value)}
                          spellCheck={false}
                          autoCorrect="off"
                          autoCapitalize="off"
                        />
                        <p className="text-xs text-muted-foreground">
                          Base58 Solana address that will receive USDC for CardCade orders. Required
                          when the toggle above is on.
                        </p>
                      </div>
                      {cardcadeCryptoEnabled && !cardcadeCryptoWallet.trim() && (
                        <p className="text-xs text-destructive">
                          Add a wallet address before enabling USDC checkout — buyers won’t see the
                          option until both are set.
                        </p>
                      )}
                    </div>
                  )}

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
                          setCardcadeCryptoEnabled(!!cardcadeSettings.cryptoPaymentsEnabled);
                          setCardcadeCryptoWallet(cardcadeSettings.cryptoWalletAddress || '');
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
                            ? {
                                profileImageUrl: shopProfileImageUrl ?? undefined,
                                cryptoPaymentsEnabled: cardcadeCryptoEnabled,
                                cryptoWalletAddress: cardcadeCryptoWallet.trim() || null,
                              }
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
              <Card className="order-2 lg:order-1" ref={itemFormRef}>
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
                    <Label>PSA Cert Number</Label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        placeholder="Enter PSA cert number"
                        value={psaCertNumber}
                        onChange={e => setPsaCertNumber(e.target.value)}
                        disabled={isPsaRateLimitActive(psaRateLimitedUntil)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => psaImportMutation.mutate(psaCertNumber)}
                        disabled={
                          psaImportMutation.isPending ||
                          !psaCertNumber.trim() ||
                          isPsaRateLimitActive(psaRateLimitedUntil)
                        }
                      >
                        {psaImportMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : null}
                        Autofill from PSA
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pulls the title, grade, and available PSA images into the listing form.
                    </p>
                    {isPsaRateLimitActive(psaRateLimitedUntil) && (
                      <p className="text-xs text-destructive">{PSA_RATE_LIMIT_MESSAGE}</p>
                    )}

                    {psaImportResult && (
                      <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-muted-foreground space-y-2">
                        <div className="font-semibold text-foreground">PSA Import Summary</div>
                        <div>
                          Population (
                          {psaImportResult.cardGrade
                            ? `PSA ${psaImportResult.cardGrade}`
                            : 'this grade'}
                          ):{' '}
                          {psaImportResult.psaPopulation?.gradePopulation !== null &&
                          psaImportResult.psaPopulation?.gradePopulation !== undefined
                            ? new Intl.NumberFormat().format(
                                psaImportResult.psaPopulation.gradePopulation
                              )
                            : 'N/A'}
                        </div>
                        <div>
                          <a
                            href={
                              psaImportResult.psaCertUrl ||
                              `https://www.psacard.com/cert/${encodeURIComponent(psaImportResult.certNumber)}/psa`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline underline-offset-2"
                          >
                            View on PSA
                          </a>
                        </div>

                        <div className="pt-1">
                          <div className="font-semibold text-foreground">Item Information</div>
                          <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                            <div className="text-foreground">
                              <span className="text-muted-foreground">Cert Number:</span>{' '}
                              {psaImportResult.itemInformation?.certNumber || 'N/A'}
                            </div>
                            <div className="text-foreground">
                              <span className="text-muted-foreground">Item Grade:</span>{' '}
                              {psaImportResult.itemInformation?.itemGrade ?? 'N/A'}
                            </div>
                            <div className="text-foreground">
                              <span className="text-muted-foreground">Brand/Title:</span>{' '}
                              {psaImportResult.itemInformation?.brandTitle ?? 'N/A'}
                            </div>
                            <div className="text-foreground">
                              <span className="text-muted-foreground">Subject:</span>{' '}
                              {psaImportResult.itemInformation?.subject ?? 'N/A'}
                            </div>
                            <div className="text-foreground">
                              <span className="text-muted-foreground">Variety/Pedigree:</span>{' '}
                              {psaImportResult.itemInformation?.varietyPedigree ?? 'N/A'}
                            </div>
                            <div className="text-foreground">
                              <span className="text-muted-foreground">Year:</span>{' '}
                              {psaImportResult.itemInformation?.year ?? 'N/A'}
                            </div>
                            <div className="text-foreground">
                              <span className="text-muted-foreground">Card Number:</span>{' '}
                              {psaImportResult.itemInformation?.cardNumber ?? 'N/A'}
                            </div>
                            <div className="text-foreground">
                              <span className="text-muted-foreground">Category:</span>{' '}
                              {psaImportResult.itemInformation?.category ?? 'N/A'}
                            </div>
                            <div className="text-foreground">
                              <span className="text-muted-foreground">Label Type:</span>{' '}
                              {psaImportResult.itemInformation?.labelType ?? 'N/A'}
                            </div>
                            <div className="text-foreground">
                              <span className="text-muted-foreground">Reverse Cert/Barcode:</span>{' '}
                              {psaImportResult.itemInformation?.reverseCertBarcode ?? 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label>
                      Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="e.g., Charizard PSA 10"
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    />
                    {canUseEbaySearch && (
                      <>
                        <div className="rounded-md border border-border/80 bg-muted/20 p-2 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Fetch</span>
                            <Select
                              value={String(ebayFetchLimit)}
                              onValueChange={value => setEbayFetchLimit(Number(value))}
                            >
                              <SelectTrigger className="h-8 w-[84px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ebayFetchLimitOptions.map(value => (
                                  <SelectItem key={value} value={String(value)}>
                                    {value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {ebayListings.length > 0 && (
                              <button
                                type="button"
                                className="text-xs text-muted-foreground hover:text-foreground"
                                onClick={clearEbaySearchState}
                              >
                                Clear
                              </button>
                            )}
                          </div>

                          <div className="grid gap-2 rounded-md border border-border/70 bg-background/70 p-2">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              Title Search
                            </p>
                            <button
                              type="button"
                              className="w-fit text-xs text-blue-500 hover:text-blue-400 disabled:opacity-50 flex items-center gap-1"
                              disabled={
                                ebaySearchMutation.isPending ||
                                ebayImageSearchMutation.isPending ||
                                ebayRetryAfterSeconds > 0 ||
                                !form.name.trim()
                              }
                              onClick={() => {
                                setEbayListings([]);
                                setSelectedEbayListings({});
                                ebaySearchMutation.mutate({
                                  title: form.name.trim(),
                                  limit: ebayFetchLimit,
                                });
                              }}
                            >
                              {ebaySearchMutation.isPending
                                ? 'Searching active eBay listings...'
                                : ebayRetryAfterSeconds > 0
                                  ? `Retry in ${ebayRetryAfterSeconds}s`
                                  : 'Search active eBay listings'}
                            </button>

                            {!form.name.trim() && (
                              <p className="text-xs text-muted-foreground">
                                Enter a name above to enable title search.
                              </p>
                            )}
                          </div>

                          <div className="grid gap-2 rounded-md border border-border/70 bg-background/70 p-2">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              Image Search
                            </p>
                            <Input
                              ref={ebayImageInputRef}
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="h-8 max-w-[260px] text-xs"
                              onChange={e => setEbayImageFile(e.target.files?.[0] || null)}
                            />
                            {ebayImageFile && (
                              <div className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/30 p-2">
                                {ebayImagePreviewUrl ? (
                                  <img
                                    src={ebayImagePreviewUrl}
                                    alt="Selected eBay search"
                                    className="h-12 w-12 rounded object-cover"
                                  />
                                ) : (
                                  <div className="h-12 w-12 rounded bg-muted" />
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-foreground truncate">
                                    {ebayImageFile.name}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {(ebayImageFile.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                              </div>
                            )}
                            <button
                              type="button"
                              className="w-fit text-xs text-blue-500 hover:text-blue-400 disabled:opacity-50 flex items-center gap-1"
                              disabled={
                                ebayImageSearchMutation.isPending ||
                                ebaySearchMutation.isPending ||
                                ebayRetryAfterSeconds > 0 ||
                                !ebayImageFile
                              }
                              onClick={() => {
                                void handleEbayImageSearch();
                              }}
                            >
                              {ebayImageSearchMutation.isPending
                                ? 'Searching by image...'
                                : ebayRetryAfterSeconds > 0
                                  ? `Retry in ${ebayRetryAfterSeconds}s`
                                  : 'Search by image'}
                            </button>
                          </div>
                        </div>
                        {ebayRetryAfterSeconds > 0 && (
                          <p className="text-xs text-amber-400">
                            Rate limit active to protect eBay API. You can search again in{' '}
                            {ebayRetryAfterSeconds}s.
                          </p>
                        )}
                      </>
                    )}
                    {canUseEbaySearch && ebayListings.length > 0 && (
                      <div className="mt-1 space-y-2 rounded-md border border-border bg-muted/40 p-2">
                        <div className="rounded-md border border-border/70 bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                          <div>
                            Selected:{' '}
                            <span className="font-medium text-foreground">
                              {selectedListings.length}
                            </span>
                            {' / '}
                            <span className="font-medium text-foreground">
                              {ebayListings.length}
                            </span>
                          </div>
                          <div className="mt-1">
                            Highest selected:{' '}
                            <span className="font-semibold text-[#FF5C8A]">
                              {highestFetchedPrice != null
                                ? `$${highestFetchedPrice.toFixed(2)}`
                                : 'N/A'}
                            </span>
                          </div>
                          <div className="mt-1">
                            Average price:{' '}
                            <span className="font-semibold text-[#39FF14]">
                              {selectedAveragePrice != null
                                ? `$${selectedAveragePrice.toFixed(2)}`
                                : 'N/A'}
                            </span>
                          </div>
                          <div className="mt-1">
                            Lowest selected:{' '}
                            <span className="font-semibold text-[#2ED3FF]">
                              {lowestFetchedPrice != null
                                ? `$${lowestFetchedPrice.toFixed(2)}`
                                : 'N/A'}
                            </span>
                          </div>
                          <div className="mt-1">
                            Uncheck incorrect listings to refine the average.
                          </div>
                        </div>

                        <div className="max-h-[430px] overflow-y-auto pr-1">
                          {ebayListings.map((listing, i) => {
                            const listingKey = getEbayListingKey(listing, i);
                            const isSelected = selectedEbayListings[listingKey] ?? true;

                            return (
                              <div
                                key={listingKey}
                                className={cn(
                                  'flex items-start gap-3 rounded-md p-2 hover:bg-muted transition-colors',
                                  !isSelected && 'opacity-60'
                                )}
                              >
                                <div className="pt-0.5" onClick={e => e.stopPropagation()}>
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={checked => {
                                      setSelectedEbayListings(prev => ({
                                        ...prev,
                                        [listingKey]: !!checked,
                                      }));
                                    }}
                                    aria-label={`Select listing ${i + 1}`}
                                  />
                                </div>
                                <a
                                  href={listing.itemWebUrl ?? '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex gap-3 min-w-0 flex-1"
                                >
                                  {listing.imageUrl && (
                                    <img
                                      src={listing.imageUrl}
                                      alt={listing.title ?? ''}
                                      className="h-14 w-14 rounded object-cover flex-shrink-0"
                                    />
                                  )}
                                  <div className="min-w-0 flex-1 text-xs">
                                    <p className="font-medium leading-tight line-clamp-2">
                                      {listing.title}
                                    </p>
                                    <p className="text-muted-foreground mt-0.5">
                                      <span className="font-semibold text-[#39FF14]">
                                        {listing.price != null
                                          ? `$${listing.price.toFixed(2)} ${listing.currency ?? ''}`.trim()
                                          : 'Price N/A'}
                                      </span>
                                      {listing.grade || listing.condition
                                        ? ` · ${listing.grade || listing.condition}`
                                        : ''}
                                    </p>
                                    <p className="text-muted-foreground">
                                      {listing.buyingOptions.join(' / ')}
                                    </p>
                                  </div>
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/*
                   * Sale Type — Auction option only shown for users that
                   * an admin has flipped `auctionsEnabled` on for. When
                   * an item is being edited we don't allow changing the
                   * type (auctions are 1-of-1 and tied to an Auction row).
                   */}
                  {!editingItemId && session?.auctionsEnabled && (
                    <div className="grid gap-2">
                      <Label>
                        Sale Type <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={form.saleType}
                        onValueChange={(value: 'fixed_price' | 'auction') =>
                          setForm(p => ({ ...p, saleType: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select sale type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed_price">Fixed Price / Offers</SelectItem>
                          <SelectItem value="auction">Auction</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {form.saleType === 'auction' ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>
                            Starting Bid (USD) <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            step="0.01"
                            placeholder="0.00"
                            value={form.auctionStartingPriceUsd || ''}
                            onChange={e =>
                              setForm(p => ({
                                ...p,
                                auctionStartingPriceUsd:
                                  e.target.value === '' ? 0 : Number(e.target.value),
                              }))
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>
                            Duration <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={String(form.auctionDurationDays)}
                            onValueChange={(value: string) =>
                              setForm(p => ({
                                ...p,
                                auctionDurationDays: Number(value) as 1 | 3 | 5 | 7,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 day</SelectItem>
                              <SelectItem value="3">3 days</SelectItem>
                              <SelectItem value="5">5 days</SelectItem>
                              <SelectItem value="7">7 days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label>Reserve Price (USD, optional)</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="Leave blank for no reserve"
                          value={form.auctionReservePriceUsd || ''}
                          onChange={e =>
                            setForm(p => ({
                              ...p,
                              auctionReservePriceUsd:
                                e.target.value === '' ? 0 : Number(e.target.value),
                            }))
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          If the highest bid does not reach the reserve, the auction ends without a
                          sale. Auctions list as 1-of-1.
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>
                          Price (USD)
                          {form.purchaseOption !== 'offers_only' && (
                            <span className="text-red-500"> *</span>
                          )}
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          step={0.01}
                          placeholder="0"
                          value={form.amount || ''}
                          onChange={e =>
                            setForm(p => ({
                              ...p,
                              amount: e.target.value === '' ? 0 : Number(e.target.value),
                            }))
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0 = unlimited"
                          value={form.stock || ''}
                          onChange={e =>
                            setForm(p => ({
                              ...p,
                              stock: e.target.value === '' ? 0 : Number(e.target.value),
                            }))
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/*
                   * In-Person Pickup. When toggled on, shipping is forced
                   * to $0 (we still show the editable input below in case
                   * the seller wants to override) AND the buyer is not
                   * asked for a shipping address at checkout / offer time.
                   */}
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between rounded-md border p-3">
                      <div className="space-y-0.5">
                        <Label className="text-base">In-Person Pickup</Label>
                        <p className="text-xs text-muted-foreground">
                          Buyer picks up locally. No shipping address is collected and shipping
                          defaults to $0 (you can still override the cost below).
                        </p>
                      </div>
                      <Switch
                        checked={form.isInPerson}
                        onCheckedChange={(checked: boolean) =>
                          setForm(p => ({
                            ...p,
                            isInPerson: checked,
                            // Toggling ON drops shipping to $0 by default;
                            // the seller can still raise it manually if
                            // they want to charge a delivery fee.
                            shippingCostUsd: checked ? 0 : p.shippingCostUsd,
                          }))
                        }
                      />
                    </div>
                  </div>

                  {/*
                   * Per-item shipping fee. Applies to every sale type —
                   * fixed-price checkout, offers, and auction close all add
                   * this on top of the buyer total. Defaults to $5; setting
                   * it to 0 advertises Free Shipping on the storefront.
                   */}
                  <div className="grid gap-2">
                    <Label>
                      Shipping Cost (USD) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="5.00"
                      value={form.shippingCostUsd ?? ''}
                      onChange={e => {
                        const raw = e.target.value;
                        setForm(p => ({
                          ...p,
                          shippingCostUsd: raw === '' ? 0 : Math.max(0, parseFloat(raw) || 0),
                        }));
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Charged to the buyer on top of the sale price (or winning bid for auctions).
                      Defaults to $5.00. Enter 0 to offer Free Shipping.
                    </p>
                  </div>

                  {form.saleType !== 'auction' && (
                    <div className="grid gap-2">
                      <Label>
                        Purchase Option <span className="text-red-500">*</span>
                      </Label>
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
                  )}
                  <div className="grid gap-2">
                    <Label>
                      Card Type <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={form.brand}
                      onValueChange={(value: PrizeBrand) =>
                        setForm(p => ({
                          ...p,
                          brand: value,
                          grade: p.category === 'raw' ? '' : p.grade,
                        }))
                      }
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
                    <Label>
                      Format <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={form.category}
                      onValueChange={(value: 'raw' | 'slab' | 'sealed' | 'other') => {
                        setIsGradeAutofillFailed(false);
                        setForm(p => ({ ...p, category: value, grade: '' }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="raw">Raw</SelectItem>
                        <SelectItem value="slab">Slab</SelectItem>
                        <SelectItem value="sealed">Sealed</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Conditional Grade selector */}
                  {form.category === 'raw' && (
                    <div className="grid gap-2">
                      <Label>
                        Condition <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={form.grade}
                        onValueChange={(value: string) => setForm(p => ({ ...p, grade: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                        <SelectContent>
                          {form.brand === 'sports' ? (
                            <>
                              <SelectItem value="MT">MT - Mint</SelectItem>
                              <SelectItem value="NM">NM - Near Mint</SelectItem>
                              <SelectItem value="EX">EX - Excellent</SelectItem>
                              <SelectItem value="VG">VG - Very Good</SelectItem>
                              <SelectItem value="GD">GD - Good</SelectItem>
                              <SelectItem value="PR">PR - Poor</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="NM">NM - Near Mint</SelectItem>
                              <SelectItem value="LP">LP - Lightly Played</SelectItem>
                              <SelectItem value="MP">MP - Moderately Played</SelectItem>
                              <SelectItem value="HP">HP - Heavily Played</SelectItem>
                              <SelectItem value="DMG">DMG - Damaged</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {form.category === 'slab' && (
                    <div className="grid gap-2">
                      <Label>
                        Grade <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="Enter grade between 1 and 10"
                        value={form.grade}
                        className={cn(
                          isGradeAutofillFailed && 'border-destructive ring-2 ring-destructive/40'
                        )}
                        onChange={e => {
                          setIsGradeAutofillFailed(false);
                          setForm(p => ({ ...p, grade: e.target.value }));
                        }}
                        onBlur={e => {
                          setIsGradeAutofillFailed(false);
                          const raw = e.target.value.trim();
                          if (raw === '') {
                            setForm(p => ({ ...p, grade: '' }));
                            return;
                          }
                          const parsed = Number(raw);
                          if (Number.isNaN(parsed)) {
                            setForm(p => ({ ...p, grade: '' }));
                            return;
                          }
                          // Clamp between 1 and 10
                          let clamped = Math.min(10, Math.max(1, parsed));
                          // Whole numbers stay; any decimal becomes the .5 step
                          const normalized = Number.isInteger(clamped)
                            ? clamped
                            : Math.min(9.5, Math.floor(clamped) + 0.5);
                          setForm(p => ({ ...p, grade: String(normalized) }));
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Allowed grades: 1, 1.5, 2, 2.5 ... 9.5, 10
                      </p>
                    </div>
                  )}

                  <div className="grid gap-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Label details about the item here like any rips or tears, wear, damage, or anything else that is important to share"
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
                      value={form.sellerDisplayOrderShop || ''}
                      onChange={e =>
                        setForm(p => ({
                          ...p,
                          sellerDisplayOrderShop:
                            e.target.value === '' ? 0 : Number(e.target.value),
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Lower numbers show first (e.g. 1 shows before 2).
                    </p>
                  </div>

                  {psaCertNumber.trim() && (
                    <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                      PSA cert {psaCertNumber.trim()} is ready to import or update.
                    </div>
                  )}

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

                  {session?.isProSubscriber && (
                    <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium text-primary">
                          Feature on Profile
                        </Label>
                        <p className="text-xs text-gray-400">
                          Highlight this item on your profile page for visitors to see.
                        </p>
                      </div>
                      <Switch
                        checked={form.profileFeatured}
                        onCheckedChange={checked =>
                          setForm(p => ({ ...p, profileFeatured: checked }))
                        }
                      />
                    </div>
                  )}

                  <div className="space-y-2.5">
                    <ItemImageGallery
                      images={itemImages}
                      coverIndex={coverImageIndex}
                      onImagesChange={setItemImages}
                      onCoverIndexChange={setCoverImageIndex}
                      maxImages={IMAGE_UPLOAD_CONFIG.ITEM_MAX_IMAGES}
                      disabled={isUploading || createItem.isPending}
                    />
                    <p className="text-xs text-muted-foreground">
                      Drag to reorder photos. Use the star button to choose cover photo.
                    </p>
                    <p className="rounded-md border border-[#D4FF00]/40 bg-[#D4FF00]/10 px-3 py-2 text-xs font-semibold text-[#D4FF00]">
                      You can import PSA cert details and images first, then make any manual edits
                      before saving the listing.
                    </p>
                  </div>

                  <Button
                    onClick={() => createItem.mutate()}
                    disabled={
                      createItem.isPending ||
                      !form.name ||
                      (form.saleType === 'auction'
                        ? form.auctionStartingPriceUsd <= 0
                        : form.purchaseOption !== 'offers_only' && form.amount <= 0) ||
                      itemImages.length === 0 ||
                      isUploading
                    }
                    className="w-full"
                  >
                    {createItem.isPending || isUploading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    {isUploading
                      ? 'Uploading...'
                      : editingItemId
                        ? 'Update Item'
                        : form.saleType === 'auction'
                          ? 'Start Auction'
                          : 'Add Item'}
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
                ) : liveItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No in-stock items match your search.
                  </p>
                ) : (
                  liveItems.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between border rounded-md p-3"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          ${item.amount ? (item.amount / 50).toFixed(2) : '0.00'} USD • Stock{' '}
                          {item.stock}
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
              <Card className="h-fit" ref={ordersRef}>
                <CardHeader>
                  <CardTitle>Sold Items</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Items that have been purchased by buyers. Mark them as shipped once sent.
                  </p>
                  <div className="relative pt-2">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="search"
                      value={soldItemsSearch}
                      onChange={e => setSoldItemsSearch(e.target.value)}
                      placeholder="Search by item, buyer, address, or tracking..."
                      className="pl-9"
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isPurchasedOrdersLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading purchases...
                    </div>
                  ) : purchasedOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No purchases yet.</p>
                  ) : filteredPurchasedOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No purchases match "{soldItemsSearch}".
                    </p>
                  ) : (
                    <>
                      {paginatedPurchasedOrders.map(order => {
                        const ship = order.shippingAddress;
                        const recipient = ship
                          ? [ship.firstName, ship.lastName].filter(Boolean).join(' ').trim()
                          : '';
                        const cityStateZip = ship
                          ? [ship.city, ship.state].filter(Boolean).join(', ') +
                            (ship.zipCode ? ` ${ship.zipCode}` : '')
                          : '';
                        const reviewSide = reviewSideByOrderId.get(order.id);
                        return (
                          <div
                            key={order.id}
                            ref={el => {
                              soldItemRefs.current.set(order.id, el);
                            }}
                            className={cn(
                              'border rounded-md p-3 space-y-3 transition-shadow',
                              highlightedOrderId === order.id &&
                                'ring-2 ring-[#7AFF14]/60 border-[#7AFF14]/40 shadow-[0_0_0_1px_#7AFF14]'
                            )}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="font-medium">
                                  {order.prizeConfiguration?.name || 'Shop Item'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Buyer:{' '}
                                  {order.user?.firstName && order.user?.lastName
                                    ? `${order.user.firstName} ${order.user.lastName} (${order.user?.username || 'Unknown'})`
                                    : order.user?.username || 'Unknown'}{' '}
                                  • Ordered: {new Date(order.createdAt).toLocaleDateString()}
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

                            {ship ? (
                              order.status === 'paid' ? (
                                <div className="rounded-md bg-muted/40 border border-border/50 p-2 text-xs space-y-0.5">
                                  <div className="font-medium text-foreground">
                                    Ship to{recipient ? `: ${recipient}` : ''}
                                  </div>
                                  {ship.addressLine1 && <div>{ship.addressLine1}</div>}
                                  {ship.addressLine2 && <div>{ship.addressLine2}</div>}
                                  {cityStateZip && <div>{cityStateZip}</div>}
                                  {ship.country && <div>{ship.country}</div>}
                                  {order.user?.email && (
                                    <div className="text-muted-foreground pt-0.5">
                                      Buyer email: {order.user.email}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground italic">
                                  Shipping address hidden after shipment.
                                </div>
                              )
                            ) : (
                              <div className="text-xs italic text-muted-foreground">
                                No shipping address on file.
                              </div>
                            )}

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

                            {reviewSide?.existingReview && (
                              <div className="rounded-md border border-[#23272F] bg-[#0D0D0D]/40 p-2 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <StarRating
                                      value={reviewSide.existingReview.rating}
                                      size={14}
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      Review from buyer
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-muted-foreground">
                                    {new Date(
                                      reviewSide.existingReview.updatedAt ??
                                        reviewSide.existingReview.createdAt
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                                {reviewSide.existingReview.comment && (
                                  <p className="text-xs text-foreground/80 whitespace-pre-wrap">
                                    {reviewSide.existingReview.comment}
                                  </p>
                                )}
                              </div>
                            )}

                            {order.status === 'paid' ? (
                              <div className="flex flex-col gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenShipDialog(order)}
                                  className="w-full"
                                >
                                  <ShoppingCart className="w-4 h-4 mr-2" />
                                  Mark as Shipped
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedSaleTransaction(order)}
                                  className="w-full"
                                >
                                  <Receipt className="w-4 h-4 mr-2" />
                                  View transaction
                                </Button>
                                {reviewSide && (
                                  <ReviewOrderButton side={reviewSide} onOpen={setReviewOrderId} />
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="text-xs text-muted-foreground">
                                  {order.shippedAt && (
                                    <>
                                      Shipped on: {new Date(order.shippedAt).toLocaleDateString()}
                                    </>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {reviewSide && (
                                    <ReviewOrderButton
                                      side={reviewSide}
                                      onOpen={setReviewOrderId}
                                    />
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setSelectedSaleTransaction(order)}
                                  >
                                    <Receipt className="w-4 h-4 mr-2" />
                                    View transaction
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {soldItemsPageCount > 1 && (
                        <div className="flex items-center justify-between pt-2">
                          <div className="text-xs text-muted-foreground">
                            Page {soldItemsPage} of {soldItemsPageCount} •{' '}
                            {filteredPurchasedOrders.length} total
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSoldItemsPage(p => Math.max(1, p - 1))}
                              disabled={soldItemsPage === 1}
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setSoldItemsPage(p => Math.min(soldItemsPageCount, p + 1))
                              }
                              disabled={soldItemsPage === soldItemsPageCount}
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Out of Stock</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {outOfStockItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No out of stock items.</p>
                ) : (
                  outOfStockItems.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between border rounded-md p-3 opacity-60"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          ${item.amount ? (item.amount / 50).toFixed(2) : '0.00'} USD • Stock{' '}
                          {item.stock}
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
            <OrderItemDetailDialog
              open={!!selectedSaleTransaction}
              onOpenChange={open => {
                if (!open) setSelectedSaleTransaction(null);
              }}
              transaction={
                selectedSaleTransaction as unknown as Parameters<
                  typeof OrderItemDetailDialog
                >[0]['transaction']
              }
              variant="sale"
            />
            <LeaveReviewDialog
              open={!!reviewOrderId}
              orderId={reviewOrderId}
              onOpenChange={open => {
                if (!open) setReviewOrderId(null);
              }}
              invalidateQueryKeys={[['my-reviewable-orders'], ['seller-shop-orders-manage']]}
            />
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
