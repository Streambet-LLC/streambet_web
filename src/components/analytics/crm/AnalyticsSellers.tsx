import { useEffect, useState } from 'react';
import moment from 'moment';
import { Card } from '@/components/ui/card';
import { Loader2, PackageOpen, Users } from 'lucide-react';
import { analyticsAPI } from '@/integrations/api/client';
import type { ApiSellerInventoryUploadSummary } from '@/types/analytics-api';
import { CrmContacts } from './CrmContacts';

/**
 * Sellers tab: the manual seller-contacts CRM plus a read-only roster of
 * ingested seller inventory uploads (each matched against CardCade buyers).
 */
export const AnalyticsSellers = () => {
  const [uploads, setUploads] = useState<ApiSellerInventoryUploadSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setUploads(await analyticsAPI.listSellerInventory());
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      <CrmContacts kind="seller" />

      <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
          <PackageOpen className="h-4 w-4 text-[#B4FF39]" /> Seller inventory
          <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-xs text-muted-foreground">
            {uploads.length}
          </span>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : uploads.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No inventory uploaded yet. Ingest a seller's CSV / Excel / Google
            Sheet to match their cards against CardCade buyers.
          </div>
        ) : (
          <div className="space-y-2">
            {uploads.map(u => (
              <div
                key={u.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-black/20 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm text-white">
                    {u.sellerLabel || u.fileName || 'Untitled upload'}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {u.source} · {moment(u.createdAt).format('MMM D, YYYY')}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs">
                  <span className="text-white/60">{u.rowCount} rows</span>
                  <span className="text-white/60">
                    {u.matchedItemCount} matched
                  </span>
                  <span className="inline-flex items-center gap-1 text-[#B4FF39]">
                    <Users className="h-3.5 w-3.5" />
                    {u.matchedBuyerCount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
