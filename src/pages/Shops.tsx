import api from '@/integrations/api/client';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getImageLink } from '@/utils/helper';
import { Link } from 'react-router-dom';
import { Store } from 'lucide-react';

export default function Shops() {
  const { data: shops, isLoading } = useQuery({
    queryKey: ['all-seller-shops'],
    queryFn: async () => {
      return api.prize.getSellerShops();
    },
  });

  const totalItems = (shops ?? []).reduce((sum, shop) => sum + (Number(shop.itemCount) || 0), 0);

  return (
    <MainLayout showFooter>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold">All Shops</h2>
          {!isLoading && shops && shops.length > 0 && (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Store className="h-4 w-4" />
              {totalItems.toLocaleString()} {totalItems === 1 ? 'item' : 'items'} listed
            </span>
          )}
        </div>
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
            {shops?.map(shop => (
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
      </div>
    </MainLayout>
  );
}
