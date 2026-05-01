import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SearchInput } from '@/components/ui/SearchInput';
import { useToast } from '@/hooks/use-toast';
import { useAdminPrizeTiers } from '@/hooks/usePrizeConfig';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { api } from '@/integrations/api/client';
import { handleMutationError } from '@/lib/mutationHelpers';
import { Loader2, Plus, Trash2, Edit, AlertCircle, GripVertical, Gavel } from 'lucide-react';
import {
  PrizeConfiguration as PrizeTier,
  CreatePrizeTierRequest,
  UpdatePrizeTierRequest,
  PrizeBrand,
  Seller,
} from '@/types/prize';
import { ItemImageGallery, type ItemImageInput } from '@/components/items/ItemImageGallery';
import { IMAGE_UPLOAD_CONFIG } from '@/utils/imageUploadConstants';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getMessage } from '@/utils/helper';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Helper function to get purchase option badge styling
const getPurchaseOptionBadge = (purchaseOption: 'both' | 'buy_only' | 'offers_only') => {
  switch (purchaseOption) {
    case 'both':
      return {
        label: 'Both Options',
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100 border-blue-200',
      };
    case 'buy_only':
      return {
        label: 'Buy Only',
        className:
          'bg-red-300 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-100 border-indigo-200',
      };
    case 'offers_only':
      return {
        label: 'Make Offer Only',
        className:
          'bg-orange-300 text-orange-900 dark:bg-orange-900 dark:text-orange-100 border-orange-200',
      };
    default:
      // Fallback so an unrecognized value never returns undefined and
      // crashes the admin grid (`.className` access on undefined).
      return {
        label: String(purchaseOption ?? 'Unknown'),
        className: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100',
      };
  }
};

// Helper function to get category badge styling
const getCategoryBadge = (category: 'raw' | 'slab' | 'sealed' | 'other') => {
  switch (category) {
    case 'raw':
      return {
        label: 'Raw',
        className: 'bg-sky-300 text-sky-900 dark:bg-sky-900 dark:text-sky-100',
      };
    case 'slab':
      return {
        label: 'Slab',
        className: 'bg-purple-300 text-purple-900 dark:bg-purple-900 dark:text-purple-100',
      };
    case 'sealed':
      return {
        label: 'Sealed',
        className: 'bg-yellow-200 text-yellow-900 dark:bg-emerald-900 dark:text-emerald-100',
      };
    case 'other':
      return {
        label: 'Other',
        className: 'bg-zinc-300 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100',
      };
    default:
      // Defensive fallback for any future category values so the entire
      // admin page doesn't blank out on `.className` of undefined.
      return {
        label: String(category ?? 'Unknown'),
        className: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100',
      };
  }
};

// Sortable Prize Item Component
interface SortablePrizeItemProps {
  tier: PrizeTier;
  position: number;
  changes: {
    displayOrderShop: number;
    displayOrderRedemptions: number;
    featuredDisplayOrder: number | null;
    isFeatured: boolean;
  };
  onToggleFeatured: (id: string, featured: boolean) => void;
  onFeaturedOrderChange: (id: string, order: number) => void;
  hasDuplicateFeaturedOrder: boolean;
  selectedPage: 'shop' | 'redemptions' | 'auctions';
  isSelected?: boolean;
  onSelectChange?: (id: string, selected: boolean) => void;
}

