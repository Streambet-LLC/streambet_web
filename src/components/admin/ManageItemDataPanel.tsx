import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ChevronLeft,
  Eye,
  EyeOff,
  Flag,
  Loader2,
  RefreshCw,
  Trash2,
  ExternalLink,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { adminAPI } from '@/integrations/api/client';
import { useAdminPrizeTiers } from '@/hooks/usePrizeConfig';
import { PrizeConfiguration, AdminEbaySoldListing } from '@/types/prize';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
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
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';

const resolveFullResImage = (imageUrl: string): string => {
  try {
    const parsed = new URL(imageUrl);
    if (!parsed.hostname.toLowerCase().includes('ebayimg.com')) return imageUrl;
    const resizedPath = parsed.pathname.replace(
      /\/s-l\d+(\.[a-z0-9]+)?$/i,
      (_match, extension = '') => `/s-l1600${extension}`,
    );
    if (resizedPath === parsed.pathname) return imageUrl;
    parsed.pathname = resizedPath;
    return parsed.toString();
  } catch {
    return imageUrl;
  }
};

const CATEGORY_LABELS: Record<string, string> = {
  raw: 'Raw',
  slab: 'Slab',
  sealed: 'Sealed',
  other: 'Other',
};

const BRAND_LABELS: Record<string, string> = {
  pokemon: 'Pokémon',
  one_piece: 'One Piece',
  sports: 'Sports',
  other: 'Other',
};

// ---------------------------------------------------------------------------
// Item list view
// ---------------------------------------------------------------------------

interface ItemListViewProps {
  onSelectItem: (item: PrizeConfiguration) => void;
}

