import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { adminAPI } from '@/integrations/api/client';
import { AdminReportedEbaySoldListing } from '@/types/prize';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const REPORTED_EBAY_LISTINGS_QUERY_KEY = ['admin-reported-ebay-sold-listings'];

const resolveEbayFullResolutionImageUrl = (imageUrl: string): string => {
  try {
    const parsed = new URL(imageUrl);
    const isEbayImageHost = parsed.hostname.toLowerCase().includes('ebayimg.com');
    if (!isEbayImageHost) {
      return imageUrl;
    }

    const resizedPath = parsed.pathname.replace(
      /\/s-l\d+(\.[a-z0-9]+)?$/i,
      (_match, extension = '') => `/s-l1600${extension}`,
    );

    if (resizedPath === parsed.pathname) {
      return imageUrl;
    }

    parsed.pathname = resizedPath;
    return parsed.toString();
  } catch {
    return imageUrl;
  }
};

export const ReportedEbayListingsPanel = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [previewRow, setPreviewRow] = useState<AdminReportedEbaySoldListing | null>(null);

  const previewHighResImageUrl = useMemo(() => {
    if (!previewRow?.imageUrl) {
      return null;
    }

    return resolveEbayFullResolutionImageUrl(previewRow.imageUrl);
  }, [previewRow?.imageUrl]);

  const {
    data: listings = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery<AdminReportedEbaySoldListing[]>({
    queryKey: REPORTED_EBAY_LISTINGS_QUERY_KEY,
    queryFn: () => adminAPI.getReportedEbaySoldListings(300),
  });

  const approveMutation = useMutation({
    mutationFn: (listingId: string) =>
      adminAPI.approveEbaySoldListingReport(listingId, 'Approved by admin'),
    onSuccess: () => {
      toast({
        title: 'Report approved',
        description: 'Listing has been removed from market data for all users.',
      });
      queryClient.invalidateQueries({ queryKey: REPORTED_EBAY_LISTINGS_QUERY_KEY });
    },
    onError: () => {
      toast({
        title: 'Failed to approve report',
        description: 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (listingId: string) =>
      adminAPI.rejectEbaySoldListingReports(listingId, 'Rejected by admin'),
    onSuccess: () => {
      toast({
        title: 'Report rejected',
        description: 'Listing remains in market data. Reporter will see it again.',
      });
      queryClient.invalidateQueries({ queryKey: REPORTED_EBAY_LISTINGS_QUERY_KEY });
    },
    onError: () => {
      toast({
        title: 'Failed to reject report',
        description: 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return listings;
    }

    return listings.filter((row) => {
      const haystack = [
        row.itemName,
        row.soldTitle,
        row.inaccurateReason,
        row.flaggedByUsername,
        row.flaggedByEmail,
        row.providerItemId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [listings, search]);

  const isMutating = approveMutation.isPending || rejectMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reported eBay Listings</h2>
          <p className="text-sm text-muted-foreground">
            Review user-reported sold comps and either clear the report or remove the row.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching || isMutating}>
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by item, sold title, reporter, reason..."
          className="md:max-w-lg"
        />
        <Badge variant="secondary">{filtered.length} reported</Badge>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border p-6 text-sm text-muted-foreground">
          No reported sold listings found.
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Sold Listing</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Reported By</TableHead>
                <TableHead>Reported At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {row.itemImageUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewRow(row)}
                          className="group relative rounded border transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          title="Click to compare item and reported listing photos"
                        >
                          <img
                            src={row.itemImageUrl}
                            alt={row.itemName}
                            className="h-10 w-10 rounded object-cover"
                          />
                        </button>
                      ) : null}
                      <div className="min-w-0">
                        <div className="font-medium truncate max-w-[240px]">{row.itemName}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[240px]">
                          {row.itemId}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-start gap-3">
                      {row.imageUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewRow(row)}
                          className="group relative rounded border transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          title="Click to compare item and reported listing photos"
                        >
                          <img
                            src={row.imageUrl}
                            alt={row.soldTitle}
                            className="h-10 w-10 rounded object-cover"
                          />
                        </button>
                      ) : null}
                      <div className="space-y-1 min-w-0">
                        <div className="font-medium truncate max-w-[320px]">{row.soldTitle}</div>
                        <div className="text-xs text-muted-foreground">
                          ${row.salePrice.toFixed(2)} {row.currencySymbol || ''}
                        </div>
                        {row.listingUrl ? (
                          <a
                            href={row.listingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary underline"
                          >
                            Open source listing
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm max-w-[280px]">
                    {row.inaccurateReason || 'No reason provided'}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">{row.flaggedByUsername || 'Unknown user'}</div>
                      <div className="text-xs text-muted-foreground">{row.flaggedByEmail || '-'}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {row.inaccurateFlaggedAt
                      ? format(new Date(row.inaccurateFlaggedAt), 'MMM dd, yyyy HH:mm')
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isMutating}
                        onClick={() => rejectMutation.mutate(row.id)}
                      >
                        Reject Report
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" disabled={isMutating}>
                            Approve & Remove
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove listing from market?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the listing from the eBay sold comps dataset for all users and mark the report as approved.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => approveMutation.mutate(row.id)}>
                              Remove & Approve
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={Boolean(previewRow)} onOpenChange={(open) => !open && setPreviewRow(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Listing Image Comparison</DialogTitle>
            <DialogDescription>
              Compare the item photo and the reported sold-listing photo before clearing or removing this row.
            </DialogDescription>
          </DialogHeader>

          {previewRow ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Item Photo</div>
                <div className="rounded-md border bg-muted/20 p-2">
                  {previewRow.itemImageUrl ? (
                    <a
                      href={previewRow.itemImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block"
                    >
                      <img
                        src={previewRow.itemImageUrl}
                        alt={previewRow.itemName}
                        className="w-full max-h-[420px] object-contain rounded"
                      />
                    </a>
                  ) : (
                    <div className="h-[220px] rounded bg-muted flex items-center justify-center text-sm text-muted-foreground">
                      No item photo
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">{previewRow.itemName}</div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Reported Sold Listing Photo</div>
                <div className="rounded-md border bg-muted/20 p-2">
                  {previewRow.imageUrl ? (
                    <a
                      href={previewHighResImageUrl || previewRow.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block"
                    >
                      <img
                        src={previewHighResImageUrl || previewRow.imageUrl}
                        alt={previewRow.soldTitle}
                        className="w-full max-h-[420px] object-contain rounded"
                        onError={(event) => {
                          event.currentTarget.src = previewRow.imageUrl || '';
                        }}
                      />
                    </a>
                  ) : (
                    <div className="h-[220px] rounded bg-muted flex items-center justify-center text-sm text-muted-foreground">
                      No sold-listing photo
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">{previewRow.soldTitle}</div>
                {previewRow.imageUrl ? (
                  <a
                    href={previewHighResImageUrl || previewRow.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary underline"
                  >
                    Open high-res eBay image
                  </a>
                ) : null}
                {previewRow.listingUrl ? (
                  <a
                    href={previewRow.listingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary underline"
                  >
                    Open source listing
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};
