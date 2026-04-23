import api from '@/integrations/api/client';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getImageLink } from '@/utils/helper';
import { Link } from 'react-router-dom';
import { Store, Eye, Heart } from 'lucide-react';

export default function Shops() {
  const { data: shops, isLoading } = useQuery({
    queryKey: ['all-seller-shops'],
    queryFn: async () => {
      return api.prize.getSellerShops();
    },
  });

  const [minViews, setMinViews] = useState<number | ''>('');
  const [minWatchers, setMinWatchers] = useState<number | ''>('');
  const [minItems, setMinItems] = useState<number | ''>('');

  const filteredShops = useMemo(() => {
    return (shops ?? []).filter(shop => {
      if (minItems !== '' && (Number(shop.itemCount) || 0) < minItems) return false;
      if (minViews !== '' && (Number(shop.totalViews) || 0) < minViews) return false;
      if (minWatchers !== '' && (Number(shop.totalWatchers) || 0) < minWatchers) return false;
      return true;
    });
  }, [shops, minViews, minWatchers, minItems]);

  const totalItems = filteredShops.reduce((sum, shop) => sum + (Number(shop.itemCount) || 0), 0);
  const totalViews = filteredShops.reduce((sum, shop) => sum + (Number(shop.totalViews) || 0), 0);
  const totalWatchers = filteredShops.reduce(
    (sum, shop) => sum + (Number(shop.totalWatchers) || 0),
    0
  );

  const hasActiveFilters = minViews !== '' || minWatchers !== '' || minItems !== '';

  return (
    <MainLayout showFooter>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold">All Shops</h2>
          {!isLoading && shops && shops.length > 0 && (
            <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1">
                <Store className="h-4 w-4" />
                {totalItems.toLocaleString()} {totalItems === 1 ? 'item' : 'items'} listed
              </span>
              <span className="inline-flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {totalViews.toLocaleString()} {totalViews === 1 ? 'view' : 'views'}
              </span>
              <span className="inline-flex items-center gap-1">
                <Heart className="h-4 w-4" />
                {totalWatchers.toLocaleString()} {totalWatchers === 1 ? 'watcher' : 'watchers'}
              </span>
              {hasActiveFilters && <span className="text-xs italic">(filtered)</span>}
            </div>
          )}
        </div>

        {/* Filters */}
        {!isLoading && shops && shops.length > 0 && (
          <div className="bg-secondary/50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold mb-3">Filter Shops:</h3>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label htmlFor="shopMinItems" className="text-xs text-muted-foreground">
                  Min Items
                </label>
                <Input
                  id="shopMinItems"
                  type="number"
                  placeholder="0"
                  value={minItems}
                  onChange={e => {
                    const val = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                    setMinItems(val);
                  }}
                  className="w-24"
                  min="0"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="shopMinViews" className="text-xs text-muted-foreground">
                  Min Views
                </label>
                <Input
                  id="shopMinViews"
                  type="number"
                  placeholder="0"
                  value={minViews}
                  onChange={e => {
                    const val = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                    setMinViews(val);
                  }}
                  className="w-24"
                  min="0"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="shopMinWatchers" className="text-xs text-muted-foreground">
                  Min Watchers
                </label>
                <Input
                  id="shopMinWatchers"
                  type="number"
                  placeholder="0"
                  value={minWatchers}
                  onChange={e => {
                    const val = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                    setMinWatchers(val);
                  }}
                  className="w-28"
                  min="0"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasActiveFilters}
                onClick={() => {
                  setMinItems('');
                  setMinViews('');
                  setMinWatchers('');
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        )}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card
                key={i}
                className="flex flex-col justify-center bg-card border border-border shadow-lg overflow-hidden animate-pulse"
              >
                <CardHeader className="flex flex-row gap-3 p-4 items-center">
                  <div className="h-12 w-12 rounded-full bg-muted" />
                  <div className="flex flex-col gap-2">
                    <div className="h-4 w-24 bg-muted rounded" />
                    <div className="h-3 w-16 bg-muted rounded" />
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredShops.map(shop => (
              <Link key={shop.id} to={`/shop/${shop.username}`} className="no-underline">
                <Card className="flex flex-col justify-center bg-card border border-border shadow-lg overflow-hidden hover:border-primary transition-colors cursor-pointer">
                  <CardHeader className="flex flex-row gap-3 p-4 items-center">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={shop.profileImageUrl ? getImageLink(shop.profileImageUrl) : undefined}
                        alt={shop.displayName}
                      />
                      <AvatarFallback className="bg-primary text-black font-semibold">
                        {shop.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-[#7AFF14] hover:text-foreground transition-colors">
                        {shop.displayName}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Store className="h-3 w-3" />
                        {shop.itemCount} {shop.itemCount === 1 ? 'item' : 'items'}
                      </span>
                      {((shop.totalViews ?? 0) > 0 || (shop.totalWatchers ?? 0) > 0) && (
                        <span className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                          <span className="inline-flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {shop.totalViews ?? 0}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {shop.totalWatchers ?? 0}
                          </span>
                        </span>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
        {!isLoading && (!shops || shops.length === 0) && (
          <div className="text-center text-muted-foreground py-12">No shops available yet.</div>
        )}
        {!isLoading && shops && shops.length > 0 && filteredShops.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            No shops match your filters.
          </div>
        )}
      </div>
    </MainLayout>
  );
}
