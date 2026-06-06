import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI, type EmailLog } from '@/integrations/api/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, DollarSign, X, Check, Truck, Mail, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { handleMutationError } from '@/lib/mutationHelpers';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface PrizeOrder {
  id: string;
  userId: string;
  prizeConfigId: string;
  status: string;
  orderType?: 'single' | 'cart' | 'bundle_offer' | 'offer';
  orderGroupId?: string | null;
  groupItemCount?: number;
  paymentMethod?: 'coins' | 'usd' | 'combined' | 'crypto';
  stripePaymentMethod?: 'card' | 'us_bank_account' | null;
  trackingNumber?: string;
  shippingCarrier?: string;
  shippedAt?: string | null;
  offerAmount?: number;
  counterOfferAmount?: number;
  offerNotes?: string;
  totalPrice: number;
  createdAt: string;
  user?: {
    username: string;
    email: string;
  };
  prizeConfig?: {
    name: string;
    category: string;
  };
}

/** Payment-method badge (Card / ACH / Coins / Combined / USDC). */
function PaymentBadge({
  method,
  stripeMethod,
}: {
  method?: 'coins' | 'usd' | 'combined' | 'crypto';
  stripeMethod?: 'card' | 'us_bank_account' | null;
}) {
  if (!method) return <span className="text-muted-foreground">-</span>;
  const isAch =
    (method === 'usd' || method === 'combined') && stripeMethod === 'us_bank_account';
  if (isAch) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md border text-xs bg-sky-500/20 text-sky-300 border-sky-500/30">
        ACH{method === 'combined' ? ' + Coins' : ''}
      </span>
    );
  }
  const styles: Record<NonNullable<typeof method>, string> = {
    crypto: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    usd: 'bg-green-500/20 text-green-300 border-green-500/30',
    coins: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    combined: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  };
  const label =
    method === 'crypto'
      ? 'USDC'
      : method === 'usd'
        ? 'Card'
        : method === 'coins'
          ? 'Coins'
          : 'Card + Coins';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs ${styles[method]}`}
    >
      {label}
    </span>
  );
}

/** Order-type badge (Single / Cart ×N / Bundle ×N / Offer). */
function OrderTypeBadge({
  orderType,
  groupItemCount,
}: {
  orderType?: PrizeOrder['orderType'];
  groupItemCount?: number;
}) {
  const type = orderType || 'single';
  const n = groupItemCount && groupItemCount > 1 ? ` ×${groupItemCount}` : '';
  const map: Record<NonNullable<PrizeOrder['orderType']>, { label: string; cls: string }> = {
    single: { label: 'Single', cls: 'bg-gray-500/15 text-gray-300 border-gray-500/25' },
    cart: { label: `Cart${n}`, cls: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
    bundle_offer: {
      label: `Bundle${n}`,
      cls: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
    },
    offer: { label: 'Offer', cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  };
  const { label, cls } = map[type];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs ${cls}`}>
      {label}
    </span>
  );
}

