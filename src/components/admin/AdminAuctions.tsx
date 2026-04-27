import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Loader2,
  Gavel,
  AlertTriangle,
  PlayCircle,
  XCircle,
} from 'lucide-react';
import api, { type AdminAuctionRow } from '@/integrations/api/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AdminAuctionDetailDialog } from './AdminAuctionDetailDialog';

/**
 * Admin → Auctions tab.
 *
 * Lists every auction with the metadata an operator needs to triage state:
 *   - status, bid count, current bid, winner, paid_at, payment intent id
 *   - "OVERDUE" badge when an auction is past its end time but the close
 *     job hasn't terminalized it (caused by worker downtime or admins
 *     editing `ends_at` directly in Postgres)
 *
 * Actions:
 *   - Force close (runs the close flow now — charges winner, creates order)
 *   - Cancel (sets status=cancelled, removes queue jobs)
 */

type StatusKey = AdminAuctionRow['status'];

const STATUS_BADGE: Record<StatusKey, { label: string; className: string }> = {
  scheduled: {
    label: 'Scheduled',
    className: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
  },
  active: {
    label: 'Active',
    className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  },
  ended: {
    label: 'Ended',
    className: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/40',
  },
  paid: {
    label: 'Paid',
    className: 'bg-primary/15 text-primary border-primary/40',
  },
  unsold: {
    label: 'Unsold',
    className: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-500/15 text-red-300 border-red-500/40',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-zinc-700/40 text-zinc-400 border-zinc-700',
  },
};

const formatDate = (iso: string | null) =>
  iso ? format(new Date(iso), 'MMM d, yyyy h:mm a') : '—';

const formatUsd = (n: number | null) =>
  n == null ? '—' : `$${n.toFixed(2)}`;

