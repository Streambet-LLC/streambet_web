import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '@/integrations/api/client';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Loader2, Package, User } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { handleMutationError } from '@/lib/mutationHelpers';
import {
  AdminPrizeRedemptionResponse,
  UpdateRedemptionStatusRequest,
  ShippingStatus,
  SHIPPING_CARRIERS,
} from '@/types/prize';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export const PrizeRedemptions = () => {
  const queryClient = useQueryClient();
  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRedemption, setSelectedRedemption] = useState<AdminPrizeRedemptionResponse | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ShippingStatus | 'all'>('all');

  // Form state for status update
  const [newStatus, setNewStatus] = useState<ShippingStatus>(ShippingStatus.OPEN);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingCarrier, setShippingCarrier] = useState('');

  // Fetch redemptions
  const { data: redemptionsData, isLoading } = useQuery<{ data: AdminPrizeRedemptionResponse[]; total: number }>({
    queryKey: ['adminRedemptions', filterStatus, currentPage],
    queryFn: async () => {
      const rangeStart = (currentPage - 1) * itemsPerPage;
      const params: { range: string; status?: string } = {
        range: `[${rangeStart}, ${itemsPerPage}]`,
      };
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      const response = await adminAPI.getPrizeRedemptions(params);
      return response.data;
    },
  });

  const redemptions = redemptionsData?.data;

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= (redemptionsData?.total || 0)) {
      setCurrentPage(page);
    }
  };

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (data: { id: string; payload: UpdateRedemptionStatusRequest }) => {
      const response = await adminAPI.updateRedemptionStatus(data.id, data.payload);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Redemption status updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['adminRedemptions'] });
      setIsUpdateDialogOpen(false);
      setSelectedRedemption(null);
      resetForm();
    },
    onError: (error) => handleMutationError(error, 'Failed to update status'),
  });

  const resetForm = () => {
    setNewStatus(ShippingStatus.OPEN);
    setTrackingNumber('');
    setShippingCarrier('');
  };

  const handleOpenUpdateDialog = (redemption: AdminPrizeRedemptionResponse) => {
    setSelectedRedemption(redemption);
    setNewStatus(redemption.shippingStatus);
    setTrackingNumber(redemption.trackingNumber || '');
    setShippingCarrier(redemption.shippingCarrier || '');
    setIsUpdateDialogOpen(true);
  };

  const handleOpenAddressDialog = (redemption: AdminPrizeRedemptionResponse) => {
    setSelectedRedemption(redemption);
    setIsAddressDialogOpen(true);
  };

  const handleSubmitUpdate = () => {
    if (!selectedRedemption) return;

    // Validation: tracking required when shipping
    if (newStatus === ShippingStatus.SHIPPED && (!trackingNumber || !shippingCarrier)) {
      toast({
        title: 'Validation Error',
        description: 'Tracking number and carrier are required when marking as shipped',
        variant: 'destructive',
      });
      return;
    }

    const payload: UpdateRedemptionStatusRequest = {
      shippingStatus: newStatus,
      ...(trackingNumber && { trackingNumber }),
      ...(shippingCarrier && { shippingCarrier }),
    };

    updateStatusMutation.mutate({ id: selectedRedemption.id, payload });
  };

  const getStatusColor = (status: ShippingStatus) => {
    switch (status) {
      case ShippingStatus.OPEN:
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case ShippingStatus.SHIPPED:
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case ShippingStatus.COMPLETE:
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Prize Redemptions</h2>
        <div className="flex items-center gap-3">
          <Label htmlFor="filter-status" className="text-sm">
            Filter:
          </Label>
          <Select
            value={filterStatus}
            onValueChange={value => {
              setFilterStatus(value as ShippingStatus | 'all');
              setCurrentPage(1); // Reset to first page when filter changes
            }}
          >
            <SelectTrigger id="filter-status" className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value={ShippingStatus.OPEN}>Open</SelectItem>
              <SelectItem value={ShippingStatus.SHIPPED}>Shipped</SelectItem>
              <SelectItem value={ShippingStatus.COMPLETE}>Complete</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {redemptions && redemptions.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Prize</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tracking</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {redemptions.map(redemption => (
                <TableRow key={redemption.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{redemption.user?.username || 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground">
                        {redemption.user?.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {redemption.prizeConfiguration?.name || `Tier ${redemption.prizeTier}`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Tier {redemption.prizeTier}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{redemption.prizeCategory}</TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(redemption.dateRedeemed), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    {redemption.paymentMethod ? (
                      <div className="flex flex-col text-sm">
                        <span className="font-medium">
                          {(() => {
                            const pm = redemption.paymentMethod;
                            // ACH = Stripe usd/combined order funded by us_bank_account.
                            const isAch =
                              (pm === 'usd' || pm === 'combined') &&
                              redemption.stripePaymentMethod === 'us_bank_account';
                            if (isAch) {
                              return pm === 'combined' ? 'ACH + Coins' : 'ACH';
                            }
                            if (pm === 'usd') return 'Card';
                            if (pm === 'combined') return 'Card + Coins';
                            return (
                              pm.replace(/_/g, ' ').charAt(0).toUpperCase() +
                              pm.replace(/_/g, ' ').slice(1)
                            );
                          })()}
                        </span>
                        {redemption.paymentMethod !== 'usd' && redemption.coinsDeducted ? (
                          <span className="text-xs text-muted-foreground">
                            {redemption.coinsDeducted.toLocaleString('en-US')} coins
                          </span>
                        ) : null}
                        {redemption.usdCharged && (
                          <span className="text-xs text-muted-foreground">
                            ${redemption.usdCharged}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(redemption.shippingStatus)}>
                      {redemption.shippingStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {redemption.trackingNumber ? (
                      <div className="flex flex-col text-sm">
                        <span className="font-mono">{redemption.trackingNumber}</span>
                        <span className="text-xs text-muted-foreground">
                          {redemption.shippingCarrier}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenAddressDialog(redemption)}
                      >
                        <User className="w-4 h-4 mr-1" />
                        Address
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleOpenUpdateDialog(redemption)}
                        disabled={redemption.fulfilled}
                      >
                        <Package className="w-4 h-4 mr-1" />
                        Update
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No redemptions found</p>
        </div>
      )}

      {/* Pagination */}
      {redemptionsData && redemptionsData.data.length > 0 && (
        <div className="flex w-full justify-between bg-black rounded-md mt-4 p-4">
          <div className="text-sm w-full" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
            Page {currentPage} of {redemptionsData.total}
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(currentPage - 1)}
                  className={cn(
                    'text-white border-white hover:bg-white/10 cursor-pointer',
                    currentPage === 1 && 'pointer-events-none opacity-50'
                  )}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(currentPage + 1)}
                  className={cn(
                    'text-white border-white hover:bg-white/10 cursor-pointer',
                    currentPage === redemptionsData.total && 'pointer-events-none opacity-50'
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Update Status Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update Redemption Status</DialogTitle>
            <DialogDescription>
              Update shipping status and tracking information for this prize redemption
            </DialogDescription>
          </DialogHeader>

          {selectedRedemption && (
            <div className="space-y-4">
              {/* Redemption Info */}
              <div className="rounded-lg border p-3 bg-muted/50">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {selectedRedemption.user?.username} -{' '}
                    {selectedRedemption.prizeConfiguration?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Category: {selectedRedemption.prizeCategory}
                  </p>
                </div>
              </div>

              {/* Status Select */}
              <div className="space-y-2">
                <Label htmlFor="status">Shipping Status *</Label>
                <Select
                  value={newStatus}
                  onValueChange={value => setNewStatus(value as ShippingStatus)}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ShippingStatus.OPEN}>Open</SelectItem>
                    <SelectItem value={ShippingStatus.SHIPPED}>Shipped</SelectItem>
                    <SelectItem value={ShippingStatus.COMPLETE}>Complete</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tracking Number */}
              <div className="space-y-2">
                <Label htmlFor="tracking">
                  Tracking Number {newStatus === ShippingStatus.SHIPPED && '*'}
                </Label>
                <Input
                  id="tracking"
                  value={trackingNumber}
                  onChange={e => setTrackingNumber(e.target.value)}
                  placeholder="1Z999AA10123456784"
                />
              </div>

              {/* Shipping Carrier */}
              <div className="space-y-2">
                <Label htmlFor="carrier">
                  Shipping Carrier {newStatus === ShippingStatus.SHIPPED && '*'}
                </Label>
                <Select value={shippingCarrier} onValueChange={setShippingCarrier}>
                  <SelectTrigger id="carrier">
                    <SelectValue placeholder="Select carrier" />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIPPING_CARRIERS.map(carrier => (
                      <SelectItem key={carrier} value={carrier}>
                        {carrier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsUpdateDialogOpen(false);
                    resetForm();
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitUpdate}
                  disabled={updateStatusMutation.isPending}
                  className="flex-1"
                >
                  {updateStatusMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Status'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Address Dialog */}
      <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Shipping Address</DialogTitle>
            <DialogDescription>
              Delivery address for {selectedRedemption?.user?.username}
            </DialogDescription>
          </DialogHeader>

          {selectedRedemption?.user && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Full Name</Label>
                  <p className="font-medium">{selectedRedemption.user.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedRedemption.user.email}</p>
                </div>
                <div className="border-t pt-3">
                  <Label className="text-xs text-muted-foreground">Street Address</Label>
                  <p className="font-medium">{selectedRedemption.user.address || 'Not provided'}</p>
                  {selectedRedemption.user.address2 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedRedemption.user.address2}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">City</Label>
                    <p className="font-medium">{selectedRedemption.user.city || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">State</Label>
                    <p className="font-medium">{selectedRedemption.user.state || '-'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">ZIP Code</Label>
                    <p className="font-medium">{selectedRedemption.user.zipCode || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Country</Label>
                    <p className="font-medium">{selectedRedemption.user.country || '-'}</p>
                  </div>
                </div>
              </div>

              <Button onClick={() => setIsAddressDialogOpen(false)} className="w-full">
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