const SortablePrizeItem = ({
  tier,
  position,
  changes,
  onToggleFeatured,
  onFeaturedOrderChange,
  hasDuplicateFeaturedOrder,
  selectedPage,
  isSelected = false,
  onSelectChange,
}: SortablePrizeItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tier.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 p-4 border-2 rounded-lg transition-colors ${isSelected ? 'border-blue-500 bg-blue-950 dark:bg-blue-900' : 'border-border hover:bg-secondary/50'}`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing flex-shrink-0"
      >
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </div>

      {/* Position indicator */}
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-primary/10 rounded-full">
        <span className="text-sm font-bold">{position}</span>
      </div>

      {/* Prize info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-base">{tier.name}</h3>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm text-muted-foreground">
            {tier.amount.toLocaleString('en-US')} coins
          </p>
          <span
            className={`text-xs px-2 py-1 rounded font-medium ${
              tier.stock > 0
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100'
                : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100'
            }`}
          >
            Stock: {tier.stock}
          </span>
          <Badge
            variant="outline"
            className={`text-xs ${getCategoryBadge(tier.category).className}`}
          >
            {getCategoryBadge(tier.category).label}
          </Badge>
          <Badge
            variant="outline"
            className={`text-xs ${getPurchaseOptionBadge(tier.purchaseOption).className}`}
          >
            {getPurchaseOptionBadge(tier.purchaseOption).label}
          </Badge>
          {tier.createdBy && (
            <Badge
              variant="outline"
              className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-100 border-purple-200"
            >
              Seller Item
            </Badge>
          )}
        </div>
        {tier.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-1">{tier.description}</p>
        )}
      </div>

      {/* Featured toggle and order input - Shop page only */}
      {selectedPage === 'shop' && (
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Featured</Label>
            <Switch
              checked={changes.isFeatured}
              onCheckedChange={checked => onToggleFeatured(tier.id, checked)}
            />
          </div>

          {changes.isFeatured && (
            <div className="flex items-center gap-1">
              <Label className="text-xs whitespace-nowrap">Order:</Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={changes.featuredDisplayOrder ?? ''}
                  onChange={e => {
                    if (e.target.value === '') {
                      onFeaturedOrderChange(tier.id, 1);
                      return;
                    }
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= 1) {
                      onFeaturedOrderChange(tier.id, value);
                    }
                  }}
                  className="w-16 h-8 text-sm"
                />
                {hasDuplicateFeaturedOrder && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Duplicate order - items will be sorted by ID</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const PrizeConfiguration = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tiers, isLoading } = useAdminPrizeTiers();

  // Fetch sellers for dropdown
  const { data: sellers = [] } = useQuery<Seller[]>({
    queryKey: ['admin-sellers'],
    queryFn: () => api.admin.getSellers(),
  });

  // Dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<PrizeTier | null>(null);
  const [deletingTier, setDeletingTier] = useState<PrizeTier | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [itemImages, setItemImages] = useState<ItemImageInput[]>([]);
  const [coverImageIndex, setCoverImageIndex] = useState(0);

  /**
   * Admin auction details (winner + shipping address) for the item
   * currently in the edit dialog. Only fires for auction items that
   * have an associated auction record. Background-refetched every time
   * the dialog opens so a freshly-paid auction's address shows up
   * without a manual refresh.
   */
  const editingAuctionId = editingTier?.auction?.id ?? null;
  const { data: editingAuctionDetails } = useQuery({
    queryKey: ['adminAuctionDetails', editingAuctionId],
    queryFn: () => api.auction.getAdminDetails(editingAuctionId as string),
    enabled: !!editingAuctionId,
    staleTime: 30 * 1000,
  });

  // Display order editing state
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [selectedPage, setSelectedPage] = useState<'shop' | 'redemptions' | 'auctions'>('shop');
  const [orderChanges, setOrderChanges] = useState<
    Map<
      string,
      {
        displayOrderShop: number;
        displayOrderRedemptions: number;
        featuredDisplayOrder: number | null;
        isFeatured: boolean;
      }
    >
  >(new Map());
  const [searchQuery, setSearchQuery] = useState('');

  // Sorting preference state (initialized from first prize in data)
  const [sortByPurchaseOption, setSortByPurchaseOption] = useState({
    shop: tiers?.[0]?.sortByPurchaseOptionShop ?? false,
    redemptions: tiers?.[0]?.sortByPurchaseOptionRedemptions ?? false,
  });

  // Bulk selection state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = useState(false);
  const [bulkAssignSeller, setBulkAssignSeller] = useState<string | null>(null);

  // Validation state
  const [validationError, setValidationError] = useState<string>('');
  const [usdAmount, setUsdAmount] = useState<string>('');

  // Sale-type & auction sub-form state. Fixed-price keeps the legacy
  // CadeCoin/USD flow; auction adds the auction setup payload that we
  // POST to /admin/auctions immediately after the item is created.
  type LocalSaleType = 'fixed_price' | 'auction';
  const [saleType, setSaleType] = useState<LocalSaleType>('fixed_price');
  const [auctionConfig, setAuctionConfig] = useState<{
    durationDays: 1 | 3 | 5 | 7;
    startingPriceUsd: string;
    reservePriceUsd: string;
    cardValueUsd: string;
    startsAt: string;
  }>({
    durationDays: 3,
    startingPriceUsd: '',
    reservePriceUsd: '',
    cardValueUsd: '',
    startsAt: '',
  });

  const resetAuctionConfig = () => {
    setSaleType('fixed_price');
    setAuctionConfig({
      durationDays: 3,
      startingPriceUsd: '',
      reservePriceUsd: '',
      cardValueUsd: '',
      startsAt: '',
    });
  };

  // Form state
  const [formData, setFormData] = useState<CreatePrizeTierRequest>({
    amount: 500,
    name: '',
    description: '',
    imageUrl: '',
    category: 'slab',
    stock: 1,
    purchaseOption: 'both',
    brand: 'pokemon',
    showOnRedemptions: false,
    showOnShop: true,
    createdBy: null,
    // Per-item shipping fee. Server has DB default $5 but we mirror it
    // here so the admin form shows a sensible value out of the box.
    shippingCostUsd: 5,
  });

  // Single-flight guard for the Create flow. The createPrizeTier +
  // createAuction sequence isn't atomic and isn't fully idempotent (the
  // backend only dedupes the auction half via the prize_configuration_id
  // unique constraint, not the prize tier). Once the user has clicked
  // Create we lock the button until the dialog is dismissed or a success
  // clears it, even if the request errors. This prevents the dup-create
  // bug seen when scheduleAuctionJobs threw and re-enabled the mutation.
  const isCreatingRef = useRef(false);

  const resetForm = () => {
    setFormData({
      amount: 500,
      name: '',
      description: '',
      imageUrl: '',
      category: 'slab',
      stock: 1,
      purchaseOption: 'both',
      brand: 'pokemon',
      showOnRedemptions: false,
      showOnShop: true,
      createdBy: null,
      shippingCostUsd: 5,
    });
    setValidationError('');
    setItemImages([]);
    setCoverImageIndex(0);
    setImageError(null);
    setUsdAmount('');
    resetAuctionConfig();
    isCreatingRef.current = false;
  };

  // USD to Cadecoins conversion handlers (1 USD = 50 cadecoins)
  const handleUsdChange = (value: string) => {
    setUsdAmount(value);
    const usdValue = parseFloat(value);
    if (!isNaN(usdValue) && usdValue > 0) {
      const cadecoins = Math.round(usdValue * 50);
      setFormData({ ...formData, amount: cadecoins });
    } else if (value === '') {
      setFormData({ ...formData, amount: 0 });
    }
  };

  const handleCoinAmountChange = (value: string) => {
    const coinValue = parseFloat(value);
    setFormData({ ...formData, amount: isNaN(coinValue) ? 0 : coinValue });

    // Just show the USD equivalent for reference (divide by 50)
    if (!isNaN(coinValue) && coinValue > 0) {
      const usdEquivalent = (coinValue / 50).toFixed(2);
      setUsdAmount(usdEquivalent);
    } else {
      setUsdAmount('');
    }
    setValidationError('');
  };

  // Validate tier number uniqueness
  const isTierNumberUnique = (
    tierNumber: number,
    existingTiers: PrizeTier[]
  ): { isValid: boolean; error?: string } => {
    if (existingTiers.some(t => t.prizeTier === tierNumber)) {
      return { isValid: false, error: `Tier ${tierNumber} already exists` };
    }
    return { isValid: true };
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (payload: CreatePrizeTierRequest) => {
      const created = await api.prize.createPrizeTier(payload);
      // If admin selected the Auction sale type, immediately create the
      // matching auction record. The backend already enforces stock=1 +
      // saleType=auction on the prize, so any failure here means the
      // item exists but no auction was scheduled — surface that clearly.
      if (payload.saleType === 'auction') {
        const prizeId =
          (created as { id?: string } | null)?.id ??
          (created as { data?: { id?: string } } | null)?.data?.id;
        if (!prizeId) {
          throw new Error(
            'Item was created but the response was missing an id, so the auction could not be scheduled.'
          );
        }
        await api.auction.create({
          prizeConfigurationId: prizeId,
          durationDays: auctionConfig.durationDays,
          startingPriceUsd: parseFloat(auctionConfig.startingPriceUsd) || 0,
          reservePriceUsd: auctionConfig.reservePriceUsd
            ? parseFloat(auctionConfig.reservePriceUsd)
            : undefined,
          cardValueUsd: auctionConfig.cardValueUsd
            ? parseFloat(auctionConfig.cardValueUsd)
            : undefined,
          startsAt: auctionConfig.startsAt || undefined,
        });
      }
      return created;
    },
    onSuccess: () => {
      isCreatingRef.current = false;
      queryClient.invalidateQueries({ queryKey: ['adminPrizeTiers'] });
      queryClient.invalidateQueries({ queryKey: ['prizeTiers'] });
      queryClient.invalidateQueries({ queryKey: ['active-auctions'] });
      toast({
        title: 'Success!',
        description: 'Item created successfully',
      });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: error => {
      // Keep the dialog open so the admin can fix + retry, but DO NOT
      // clear the single-flight guard. The createPrizeTier half may have
      // succeeded even though the auction half failed (or vice versa);
      // re-clicking would create a duplicate prize tier. The user must
      // explicitly Cancel + reopen to start fresh.
      handleMutationError(error, 'Failed to create item');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePrizeTierRequest }) =>
      api.prize.updatePrizeTier(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPrizeTiers'] });
      queryClient.invalidateQueries({ queryKey: ['prizeTiers'] });
      toast({
        title: 'Success!',
        description: 'Item updated successfully',
      });
      setEditingTier(null);
      resetForm();
    },
    onError: error => handleMutationError(error, 'Failed to update item'),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.prize.deletePrizeTier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPrizeTiers'] });
      queryClient.invalidateQueries({ queryKey: ['prizeTiers'] });
      toast({
        title: 'Success!',
        description: 'Item deleted successfully',
      });
      setDeletingTier(null);
    },
    onError: error => handleMutationError(error, 'Failed to delete item'),
  });

  // Bulk update display order mutation
  const bulkUpdateOrderMutation = useMutation({
    mutationFn: (
      updates: Array<{
        id: string;
        displayOrderShop: number | null;
        displayOrderRedemptions: number | null;
        featuredDisplayOrder: number | null;
        sortByPurchaseOptionShop?: boolean;
        sortByPurchaseOptionRedemptions?: boolean;
      }>
    ) => api.prize.bulkUpdateDisplayOrder({ updates } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPrizeTiers'] });
      queryClient.invalidateQueries({ queryKey: ['prizeTiers'] });
      toast({
        title: 'Success!',
        description: 'Display orders updated successfully',
      });
      setIsEditingOrder(false);
      setOrderChanges(new Map());
    },
    onError: error => handleMutationError(error, 'Failed to update display orders'),
  });

  // Bulk assignment mutation (for assigning to sellers or making items shop/redemption)
  const bulkAssignMutation = useMutation({
    mutationFn: (
      updates: Array<{
        id: string;
        createdBy: string | null;
        showOnShop: boolean;
        showOnRedemptions: boolean;
        amount?: number;
      }>
    ) =>
      Promise.all(
        updates.map(update => {
          const tier = tiers?.find(t => t.id === update.id);
          if (!tier) throw new Error('Item not found');

          const imageUrls =
            tier.imageUrls && tier.imageUrls.length > 0
              ? tier.imageUrls
              : tier.imageUrl
                ? [tier.imageUrl]
                : [];

          const resolvedCoverIndex = tier.itemImages?.findIndex(image => image.isCover) ?? -1;
          const coverImageIndex = resolvedCoverIndex >= 0 ? resolvedCoverIndex : 0;

          return api.prize.updatePrizeTier(update.id, {
            name: tier.name,
            description: tier.description,
            amount: update.amount ?? tier.amount,
            stock: tier.stock,
            category: tier.category,
            brand: tier.brand,
            purchaseOption: tier.purchaseOption,
            imageUrl: imageUrls[coverImageIndex] || tier.imageUrl || undefined,
            imageUrls,
            coverImageIndex,
            createdBy: update.createdBy,
            showOnShop: update.showOnShop,
            showOnRedemptions: update.showOnRedemptions,
          });
        })
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPrizeTiers'] });
      queryClient.invalidateQueries({ queryKey: ['prizeTiers'] });
      toast({
        title: 'Success!',
        description: 'Items updated successfully',
      });
      setSelectedItems(new Set());
      setBulkAssignDialogOpen(false);
      setBulkAssignSeller(null);
    },
    onError: error => handleMutationError(error, 'Failed to update items'),
  });

  // Helper functions for display order editing
  const enterEditMode = () => {
    setIsEditingOrder(true);
    // Initialize orderChanges with current values (keep NULL for pages where prize isn't shown)
    const initialChanges = new Map();
    activeTiers.forEach(tier => {
      initialChanges.set(tier.id, {
        displayOrderShop: tier.displayOrderShop ?? null,
        displayOrderRedemptions: tier.displayOrderRedemptions ?? null,
        featuredDisplayOrder: tier.featuredDisplayOrder ?? null,
        isFeatured: tier.featuredDisplayOrder !== null,
      });
    });
    setOrderChanges(initialChanges);
  };

  const cancelEditMode = () => {
    setIsEditingOrder(false);
    setOrderChanges(new Map());
  };

  const saveDisplayOrders = () => {
    const updates = Array.from(orderChanges.entries()).map(([id, values]) => ({
      id,
      displayOrderShop: values.displayOrderShop,
      displayOrderRedemptions: values.displayOrderRedemptions,
      featuredDisplayOrder: values.isFeatured ? values.featuredDisplayOrder : null,
    }));

    bulkUpdateOrderMutation.mutate(updates);
  };

  // Handle toggle change for purchase option sorting
  const handleToggleSortChange = async (checked: boolean) => {
    // Update local state immediately for instant UI feedback
    setSortByPurchaseOption(prev => ({ ...prev, [selectedPage]: checked }));

    // Prepare field name for API
    const fieldMap = {
      shop: 'sortByPurchaseOptionShop',
      redemptions: 'sortByPurchaseOptionRedemptions',
    };

    // Update all prize configs with the new sorting preference
    const updates = activeTiers.map(tier => ({
      id: tier.id,
      displayOrderShop: tier.displayOrderShop,
      displayOrderRedemptions: tier.displayOrderRedemptions,
      featuredDisplayOrder: tier.featuredDisplayOrder,
      // Include all sorting preferences, updating only the current page
      sortByPurchaseOptionShop: selectedPage === 'shop' ? checked : tier.sortByPurchaseOptionShop,
      sortByPurchaseOptionRedemptions:
        selectedPage === 'redemptions' ? checked : tier.sortByPurchaseOptionRedemptions,
    }));

    try {
      await bulkUpdateOrderMutation.mutateAsync(updates);
    } catch (error) {
      // Revert state on error
      setSortByPurchaseOption(prev => ({ ...prev, [selectedPage]: !checked }));
      toast({
        title: 'Error',
        description: 'Failed to update sorting preference',
        variant: 'destructive',
      });
    }
  };

  // Setup sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Helper function to get sorted prizes based on current state
  const getSortedPrizes = (category?: 'raw' | 'slab' | 'sealed', includeSearchFilter = true) => {
    let prizes = activeTiers;

    // Filter by category if specified
    if (category) {
      prizes = prizes.filter(t => t.category === category);
    }

    // Filter by selected page (both in edit and view mode)
    prizes = prizes.filter(t => {
      if (selectedPage === 'shop') return t.showOnShop;
      if (selectedPage === 'redemptions') return t.showOnRedemptions;
      if (selectedPage === 'auctions') return t.saleType === 'auction';
      return true;
    });

    // Apply search filter (optional - can be disabled to get full list for position calculation)
    if (includeSearchFilter && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      prizes = prizes.filter(
        p =>
          p.name.toLowerCase().includes(query) ||
          (p.description?.toLowerCase() || '').includes(query)
      );
    }

    // Sort based on mode
    return prizes.sort((a, b) => {
      if (isEditingOrder) {
        // Edit mode: Sort by display order and purchase option (existing logic)
        let aOrder: number, bOrder: number;

        // In edit mode: use live state from orderChanges (so drag updates are immediately visible)
        const aChanges = orderChanges.get(a.id);
        const bChanges = orderChanges.get(b.id);

        if (selectedPage === 'shop') {
          aOrder = aChanges?.displayOrderShop ?? a.displayOrderShop ?? 999;
          bOrder = bChanges?.displayOrderShop ?? b.displayOrderShop ?? 999;
        } else {
          aOrder = aChanges?.displayOrderRedemptions ?? a.displayOrderRedemptions ?? 999;
          bOrder = bChanges?.displayOrderRedemptions ?? b.displayOrderRedemptions ?? 999;
        }

        // Apply purchase option sorting if enabled for current page
        if (sortByPurchaseOption[selectedPage]) {
          // Primary sort: purchaseOption (both=0, buy_only=1, offers_only=2)
          const purchaseOrder = { both: 0, buy_only: 1, offers_only: 2 };
          const aPurchase = purchaseOrder[a.purchaseOption] ?? 3;
          const bPurchase = purchaseOrder[b.purchaseOption] ?? 3;
          if (aPurchase !== bPurchase) return aPurchase - bPurchase;
        }

        // Secondary sort (or primary if purchase sorting disabled): displayOrder
        return aOrder - bOrder;
      } else {
        // View mode: Sort alphabetically by name
        return a.name.localeCompare(b.name);
      }
    });
  };

  // Sync sorting state from tiers data when it loads/changes
  useEffect(() => {
    if (tiers && tiers.length > 0) {
      setSortByPurchaseOption({
        shop: tiers[0].sortByPurchaseOptionShop ?? false,
        redemptions: tiers[0].sortByPurchaseOptionRedemptions ?? false,
      });
    }
  }, [tiers]);

  // Helper function to get the actual position of a prize in the full (unfiltered) sorted list
  const getRealPosition = (tierId: string, category?: 'raw' | 'slab' | 'sealed'): number => {
    const fullList = getSortedPrizes(category, false); // Get list without search filter
    const index = fullList.findIndex(t => t.id === tierId);
    return index !== -1 ? index + 1 : 0;
  };

  // Drag handler for reordering prizes
  const handleDragEnd = (event: DragEndEvent, category?: 'raw' | 'slab' | 'sealed') => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    // IMPORTANT: Get the FULL sorted list (without search filter) to calculate real positions
    const fullSortedList = getSortedPrizes(category, false);

    // Validate drag if purchase option sorting is enabled
    if (sortByPurchaseOption[selectedPage]) {
      const draggedPrize = fullSortedList.find(p => p.id === active.id);
      const targetPrize = fullSortedList.find(p => p.id === over.id);

      if (draggedPrize && targetPrize) {
        const purchaseOrder = { both: 0, buy_only: 1, offers_only: 2 };
        const draggedPriority = purchaseOrder[draggedPrize.purchaseOption];
        const targetPriority = purchaseOrder[targetPrize.purchaseOption];

        // Prevent dragging lower priority items before higher priority items
        if (draggedPriority > targetPriority) {
          let message = '';
          if (
            draggedPrize.purchaseOption === 'offers_only' &&
            targetPrize.purchaseOption === 'both'
          ) {
            message =
              'Cards with "Make Offer Only" cannot be placed before cards with "Both Options". Disable grouping to reorder freely.';
          } else if (
            draggedPrize.purchaseOption === 'offers_only' &&
            targetPrize.purchaseOption === 'buy_only'
          ) {
            message =
              'Cards with "Make Offer Only" cannot be placed before cards with "Buy Only". Disable grouping to reorder freely.';
          } else if (
            draggedPrize.purchaseOption === 'buy_only' &&
            targetPrize.purchaseOption === 'both'
          ) {
            message =
              'Cards with "Buy Only" cannot be placed before cards with "Both Options". Disable grouping to reorder freely.';
          }

          toast({
            title: 'Invalid card placement',
            description: message,
            variant: 'destructive',
          });
          return; // Exit without updating order
        }
      }
    }

    // Find the indices in the FULL list (not the filtered list)
    const oldIndex = fullSortedList.findIndex(p => p.id === active.id);
    const newIndex = fullSortedList.findIndex(p => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder the FULL array based on actual positions
    const reorderedFullList = arrayMove(fullSortedList, oldIndex, newIndex);

    // Update orderChanges with new positions based on the FULL list
    const newChanges = new Map(orderChanges);
    reorderedFullList.forEach((prize, index) => {
      const current = newChanges.get(prize.id);
      if (current) {
        const displayOrder = index + 1; // Position in the full list
        if (selectedPage === 'shop') {
          newChanges.set(prize.id, { ...current, displayOrderShop: displayOrder });
        } else {
          newChanges.set(prize.id, { ...current, displayOrderRedemptions: displayOrder });
        }
      }
    });

    setOrderChanges(newChanges);
  };

  // Helper to get next available featured order
  const getNextFeaturedOrder = (): number => {
    const featuredOrders = Array.from(orderChanges.values())
      .filter(change => change.isFeatured && change.featuredDisplayOrder !== null)
      .map(change => change.featuredDisplayOrder as number);

    return featuredOrders.length > 0 ? Math.max(...featuredOrders) + 1 : 1;
  };

  // Check if a featured order number is duplicated
  const checkDuplicateFeaturedOrder = (prizeId: string, order: number): boolean => {
    return Array.from(orderChanges.entries()).some(
      ([id, change]) => id !== prizeId && change.isFeatured && change.featuredDisplayOrder === order
    );
  };

  const toggleFeatured = (prizeId: string, isFeatured: boolean) => {
    const currentChanges = orderChanges.get(prizeId);
    if (currentChanges) {
      const newChanges = new Map(orderChanges);
      newChanges.set(prizeId, {
        ...currentChanges,
        isFeatured,
        featuredDisplayOrder: isFeatured
          ? currentChanges.featuredDisplayOrder || getNextFeaturedOrder()
          : null,
      });
      setOrderChanges(newChanges);
    }
  };

  const handleFeaturedOrderChange = (prizeId: string, order: number) => {
    const currentChanges = orderChanges.get(prizeId);
    if (currentChanges) {
      const newChanges = new Map(orderChanges);
      newChanges.set(prizeId, {
        ...currentChanges,
        featuredDisplayOrder: order,
      });
      setOrderChanges(newChanges);
    }
  };

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

  const handleCreate = async () => {
    if (isCreatingRef.current) return;
    if (!formData.name.trim()) {
      setValidationError('Item name is required');
      return;
    }

    // Validate amount for non-offers_only prizes (skipped for auctions —
    // auctions are priced in USD via the auction config block).
    if (
      saleType !== 'auction' &&
      formData.purchaseOption !== 'offers_only' &&
      (!formData.amount || formData.amount <= 0)
    ) {
      setValidationError('Cadecoin amount is required for Buy Only and Both purchase options');
      return;
    }

    // Check for image errors
    if (imageError) {
      toast({
        variant: 'destructive',
        title: 'Image Error',
        description: imageError,
      });
      return;
    }

    if (!itemImages.length) {
      setValidationError('At least one item image is required');
      return;
    }

    // Auction-specific validation: starting price > 0, reserve >= starting,
    // exactly 1 in stock (the backend enforces this too but we want to
    // surface a friendly error before the upload round-trips).
    if (saleType === 'auction') {
      const start = parseFloat(auctionConfig.startingPriceUsd);
      if (!start || start < 1) {
        setValidationError('Starting price (USD) must be at least $1 for auctions');
        return;
      }
      if (auctionConfig.reservePriceUsd) {
        const reserve = parseFloat(auctionConfig.reservePriceUsd);
        if (reserve < start) {
          setValidationError('Reserve price cannot be less than the starting price');
          return;
        }
      }
      if ((formData.stock ?? 0) !== 1) {
        setValidationError('Auction items must have exactly 1 in stock');
        return;
      }
    }

    setValidationError('');

    try {
      const imagePayload = await resolveImagePayload();

      isCreatingRef.current = true;
      createMutation.mutate({
        ...formData,
        imageUrl: imagePayload.coverImageUrl,
        imageUrls: imagePayload.imageUrls,
        coverImageIndex: imagePayload.coverImageIndex,
        saleType,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error uploading image',
        description: getMessage(error) || 'Failed to upload item image. Please try again.',
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingTier) return;
    if (!formData.name.trim()) {
      setValidationError('Item name is required');
      return;
    }

    // Validate amount for non-offers_only prizes
    if (formData.purchaseOption !== 'offers_only' && (!formData.amount || formData.amount <= 0)) {
      setValidationError('Cadecoin amount is required for Buy Only and Both purchase options');
      return;
    }

    // Check for image errors
    if (imageError) {
      toast({
        variant: 'destructive',
        title: 'Image Error',
        description: imageError,
      });
      return;
    }

    if (!itemImages.length) {
      setValidationError('At least one item image is required');
      return;
    }

    setValidationError('');

    try {
      const imagePayload = await resolveImagePayload();

      updateMutation.mutate({
        id: editingTier.id,
        payload: {
          ...formData,
          imageUrl: imagePayload.coverImageUrl,
          imageUrls: imagePayload.imageUrls,
          coverImageIndex: imagePayload.coverImageIndex,
        },
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error uploading image',
        description: getMessage(error) || 'Failed to upload item image. Please try again.',
      });
    }
  };

  const handleEdit = (tier: PrizeTier) => {
    const existingImageUrls =
      tier.imageUrls && tier.imageUrls.length > 0
        ? tier.imageUrls
        : tier.imageUrl
          ? [tier.imageUrl]
          : [];

    const existingCoverIndex =
      tier.itemImages?.findIndex(image => image.isCover) ?? (existingImageUrls.length > 0 ? 0 : -1);

    const mappedImages: ItemImageInput[] = existingImageUrls.map((imageUrl, index) => ({
      id: `existing-${tier.id}-${index}`,
      imageUrl,
      isNew: false,
    }));

    setFormData({
      amount: tier.amount,
      name: tier.name,
      description: tier.description || '',
      imageUrl: tier.imageUrl || '',
      category: tier.category,
      stock: tier.stock,
      purchaseOption: tier.purchaseOption || 'both',
      brand: tier.brand || 'pokemon',
      displayOrderShop: tier.displayOrderShop,
      displayOrderRedemptions: tier.displayOrderRedemptions,
      featuredDisplayOrder: tier.featuredDisplayOrder,
      showOnRedemptions: tier.showOnRedemptions ?? true,
      showOnShop: tier.showOnShop ?? true,
      createdBy: tier.createdBy,
      shippingCostUsd: tier.shippingCostUsd ?? 5,
    });
    // Calculate and display USD equivalent (amount is always in cadecoins)
    if (tier.amount && tier.amount > 0) {
      const usdEquivalent = (tier.amount / 50).toFixed(2);
      setUsdAmount(usdEquivalent);
    } else {
      setUsdAmount('');
    }
    setItemImages(mappedImages);
    setCoverImageIndex(existingCoverIndex >= 0 ? existingCoverIndex : 0);
    setImageError(null);
    // Sync saleType from the tier so the edit dialog renders the right
    // form sections — auction items hide the CadeCoin / stock / shop /
    // purchase-option fields that don't apply to a 1-of-1 auction.
    setSaleType(tier.saleType === 'auction' ? 'auction' : 'fixed_price');
    setEditingTier(tier);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const activeTiers = tiers?.filter(t => t.isActive) || [];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Item Settings</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage items in the shop and redemptions
              </p>
            </div>
            <div className="flex gap-2">
              {isEditingOrder ? (
                <>
                  <Button variant="outline" onClick={cancelEditMode}>
                    Cancel
                  </Button>
                  <Button onClick={saveDisplayOrders} disabled={bulkUpdateOrderMutation.isPending}>
                    {bulkUpdateOrderMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={enterEditMode}>
                    <Edit className="w-4 h-4" />
                    <span className="hidden sm:inline ml-2">Edit Display Order</span>
                  </Button>
                  <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline ml-2">Add Item</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Page filter tabs - always visible */}
          <div className="mb-6 flex gap-2 border-b border-border">
            <Button
              variant={selectedPage === 'shop' ? 'default' : 'ghost'}
              onClick={() => setSelectedPage('shop')}
              className="rounded-b-none"
            >
              Shops
            </Button>
            <Button
              variant={selectedPage === 'redemptions' ? 'default' : 'ghost'}
              onClick={() => setSelectedPage('redemptions')}
              className="rounded-b-none"
            >
              Redemptions
            </Button>
            <Button
              variant={selectedPage === 'auctions' ? 'default' : 'ghost'}
              onClick={() => setSelectedPage('auctions')}
              className="rounded-b-none"
            >
              Auctions
            </Button>
          </div>

          {/* Search bar and sorting toggle */}
          {activeTiers.length > 0 && (
            <div className="mb-6 flex items-center justify-between gap-4">
              {/* Left side: Search */}
              <div className="flex-1">
                <SearchInput
                  id="prize-search"
                  placeholder="Search items by name or description..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                  width="lg"
                />
              </div>

              {/* Right side: Sorting toggle (only in edit mode) */}
              {isEditingOrder && (
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <Switch
                    checked={sortByPurchaseOption[selectedPage]}
                    onCheckedChange={handleToggleSortChange}
                    id="sort-toggle"
                  />
                  <Label htmlFor="sort-toggle" className="text-sm cursor-pointer">
                    Group "Both Options" first
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          When enabled, prizes with both purchase options appear before buy-only or
                          offers-only prizes
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
          )}

          {/* Bulk action toolbar */}
          {selectedItems.size > 0 && (
            <div className="mb-6 p-4 bg-slate-900 dark:bg-slate-800 border border-blue-500 dark:border-blue-600 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-sm text-white">
                  {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                {selectedPage === 'redemptions' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setBulkAssignDialogOpen(true);
                      setBulkAssignSeller(null);
                    }}
                  >
                    Assign to Seller
                  </Button>
                )}
                {selectedPage === 'shop' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const updates = Array.from(selectedItems).map(id => {
                        const item = tiers?.find(t => t.id === id);
                        return {
                          id,
                          createdBy: item?.createdBy ?? null,
                          showOnShop: false,
                          showOnRedemptions: true,
                          // Amount is already stored in cadecoins, no conversion needed
                        };
                      });
                      bulkAssignMutation.mutate(updates);
                    }}
                    disabled={bulkAssignMutation.isPending}
                  >
                    {bulkAssignMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Move to Redemptions
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setSelectedItems(new Set())}>
                  Clear Selection
                </Button>
              </div>
            </div>
          )}

          {activeTiers.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No active prize tiers</p>
              <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                Create First Tier
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Shop / Auctions Page - Combined List (No Category Separation) */}
              {(selectedPage === 'shop' || selectedPage === 'auctions') && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">
                    {selectedPage === 'auctions' ? 'All Auctions' : 'All Items'}
                  </h3>
                  {isEditingOrder ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={e => handleDragEnd(e)}
                    >
                      <SortableContext
                        items={getSortedPrizes().map(t => t.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3">
                          {getSortedPrizes().map((tier, index) => {
                            const changes = orderChanges.get(tier.id);
                            return changes ? (
                              <SortablePrizeItem
                                key={tier.id}
                                tier={tier}
                                position={getRealPosition(tier.id)}
                                changes={changes}
                                onToggleFeatured={toggleFeatured}
                                onFeaturedOrderChange={handleFeaturedOrderChange}
                                hasDuplicateFeaturedOrder={
                                  changes.isFeatured && changes.featuredDisplayOrder !== null
                                    ? checkDuplicateFeaturedOrder(
                                        tier.id,
                                        changes.featuredDisplayOrder
                                      )
                                    : false
                                }
                                selectedPage={selectedPage}
                                isSelected={selectedItems.has(tier.id)}
                                onSelectChange={(id, selected) => {
                                  const newSelected = new Set(selectedItems);
                                  if (selected) newSelected.add(id);
                                  else newSelected.delete(id);
                                  setSelectedItems(newSelected);
                                }}
                              />
                            ) : null;
                          })}
                          {getSortedPrizes().length === 0 && searchQuery.trim() && (
                            <div className="text-center py-8 text-muted-foreground">
                              <p>No prizes found matching "{searchQuery}"</p>
                              <Button
                                variant="link"
                                onClick={() => setSearchQuery('')}
                                className="mt-2"
                              >
                                Clear search
                              </Button>
                            </div>
                          )}
                        </div>
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div className="space-y-3">
                      {getSortedPrizes().map(tier => (
                        <div
                          key={tier.id}
                          className={`flex items-center gap-4 p-4 border-2 rounded-lg transition-colors ${
                            selectedItems.has(tier.id)
                              ? 'border-blue-500 bg-blue-950 dark:bg-blue-900'
                              : 'border-border hover:bg-secondary/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedItems.has(tier.id)}
                            onChange={e => {
                              const newSelected = new Set(selectedItems);
                              if (e.target.checked) newSelected.add(tier.id);
                              else newSelected.delete(tier.id);
                              setSelectedItems(newSelected);
                            }}
                            className="w-5 h-5 rounded cursor-pointer flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-base">{tier.name}</h3>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                              <p className="text-sm text-muted-foreground">
                                {tier.amount.toLocaleString('en-US')} coins
                              </p>
                              <span
                                className={`text-xs px-2 py-1 rounded font-medium ${
                                  tier.stock > 0
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100'
                                }`}
                              >
                                Stock: {tier.stock}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-xs ${getCategoryBadge(tier.category).className}`}
                              >
                                {getCategoryBadge(tier.category).label}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`text-xs ${getPurchaseOptionBadge(tier.purchaseOption).className}`}
                              >
                                {getPurchaseOptionBadge(tier.purchaseOption).label}
                              </Badge>
                            </div>
                            {tier.description && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                                {tier.description}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(tier)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeletingTier(tier)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {getSortedPrizes().length === 0 && searchQuery.trim() && (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>No prizes found matching "{searchQuery}"</p>
                          <Button
                            variant="link"
                            onClick={() => setSearchQuery('')}
                            className="mt-2"
                          >
                            Clear search
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Redemptions - Separate Category Sections */}
              {selectedPage === 'redemptions' && (
                <>
                  {/* Slab Category Section */}
                  {getSortedPrizes('slab').length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-primary">Slab Prizes</h3>
                      {isEditingOrder ? (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={e => handleDragEnd(e, 'slab')}
                        >
                          <SortableContext
                            items={getSortedPrizes('slab').map(t => t.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-3">
                              {getSortedPrizes('slab').map((tier, index) => {
                                const changes = orderChanges.get(tier.id);
                                return changes ? (
                                  <SortablePrizeItem
                                    key={tier.id}
                                    tier={tier}
                                    position={getRealPosition(tier.id, 'slab')}
                                    changes={changes}
                                    onToggleFeatured={toggleFeatured}
                                    onFeaturedOrderChange={handleFeaturedOrderChange}
                                    hasDuplicateFeaturedOrder={
                                      changes.isFeatured && changes.featuredDisplayOrder !== null
                                        ? checkDuplicateFeaturedOrder(
                                            tier.id,
                                            changes.featuredDisplayOrder
                                          )
                                        : false
                                    }
                                    selectedPage={selectedPage}
                                    isSelected={selectedItems.has(tier.id)}
                                    onSelectChange={(id, selected) => {
                                      const newSelected = new Set(selectedItems);
                                      if (selected) newSelected.add(id);
                                      else newSelected.delete(id);
                                      setSelectedItems(newSelected);
                                    }}
                                  />
                                ) : null;
                              })}
                              {getSortedPrizes('slab').length === 0 && searchQuery.trim() && (
                                <div className="text-center py-8 text-muted-foreground">
                                  <p>No slab prizes found matching "{searchQuery}"</p>
                                </div>
                              )}
                            </div>
                          </SortableContext>
                        </DndContext>
                      ) : (
                        <div className="space-y-3">
                          {getSortedPrizes('slab').map(tier => (
                            <div
                              key={tier.id}
                              className={`flex items-center gap-4 p-4 border-2 rounded-lg transition-colors ${
                                selectedItems.has(tier.id)
                                  ? 'border-blue-500 bg-blue-950 dark:bg-blue-900'
                                  : 'border-border hover:bg-secondary/50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedItems.has(tier.id)}
                                onChange={e => {
                                  const newSelected = new Set(selectedItems);
                                  if (e.target.checked) newSelected.add(tier.id);
                                  else newSelected.delete(tier.id);
                                  setSelectedItems(newSelected);
                                }}
                                className="w-5 h-5 rounded cursor-pointer flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-base">{tier.name}</h3>
                                </div>
                                <div className="flex items-center gap-3 flex-wrap">
                                  <p className="text-sm text-muted-foreground">
                                    {tier.amount.toLocaleString('en-US')} coins
                                  </p>
                                  <span
                                    className={`text-xs px-2 py-1 rounded font-medium ${
                                      tier.stock > 0
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100'
                                        : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100'
                                    }`}
                                  >
                                    Stock: {tier.stock}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${getCategoryBadge(tier.category).className}`}
                                  >
                                    {getCategoryBadge(tier.category).label}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${getPurchaseOptionBadge(tier.purchaseOption).className}`}
                                  >
                                    {getPurchaseOptionBadge(tier.purchaseOption).label}
                                  </Badge>
                                </div>
                                {tier.description && (
                                  <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                                    {tier.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(tier)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setDeletingTier(tier)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          {getSortedPrizes('slab').length === 0 && searchQuery.trim() && (
                            <div className="text-center py-8 text-muted-foreground">
                              <p>No slab prizes found matching "{searchQuery}"</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sealed Category Section */}
                  {getSortedPrizes('sealed').length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-primary">Sealed Prizes</h3>
                      {isEditingOrder ? (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={e => handleDragEnd(e, 'sealed')}
                        >
                          <SortableContext
                            items={getSortedPrizes('sealed').map(t => t.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-3">
                              {getSortedPrizes('sealed').map((tier, index) => {
                                const changes = orderChanges.get(tier.id);
                                return changes ? (
                                  <SortablePrizeItem
                                    key={tier.id}
                                    tier={tier}
                                    position={getRealPosition(tier.id, 'sealed')}
                                    changes={changes}
                                    onToggleFeatured={toggleFeatured}
                                    onFeaturedOrderChange={handleFeaturedOrderChange}
                                    hasDuplicateFeaturedOrder={
                                      changes.isFeatured && changes.featuredDisplayOrder !== null
                                        ? checkDuplicateFeaturedOrder(
                                            tier.id,
                                            changes.featuredDisplayOrder
                                          )
                                        : false
                                    }
                                    selectedPage={selectedPage}
                                    isSelected={selectedItems.has(tier.id)}
                                    onSelectChange={(id, selected) => {
                                      const newSelected = new Set(selectedItems);
                                      if (selected) newSelected.add(id);
                                      else newSelected.delete(id);
                                      setSelectedItems(newSelected);
                                    }}
                                  />
                                ) : null;
                              })}
                              {getSortedPrizes('sealed').length === 0 && searchQuery.trim() && (
                                <div className="text-center py-8 text-muted-foreground">
                                  <p>No sealed prizes found matching "{searchQuery}"</p>
                                </div>
                              )}
                            </div>
                          </SortableContext>
                        </DndContext>
                      ) : (
                        <div className="space-y-3">
                          {getSortedPrizes('sealed').map(tier => (
                            <div
                              key={tier.id}
                              className={`flex items-center gap-4 p-4 border-2 rounded-lg transition-colors ${
                                selectedItems.has(tier.id)
                                  ? 'border-blue-500 bg-blue-950 dark:bg-blue-900'
                                  : 'border-border hover:bg-secondary/50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedItems.has(tier.id)}
                                onChange={e => {
                                  const newSelected = new Set(selectedItems);
                                  if (e.target.checked) newSelected.add(tier.id);
                                  else newSelected.delete(tier.id);
                                  setSelectedItems(newSelected);
                                }}
                                className="w-5 h-5 rounded cursor-pointer flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-base">{tier.name}</h3>
                                </div>
                                <div className="flex items-center gap-3 flex-wrap">
                                  <p className="text-sm text-muted-foreground">
                                    {tier.amount.toLocaleString('en-US')} coins
                                  </p>
                                  <span
                                    className={`text-xs px-2 py-1 rounded font-medium ${
                                      tier.stock > 0
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100'
                                        : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100'
                                    }`}
                                  >
                                    Stock: {tier.stock}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${getCategoryBadge(tier.category).className}`}
                                  >
                                    {getCategoryBadge(tier.category).label}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${getPurchaseOptionBadge(tier.purchaseOption).className}`}
                                  >
                                    {getPurchaseOptionBadge(tier.purchaseOption).label}
                                  </Badge>
                                </div>
                                {tier.description && (
                                  <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                                    {tier.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(tier)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setDeletingTier(tier)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          {getSortedPrizes('sealed').length === 0 && searchQuery.trim() && (
                            <div className="text-center py-8 text-muted-foreground">
                              <p>No sealed prizes found matching "{searchQuery}"</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateOpen || editingTier !== null}
        onOpenChange={open => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingTier(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTier ? 'Edit Item' : 'Create Item'}</DialogTitle>
            <DialogDescription>
              {editingTier
                ? 'Update the item details. This will create a new version and deactivate the old one.'
                : 'Add a new item for users to purchase.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            {!editingTier && (
              <div className="space-y-2.5">
                <Label htmlFor="saleType" className="text-base font-medium">
                  Sale Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={saleType}
                  onValueChange={value => {
                    const next = value as LocalSaleType;
                    setSaleType(next);
                    // Auction items are 1-of-1, shop-only, CardCade-only.
                    if (next === 'auction') {
                      setFormData(prev => ({
                        ...prev,
                        stock: 1,
                        showOnShop: true,
                        showOnRedemptions: false,
                        purchaseOption: 'buy_only',
                        createdBy: null,
                      }));
                    }
                    setValidationError('');
                  }}
                >
                  <SelectTrigger id="saleType" className="h-12 text-base">
                    <SelectValue placeholder="Select sale type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed_price">Fixed Price (CadeCoins)</SelectItem>
                    <SelectItem value="auction">Auction (USD bidding)</SelectItem>
                  </SelectContent>
                </Select>
                {saleType === 'auction' && (
                  <p className="text-xs text-muted-foreground">
                    Auction items are 1-of-1, shop-only, and excluded from CadeCoin redemptions.
                  </p>
                )}
              </div>
            )}

            {saleType === 'auction' && !editingTier && (
              <div className="space-y-4 rounded-lg border border-primary/40 bg-primary/5 p-4 shadow-[0_0_18px_rgba(122,255,20,0.08)]">
                <div className="flex items-center gap-2">
                  <Gavel className="w-4 h-4 text-primary" />
                  <span className="text-base font-semibold text-primary tracking-wide uppercase">
                    Auction Setup
                  </span>
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="auctionDuration" className="text-sm font-medium">
                    Duration <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={String(auctionConfig.durationDays)}
                    onValueChange={value =>
                      setAuctionConfig(prev => ({
                        ...prev,
                        durationDays: Number(value) as 1 | 3 | 5 | 7,
                      }))
                    }
                  >
                    <SelectTrigger id="auctionDuration" className="h-11">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="startingPriceUsd" className="text-sm font-medium">
                      Starting price (USD) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="startingPriceUsd"
                      type="number"
                      min="1"
                      step="0.01"
                      value={auctionConfig.startingPriceUsd}
                      onChange={e =>
                        setAuctionConfig(prev => ({
                          ...prev,
                          startingPriceUsd: e.target.value,
                        }))
                      }
                      placeholder="e.g. 25"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reservePriceUsd" className="text-sm font-medium">
                      Reserve price (USD)
                    </Label>
                    <Input
                      id="reservePriceUsd"
                      type="number"
                      min="1"
                      step="0.01"
                      value={auctionConfig.reservePriceUsd}
                      onChange={e =>
                        setAuctionConfig(prev => ({
                          ...prev,
                          reservePriceUsd: e.target.value,
                        }))
                      }
                      placeholder="Hidden — optional"
                      className="h-11"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Hidden from bidders. If unmet, auction marks as unsold.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="cardValueUsd" className="text-sm font-medium">
                      Card value (USD)
                    </Label>
                    <Input
                      id="cardValueUsd"
                      type="number"
                      min="0"
                      step="0.01"
                      value={auctionConfig.cardValueUsd}
                      onChange={e =>
                        setAuctionConfig(prev => ({
                          ...prev,
                          cardValueUsd: e.target.value,
                        }))
                      }
                      placeholder="Internal — optional"
                      className="h-11"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Internal only — never shown to bidders.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="auctionStartsAt" className="text-sm font-medium">
                      Scheduled start
                    </Label>
                    <Input
                      id="auctionStartsAt"
                      type="datetime-local"
                      value={auctionConfig.startsAt}
                      onChange={e =>
                        setAuctionConfig(prev => ({
                          ...prev,
                          startsAt: e.target.value,
                        }))
                      }
                      className="h-11"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Leave blank to start immediately on save.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/*
              Read-only auction details when editing an auction item. The
              auction config (duration, prices, schedule) is immutable
              after bids start landing — admins manage live state from
              the dedicated Auctions tab (force close / cancel).
            */}
            {saleType === 'auction' && editingTier && (
              <div className="space-y-3 rounded-lg border border-primary/40 bg-primary/5 p-4 shadow-[0_0_18px_rgba(122,255,20,0.08)]">
                <div className="flex items-center gap-2">
                  <Gavel className="w-4 h-4 text-primary" />
                  <span className="text-base font-semibold text-primary tracking-wide uppercase">
                    Auction Details
                  </span>
                </div>
                {editingTier.auction ? (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div className="text-muted-foreground">Status</div>
                    <div className="font-medium capitalize">{editingTier.auction.status}</div>

                    <div className="text-muted-foreground">Duration</div>
                    <div className="font-medium">
                      {editingTier.auction.durationDays} day
                      {editingTier.auction.durationDays === 1 ? '' : 's'}
                    </div>

                    <div className="text-muted-foreground">Starting price</div>
                    <div className="font-medium">
                      ${Number(editingTier.auction.startingPriceUsd).toFixed(2)}
                    </div>

                    <div className="text-muted-foreground">Current bid</div>
                    <div className="font-medium">
                      {editingTier.auction.currentBidUsd != null
                        ? `$${Number(editingTier.auction.currentBidUsd).toFixed(2)}`
                        : '—'}
                    </div>

                    <div className="text-muted-foreground">Bids</div>
                    <div className="font-medium">
                      {editingTier.auction.bidCount}
                      {editingTier.auction.extensionCount > 0 && (
                        <span className="text-muted-foreground">
                          {' '}
                          ({editingTier.auction.extensionCount} ext)
                        </span>
                      )}
                    </div>

                    <div className="text-muted-foreground">Reserve</div>
                    <div className="font-medium">
                      {editingTier.auction.reserveMet === null
                        ? 'None'
                        : editingTier.auction.reserveMet
                          ? 'Met'
                          : 'Not met'}
                    </div>

                    <div className="text-muted-foreground">Starts</div>
                    <div className="font-medium text-xs">
                      {new Date(editingTier.auction.startsAt).toLocaleString()}
                    </div>

                    <div className="text-muted-foreground">Ends</div>
                    <div className="font-medium text-xs">
                      {new Date(editingTier.auction.endsAt).toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No auction record found for this item.
                  </p>
                )}

                {/*
                  Winner + shipping. Loaded from a dedicated admin
                  endpoint so we can include the winner's email and the
                  full address without leaking PII into the public
                  auction summary used everywhere else.
                */}
                {editingAuctionDetails && (
                  <div className="space-y-2 border-t border-primary/20 pt-3">
                    <div className="text-xs font-semibold text-primary uppercase tracking-wide">
                      Winner
                    </div>
                    {editingAuctionDetails.winner ? (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <div className="text-muted-foreground">Username</div>
                        <div className="font-medium">{editingAuctionDetails.winner.username}</div>
                        <div className="text-muted-foreground">Email</div>
                        <div className="font-medium text-xs break-all">
                          {editingAuctionDetails.winner.email ?? '—'}
                        </div>
                        <div className="text-muted-foreground">Paid at</div>
                        <div className="font-medium text-xs">
                          {editingAuctionDetails.paidAt
                            ? new Date(editingAuctionDetails.paidAt).toLocaleString()
                            : '—'}
                        </div>
                        {editingAuctionDetails.paymentIntentId && (
                          <>
                            <div className="text-muted-foreground">Payment ID</div>
                            <div className="font-mono text-[10px] break-all">
                              {editingAuctionDetails.paymentIntentId}
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No winner yet — auction is still active or closed without a successful
                        charge.
                      </p>
                    )}

                    <div className="text-xs font-semibold text-primary uppercase tracking-wide pt-2">
                      Shipping address
                    </div>
                    {editingAuctionDetails.shippingAddress ? (
                      <div className="text-sm leading-snug bg-background/50 rounded border border-primary/20 p-2">
                        <div className="font-medium">
                          {editingAuctionDetails.shippingAddress.firstName}{' '}
                          {editingAuctionDetails.shippingAddress.lastName}
                        </div>
                        <div>{editingAuctionDetails.shippingAddress.addressLine1}</div>
                        {editingAuctionDetails.shippingAddress.addressLine2 && (
                          <div>{editingAuctionDetails.shippingAddress.addressLine2}</div>
                        )}
                        <div>
                          {editingAuctionDetails.shippingAddress.city},{' '}
                          {editingAuctionDetails.shippingAddress.state}{' '}
                          {editingAuctionDetails.shippingAddress.zipCode}
                        </div>
                        <div>{editingAuctionDetails.shippingAddress.country}</div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Shipping address is recorded with the prize order once the winner is
                        charged.
                      </p>
                    )}
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground border-t border-primary/20 pt-2">
                  Auction timing and pricing are locked after creation. Use the{' '}
                  <span className="text-primary font-medium">Auctions</span> tab to force close or
                  cancel a live auction.
                </p>
              </div>
            )}

            {saleType !== 'auction' && (
              <>
                <div className="space-y-2.5">
                  <Label htmlFor="usdAmount" className="text-base font-medium">
                    USD Amount
                    <span className="text-xs text-muted-foreground font-normal ml-2">
                      ($1 = 50 cadecoins)
                    </span>
                  </Label>
                  <Input
                    id="usdAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={usdAmount}
                    onChange={e => handleUsdChange(e.target.value)}
                    className="h-12 text-base"
                    placeholder="Enter USD amount..."
                    disabled={formData.purchaseOption === 'offers_only'}
                  />
                  <p className="text-xs text-muted-foreground">
                    This will auto-calculate the cadecoin amount below
                  </p>
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="amount" className="text-base font-medium">
                    Cadecoin Amount{' '}
                    {formData.purchaseOption !== 'offers_only' && (
                      <span className="text-destructive">*</span>
                    )}
                    {formData.purchaseOption === 'offers_only' && (
                      <span className="text-xs text-muted-foreground font-normal">
                        (optional - defaults to $0.02)
                      </span>
                    )}
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount || ''}
                    onChange={e => handleCoinAmountChange(e.target.value)}
                    className="h-12 text-base"
                    placeholder={formData.purchaseOption === 'offers_only' ? 'Optional' : '0'}
                    disabled={formData.purchaseOption === 'offers_only'}
                  />
                  {formData.purchaseOption === 'offers_only' && (
                    <p className="text-xs text-muted-foreground">
                      Price is not shown to users for offer-only items. They submit their own offer.
                    </p>
                  )}
                </div>
              </>
            )}
            <div className="space-y-2.5">
              <Label htmlFor="name" className="text-base font-medium">
                Item Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => {
                  setFormData({ ...formData, name: e.target.value });
                  setValidationError('');
                }}
                className="h-12 text-base"
                placeholder="e.g., PSA 10 Charizard Slab"
              />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="category" className="text-base font-medium">
                Item Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={value => {
                  setFormData({ ...formData, category: value as 'raw' | 'slab' | 'sealed' });
                  setValidationError('');
                }}
              >
                <SelectTrigger id="category" className="h-12 text-base">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="raw">Raw</SelectItem>
                  <SelectItem value="slab">Slab</SelectItem>
                  <SelectItem value="sealed">Sealed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {saleType !== 'auction' && (
              <div className="space-y-2.5">
                <Label htmlFor="purchaseOption" className="text-base font-medium">
                  Purchase Option <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.purchaseOption}
                  onValueChange={value => {
                    setFormData({
                      ...formData,
                      purchaseOption: value as 'offers_only' | 'buy_only' | 'both',
                    });
                    setValidationError('');
                  }}
                >
                  <SelectTrigger id="purchaseOption" className="h-12 text-base">
                    <SelectValue placeholder="Select purchase option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="offers_only">Offers Only</SelectItem>
                    <SelectItem value="buy_only">Buy Only</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2.5">
              <Label htmlFor="brand" className="text-base font-medium">
                Card Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.brand || 'pokemon'}
                onValueChange={value => {
                  setFormData({
                    ...formData,
                    brand: value as PrizeBrand,
                  });
                  setValidationError('');
                }}
              >
                <SelectTrigger id="brand" className="h-12 text-base">
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pokemon">Pokémon</SelectItem>
                  <SelectItem value="one_piece">One Piece</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {saleType !== 'auction' && (
              <div className="space-y-3 rounded-lg border border-border p-4 bg-muted/30">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <Label htmlFor="sellAsCardcade" className="text-base font-medium">
                      Sell as CardCade
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      When on, this item lives in the CardCade shop with no
                      seller. Buyers see the &ldquo;Pay with USDC&rdquo;
                      option (controlled by the CardCade Shop Settings).
                      Turn off only to assign the item to a real seller&rsquo;s
                      shop.
                    </p>
                  </div>
                  <Switch
                    id="sellAsCardcade"
                    checked={!formData.createdBy}
                    onCheckedChange={checked => {
                      setFormData({
                        ...formData,
                        createdBy: checked ? null : formData.createdBy,
                      });
                      setValidationError('');
                    }}
                  />
                </div>

                {formData.createdBy && (
                  <div className="space-y-2.5 pt-2 border-t border-border">
                    <Label htmlFor="seller" className="text-base font-medium">
                      Assign to Seller
                    </Label>
                    <Select
                      value={formData.createdBy || '__none__'}
                      onValueChange={value => {
                        setFormData({
                          ...formData,
                          createdBy: value === '__none__' ? null : value,
                        });
                        setValidationError('');
                      }}
                    >
                      <SelectTrigger id="seller" className="h-12 text-base">
                        <SelectValue placeholder="No seller (admin item)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No seller (CardCade item)</SelectItem>
                        {sellers.map(seller => (
                          <SelectItem key={seller.id} value={seller.id}>
                            {seller.shopName || seller.username}
                            {seller.name && ` (${seller.name})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      USDC checkout will only show if this seller has
                      connected a Solana wallet and been approved.
                    </p>
                  </div>
                )}
              </div>
            )}
            {saleType !== 'auction' && (
              <div className="space-y-2.5">
                <Label htmlFor="stock" className="text-base font-medium">
                  Stock Quantity
                </Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock || ''}
                  onChange={e => {
                    setFormData({
                      ...formData,
                      stock: e.target.value === '' ? 0 : parseInt(e.target.value) || 0,
                    });
                    setValidationError('');
                  }}
                  className="h-12 text-base"
                  placeholder="0 = unlimited"
                />
              </div>
            )}
            {/*
              Per-item shipping fee. Applies to every sale type — fixed-price
              checkout, offers, and auction close all add this on top of the
              winner/buyer total. Backend defaults to $5 if omitted.
            */}
            <div className="space-y-2.5">
              <Label htmlFor="shippingCostUsd" className="text-base font-medium">
                Shipping Cost (USD)
              </Label>
              <Input
                id="shippingCostUsd"
                type="number"
                min="0"
                step="0.01"
                value={formData.shippingCostUsd ?? ''}
                onChange={e => {
                  const raw = e.target.value;
                  setFormData({
                    ...formData,
                    shippingCostUsd: raw === '' ? undefined : Math.max(0, parseFloat(raw) || 0),
                  });
                }}
                className="h-12 text-base"
                placeholder="5.00"
              />
              <p className="text-xs text-muted-foreground">
                Charged to the buyer on top of the sale price (or winning bid for auctions).
                Defaults to $5.00.
              </p>
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="description" className="text-base font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Item description..."
                rows={4}
                className="text-base resize-none"
              />
            </div>

            {saleType !== 'auction' && (
              <div className="space-y-2.5">
                <Label className="text-base font-medium">Page Visibility</Label>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="showOnShop"
                      checked={formData.showOnShop ?? true}
                      onCheckedChange={checked => setFormData({ ...formData, showOnShop: checked })}
                    />
                    <Label htmlFor="showOnShop" className="font-medium cursor-pointer">
                      Show in Shops
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="showOnRedemptions"
                      checked={formData.showOnRedemptions ?? false}
                      onCheckedChange={checked =>
                        setFormData({ ...formData, showOnRedemptions: checked })
                      }
                    />
                    <Label htmlFor="showOnRedemptions" className="font-medium cursor-pointer">
                      Show on Redemptions Page
                    </Label>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              <Label className="text-base font-medium">Item Image</Label>
              <ItemImageGallery
                images={itemImages}
                coverIndex={coverImageIndex}
                onImagesChange={setItemImages}
                onCoverIndexChange={setCoverImageIndex}
                onError={setImageError}
                maxImages={IMAGE_UPLOAD_CONFIG.ITEM_MAX_IMAGES}
                disabled={isUploading || createMutation.isPending || updateMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Drag to reorder photos. Use the star button to choose cover photo.
              </p>
              <p className="rounded-md border border-[#D4FF00]/40 bg-[#D4FF00]/10 px-3 py-2 text-xs font-semibold text-[#D4FF00]">
                Please lookup the cert number for your slab to see if there are high resolution
                photos of it. If so, right click, save to downloads, and upload those photos here.
              </p>
              {imageError && <p className="text-sm text-red-500 mt-2">{imageError}</p>}
            </div>
          </div>
          {validationError && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive rounded-md">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{validationError}</p>
            </div>
          )}
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingTier(null);
                resetForm();
              }}
              className="h-12 sm:h-10 text-base sm:text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={editingTier ? handleUpdate : handleCreate}
              disabled={
                isUploading ||
                createMutation.isPending ||
                updateMutation.isPending ||
                itemImages.length === 0 ||
                (!editingTier && isCreatingRef.current)
              }
              className="h-12 sm:h-10 text-base sm:text-sm"
            >
              {(isUploading || createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingTier ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletingTier !== null} onOpenChange={() => setDeletingTier(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Prize Tier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingTier?.name}&quot;? This will deactivate
              the tier but preserve it in history for data integrity.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingTier) {
                  deleteMutation.mutate(deletingTier.id);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Assign to Seller Dialog */}
      <Dialog open={bulkAssignDialogOpen} onOpenChange={setBulkAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to Seller</DialogTitle>
            <DialogDescription>
              Select a seller to assign {selectedItems.size} selected item
              {selectedItems.size !== 1 ? 's' : ''} to them, or remove seller assignment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-seller">Seller</Label>
              <Select value={bulkAssignSeller ?? ''} onValueChange={setBulkAssignSeller}>
                <SelectTrigger id="bulk-seller">
                  <SelectValue placeholder="Select a seller or admin item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No seller (Admin item)</SelectItem>
                  {sellers.map(seller => (
                    <SelectItem key={seller.id} value={seller.id}>
                      {seller.name || seller.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!bulkAssignSeller) {
                  toast({
                    title: 'Error',
                    description: 'Please select a seller',
                    variant: 'destructive',
                  });
                  return;
                }
                const createdBy = bulkAssignSeller === '__none__' ? null : bulkAssignSeller;
                const updates = Array.from(selectedItems).map(id => {
                  const item = tiers?.find(t => t.id === id);
                  let amount = item?.amount ?? 0;

                  // If assigning to seller (moving to shop) and item is currently in redemptions, divide by 50
                  if (createdBy && item?.showOnRedemptions && !item?.showOnShop) {
                    amount = Math.round(item.amount / 50);
                  }

                  return {
                    id,
                    createdBy,
                    showOnShop: createdBy ? true : (item?.showOnShop ?? true),
                    showOnRedemptions: createdBy ? false : (item?.showOnRedemptions ?? true),
                    amount,
                  };
                });
                bulkAssignMutation.mutate(updates);
              }}
              disabled={bulkAssignSeller === null || bulkAssignMutation.isPending}
            >
              {bulkAssignMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
