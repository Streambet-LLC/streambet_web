import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ChevronLeft,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Trash2,
  ExternalLink,
  Search,
} from 'lucide-react';
import { adminAPI } from '@/integrations/api/client';
import { useAdminPrizeTiers } from '@/hooks/usePrizeConfig';
import { PrizeConfiguration, AdminEbaySoldListing } from '@/types/prize';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item =>
      item.name.toLowerCase().includes(query) ||
      item.ebaySearchQuery?.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

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

  const handleSyncAll = () => {
    syncAllMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search items by name, query, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
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

      <p className="text-sm text-muted-foreground mb-4">
        Showing {filteredItems.length} of {items.length} item{items.length !== 1 ? 's' : ''}. Click an item to view and manage its eBay sold data.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelectItem(item)}
            className="text-left border border-[#2D343E] rounded-lg p-3 hover:bg-[#1f1f1f] transition-colors"
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
            <Badge variant="outline" className="text-xs mb-1">
              {CATEGORY_LABELS[item.category] ?? item.category}
            </Badge>
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
        ))}
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
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
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

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => adminAPI.bulkDeleteEbaySoldListings(ids),
    onSuccess: (result) => {
      toast({ title: 'Deleted', description: `Removed ${result.deleted} listing${result.deleted !== 1 ? 's' : ''}.` });
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: listingsQueryKey });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete listings.', variant: 'destructive' });
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
              onClick={() => setShowFlagged((v) => !v)}
            >
              {showFlagged ? (
                <><EyeOff className="w-3 h-3 mr-1" />Hide flagged ({flaggedCount})</>
              ) : (
                <><Eye className="w-3 h-3 mr-1" />Show flagged ({flaggedCount})</>
              )}
            </Button>
          )}
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmBulkDelete(true)}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Trash2 className="w-3 h-3 mr-1" />
              )}
              Delete Selected ({selectedIds.size})
            </Button>
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

      {/* Bulk delete confirm */}
      <AlertDialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} listing{selectedIds.size !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected {selectedIds.size} listing{selectedIds.size !== 1 ? 's' : ''}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setConfirmBulkDelete(false);
                bulkDeleteMutation.mutate([...selectedIds]);
              }}
            >
              Delete
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
