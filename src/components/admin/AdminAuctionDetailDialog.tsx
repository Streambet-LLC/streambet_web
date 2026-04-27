import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Loader2, User as UserIcon, Bot } from 'lucide-react';
import api, {
  type AdminAuctionRow,
  type AdminAuctionBidRow,
  type AdminAuctionDetails,
} from '@/integrations/api/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Props {
  auction: AdminAuctionRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatDate = (iso: string | null | undefined) =>
  iso ? format(new Date(iso), 'MMM d, yyyy h:mm a') : '—';

const formatUsd = (n: number | null | undefined) =>
  n == null ? '—' : `$${n.toFixed(2)}`;

/**
 * Admin auction detail dialog. Fetches both the admin details (winner +
 * shipping) and the full bid history in parallel and shows them side-by-side
 * so ops can see the complete context for an auction in one place.
 */
export const AdminAuctionDetailDialog = ({
  auction,
  open,
  onOpenChange,
}: Props) => {
  const auctionId = auction?.id ?? null;

  const { data: details, isLoading: detailsLoading } =
    useQuery<AdminAuctionDetails>({
      queryKey: ['adminAuctionDetails', auctionId],
      queryFn: () => api.auction.getAdminDetails(auctionId as string),
      enabled: !!auctionId && open,
    });

  const { data: bids, isLoading: bidsLoading } = useQuery<AdminAuctionBidRow[]>(
    {
      queryKey: ['adminAuctionBids', auctionId],
      queryFn: () => api.auction.listAdminBids(auctionId as string),
      enabled: !!auctionId && open,
    },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {auction?.prizeName ?? 'Auction details'}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {auction?.id}
          </DialogDescription>
        </DialogHeader>

        {/* Top: auction summary grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <Stat label="Status" value={auction?.status ?? '—'} />
          <Stat
            label="Current bid"
            value={formatUsd(auction?.currentBidUsd ?? null)}
          />
          <Stat label="Bids" value={String(auction?.bidCount ?? 0)} />
          <Stat
            label="Reserve"
            value={formatUsd(auction?.reservePriceUsd ?? null)}
          />
          <Stat label="Starts" value={formatDate(auction?.startsAt)} />
          <Stat label="Ends" value={formatDate(auction?.endsAt)} />
          <Stat
            label="Starting price"
            value={formatUsd(auction?.startingPriceUsd ?? null)}
          />
          <Stat
            label="Extensions"
            value={String(auction?.extensionCount ?? 0)}
          />
        </div>

        <Separator />

        {/* Winner + shipping */}
        <section>
          <h3 className="text-sm font-semibold mb-2">Winner & fulfillment</h3>
          {detailsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : !details?.winner ? (
            <p className="text-sm text-muted-foreground">
              No winner yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Winner</div>
                <div>
                  <span className="font-medium">{details.winner.username}</span>
                  {details.winner.email && (
                    <span className="text-muted-foreground">
                      {' '}
                      · {details.winner.email}
                    </span>
                  )}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Winning bid
                </div>
                <div>{formatUsd(details.winningBidUsd)}</div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Paid at
                </div>
                <div>{formatDate(details.paidAt)}</div>
                {details.paymentIntentId && (
                  <>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Payment intent
                    </div>
                    <div className="font-mono text-xs break-all">
                      {details.paymentIntentId}
                    </div>
                  </>
                )}
              </div>
              <div>
                <div className="text-xs text-muted-foreground">
                  Shipping address
                </div>
                {details.shippingAddress ? (
                  <address className="not-italic text-sm">
                    {details.shippingAddress.firstName}{' '}
                    {details.shippingAddress.lastName}
                    <br />
                    {details.shippingAddress.addressLine1}
                    {details.shippingAddress.addressLine2 && (
                      <>
                        <br />
                        {details.shippingAddress.addressLine2}
                      </>
                    )}
                    <br />
                    {details.shippingAddress.city},{' '}
                    {details.shippingAddress.state}{' '}
                    {details.shippingAddress.zipCode}
                    <br />
                    {details.shippingAddress.country}
                  </address>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Not provided yet.
                  </p>
                )}
                {details.orderStatus && (
                  <>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Order status
                    </div>
                    <Badge variant="outline">{details.orderStatus}</Badge>
                  </>
                )}
              </div>
            </div>
          )}
        </section>

        <Separator />

        {/* Bid history */}
        <section>
          <h3 className="text-sm font-semibold mb-2">
            Bid history{' '}
            {bids && (
              <span className="text-xs text-muted-foreground font-normal">
                ({bids.length})
              </span>
            )}
          </h3>
          {bidsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : !bids || bids.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No bids placed yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bidder</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Proxy max</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Placed at</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bids.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
                          {b.username ?? (
                            <span className="font-mono text-xs">
                              {b.userId.slice(0, 8)}…
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatUsd(b.amountUsd)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatUsd(b.proxyMaxUsd)}
                      </TableCell>
                      <TableCell>
                        {b.isProxyAuto ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-blue-500/40 bg-blue-500/10 text-blue-300"
                          >
                            <Bot className="w-3 h-3 mr-1" />
                            Auto
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            Manual
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatDate(b.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="font-medium truncate" title={value}>
      {value}
    </div>
  </div>
);

export default AdminAuctionDetailDialog;
