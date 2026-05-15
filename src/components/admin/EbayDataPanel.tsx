import { useState, useEffect } from 'react';
import { TabSwitch } from '@/components/navigation/TabSwitch';
import { ManageItemDataPanel } from './ManageItemDataPanel';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/integrations/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const EBAY_DATA_TABS = [
  { key: 'manage-item-data', label: 'Manage Item Data' },
  { key: 'feature-controls', label: 'Feature Controls' },
];

export const EbayDataPanel = () => {
  const [activeTab, setActiveTab] = useState('manage-item-data');
  const [migrationJobId, setMigrationJobId] = useState<string | null>(null);
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
  const ebayItemCardButtonPublic = parseFlag(socials._ff_ebayItemCardButtonPublic, false);

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

  const setFlag = (key: '_ff_ebaySoldAvg' | '_ff_ebaySoldAvgAdminOnly' | '_ff_ebayManualSync' | '_ff_ebayItemCardButtonPublic', value: boolean) => {
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
      setMigrationJobId(result.jobId);
      toast({
        title: 'Migration started',
        description: `Processing ~${result.estimatedItems} items in the background.`,
      });
    },
    onError: () => {
      toast({
        title: 'Migration failed',
        description: 'Unable to queue PSA grade, card number & year migration right now.',
        variant: 'destructive',
      });
    },
  });

  // Poll for migration status
  const { data: migrationStatus } = useQuery({
    queryKey: ['migration-status', migrationJobId],
    queryFn: () => api.admin.getMigratePsaGradeFlagsStatus(migrationJobId!),
    enabled: !!migrationJobId,
    refetchInterval: (query) => {
      // Stop polling if completed or failed
      if (query.state.data?.state === 'completed' || query.state.data?.state === 'failed') {
        return false;
      }
      return 2000; // Poll every 2 seconds
    },
  });

  // Handle completion
  useEffect(() => {
    if (migrationStatus?.state === 'completed' && migrationJobId) {
      const result = migrationStatus.result;
      toast({
        title: 'Migration completed',
        description: `Processed ${result?.totalListings || 0} listings: ${result?.flaggedCount || 0} newly flagged, ${result?.unflaggedCount || 0} newly unflagged, ${result?.unchangedCount || 0} unchanged.`,
      });
      queryClient.invalidateQueries({ queryKey: ['ebay-market-summary'] });
      queryClient.invalidateQueries({ queryKey: ['ebay-market-history'] });
      // Keep the job ID to show completion state
    } else if (migrationStatus?.state === 'failed' && migrationJobId) {
      toast({
        title: 'Migration failed',
        description: 'The migration job encountered an error.',
        variant: 'destructive',
      });
    }
  }, [migrationStatus?.state, migrationJobId, migrationStatus?.result, queryClient]);

  return (
    <div className="space-y-4">
      <TabSwitch
        tabs={EBAY_DATA_TABS}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      {activeTab === 'manage-item-data' && <ManageItemDataPanel />}
      {activeTab === 'feature-controls' && (
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
                <Label className="text-sm font-medium">Show eBay Button on Item Cards for Users</Label>
                <p className="text-xs text-muted-foreground">
                  When enabled, regular users can see the "See Recent eBay Sales" button on shop/redemption item cards. Auction cards always show the button for everyone.
                </p>
              </div>
              <Switch
                checked={ebayItemCardButtonPublic}
                onCheckedChange={(checked) => setFlag('_ff_ebayItemCardButtonPublic', checked)}
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
              <div className="space-y-3">
                <Label className="text-sm font-medium">PSA Grade, Card Number & Year Migration</Label>
                <p className="text-xs text-muted-foreground">
                  One-time migration to retroactively apply PSA grade, card number, and year filtering to all existing sold listings. This will flag listings where PSA grades, card numbers, or years don't match the item.
                </p>
                
                {migrationStatus && migrationStatus.state !== 'not-found' && (
                  <div className="space-y-2 p-3 rounded-md bg-muted/50">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {migrationStatus.state === 'completed' ? (
                          <span className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="w-4 h-4" />
                            Completed
                          </span>
                        ) : migrationStatus.state === 'failed' ? (
                          <span className="text-destructive">Failed</span>
                        ) : migrationStatus.state === 'active' ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing...
                          </span>
                        ) : (
                          <span className="text-muted-foreground capitalize">{migrationStatus.state}</span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {migrationStatus.processedItems} / {migrationStatus.totalItems} items
                      </span>
                    </div>
                    <Progress value={migrationStatus.progress} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      {migrationStatus.progress}% complete
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => {
                    setMigrationJobId(null);
                    migratePsaFlagsMutation.mutate();
                  }}
                  disabled={migratePsaFlagsMutation.isPending || (migrationStatus?.state === 'active' || migrationStatus?.state === 'waiting')}
                  variant="outline"
                  size="sm"
                >
                  {migratePsaFlagsMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : migrationStatus?.state === 'active' || migrationStatus?.state === 'waiting' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    'Run PSA Grade, Card # & Year Migration'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
