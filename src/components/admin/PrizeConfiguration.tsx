import { useState, useRef, useEffect } from 'react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SearchInput } from '@/components/ui/SearchInput';
import { useToast } from '@/hooks/use-toast';
import { useAdminPrizeTiers } from '@/hooks/usePrizeConfig';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/integrations/api/client';
import { handleMutationError } from '@/lib/mutationHelpers';
import { Loader2, Plus, Trash2, X, Edit, AlertCircle, Expand, GripVertical } from 'lucide-react';
import {
  PrizeConfiguration as PrizeTier,
  CreatePrizeTierRequest,
  UpdatePrizeTierRequest,
  PrizeBrand,
} from '@/types/prize';
import PhotoCropper from '../PhotoCropper';
import { useImageCropper } from '@/hooks/useImageCropper';
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
import Bugsnag from '@bugsnag/js';
import { getMessage, getThumbnailUrl } from '@/utils/helper';
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
        className: 'bg-red-300 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-100 border-indigo-200',
      };
    case 'offers_only':
      return {
        label: 'Make Offer Only',
        className: 'bg-orange-300 text-orange-900 dark:bg-orange-900 dark:text-orange-100 border-orange-200',
      };
  }
};

// Helper function to get category badge styling
const getCategoryBadge = (category: 'slab' | 'sealed') => {
  switch (category) {
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
  }
};

// Sortable Prize Item Component
interface SortablePrizeItemProps {
  tier: PrizeTier;
  position: number;
  changes: {
    displayOrderShop: number;
    displayOrderRedemptions: number;
    displayOrderNicksNiceties: number;
    featuredDisplayOrder: number | null;
    isFeatured: boolean;
  };
  onToggleFeatured: (id: string, featured: boolean) => void;
  onFeaturedOrderChange: (id: string, order: number) => void;
  hasDuplicateFeaturedOrder: boolean;
  selectedPage: 'shop' | 'redemptions' | 'nicks_niceties';
}