const ItemListView = ({ onSelectItem }: ItemListViewProps) => {
  const queryClient = useQueryClient();
  const { data: items = [], isLoading } = useAdminPrizeTiers();
  const [searchQuery, setSearchQuery] = useState('');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredItems = useMemo(() => {
    let result = items;
    
    // Apply brand filter
    if (brandFilter !== 'all') {
      result = result.filter(item => item.brand === brandFilter);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.ebaySearchQuery?.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [items, searchQuery, brandFilter]);

  const syncAllMutation = useMutation({
    mutationFn: () => adminAPI.syncAllEbayData(),
    onSuccess: (result) => {
      if (result.alreadyRunning) {
        toast({ title: 'Already running', description: 'A sync-all is already in progress.' });
      } else {
        toast({
          title: 'Sync started',
          description: `Queued ${result.queued} item${result.queued !== 1 ? 's' : ''} for background sync. This may take several minutes.`,
        });
      }
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to start sync.', variant: 'destructive' });
    },
  });

  const bulkUpdateVisibilityMutation = useMutation({
    mutationFn: async ({ itemIds, showPublicly }: { itemIds: string[]; showPublicly: boolean }) => {
      // Batch requests in chunks of 200 to respect backend validation
      const batchSize = 200;
      let totalUpdated = 0;
      
      for (let i = 0; i < itemIds.length; i += batchSize) {
        const batch = itemIds.slice(i, i + batchSize);
        const result = await adminAPI.bulkUpdateEbayPublicVisibility(batch, showPublicly);
        totalUpdated += result.updated;
      }
      
      return { updated: totalUpdated };
    },
    onSuccess: (result, { showPublicly, itemIds }) => {
      toast({
        title: 'Success',
        description: `${result.updated} item${result.updated !== 1 ? 's' : ''} ${showPublicly ? 'now show' : 'no longer show'} eBay avg publicly.`,
      });
      queryClient.invalidateQueries({ queryKey: ['adminPrizeTiers'] });
      setSelectedIds(new Set());
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update visibility.', variant: 'destructive' });
    },
  });

  const handleSyncAll = () => {
    syncAllMutation.mutate();
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(item => item.id)));
    }
  };

  const handleToggleItem = (itemId: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedIds(newSelection);
  };

  const handleShowPublicly = () => {
    if (selectedIds.size === 0) return;
    bulkUpdateVisibilityMutation.mutate({
      itemIds: Array.from(selectedIds),
      showPublicly: true,
    });
  };

  const handleHideFromPublic = () => {
    if (selectedIds.size === 0) return;
    bulkUpdateVisibilityMutation.mutate({
      itemIds: Array.from(selectedIds),
      showPublicly: false,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allSelected = filteredItems.length > 0 && selectedIds.size === filteredItems.length;
  const someSelected = selectedIds.size > 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex-1 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search items by name, query, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              <SelectItem value="pokemon">Pokémon</SelectItem>
              <SelectItem value="one_piece">One Piece</SelectItem>
              <SelectItem value="sports">Sports</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleSyncAll}
          disabled={syncAllMutation.isPending}
          variant="outline"
          size="sm"
        >
          {syncAllMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Update All Sold eBay Data
        </Button>
      </div>

      {/* Selection and visibility controls */}
      <div className="flex items-center justify-between gap-4 mb-4 p-3 border border-[#2D343E] rounded-lg bg-[#1a1a1a]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={allSelected}
              onCheckedChange={handleToggleSelectAll}
            />
            <Label htmlFor="select-all" className="cursor-pointer">
              {allSelected ? 'Deselect All' : 'Select All'}
            </Label>
          </div>
          {someSelected && (
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
          )}
        </div>
        {someSelected && (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleShowPublicly}
              disabled={bulkUpdateVisibilityMutation.isPending}
              variant="default"
              size="sm"
            >
              {bulkUpdateVisibilityMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Eye className="w-4 h-4 mr-2" />
              )}
              Show eBay Avg Publicly
            </Button>
            <Button
              onClick={handleHideFromPublic}
              disabled={bulkUpdateVisibilityMutation.isPending}
              variant="outline"
              size="sm"
            >
              <EyeOff className="w-4 h-4 mr-2" />
              Hide eBay Avg
            </Button>
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Showing {filteredItems.length} of {items.length} item{items.length !== 1 ? 's' : ''}. Click an item to view and manage its eBay sold data.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filteredItems.map((item) => {
          const isSelected = selectedIds.has(item.id);
          const isPublic = (item as any).showEbayAvgPublicly ?? false;
          
          return (
            <div
              key={item.id}
              className={`relative border rounded-lg p-3 transition-colors ${
                isSelected ? 'border-primary bg-[#1f1f1f]' : 'border-[#2D343E]'
              }`}
            >
              {/* Selection checkbox */}
              <div className="absolute top-2 left-2 z-10">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => handleToggleItem(item.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-background border-2"
                />
              </div>
              
              {/* Public visibility indicator */}
              {isPublic && (
                <div className="absolute top-2 right-2 z-10">
                  <CheckCircle2 className="w-5 h-5 text-green-500" title="Visible to public" />
                </div>
              )}
              
              <button
                onClick={() => onSelectItem(item)}
                className="text-left w-full hover:opacity-80 transition-opacity"
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full aspect-square object-cover rounded mb-2"
                  />
                ) : (
                  <div className="w-full aspect-square bg-muted rounded mb-2 flex items-center justify-center text-xs text-muted-foreground">
                    No image
                  </div>
                )}
                <p className="font-medium text-sm leading-tight line-clamp-2 mb-1">{item.name}</p>
                <div className="flex gap-1 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {CATEGORY_LABELS[item.category] ?? item.category}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {BRAND_LABELS[item.brand] ?? item.brand}
                  </Badge>
                </div>
                {item.ebaySearchQuery ? (
                  <p className="text-xs text-muted-foreground mt-1 truncate" title={item.ebaySearchQuery}>
                    Query: {item.ebaySearchQuery}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1 italic">Using item name</p>
                )}
                {item.ebayMarketLastCalculatedAt && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Updated {format(new Date(item.ebayMarketLastCalculatedAt), 'MMM d')}
                  </p>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Listing card
// ---------------------------------------------------------------------------

interface ListingCardProps {
  listing: AdminEbaySoldListing;
  selected: boolean;
  onToggle: () => void;
  onImageClick: (listing: AdminEbaySoldListing) => void;
}

const ListingCard = ({ listing, selected, onToggle, onImageClick }: ListingCardProps) => {
  const imageUrl = listing.imageUrl ? resolveFullResImage(listing.imageUrl) : null;

  return (
    <div
      className={`relative border rounded-lg overflow-hidden transition-all ${
        selected ? 'border-primary ring-1 ring-primary' : 'border-[#2D343E]'
      } ${listing.isInaccurate ? 'opacity-60' : ''}`}
    >
      <div className="absolute top-2 left-2 z-10">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          className="bg-black/60 border-white/60"
        />
      </div>
      {listing.isInaccurate && (
        <Badge variant="destructive" className="absolute top-2 right-2 z-10 text-xs px-1 py-0">
          Flagged
        </Badge>
      )}

      {imageUrl ? (
        <button
          type="button"
          className="block w-full"
          onClick={() => onImageClick(listing)}
        >
          <img
            src={imageUrl}
            alt={listing.soldTitle}
            className="w-full aspect-square object-cover hover:opacity-90 transition-opacity cursor-pointer"
          />
        </button>
      ) : (
        <div className="w-full aspect-square bg-muted flex items-center justify-center text-xs text-muted-foreground">
          No image
        </div>
      )}

      <div className="p-2 space-y-0.5">
        <p className="text-xs font-medium leading-tight">{listing.soldTitle}</p>
        <p className="text-xs font-bold">
          {listing.currencySymbol ?? '$'}{listing.salePrice.toFixed(2)}
        </p>
        {listing.dateSold && (
          <p className="text-xs text-muted-foreground">
            {format(new Date(listing.dateSold), 'MMM d, yyyy')}
          </p>
        )}
        {listing.searchQuery && (
          <p
            className="text-xs text-muted-foreground italic truncate"
            title={`Fetched with: "${listing.searchQuery}"`}
          >
            "{listing.searchQuery}"
          </p>
        )}
        {listing.listingUrl && (
          <a
            href={listing.listingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-xs text-blue-400 hover:text-blue-300"
          >
            View on eBay <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Item detail view
// ---------------------------------------------------------------------------

interface ItemDetailViewProps {
  item: PrizeConfiguration;
  onBack: (updatedSearchQuery?: string | null) => void;
}

const ItemDetailView = ({ item, onBack }: ItemDetailViewProps) => {
  const queryClient = useQueryClient();
  const listingsQueryKey = ['admin-item-ebay-listings', item.id];

  const [searchQueryInput, setSearchQueryInput] = useState(item.ebaySearchQuery ?? '');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDropAll, setConfirmDropAll] = useState(false);
  const [confirmFlagSelected, setConfirmFlagSelected] = useState(false);
  const [confirmUnflagSelected, setConfirmUnflagSelected] = useState(false);
  const [confirmFlagAllButSelected, setConfirmFlagAllButSelected] = useState(false);
  const [showFlagged, setShowFlagged] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'price-high' | 'price-low'>('date');
  const [soldListingPreview, setSoldListingPreview] = useState<{
    activeUrl: string;
    thumbnailUrl: string;
    fullResolutionUrl: string;
    soldTitle: string;
  } | null>(null);

  const { data: listings = [], isLoading: listingsLoading } = useQuery<AdminEbaySoldListing[]>({
    queryKey: listingsQueryKey,
    queryFn: () => adminAPI.getItemEbaySoldListings(item.id, 500),
  });

  const saveQueryMutation = useMutation({
    mutationFn: (query: string | null) =>
      adminAPI.updateItemEbaySearchQuery(item.id, query),
    onSuccess: (result) => {
      toast({ title: 'Saved', description: 'eBay search query updated.' });
      queryClient.invalidateQueries({ queryKey: ['adminPrizeTiers'] });
      onBack(result.ebaySearchQuery);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to save search query.', variant: 'destructive' });
    },
  });

  const dropAllMutation = useMutation({
    mutationFn: () => adminAPI.deleteAllItemEbaySoldListings(item.id),
    onSuccess: (result) => {
      toast({ title: 'Done', description: `Deleted ${result.deleted} listing${result.deleted !== 1 ? 's' : ''} and reset sync state.` });
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: listingsQueryKey });
      queryClient.invalidateQueries({ queryKey: ['adminPrizeTiers'] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to drop listings.', variant: 'destructive' });
    },
  });

  const bulkModerateMutation = useMutation({
    mutationFn: async ({ ids, isInaccurate, reason }: { 
      ids: string[]; 
      isInaccurate: boolean; 
      reason?: string;
    }) => {
      const BATCH_SIZE = 200;
      const batches: string[][] = [];
      
      // Split into batches of 200
      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        batches.push(ids.slice(i, i + BATCH_SIZE));
      }
      
      let totalUpdated = 0;
      
      // Process batches sequentially
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const result = await adminAPI.bulkModerateEbaySoldListings(batch, isInaccurate, reason);
        totalUpdated += result.updated;
        
        // Show progress for multi-batch operations
        if (batches.length > 1) {
          const action = isInaccurate ? 'Flagging' : 'Unflagging';
          toast({ 
            title: `${action}...`, 
            description: `Processed ${totalUpdated} of ${ids.length} listings (batch ${i + 1}/${batches.length})` 
          });
        }
      }
      
      return { updated: totalUpdated };
    },
    onSuccess: (result, variables) => {
      const action = variables.isInaccurate ? 'Flagged' : 'Unflagged';
      toast({ 
        title: 'Completed', 
        description: `${action} ${result.updated} listing${result.updated !== 1 ? 's' : ''}.` 
      });
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: listingsQueryKey });
    },
    onError: (_, variables) => {
      const action = variables.isInaccurate ? 'flag' : 'unflag';
      toast({ 
        title: 'Error', 
        description: `Failed to ${action} listings.`, 
        variant: 'destructive' 
      });
    },
  });

  const flaggedCount = useMemo(() => listings.filter((l) => l.isInaccurate).length, [listings]);
  const displayedListings = useMemo(() => {
    let filtered = showFlagged ? listings : listings.filter((l) => !l.isInaccurate);
    
    // Sort listings
    const sorted = [...filtered];
    if (sortBy === 'date') {
      sorted.sort((a, b) => {
        const dateA = a.dateSold ? new Date(a.dateSold).getTime() : 0;
        const dateB = b.dateSold ? new Date(b.dateSold).getTime() : 0;
        return dateB - dateA; // Most recent first
      });
    } else if (sortBy === 'price-high') {
      sorted.sort((a, b) => b.salePrice - a.salePrice);
    } else if (sortBy === 'price-low') {
      sorted.sort((a, b) => a.salePrice - b.salePrice);
    }
    
    return sorted;
  }, [listings, showFlagged, sortBy]);

  const handleOpenLightbox = (listing: AdminEbaySoldListing) => {
    if (!listing.imageUrl) return;
    const fullResolutionUrl = resolveFullResImage(listing.imageUrl);
    setSoldListingPreview({
      activeUrl: fullResolutionUrl,
      thumbnailUrl: listing.imageUrl,
      fullResolutionUrl,
      soldTitle: listing.soldTitle,
    });
  };

  const allSelected = displayedListings.length > 0 && selectedIds.size === displayedListings.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedListings.map((l) => l.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSaveQuery = () => {
    const normalized = searchQueryInput.trim() || null;
    saveQueryMutation.mutate(normalized);
  };

  return (
    <div>
      {/* Breadcrumb */}
      <button
        onClick={() => onBack()}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-white mb-5 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to items
      </button>

      {/* Item header */}
      <div className="flex items-center gap-3 mb-6">
        {item.imageUrl && (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-14 h-14 object-cover rounded flex-shrink-0"
          />
        )}
        <div>
          <h2 className="text-lg font-bold leading-tight">{item.name}</h2>
          <Badge variant="outline" className="mt-1 text-xs">
            {CATEGORY_LABELS[item.category] ?? item.category}
          </Badge>
        </div>
      </div>

      {/* Search query editor */}
      <div className="border border-[#2D343E] rounded-lg p-4 mb-5">
        <Label className="mb-1 block">eBay Search Query</Label>
        <p className="text-xs text-muted-foreground mb-3">
          Controls what is searched on eBay to find sold listings. Clear to fall back to the item name. Does not affect the displayed item name.
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          PSA condition abbreviations between PSA and grade (for example NM-MT, GEM-MT, EX) are automatically removed before search.
        </p>
        <div className="flex gap-2">
          <Input
            value={searchQueryInput}
            onChange={(e) => setSearchQueryInput(e.target.value)}
            placeholder={`Using item name: "${item.name}"`}
            className="flex-1"
          />
          <Button
            onClick={handleSaveQuery}
            disabled={saveQueryMutation.isPending}
            size="sm"
          >
            {saveQueryMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
            Save
          </Button>
        </div>
      </div>

      {/* Actions row */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected ? true : someSelected ? 'indeterminate' : false}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              {displayedListings.length}{displayedListings.length !== listings.length ? ` of ${listings.length}` : ''} listing{listings.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="inline-flex rounded-md border border-[#2A2F3A] bg-[#0B1018] p-0.5">
            <button
              type="button"
              onClick={() => setSortBy('date')}
              className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                sortBy === 'date' ? 'bg-[#7AFF14] text-black' : 'text-muted-foreground hover:text-white'
              }`}
            >
              Date
            </button>
            <button
              type="button"
              onClick={() => setSortBy('price-high')}
              className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                sortBy === 'price-high' ? 'bg-[#7AFF14] text-black' : 'text-muted-foreground hover:text-white'
              }`}
            >
              $ High
            </button>
            <button
              type="button"
              onClick={() => setSortBy('price-low')}
              className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                sortBy === 'price-low' ? 'bg-[#7AFF14] text-black' : 'text-muted-foreground hover:text-white'
              }`}
            >
              $ Low
            </button>
          </div>
          {flaggedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowFlagged((v) => !v);
                setSelectedIds(new Set()); // Clear selection when toggling view
              }}
            >
              {showFlagged ? (
                <><EyeOff className="w-3 h-3 mr-1" />Hide flagged ({flaggedCount})</>
              ) : (
                <><Eye className="w-3 h-3 mr-1" />Show flagged ({flaggedCount})</>
              )}
            </Button>
          )}
          {selectedIds.size > 0 && (
            <>
              {!showFlagged && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmFlagSelected(true)}
                    disabled={bulkModerateMutation.isPending}
                  >
                    {bulkModerateMutation.isPending ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Flag className="w-3 h-3 mr-1" />
                    )}
                    Flag Selected ({selectedIds.size})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmFlagAllButSelected(true)}
                    disabled={bulkModerateMutation.isPending || selectedIds.size === displayedListings.length}
                  >
                    {bulkModerateMutation.isPending ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Flag className="w-3 h-3 mr-1" />
                    )}
                    Flag All But Selected
                  </Button>
                </>
              )}
              {showFlagged && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmUnflagSelected(true)}
                  disabled={bulkModerateMutation.isPending}
                >
                  {bulkModerateMutation.isPending ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Flag className="w-3 h-3 mr-1" />
                  )}
                  Unflag Selected ({selectedIds.size})
                </Button>
              )}
            </>
          )}
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setConfirmDropAll(true)}
          disabled={dropAllMutation.isPending || listings.length === 0}
        >
          {dropAllMutation.isPending ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Trash2 className="w-3 h-3 mr-1" />
          )}
          Drop All Listings
        </Button>
      </div>

      {/* Listings grid */}
      {listingsLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : listings.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground border border-dashed border-[#2D343E] rounded-lg">
          No eBay sold listings found for this item.
        </div>
      ) : displayedListings.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground border border-dashed border-[#2D343E] rounded-lg">
          All listings are flagged. Toggle "Show flagged" to view them.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {displayedListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              selected={selectedIds.has(listing.id)}
              onToggle={() => toggleSelect(listing.id)}
              onImageClick={handleOpenLightbox}
            />
          ))}
        </div>
      )}

      {/* Drop all confirm */}
      <AlertDialog open={confirmDropAll} onOpenChange={setConfirmDropAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Drop all eBay listings?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {listings.length} sold listing{listings.length !== 1 ? 's' : ''} for{' '}
              <strong>{item.name}</strong> and reset its sync state. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setConfirmDropAll(false);
                dropAllMutation.mutate();
              }}
            >
              Drop All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Flag selected confirm */}
      <AlertDialog open={confirmFlagSelected} onOpenChange={setConfirmFlagSelected}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Flag {selectedIds.size} listing{selectedIds.size !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the selected {selectedIds.size} listing{selectedIds.size !== 1 ? 's' : ''} as inaccurate. {selectedIds.size !== 1 ? 'They' : 'It'} will be excluded from market data calculations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmFlagSelected(false);
                bulkModerateMutation.mutate({
                  ids: [...selectedIds],
                  isInaccurate: true,
                  reason: 'Flagged by admin',
                });
              }}
            >
              Flag
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unflag selected confirm */}
      <AlertDialog open={confirmUnflagSelected} onOpenChange={setConfirmUnflagSelected}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unflag {selectedIds.size} listing{selectedIds.size !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the selected {selectedIds.size} listing{selectedIds.size !== 1 ? 's' : ''} as accurate. {selectedIds.size !== 1 ? 'They' : 'It'} will be included in market data calculations again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmUnflagSelected(false);
                bulkModerateMutation.mutate({
                  ids: [...selectedIds],
                  isInaccurate: false,
                });
              }}
            >
              Unflag
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Flag all but selected confirm */}
      <AlertDialog open={confirmFlagAllButSelected} onOpenChange={setConfirmFlagAllButSelected}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Flag all except {selectedIds.size} selected?</AlertDialogTitle>
            <AlertDialogDescription>
              This will flag {displayedListings.length - selectedIds.size} listing{displayedListings.length - selectedIds.size !== 1 ? 's' : ''} as inaccurate.
              The {selectedIds.size} selected listing{selectedIds.size !== 1 ? 's' : ''} will remain unmarked (accurate).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const idsToFlag = displayedListings
                  .filter((l) => !selectedIds.has(l.id))
                  .map((l) => l.id);
                setConfirmFlagAllButSelected(false);
                bulkModerateMutation.mutate({
                  ids: idsToFlag,
                  isInaccurate: true,
                  reason: 'Bulk flagged by admin (kept selected accurate listings)',
                });
              }}
            >
              Flag {displayedListings.length - selectedIds.size}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image lightbox */}
      <Dialog open={!!soldListingPreview} onOpenChange={() => setSoldListingPreview(null)}>
        <DialogTitle className="sr-only">Sold Listing Image Preview</DialogTitle>
        <DialogContent
          className="max-w-[95vw] max-h-[95vh] p-0 border-0 bg-transparent flex items-center justify-center"
          aria-describedby={undefined}
        >
          {soldListingPreview && (
            <img
              src={soldListingPreview.activeUrl}
              alt={soldListingPreview.soldTitle}
              className="block max-w-[95vw] max-h-[95vh] w-auto h-auto object-contain rounded-lg"
              onError={() => {
                setSoldListingPreview((prev) => {
                  if (!prev || prev.activeUrl === prev.thumbnailUrl) return prev;
                  return { ...prev, activeUrl: prev.thumbnailUrl };
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main panel — manages list vs detail routing
// ---------------------------------------------------------------------------

export const ManageItemDataPanel = () => {
  const [selectedItem, setSelectedItem] = useState<PrizeConfiguration | null>(null);

  const handleBack = (updatedSearchQuery?: string | null) => {
    if (selectedItem && updatedSearchQuery !== undefined) {
      setSelectedItem({ ...selectedItem, ebaySearchQuery: updatedSearchQuery });
    }
    setSelectedItem(null);
  };

  if (selectedItem) {
    return (
      <ItemDetailView
        item={selectedItem}
        onBack={handleBack}
      />
    );
  }

  return <ItemListView onSelectItem={setSelectedItem} />;
};
