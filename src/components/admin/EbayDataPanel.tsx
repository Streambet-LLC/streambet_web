import { useState } from 'react';
import { TabSwitch } from '@/components/navigation/TabSwitch';
import { ReportedEbayListingsPanel } from './ReportedEbayListingsPanel';
import { ManageItemDataPanel } from './ManageItemDataPanel';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/integrations/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const EBAY_DATA_TABS = [
  { key: 'manage-item-data', label: 'Manage Item Data' },
  { key: 'reported-listings', label: 'Reported eBay Listings' },
];

export const EbayDataPanel = () => {
  const [activeTab, setActiveTab] = useState('manage-item-data');
  const queryClient = useQueryClient();

  const { data: cardcadeSettings } = useQuery({
    queryKey: ['cardcade-shop-settings'],
    queryFn: () => api.prize.getShopSettings('cardcade'),
    staleTime: 5 * 60 * 1000,
  });

  const socials = (cardcadeSettings?.socials ?? {}) as Record<string, string>;

  const parseFlag = (value: unknown, fallback: boolean): boolean => {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
    }

    return fallback;
  };

  const ebaySoldAvgEnabled = parseFlag(socials._ff_ebaySoldAvg, true);
  const ebaySoldAvgAdminOnly = parseFlag(socials._ff_ebaySoldAvgAdminOnly, false);
  const ebayManualSyncEnabled = parseFlag(socials._ff_ebayManualSync, true);

  const updateSettingsMutation = useMutation({
    mutationFn: (nextSocials: Record<string, string>) =>
      api.prize.updateShopSettings('cardcade', {
        socials: nextSocials,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cardcade-shop-settings'] });
      queryClient.invalidateQueries({ queryKey: ['ebay-feature-flags'] });
      toast({ title: 'Saved', description: 'eBay feature controls updated.' });
    },
    onError: () => {
      toast({
        title: 'Save failed',
        description: 'Unable to update eBay feature controls right now.',
        variant: 'destructive',
      });
    },
  });

  const setFlag = (key: '_ff_ebaySoldAvg' | '_ff_ebaySoldAvgAdminOnly' | '_ff_ebayManualSync', value: boolean) => {
    const baseSocials = (cardcadeSettings?.socials ?? {}) as Record<string, string>;
    const nextSocials: Record<string, string> = {
      ...baseSocials,
      [key]: String(value),
    };

    updateSettingsMutation.mutate(nextSocials);
  };

  const migratePsaFlagsMutation = useMutation({
    mutationFn: () => api.admin.migratePsaGradeFlags(),
    onSuccess: (result) => {
      toast({
        title: 'Migration complete',
        description: `Processed ${result.totalListings} listings: ${result.flaggedCount} newly flagged, ${result.unflaggedCount} newly unflagged, ${result.unchangedCount} unchanged.`,
      });
      queryClient.invalidateQueries({ queryKey: ['ebay-market-summary'] });
      queryClient.invalidateQueries({ queryKey: ['ebay-market-history'] });
    },
    onError: () => {
      toast({
        title: 'Migration failed',
        description: 'Unable to complete PSA grade, card number & year migration right now.',
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">eBay Feature Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="space-y-1 pr-3">
              <Label className="text-sm font-medium">Show eBay Sold Avg on Item Cards</Label>
              <p className="text-xs text-muted-foreground">
                Controls the public eBay sold average box shown on main shop item cards.
              </p>
            </div>
            <Switch
              checked={ebaySoldAvgEnabled}
              onCheckedChange={(checked) => setFlag('_ff_ebaySoldAvg', checked)}
              disabled={updateSettingsMutation.isPending}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="space-y-1 pr-3">
              <Label className="text-sm font-medium">Admin-Only eBay Sold Avg Visibility</Label>
              <p className="text-xs text-muted-foreground">
                When enabled, only admins can see the eBay sold average on item cards (requires main toggle to be ON).
              </p>
            </div>
            <Switch
              checked={ebaySoldAvgAdminOnly}
              onCheckedChange={(checked) => setFlag('_ff_ebaySoldAvgAdminOnly', checked)}
              disabled={updateSettingsMutation.isPending}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="space-y-1 pr-3">
              <Label className="text-sm font-medium">Allow Manual Fetch Sold Data Now</Label>
              <p className="text-xs text-muted-foreground">
                Controls the admin-facing manual sync action for individual items.
              </p>
            </div>
            <Switch
              checked={ebayManualSyncEnabled}
              onCheckedChange={(checked) => setFlag('_ff_ebayManualSync', checked)}
              disabled={updateSettingsMutation.isPending}
            />
          </div>

          <div className="pt-2 border-t">
            <div className="space-y-2">
              <Label className="text-sm font-medium">PSA Grade, Card Number & Year Migration</Label>
              <p className="text-xs text-muted-foreground mb-2">
                One-time migration to retroactively apply PSA grade, card number, and year filtering to all existing sold listings. This will flag listings where PSA grades, card numbers, or years don't match the item.
              </p>
              <Button
                onClick={() => migratePsaFlagsMutation.mutate()}
                disabled={migratePsaFlagsMutation.isPending}
                variant="outline"
                size="sm"
              >
                {migratePsaFlagsMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Migrating...
                  </>
                ) : (
                  'Run PSA Grade, Card # & Year Migration'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <TabSwitch
        tabs={EBAY_DATA_TABS}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      {activeTab === 'reported-listings' && <ReportedEbayListingsPanel />}
      {activeTab === 'manage-item-data' && <ManageItemDataPanel />}
    </div>
  );
};