export const AdminAuctions = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusKey | 'all' | 'overdue'>(
    'all',
  );
  const [search, setSearch] = useState('');
  const [pendingForceClose, setPendingForceClose] =
    useState<AdminAuctionRow | null>(null);
  const [pendingCancel, setPendingCancel] = useState<AdminAuctionRow | null>(
    null,
  );
  const [activeRow, setActiveRow] = useState<AdminAuctionRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['adminAuctions'],
    queryFn: () => api.auction.listAdmin(),
  });

  const rows = useMemo(() => {
    const all = data ?? [];
    const lowered = search.trim().toLowerCase();
    return all.filter(row => {
      if (statusFilter === 'overdue' && !row.isOverdue) return false;
      if (
        statusFilter !== 'all' &&
        statusFilter !== 'overdue' &&
        row.status !== statusFilter
      ) {
        return false;
      }
      if (!lowered) return true;
      return (
        row.prizeName.toLowerCase().includes(lowered) ||
        row.id.toLowerCase().includes(lowered) ||
        (row.winnerUsername ?? '').toLowerCase().includes(lowered)
      );
    });
  }, [data, statusFilter, search]);

  const overdueCount = useMemo(
    () => (data ?? []).filter(r => r.isOverdue).length,
    [data],
  );

  const forceCloseMutation = useMutation({
    mutationFn: (id: string) => api.auction.forceClose(id),
    onSuccess: () => {
      toast({
        title: 'Force close complete',
        description:
          'Close flow ran. Refresh to see the updated status (charge may take a moment).',
      });
      queryClient.invalidateQueries({ queryKey: ['adminAuctions'] });
      queryClient.invalidateQueries({ queryKey: ['active-auctions'] });
    },
    onError: (err: Error) => {
      toast({
        variant: 'destructive',
        title: 'Force close failed',
        description: err.message,
      });
    },
    onSettled: () => setPendingForceClose(null),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.auction.cancel(id),
    onSuccess: () => {
      toast({
        title: 'Auction cancelled',
        description: 'The auction has been marked cancelled.',
      });
      queryClient.invalidateQueries({ queryKey: ['adminAuctions'] });
      queryClient.invalidateQueries({ queryKey: ['active-auctions'] });
    },
    onError: (err: Error) => {
      toast({
        variant: 'destructive',
        title: 'Cancel failed',
        description: err.message,
      });
    },
    onSettled: () => setPendingCancel(null),
  });

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Gavel className="w-5 h-5 text-primary" />
          <CardTitle>Auctions</CardTitle>
          {overdueCount > 0 && (
            <Badge
              variant="outline"
              className="border-amber-500 bg-amber-500/10 text-amber-300"
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              {overdueCount} overdue
            </Badge>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Search by item, id, or winner..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-72"
          />
          <Select
            value={statusFilter}
            onValueChange={value =>
              setStatusFilter(value as StatusKey | 'all' | 'overdue')
            }
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="overdue">Overdue only</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="ended">Ended</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unsold">Unsold</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-12 text-center">
            No auctions match the current filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ends</TableHead>
                  <TableHead className="text-right">Current bid</TableHead>
                  <TableHead className="text-right">Bids</TableHead>
                  <TableHead>Winner</TableHead>
                  <TableHead>Paid at</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(row => {
                  const badge = STATUS_BADGE[row.status];
                  const inFlight =
                    forceCloseMutation.isPending &&
                    forceCloseMutation.variables === row.id;
                  const cancelInFlight =
                    cancelMutation.isPending &&
                    cancelMutation.variables === row.id;
                  const canForceClose =
                    row.status === 'active' || row.status === 'scheduled';
                  const canCancel = canForceClose;
                  return (
                    <TableRow
                      key={row.id}
                      onClick={() => setActiveRow(row)}
                      className="cursor-pointer hover:bg-muted/40"
                    >
                      <TableCell className="font-medium max-w-[260px]">
                        <div className="truncate" title={row.prizeName}>
                          {row.prizeName}
                        </div>
                        <div className="text-xs text-muted-foreground truncate font-mono">
                          {row.id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          <Badge
                            variant="outline"
                            className={cn('text-xs', badge.className)}
                          >
                            {badge.label}
                          </Badge>
                          {row.isOverdue && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-amber-500 text-amber-300 bg-amber-500/10"
                            >
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Overdue
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatDate(row.endsAt)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatUsd(row.currentBidUsd)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.bidCount}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.winnerUsername ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatDate(row.paidAt)}
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canForceClose || inFlight}
                            onClick={() => setPendingForceClose(row)}
                            title={
                              canForceClose
                                ? 'Run the close flow now'
                                : 'Only active or scheduled auctions can be closed'
                            }
                          >
                            {inFlight ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <PlayCircle className="w-3 h-3" />
                            )}
                            <span className="ml-1">Force close</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canCancel || cancelInFlight}
                            onClick={() => setPendingCancel(row)}
                            className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                          >
                            {cancelInFlight ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            <span className="ml-1">Cancel</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Confirm: force close. Charges the winner if applicable. */}
      <AlertDialog
        open={!!pendingForceClose}
        onOpenChange={open => !open && setPendingForceClose(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Force close this auction?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingForceClose && (
                <>
                  This runs the close flow for{' '}
                  <strong>{pendingForceClose.prizeName}</strong> immediately. If
                  there&apos;s a winning bid the buyer&apos;s saved card will be
                  charged for{' '}
                  <strong>
                    {formatUsd(pendingForceClose.currentBidUsd)}
                  </strong>{' '}
                  (plus fees & shipping) and a prize order will be created. If
                  reserve isn&apos;t met or there are no bids the auction will
                  be marked unsold.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingForceClose) {
                  forceCloseMutation.mutate(pendingForceClose.id);
                }
              }}
            >
              Force close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm: cancel. Marks status=cancelled and removes queue jobs. */}
      <AlertDialog
        open={!!pendingCancel}
        onOpenChange={open => !open && setPendingCancel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this auction?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCancel && (
                <>
                  This marks <strong>{pendingCancel.prizeName}</strong> as
                  cancelled and removes its scheduled close job. Existing bids
                  are kept for audit but no charge will occur. This action
                  cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep auction</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-500"
              onClick={() => {
                if (pendingCancel) cancelMutation.mutate(pendingCancel.id);
              }}
            >
              Cancel auction
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail dialog: bid history + winner/shipping */}
      <AdminAuctionDetailDialog
        auction={activeRow}
        open={!!activeRow}
        onOpenChange={open => !open && setActiveRow(null)}
      />
    </Card>
  );
};

export default AdminAuctions;
