import api from '@/integrations/api/client';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Loader2, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';

interface StripeStatus {
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

interface SellerWithStatus {
  id: string;
  username: string;
  name: string;
  email: string;
  shopName: string;
  stripeAccountId: string | null;
  stripeAccountConnected: boolean;
  sellerOnboardingCompleted: boolean;
  applicationFeePercent: number;
  stripeStatus: StripeStatus;
}

const StatusBadge = ({ ok, label }: { ok: boolean; label: string }) => (
  <Badge
    variant="outline"
    className={
      ok
        ? 'border-green-500/40 bg-green-500/10 text-green-400'
        : 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400'
    }
  >
    {ok ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
    {label}
  </Badge>
);

const OverallStatus = ({ seller }: { seller: SellerWithStatus }) => {
  const { stripeStatus, stripeAccountId } = seller;

  if (!stripeAccountId) {
    return (
      <Badge variant="outline" className="border-red-500/40 bg-red-500/10 text-red-400">
        <XCircle className="w-3 h-3 mr-1" />
        No Stripe Account
      </Badge>
    );
  }

  if (stripeStatus.chargesEnabled && stripeStatus.payoutsEnabled) {
    return (
      <Badge variant="outline" className="border-green-500/40 bg-green-500/10 text-green-400">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Fully Verified
      </Badge>
    );
  }

  if (stripeStatus.detailsSubmitted) {
    return (
      <Badge variant="outline" className="border-yellow-500/40 bg-yellow-500/10 text-yellow-400">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Pending Verification
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="border-yellow-500/40 bg-yellow-500/10 text-yellow-400">
      <Clock className="w-3 h-3 mr-1" />
      Onboarding Incomplete
    </Badge>
  );
};

const PendingOnboardingTable = () => {
  const { data, isLoading } = useQuery<SellerWithStatus[]>({
    queryKey: ['seller-stripe-status'],
    queryFn: async () => {
      const response = await api.admin.getSellerStripeStatus();
      return response.data;
    },
  });

  return (
    <Card className="bg-[rgba(22,22,22,1)] border-none">
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          </div>
        ) : !data || data.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No sellers found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[#2D343E] hover:bg-transparent">
                <TableHead className="text-[#9CA3AF]">Username</TableHead>
                <TableHead className="text-[#9CA3AF]">Email</TableHead>
                <TableHead className="text-[#9CA3AF]">Shop Name</TableHead>
                <TableHead className="text-[#9CA3AF]">Overall Status</TableHead>
                <TableHead className="text-[#9CA3AF]">Details Submitted</TableHead>
                <TableHead className="text-[#9CA3AF]">Charges</TableHead>
                <TableHead className="text-[#9CA3AF]">Payouts</TableHead>
                <TableHead className="text-[#9CA3AF]">Fee %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(seller => (
                <TableRow key={seller.id} className="border-b border-[#2D343E] hover:bg-[#1a1a1a]">
                  <TableCell className="text-white">{seller.username}</TableCell>
                  <TableCell className="text-white">{seller.email}</TableCell>
                  <TableCell className="text-white">{seller.shopName || '—'}</TableCell>
                  <TableCell>
                    <OverallStatus seller={seller} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      ok={seller.stripeStatus.detailsSubmitted}
                      label={seller.stripeStatus.detailsSubmitted ? 'Yes' : 'No'}
                    />
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      ok={seller.stripeStatus.chargesEnabled}
                      label={seller.stripeStatus.chargesEnabled ? 'Enabled' : 'Disabled'}
                    />
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      ok={seller.stripeStatus.payoutsEnabled}
                      label={seller.stripeStatus.payoutsEnabled ? 'Enabled' : 'Disabled'}
                    />
                  </TableCell>
                  <TableCell className="text-white">
                    {seller.applicationFeePercent ?? '—'}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default PendingOnboardingTable;