const SortablePrizeItem = ({ tier, position, changes, onToggleFeatured, onFeaturedOrderChange, hasDuplicateFeaturedOrder, selectedPage }: SortablePrizeItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tier.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors"
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
          <Badge variant="outline" className={`text-xs ${getCategoryBadge(tier.category).className}`}>
            {getCategoryBadge(tier.category).label}
          </Badge>
          <Badge variant="outline" className={`text-xs ${getPurchaseOptionBadge(tier.purchaseOption).className}`}>
            {getPurchaseOptionBadge(tier.purchaseOption).label}
          </Badge>
        </div>
        {tier.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
            {tier.description}
          </p>
        )}
      </div>

      {/* Featured toggle and order input - Shop page only */}
      {selectedPage === 'shop' && (
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Featured</Label>
            <Switch
              checked={changes.isFeatured}
              onCheckedChange={(checked) => onToggleFeatured(tier.id, checked)}
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
                  value={changes.featuredDisplayOrder ?? 1}
                  onChange={(e) => {
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

  // Image upload hook
  const imageUpload = useImageCropper({
    checkNSFW: false,
    onError: error => setImageError(error),
  });

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<PrizeTier | null>(null);
  const [deletingTier, setDeletingTier] = useState<PrizeTier | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Display order editing state
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [selectedPage, setSelectedPage] = useState<'shop' | 'redemptions' | 'nicks_niceties'>('shop');
  const [orderChanges, setOrderChanges] = useState<Map<string, { displayOrderShop: number; displayOrderRedemptions: number; displayOrderNicksNiceties: number; featuredDisplayOrder: number | null; isFeatured: boolean }>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sorting preference state (initialized from first prize in data)
  const [sortByPurchaseOption, setSortByPurchaseOption] = useState({
    shop: tiers?.[0]?.sortByPurchaseOptionShop ?? false,
    redemptions: tiers?.[0]?.sortByPurchaseOptionRedemptions ?? false,
    nicksNiceties: tiers?.[0]?.sortByPurchaseOptionNicksNiceties ?? false,
  });

  // Validation state
  const [validationError, setValidationError] = useState<string>('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageLayout, setImageLayout] = useState<'single' | 'double'>('single');
  const [usdAmount, setUsdAmount] = useState<string>('');

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
    displayOrder: 0,
    showOnRedemptions: true,
    showOnShop: true,
  });

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
      displayOrder: 0,
      showOnRedemptions: true,
      showOnShop: true,
    });
    setValidationError('');
    imageUpload.clearImage();
    setImageError(null);
    setImageLayout('single');
    setUsdAmount('');
  };

  // USD to Cadecoins conversion handlers (1 USD = 50 cadecoins)
  const handleUsdChange = (value: string) => {
    setUsdAmount(value);
    const usdValue = parseFloat(value);
    if (!isNaN(usdValue) && usdValue > 0) {
      const cadecoins = parseFloat((usdValue * 50).toFixed(2));
      setFormData({ ...formData, amount: cadecoins });
    } else if (value === '') {
      setFormData({ ...formData, amount: 0 });
    }
  };

  const handleCoinAmountChange = (value: string) => {
    const coinValue = parseFloat(value);
    setFormData({ ...formData, amount: isNaN(coinValue) ? 0 : coinValue });
    
    // Calculate and display equivalent USD
    if (!isNaN(coinValue) && coinValue > 0) {
      const usdEquivalent = (coinValue / 50).toFixed(2);
      setUsdAmount(usdEquivalent);
    } else {
      setUsdAmount('');
    }
    setValidationError('');
  };

  // Drag and drop handlers
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) imageUpload.handleFileSelect(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) imageUpload.handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
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
    mutationFn: (payload: CreatePrizeTierRequest) => api.prize.createPrizeTier(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPrizeTiers'] });
      queryClient.invalidateQueries({ queryKey: ['prizeTiers'] });
      toast({
        title: 'Success!',
        description: 'Item created successfully',
      });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: error => handleMutationError(error, 'Failed to create item'),
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
    mutationFn: (updates: Array<{ 
      id: string; 
      displayOrderShop: number | null; 
      displayOrderRedemptions: number | null; 
      displayOrderNicksNiceties: number | null; 
      featuredDisplayOrder: number | null;
      sortByPurchaseOptionShop?: boolean;
      sortByPurchaseOptionRedemptions?: boolean;
      sortByPurchaseOptionNicksNiceties?: boolean;
    }>) =>
      api.prize.bulkUpdateDisplayOrder({ updates } as any),
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

  // Helper functions for display order editing
  const enterEditMode = () => {
    setIsEditingOrder(true);
    // Initialize orderChanges with current values (keep NULL for pages where prize isn't shown)
    const initialChanges = new Map();
    activeTiers.forEach(tier => {
      initialChanges.set(tier.id, {
        displayOrderShop: tier.displayOrderShop ?? null,
        displayOrderRedemptions: tier.displayOrderRedemptions ?? null,
        displayOrderNicksNiceties: tier.displayOrderNicksNiceties ?? null,
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
      displayOrderNicksNiceties: values.displayOrderNicksNiceties,
      featuredDisplayOrder: values.isFeatured ? values.featuredDisplayOrder : null,
    }));

    bulkUpdateOrderMutation.mutate(updates);
  };

  // Handle toggle change for purchase option sorting
  const handleToggleSortChange = async (checked: boolean) => {
    const page = selectedPage === 'nicks_niceties' ? 'nicksNiceties' : selectedPage;
    
    // Update local state immediately for instant UI feedback
    setSortByPurchaseOption(prev => ({ ...prev, [page]: checked }));
    
    // Prepare field name for API
    const fieldMap = {
      shop: 'sortByPurchaseOptionShop',
      redemptions: 'sortByPurchaseOptionRedemptions',
      nicksNiceties: 'sortByPurchaseOptionNicksNiceties',
    };
    
    // Update all prize configs with the new sorting preference
    const updates = activeTiers.map(tier => ({
      id: tier.id,
      displayOrderShop: tier.displayOrderShop,
      displayOrderRedemptions: tier.displayOrderRedemptions,
      displayOrderNicksNiceties: tier.displayOrderNicksNiceties,
      featuredDisplayOrder: tier.featuredDisplayOrder,
      // Include all sorting preferences, updating only the current page
      sortByPurchaseOptionShop: page === 'shop' ? checked : tier.sortByPurchaseOptionShop,
      sortByPurchaseOptionRedemptions: page === 'redemptions' ? checked : tier.sortByPurchaseOptionRedemptions,
      sortByPurchaseOptionNicksNiceties: page === 'nicksNiceties' ? checked : tier.sortByPurchaseOptionNicksNiceties,
    }));
    
    try {
      await bulkUpdateOrderMutation.mutateAsync(updates);
    } catch (error) {
      // Revert state on error
      setSortByPurchaseOption(prev => ({ ...prev, [page]: !checked }));
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
  const getSortedPrizes = (category?: 'slab' | 'sealed', includeSearchFilter = true) => {
    let prizes = activeTiers;
    
    // Filter by category if specified
    if (category) {
      prizes = prizes.filter(t => t.category === category);
    }
    
    // Filter by selected page (only show prizes that should appear on this page)
    prizes = prizes.filter(t => {
      if (selectedPage === 'shop') return t.showOnShop;
      if (selectedPage === 'redemptions') return t.showOnRedemptions;
      if (selectedPage === 'nicks_niceties') return t.showOnNicksNiceties;
      return true;
    });
    
    // Apply search filter (optional - can be disabled to get full list for position calculation)
    if (includeSearchFilter && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      prizes = prizes.filter(p => 
        p.name.toLowerCase().includes(query) ||
        (p.description?.toLowerCase() || '').includes(query)
      );
    }
    
    // Sort by current order (use orderChanges in edit mode, DB values in view mode)
    return prizes.sort((a, b) => {
      let aOrder: number, bOrder: number;
      
      if (isEditingOrder) {
        // In edit mode: use live state from orderChanges (so drag updates are immediately visible)
        const aChanges = orderChanges.get(a.id);
        const bChanges = orderChanges.get(b.id);
        
        if (selectedPage === 'shop') {
          aOrder = aChanges?.displayOrderShop ?? a.displayOrderShop ?? 999;
          bOrder = bChanges?.displayOrderShop ?? b.displayOrderShop ?? 999;
        } else if (selectedPage === 'redemptions') {
          aOrder = aChanges?.displayOrderRedemptions ?? a.displayOrderRedemptions ?? 999;
          bOrder = bChanges?.displayOrderRedemptions ?? b.displayOrderRedemptions ?? 999;
        } else {
          aOrder = aChanges?.displayOrderNicksNiceties ?? a.displayOrderNicksNiceties ?? 999;
          bOrder = bChanges?.displayOrderNicksNiceties ?? b.displayOrderNicksNiceties ?? 999;
        }
      } else {
        // In view mode: use DB values (same field as edit mode for consistency)
        if (selectedPage === 'shop') {
          aOrder = a.displayOrderShop ?? 999;
          bOrder = b.displayOrderShop ?? 999;
        } else if (selectedPage === 'redemptions') {
          aOrder = a.displayOrderRedemptions ?? 999;
          bOrder = b.displayOrderRedemptions ?? 999;
        } else {
          aOrder = a.displayOrderNicksNiceties ?? 999;
          bOrder = b.displayOrderNicksNiceties ?? 999;
        }
      }
      
      // Apply purchase option sorting if enabled for current page
      const pageKey = selectedPage === 'nicks_niceties' ? 'nicksNiceties' : selectedPage;
      if (sortByPurchaseOption[pageKey]) {
        // Primary sort: purchaseOption (both=0, buy_only=1, offers_only=2)
        const purchaseOrder = { both: 0, buy_only: 1, offers_only: 2 };
        const aPurchase = purchaseOrder[a.purchaseOption] ?? 3;
        const bPurchase = purchaseOrder[b.purchaseOption] ?? 3;
        if (aPurchase !== bPurchase) return aPurchase - bPurchase;
      }
      
      // Secondary sort (or primary if purchase sorting disabled): displayOrder
      return aOrder - bOrder;
    });
  };

  // Sync sorting state from tiers data when it loads/changes
  useEffect(() => {
    if (tiers && tiers.length > 0) {
      setSortByPurchaseOption({
        shop: tiers[0].sortByPurchaseOptionShop ?? false,
        redemptions: tiers[0].sortByPurchaseOptionRedemptions ?? false,
        nicksNiceties: tiers[0].sortByPurchaseOptionNicksNiceties ?? false,
      });
    }
  }, [tiers]);

  // Helper function to get the actual position of a prize in the full (unfiltered) sorted list
  const getRealPosition = (tierId: string, category?: 'slab' | 'sealed'): number => {
    const fullList = getSortedPrizes(category, false); // Get list without search filter
    const index = fullList.findIndex(t => t.id === tierId);
    return index !== -1 ? index + 1 : 0;
  };

  // Drag handler for reordering prizes
  const handleDragEnd = (event: DragEndEvent, category?: 'slab' | 'sealed') => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    // IMPORTANT: Get the FULL sorted list (without search filter) to calculate real positions
    const fullSortedList = getSortedPrizes(category, false);

    // Validate drag if purchase option sorting is enabled
    const pageKey = selectedPage === 'nicks_niceties' ? 'nicksNiceties' : selectedPage;
    if (sortByPurchaseOption[pageKey]) {
      const draggedPrize = fullSortedList.find(p => p.id === active.id);
      const targetPrize = fullSortedList.find(p => p.id === over.id);
      
      if (draggedPrize && targetPrize) {
        const purchaseOrder = { both: 0, buy_only: 1, offers_only: 2 };
        const draggedPriority = purchaseOrder[draggedPrize.purchaseOption];
        const targetPriority = purchaseOrder[targetPrize.purchaseOption];
        
        // Prevent dragging lower priority items before higher priority items
        if (draggedPriority > targetPriority) {
          let message = '';
          if (draggedPrize.purchaseOption === 'offers_only' && targetPrize.purchaseOption === 'both') {
            message = 'Cards with "Make Offer Only" cannot be placed before cards with "Both Options". Disable grouping to reorder freely.';
          } else if (draggedPrize.purchaseOption === 'offers_only' && targetPrize.purchaseOption === 'buy_only') {
            message = 'Cards with "Make Offer Only" cannot be placed before cards with "Buy Only". Disable grouping to reorder freely.';
          } else if (draggedPrize.purchaseOption === 'buy_only' && targetPrize.purchaseOption === 'both') {
            message = 'Cards with "Buy Only" cannot be placed before cards with "Both Options". Disable grouping to reorder freely.';
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
        } else if (selectedPage === 'redemptions') {
          newChanges.set(prize.id, { ...current, displayOrderRedemptions: displayOrder });
        } else {
          newChanges.set(prize.id, { ...current, displayOrderNicksNiceties: displayOrder });
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
        featuredDisplayOrder: isFeatured ? (currentChanges.featuredDisplayOrder || getNextFeaturedOrder()) : null,
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



  const handleCreate = async () => {
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

    setValidationError('');

    try {
      // Upload image if new file selected
      const imageUrl = await handleImageUpload();

      createMutation.mutate({
        ...formData,
        imageUrl,
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

    setValidationError('');

    try {
      // Upload image if new file selected
      const imageUrl = await handleImageUpload();

      updateMutation.mutate({
        id: editingTier.id,
        payload: {
          ...formData,
          imageUrl,
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
      displayOrderNicksNiceties: tier.displayOrderNicksNiceties,
      featuredDisplayOrder: tier.featuredDisplayOrder,
      showOnRedemptions: tier.showOnRedemptions ?? true,
      showOnShop: tier.showOnShop ?? true,
    });
    // Calculate and display USD equivalent when editing
    if (tier.amount && tier.amount > 0) {
      const usdEquivalent = (tier.amount / 50).toFixed(2);
      setUsdAmount(usdEquivalent);
    } else {
      setUsdAmount('');
    }
    imageUpload.clearImage();
    setEditingTier(tier);
  };

  const handleImageUpload = async (): Promise<string> => {
    if (!imageUpload.selectedFile) {
      return formData.imageUrl; // Return existing URL if no new file
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
      Bugsnag.notify(error);
      throw error; // Re-throw to be caught by handleCreate/handleUpdate
    } finally {
      setIsUploading(false);
    }
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
              <CardTitle>Shop Configuration</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Manage items in the shop</p>
            </div>
            <div className="flex gap-2">
              {isEditingOrder ? (
                <>
                  <Button variant="outline" onClick={cancelEditMode}>
                    Cancel
                  </Button>
                  <Button onClick={saveDisplayOrders} disabled={bulkUpdateOrderMutation.isPending}>
                    {bulkUpdateOrderMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
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
          {/* Page filter tabs in edit mode */}
          {isEditingOrder && (
            <div className="mb-6 flex gap-2 border-b border-border">
              <Button
                variant={selectedPage === 'shop' ? 'default' : 'ghost'}
                onClick={() => setSelectedPage('shop')}
                className="rounded-b-none"
              >
                Shop Page
              </Button>
              <Button
                variant={selectedPage === 'redemptions' ? 'default' : 'ghost'}
                onClick={() => setSelectedPage('redemptions')}
                className="rounded-b-none"
              >
                Redeem Page
              </Button>
              <Button
                variant={selectedPage === 'nicks_niceties' ? 'default' : 'ghost'}
                onClick={() => setSelectedPage('nicks_niceties')}
                className="rounded-b-none"
              >
                Nick's Niceties
              </Button>
            </div>
          )}
          
          {/* Search bar and sorting toggle */}
          {activeTiers.length > 0 && (
            <div className="mb-6 flex items-center justify-between gap-4">
              {/* Left side: Search */}
              <div className="flex-1">
                <SearchInput
                  id="prize-search"
                  placeholder="Search prizes by name or description..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                  width="lg"
                />
              </div>
              
              {/* Right side: Sorting toggle (only in edit mode) */}
              {isEditingOrder && (
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <Switch
                    checked={sortByPurchaseOption[selectedPage === 'nicks_niceties' ? 'nicksNiceties' : selectedPage]}
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
                        <p>When enabled, prizes with both purchase options appear before buy-only or offers-only prizes</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
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
              {/* Shop Page - Combined List (No Category Separation) */}
              {selectedPage === 'shop' && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">All Prizes</h3>
                  {isEditingOrder ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => handleDragEnd(e)}
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
                                hasDuplicateFeaturedOrder={changes.isFeatured && changes.featuredDisplayOrder !== null ? checkDuplicateFeaturedOrder(tier.id, changes.featuredDisplayOrder) : false}
                                selectedPage={selectedPage}
                              />
                            ) : null;
                          })}
                          {getSortedPrizes().length === 0 && searchQuery.trim() && (
                            <div className="text-center py-8 text-muted-foreground">
                              <p>No prizes found matching "{searchQuery}"</p>
                              <Button variant="link" onClick={() => setSearchQuery('')} className="mt-2">
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
                          className="flex items-center justify-between gap-4 p-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors"
                        >
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
                              <Badge variant="outline" className={`text-xs ${getCategoryBadge(tier.category).className}`}>
                                {getCategoryBadge(tier.category).label}
                              </Badge>
                              <Badge variant="outline" className={`text-xs ${getPurchaseOptionBadge(tier.purchaseOption).className}`}>
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
                          <Button variant="link" onClick={() => setSearchQuery('')} className="mt-2">
                            Clear search
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Redemptions/Nick's Niceties - Separate Category Sections */}
              {selectedPage !== 'shop' && (
                <>
                  {/* Slab Category Section */}
                  {getSortedPrizes('slab').length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-primary">Slab Prizes</h3>
                      {isEditingOrder ? (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(e) => handleDragEnd(e, 'slab')}
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
                                    hasDuplicateFeaturedOrder={changes.isFeatured && changes.featuredDisplayOrder !== null ? checkDuplicateFeaturedOrder(tier.id, changes.featuredDisplayOrder) : false}
                                    selectedPage={selectedPage}
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
                              className="flex items-center justify-between gap-4 p-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors"
                            >
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
                                  <Badge variant="outline" className={`text-xs ${getCategoryBadge(tier.category).className}`}>
                                    {getCategoryBadge(tier.category).label}
                                  </Badge>
                                  <Badge variant="outline" className={`text-xs ${getPurchaseOptionBadge(tier.purchaseOption).className}`}>
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
                          onDragEnd={(e) => handleDragEnd(e, 'sealed')}
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
                                    hasDuplicateFeaturedOrder={changes.isFeatured && changes.featuredDisplayOrder !== null ? checkDuplicateFeaturedOrder(tier.id, changes.featuredDisplayOrder) : false}
                                    selectedPage={selectedPage}
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
                              className="flex items-center justify-between gap-4 p-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors"
                            >
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
                                  <Badge variant="outline" className={`text-xs ${getCategoryBadge(tier.category).className}`}>
                                    {getCategoryBadge(tier.category).label}
                                  </Badge>
                                  <Badge variant="outline" className={`text-xs ${getPurchaseOptionBadge(tier.purchaseOption).className}`}>
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
                value={formData.amount}
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
            <div className="space-y-2.5">
              <Label htmlFor="name" className="text-base font-medium">
                Prize Name <span className="text-destructive">*</span>
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
                Prize Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={value => {
                  setFormData({ ...formData, category: value as 'slab' | 'sealed' });
                  setValidationError('');
                }}
              >
                <SelectTrigger id="category" className="h-12 text-base">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slab">Slab</SelectItem>
                  <SelectItem value="sealed">Sealed</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <div className="space-y-2.5">
              <Label htmlFor="brand" className="text-base font-medium">
                Brand <span className="text-destructive">*</span>
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
            <div className="space-y-2.5">
              <Label htmlFor="imageLayout" className="text-base font-medium">
                Image Layout
              </Label>
              <Select
                value={imageLayout}
                onValueChange={value => setImageLayout(value as 'single' | 'double')}
              >
                <SelectTrigger id="imageLayout" className="h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Slab (4" × 6.5")</SelectItem>
                  <SelectItem value="double">Double Slab - Front & Back (8" × 6.5")</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose single for one side, or double for front & back side-by-side
              </p>
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="stock" className="text-base font-medium">
                Stock Quantity
              </Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={formData.stock}
                onChange={e => {
                  setFormData({ ...formData, stock: parseInt(e.target.value) || 0 });
                  setValidationError('');
                }}
                className="h-12 text-base"
                placeholder="0 = unlimited"
              />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="description" className="text-base font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Prize description..."
                rows={4}
                className="text-base resize-none"
              />
            </div>

            <div className="space-y-2.5">
              <Label className="text-base font-medium">Page Visibility</Label>
              <div className="flex flex-col gap-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="showOnShop"
                    checked={formData.showOnShop ?? true}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, showOnShop: checked })
                    }
                  />
                  <Label htmlFor="showOnShop" className="font-medium cursor-pointer">
                    Show on Shop Page
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="showOnRedemptions"
                    checked={formData.showOnRedemptions ?? false}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, showOnRedemptions: checked })
                    }
                  />
                  <Label htmlFor="showOnRedemptions" className="font-medium cursor-pointer">
                    Show on Redemptions Page
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="showOnShop"
                    checked={formData.showOnShop ?? true}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, showOnShop: checked })
                    }
                  />
                  <Label htmlFor="showOnShop" className="font-medium cursor-pointer">
                    Show on Shop Page
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <Label className="text-base font-medium">Prize Image</Label>
              {imageUpload.previewUrl ||
              (editingTier && formData.imageUrl && !imageUpload.selectedFile) ? (
                <div className="relative rounded-lg overflow-hidden">
                  <img
                    src={imageUpload.previewUrl || getThumbnailUrl(formData.imageUrl)}
                    alt="Preview"
                    className={`w-full object-cover cursor-pointer hover:opacity-90 transition-opacity ${
                      imageLayout === 'single' ? 'aspect-[8/13]' : 'aspect-[16/13]'
                    }`}
                    onClick={() => setShowImageModal(true)}
                  />
                  <div 
                    className="absolute top-2 left-2 z-20 bg-black/60 rounded-md p-1.5 hover:bg-black/80 transition-colors cursor-pointer"
                    onClick={() => setShowImageModal(true)}
                  >
                    <Expand className="h-4 w-4 text-white" aria-hidden="true" />
                  </div>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 h-10 w-10 shadow-lg"
                    onClick={() => {
                      imageUpload.clearImage();
                      setFormData({ ...formData, imageUrl: '' });
                    }}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              ) : (
                <div
                  className={`w-full flex flex-col items-center justify-center bg-secondary rounded-lg py-8 px-4 cursor-pointer border-2 border-dashed transition-colors ${isDragging ? 'ring-2 ring-primary border-primary' : 'border-border'} ${imageError ? 'border-destructive' : ''}`}
                  onClick={imageUpload.isValidating ? undefined : handleUploadClick}
                  onDrop={imageUpload.isValidating ? undefined : handleDrop}
                  onDragOver={imageUpload.isValidating ? undefined : handleDragOver}
                  onDragLeave={imageUpload.isValidating ? undefined : handleDragLeave}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileInputChange}
                    disabled={imageUpload.isValidating}
                  />
                  <div className="flex flex-col items-center gap-2">
                    <div className="rounded-full bg-background border-4 border-border flex items-center justify-center p-3">
                      {imageUpload.isValidating ? (
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      ) : (
                        <img src="/icons/cloud_upload.png" alt="Upload" className="w-8 h-8" />
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-primary">Click to upload</p>
                      <p className="text-xs text-muted-foreground mt-0.5">or drag and drop</p>
                      <p className="text-xs text-muted-foreground mt-2">JPEG, PNG, or WebP</p>
                      <p className="text-xs text-muted-foreground">
                        {imageLayout === 'single'
                          ? 'Aspect ratio 8:13 • 1200×1950px'
                          : 'Aspect ratio 16:13 • 2400×1950px'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {imageError && <p className="text-sm text-red-500 mt-2">{imageError}</p>}
            </div>
          </div>
          {imageUpload.fileToCrop && (
            <PhotoCropper
              file={imageUpload.fileToCrop}
              onClose={imageUpload.cancelCrop}
              onCrop={imageUpload.handleCropComplete}
              cropperProps={{
                aspect:
                  imageLayout === 'single'
                    ? IMAGE_UPLOAD_CONFIG.PRIZE_SINGLE_SLAB_ASPECT_RATIO
                    : IMAGE_UPLOAD_CONFIG.PRIZE_DOUBLE_SLAB_ASPECT_RATIO,
              }}
              resizerProps={{
                maxWidth:
                  imageLayout === 'single'
                    ? IMAGE_UPLOAD_CONFIG.PRIZE_SINGLE_SLAB_MAX_WIDTH
                    : IMAGE_UPLOAD_CONFIG.PRIZE_DOUBLE_SLAB_MAX_WIDTH,
                maxHeight:
                  imageLayout === 'single'
                    ? IMAGE_UPLOAD_CONFIG.PRIZE_SINGLE_SLAB_MAX_HEIGHT
                    : IMAGE_UPLOAD_CONFIG.PRIZE_DOUBLE_SLAB_MAX_HEIGHT,
                compressFormat: 'JPEG',
                quality: IMAGE_UPLOAD_CONFIG.QUALITY,
              }}
            />
          )}
          {validationError && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive rounded-md">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{validationError}</p>
            </div>
          )}
          {showImageModal && (imageUpload.previewUrl || formData.imageUrl) && (
            <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
              <DialogTitle className="sr-only">Prize Image Preview</DialogTitle>
              <DialogContent
                className="max-w-[95vw] max-h-[95vh] p-0 border-0 bg-transparent"
                aria-describedby={undefined}
              >
                <img
                  src={imageUpload.previewUrl || getThumbnailUrl(formData.imageUrl)}
                  alt="Full size preview"
                  className="w-full h-full object-contain rounded-lg"
                />
              </DialogContent>
            </Dialog>
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
              disabled={isUploading || createMutation.isPending || updateMutation.isPending}
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
    </>
  );
};