export const PrizeOrders = ({ view = 'offers' }: { view?: 'offers' | 'orders' }) => {
  const isOffersView = view === 'offers';
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<PrizeOrder | null>(null);
  const [isCounterDialogOpen, setIsCounterDialogOpen] = useState(false);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterNotes, setCounterNotes] = useState('');
  const [isShipDialogOpen, setIsShipDialogOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingCarrier, setShippingCarrier] = useState('');
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | string>('all');

  // Fetch orders
  const {
    data: orders,
    isLoading,
    error,
  } = useQuery<PrizeOrder[]>({
    queryKey: ['adminPrizeOrders', filterStatus],
    queryFn: async () => {
      try {
        const params: { status?: string } = {};
        if (filterStatus !== 'all') {
          params.status = filterStatus;
        }
        const response = await adminAPI.getPrizeOrders(params);
        console.log('Full response:', response);

        // Handle different response formats
        let ordersData;
        if (response && typeof response === 'object') {
          if (Array.isArray(response)) {
            ordersData = response;
          } else if (response.data && Array.isArray(response.data)) {
            ordersData = response.data;
          } else {
            console.error('Unexpected response format:', response);
            ordersData = [];
          }
        } else {
          ordersData = [];
        }

        console.log('Final orders data:', ordersData);
        return ordersData;
      } catch (err) {
        console.error('Error fetching orders:', err);
        throw err;
      }
    },
    retry: false,
  });

  console.log('Orders state:', orders);
  console.log('Query error:', error);
  console.log('Is loading:', isLoading);

  // Counter offer mutation
  const counterOfferMutation = useMutation({
    mutationFn: async (data: {
      orderId: string;
      counterOfferAmount: number;
      offerNotes?: string;
    }) => {
      return await adminAPI.counterPrizeOffer(data.orderId, {
        counterOfferAmount: data.counterOfferAmount,
        offerNotes: data.offerNotes,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Counter offer sent successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['adminPrizeOrders'] });
      setIsCounterDialogOpen(false);
      setSelectedOrder(null);
      setCounterAmount('');
      setCounterNotes('');
    },
    onError: error => handleMutationError(error, 'Failed to send counter offer'),
  });

  // Accept offer mutation
  const acceptOfferMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await adminAPI.acceptPrizeOffer(orderId);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Offer accepted! Checkout link sent to user.',
      });
      queryClient.invalidateQueries({ queryKey: ['adminPrizeOrders'] });
    },
    onError: error => handleMutationError(error, 'Failed to accept offer'),
  });

  // Reject offer mutation
  const rejectOfferMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await adminAPI.rejectPrizeOffer(orderId);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Offer rejected',
      });
      queryClient.invalidateQueries({ queryKey: ['adminPrizeOrders'] });
    },
    onError: error => handleMutationError(error, 'Failed to reject offer'),
  });

  // Mark order shipped mutation
  const markShippedMutation = useMutation({
    mutationFn: async (data: {
      orderId: string;
      trackingNumber?: string;
      shippingCarrier?: string;
    }) => {
      return await adminAPI.markOrderShipped(data.orderId, {
        trackingNumber: data.trackingNumber,
        shippingCarrier: data.shippingCarrier,
      });
    },
    onSuccess: () => {
      toast({ title: 'Marked as shipped', description: 'Buyer has been emailed.' });
      setIsShipDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['adminPrizeOrders'] });
    },
    onError: error => handleMutationError(error, 'Failed to mark as shipped'),
  });

  // Email history for the selected order (loaded when the dialog is open)
  const {
    data: emailLogs,
    refetch: refetchEmailLogs,
    isFetching: emailLogsLoading,
  } = useQuery<EmailLog[]>({
    queryKey: ['orderEmailLogs', selectedOrder?.id],
    queryFn: () => adminAPI.getOrderEmailLogs(selectedOrder!.id),
    enabled: isEmailDialogOpen && !!selectedOrder?.id,
  });

  const resendLogMutation = useMutation({
    mutationFn: (id: string) => adminAPI.resendEmailLog(id),
    onSuccess: () => {
      toast({ title: 'Email resent' });
      refetchEmailLogs();
    },
    onError: error => handleMutationError(error, 'Failed to resend email'),
  });

  const resendOrderEmailsMutation = useMutation({
    mutationFn: (orderId: string) => adminAPI.resendOrderEmails(orderId),
    onSuccess: () => {
      toast({ title: 'Purchase emails sent', description: 'Buyer + seller notified.' });
      refetchEmailLogs();
    },
    onError: error =>
      handleMutationError(error, 'Failed to (re)send purchase emails'),
  });

  const handleOpenEmailDialog = (order: PrizeOrder) => {
    setSelectedOrder(order);
    setIsEmailDialogOpen(true);
  };

  const handleOpenShipDialog = (order: PrizeOrder) => {
    setSelectedOrder(order);
    setTrackingNumber(order.trackingNumber || '');
    setShippingCarrier(order.shippingCarrier || '');
    setIsShipDialogOpen(true);
  };

  const handleSubmitShip = () => {
    if (!selectedOrder) return;
    markShippedMutation.mutate({
      orderId: selectedOrder.id,
      trackingNumber: trackingNumber.trim() || undefined,
      shippingCarrier: shippingCarrier.trim() || undefined,
    });
  };

  const handleOpenCounterDialog = (order: PrizeOrder) => {
    setSelectedOrder(order);
    setCounterAmount(order.offerAmount?.toString() || '');
    setCounterNotes('');
    setIsCounterDialogOpen(true);
  };

  const handleSubmitCounter = () => {
    if (!selectedOrder) return;

    const amount = parseFloat(counterAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid counter offer amount',
        variant: 'destructive',
      });
      return;
    }

    if (amount === selectedOrder.offerAmount) {
      toast({
        title: 'Validation Error',
        description: "Counter offer amount must be different from the user's offer",
        variant: 'destructive',
      });
      return;
    }

    counterOfferMutation.mutate({
      orderId: selectedOrder.id,
      counterOfferAmount: amount,
      offerNotes: counterNotes || undefined,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'offer_made':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'countered':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'offer_accepted':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'paid':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'payment_processing':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'payment_failed':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'buy_attempted':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === 'buy_attempted') {
      return 'Buy Attempted';
    }
    if (status === 'payment_processing') {
      return 'ACH PROCESSING — DO NOT SHIP';
    }
    if (status === 'payment_failed') {
      return 'PAYMENT FAILED';
    }
    return status.replace(/_/g, ' ').toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // "Offers" view shows ONLY offer-originated orders (make-an-offer + bundle
  // offers), with bundle rows collapsed to one per group (backend applies
  // actions group-wide). "Orders" view shows everything else — the actual
  // cart/single purchases (the transaction record).
  const seenBundleGroups = new Set<string>();
  const displayOrders = (orders || []).filter(order => {
    const isOfferType =
      order.orderType === 'offer' || order.orderType === 'bundle_offer';
    if (isOffersView) {
      if (!isOfferType) return false;
      if (order.orderType === 'bundle_offer' && order.orderGroupId) {
        if (seenBundleGroups.has(order.orderGroupId)) return false;
        seenBundleGroups.add(order.orderGroupId);
      }
      return true;
    }
    // Orders view: all non-offer purchases.
    return !isOfferType;
  });

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">{isOffersView ? 'Offers' : 'Orders'}</h2>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {displayOrders.length}{' '}
            {isOffersView
              ? displayOrders.length === 1
                ? 'Offer'
                : 'Offers'
              : displayOrders.length === 1
                ? 'Order'
                : 'Orders'}
          </Badge>
        </div>
        
        {/* Status Filter */}
        <div className="flex items-center gap-4">
          <Label htmlFor="status-filter" className="font-semibold">
            Filter by Status:
          </Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger id="status-filter" className="w-48">
              <SelectValue placeholder="Select status..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="buy_attempted">Buy Attempted</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="offer_made">Offer Made</SelectItem>
              <SelectItem value="countered">Countered</SelectItem>
              <SelectItem value="offer_accepted">Offer Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {displayOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <DollarSign className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-2xl font-semibold mb-2">
            {isOffersView
              ? filterStatus === 'all'
                ? 'No Offers Yet'
                : 'No Offers Found'
              : filterStatus === 'all'
                ? 'No Orders Yet'
                : 'No Orders Found'}
          </h3>
          <p className="text-muted-foreground">
            {isOffersView
              ? filterStatus === 'all'
                ? 'Make-an-offer and bundle offers will appear here'
                : `No offers found with status: ${filterStatus}`
              : filterStatus === 'all'
                ? 'Cart and single purchases will appear here'
                : `No orders found with status: ${filterStatus}`}
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Prize</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Offer Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayOrders.map(order => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{order.user?.username || 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground">{order.user?.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{order.prizeConfig?.name || 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {order.prizeConfig?.category}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <OrderTypeBadge
                      orderType={order.orderType}
                      groupItemCount={order.groupItemCount}
                    />
                  </TableCell>
                  <TableCell>
                    <PaymentBadge
                      method={order.paymentMethod}
                      stripeMethod={order.stripePaymentMethod}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('border', getStatusColor(order.status))}>
                      {getStatusLabel(order.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">
                      ${order.totalPrice?.toFixed(2) || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {order.offerAmount ? (
                      <span className="font-semibold text-green-400">
                        ${order.offerAmount.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(order.createdAt), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1"
                        onClick={() => handleOpenEmailDialog(order)}
                      >
                        <Mail className="h-3 w-3" />
                        Emails
                      </Button>
                      {['offer_made'].includes(order.status) && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            className="gap-1"
                            disabled={acceptOfferMutation.isPending}
                            onClick={() => acceptOfferMutation.mutate(order.id)}
                          >
                            <Check className="h-3 w-3" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenCounterDialog(order)}
                          >
                            <DollarSign className="h-3 w-3 mr-1" />
                            Counter
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={rejectOfferMutation.isPending}
                            onClick={() => rejectOfferMutation.mutate(order.id)}
                          >
                            <X className="h-3 w-3" />
                            Reject
                          </Button>
                        </>
                      )}
                      {order.status === 'started' && (
                        <span className="text-sm text-yellow-500 font-medium">
                          Awaiting Payment
                        </span>
                      )}
                      {order.status === 'paid' && (
                        <Button
                          size="sm"
                          variant="default"
                          className="gap-1"
                          disabled={markShippedMutation.isPending}
                          onClick={() => handleOpenShipDialog(order)}
                        >
                          <Truck className="h-3 w-3" />
                          Mark Shipped
                        </Button>
                      )}
                      {order.status === 'shipped' && (
                        <div className="text-xs">
                          <span className="text-green-500 font-medium">Shipped</span>
                          {order.trackingNumber && (
                            <span className="text-muted-foreground">
                              {' '}
                              · {order.shippingCarrier ? `${order.shippingCarrier} ` : ''}
                              {order.trackingNumber}
                            </span>
                          )}
                        </div>
                      )}
                      {order.status === 'cancelled' && (
                        <span className="text-sm text-red-500 font-medium">Cancelled</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Counter Offer Dialog */}
      <Dialog open={isCounterDialogOpen} onOpenChange={setIsCounterDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl">Make Counter Offer</DialogTitle>
            <DialogDescription>
              {selectedOrder && (
                <div className="mt-4 space-y-2">
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="font-semibold text-foreground">
                      {selectedOrder.prizeConfig?.name}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      User's Offer:{' '}
                      <span className="font-semibold text-foreground">
                        ${selectedOrder.offerAmount?.toFixed(2)}
                      </span>
                    </p>
                    {selectedOrder.offerNotes && (
                      <p className="text-xs mt-2 italic text-muted-foreground">
                        "{selectedOrder.offerNotes}"
                      </p>
                    )}
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="counterAmount" className="text-base font-semibold">
                Counter Offer Amount ($)
              </Label>
              <Input
                id="counterAmount"
                type="number"
                step="0.01"
                value={counterAmount}
                onChange={e => setCounterAmount(e.target.value)}
                placeholder="Enter counter offer amount"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="counterNotes">Notes (Optional)</Label>
              <Textarea
                id="counterNotes"
                value={counterNotes}
                onChange={e => setCounterNotes(e.target.value)}
                placeholder="Add any notes for the user..."
                maxLength={500}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">{counterNotes.length}/500</p>
            </div>
          </div>

          <DialogFooter className="gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsCounterDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitCounter} disabled={counterOfferMutation.isPending}>
              {counterOfferMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Counter Offer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Shipped Dialog */}
      <Dialog open={isShipDialogOpen} onOpenChange={setIsShipDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl">Mark as Shipped</DialogTitle>
            <DialogDescription>
              {selectedOrder?.prizeConfig?.name
                ? `Shipping "${selectedOrder.prizeConfig.name}". The buyer will be emailed.`
                : 'The buyer will be emailed with the tracking details.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="shippingCarrier">Carrier (optional)</Label>
              <Input
                id="shippingCarrier"
                placeholder="USPS, UPS, FedEx…"
                value={shippingCarrier}
                onChange={e => setShippingCarrier(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trackingNumber">Tracking number (optional)</Label>
              <Input
                id="trackingNumber"
                placeholder="1Z…"
                value={trackingNumber}
                onChange={e => setTrackingNumber(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShipDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitShip} disabled={markShippedMutation.isPending}>
              {markShippedMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Marking…
                </>
              ) : (
                'Mark Shipped'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email history + resend Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle className="text-2xl">Order Emails</DialogTitle>
            <DialogDescription>
              Email history for this order. Resend any logged email, or
              (re)send the purchase notifications — useful for orders that
              never sent any.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Button
              onClick={() =>
                selectedOrder && resendOrderEmailsMutation.mutate(selectedOrder.id)
              }
              disabled={resendOrderEmailsMutation.isPending}
              className="gap-2"
            >
              {resendOrderEmailsMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              (Re)send purchase emails
            </Button>

            <div className="rounded-md border max-h-[320px] overflow-y-auto">
              {emailLogsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : !emailLogs || emailLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No emails logged for this order yet.
                </p>
              ) : (
                <div className="divide-y">
                  {emailLogs.map(log => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between gap-3 p-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {log.emailType}
                          </span>
                          <span
                            className={cn(
                              'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border',
                              log.status === 'sent'
                                ? 'bg-green-500/15 text-green-400 border-green-500/30'
                                : 'bg-red-500/15 text-red-400 border-red-500/30'
                            )}
                          >
                            {log.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {log.toAddress} ·{' '}
                          {format(new Date(log.createdAt), 'MMM dd, HH:mm')}
                        </div>
                        {log.error && (
                          <div className="text-xs text-red-400 truncate">{log.error}</div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 flex-shrink-0"
                        disabled={resendLogMutation.isPending}
                        onClick={() => resendLogMutation.mutate(log.id)}
                      >
                        <RefreshCw className="h-3 w-3" />
                        Resend
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
