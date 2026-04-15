import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/integrations/api/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { getThumbnailUrl } from '@/utils/helper';
import { Search, Star, Store, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { PrizeConfiguration } from '@/types/prize';

const MAX_FEATURED = 10;

interface FeaturedItemsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function FeaturedItemsModal({ open, onClose }: FeaturedItemsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [featuredIds, setFeaturedIds] = useState<Set<string>>(new Set());
  const userHasEdited = useRef(false);

  const { data: items, isLoading, dataUpdatedAt } = useQuery<PrizeConfiguration[]>({
    queryKey: ['seller-shop-items-for-featured'],
    queryFn: () => api.prize.getMyShopItems(),
    enabled: open,
    staleTime: 0, // always refetch when modal opens
  });

  // Sync featured set from server data whenever fresh data arrives
  // but only if user hasn't started editing yet
  useEffect(() => {
    if (items && dataUpdatedAt && !userHasEdited.current) {
      const serverFeatured = new Set(
        items.filter(i => i.profileFeatured).map(i => i.id)
      );
      setFeaturedIds(serverFeatured);
    }
  }, [items, dataUpdatedAt]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      userHasEdited.current = false;
    } else {
      setSearch('');
      userHasEdited.current = false;
    }
  }, [open]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    const q = search.toLowerCase().trim();
    if (!q) return items;
    return items.filter(
      item =>
        item.name.toLowerCase().includes(q) ||
        (item.category && item.category.toLowerCase().includes(q))
    );
  }, [items, search]);

  const toggleFeatured = (id: string) => {
    userHasEdited.current = true;
    setFeaturedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_FEATURED) {
          toast({
            title: 'Limit reached',
            description: `You can feature up to ${MAX_FEATURED} items on your profile.`,
            variant: 'destructive',
          });
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const mutation = useMutation({
    mutationFn: (ids: string[]) => api.prize.updateProfileFeaturedItems(ids),
    onSuccess: () => {
      toast({ title: 'Featured items updated' });
      queryClient.invalidateQueries({ queryKey: ['seller-shop-items-for-featured'] });
      queryClient.invalidateQueries({ queryKey: ['profile-seller-items'] });
      onClose();
    },
    onError: (err: any) => {
      toast({
        title: 'Failed to update',
        description: err?.response?.data?.message || 'Something went wrong',
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    mutation.mutate(Array.from(featuredIds));
  };

  const hasChanges = useMemo(() => {
    if (!items) return false;
    const serverIds = new Set(items.filter(i => i.profileFeatured).map(i => i.id));
    if (serverIds.size !== featuredIds.size) return true;
    for (const id of featuredIds) {
      if (!serverIds.has(id)) return true;
    }
    return false;
  }, [items, featuredIds]);

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg bg-[#0D0D0D] border-[#23272F] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            Manage Featured Items
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Choose up to {MAX_FEATURED} items to feature on your profile.
            ({featuredIds.size}/{MAX_FEATURED} selected)
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-[#181A20] border-[#23272F] text-white"
          />
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto min-h-0 -mx-1 px-1 space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading items...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {search ? 'No items match your search.' : 'No shop items found.'}
            </div>
          ) : (
            filteredItems.map(item => {
              const isFeatured = featuredIds.has(item.id);
              const imageUrl =
                (item.imageUrls && item.imageUrls.length > 0
                  ? item.imageUrls[0]
                  : item.imageUrl) || null;

              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    isFeatured
                      ? 'bg-yellow-400/10 border border-yellow-400/30'
                      : 'bg-[#181A20] border border-transparent hover:border-[#23272F]'
                  }`}
                  onClick={() => toggleFeatured(item.id)}
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-md overflow-hidden bg-[#0D0D0D] flex-shrink-0">
                    {imageUrl ? (
                      <img
                        src={getThumbnailUrl(imageUrl)}
                        alt={item.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Store className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : 'Item'}
                      {item.amount != null && item.amount > 0 && (
                        <span className="ml-2 text-primary">
                          ${(item.amount / 100).toFixed(2)}
                        </span>
                      )}
                      {item.stock != null && (
                        <span className="ml-2">· {item.stock} in stock</span>
                      )}
                    </p>
                  </div>

                  {/* Toggle */}
                  <Switch
                    checked={isFeatured}
                    onCheckedChange={() => toggleFeatured(item.id)}
                    onClick={e => e.stopPropagation()}
                    className="flex-shrink-0"
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#23272F]">
          <span className="text-xs text-muted-foreground">
            {featuredIds.size} of {MAX_FEATURED} featured
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || mutation.isPending}
              className="bg-primary text-black text-sm font-bold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
