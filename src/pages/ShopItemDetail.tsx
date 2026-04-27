import { Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { MainLayout } from '@/components/layout';
import api from '@/integrations/api/client';

/**
 * Backwards-compat redirect for the old `/shop/item/:id` direct link.
 *
 * The canonical share URL is now `/shop?highlight=<id>` (or
 * `/shop/<seller>?highlight=<id>` for seller-owned items) so the
 * destination shop scrolls the card into view and pulses its border.
 *
 * We resolve the item to figure out which shop it lives in, then issue
 * a `<Navigate replace />`. Old emails / DMs that still point at
 * `/shop/item/:id` keep working.
 */
export default function ShopItemDetail() {
  const { id = '' } = useParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['shop-item-redirect', id],
    queryFn: () => api.prize.getShopItemById(id),
    enabled: !!id,
    retry: false,
    staleTime: 60_000,
  });

  if (!id || isError) {
    // Item missing / hidden — just dump them on the shop landing.
    return <Navigate to="/shop" replace />;
  }

  if (isLoading || !data) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = data as any;
  const username: string | null =
    raw.createdByUsername && raw.createdByUsername !== 'cardcade'
      ? String(raw.createdByUsername)
      : null;
  const target = username
    ? `/shop/${username}?highlight=${encodeURIComponent(id)}`
    : `/shop?highlight=${encodeURIComponent(id)}`;

  return <Navigate to={target} replace />;
}
