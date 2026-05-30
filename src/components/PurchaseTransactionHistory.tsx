import { useIsMobile } from '@/hooks/use-mobile';
import React, { useMemo, useState } from 'react';
import { Input } from './ui/input';
import { Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/integrations/api/client';
import { Card, CardContent } from './ui/card';
import { TableBody, TableCell, TableHead, TableHeader, TableRow, Table } from './ui/table';
import _ from 'lodash';
import OrderItemDetailDialog from './OrderItemDetailDialog';
import ReviewOrderButton from './reviews/ReviewOrderButton';
import TableLoader from './TableLoader';
import { ReviewableOrderSide } from '@/types/review';

/**
 * Map an order's `paymentMethod` to a user-friendly currency label.
 * 'crypto' is rendered as 'USDC' since that's the only supported on-chain
 * currency today. When the order is a Stripe USD/combined order paid via
 * ACH (us_bank_account), surface the label as ACH so buyers/sellers can
 * tell at a glance how the order was funded.
 */
function formatPaymentLabel(
  method?: string,
  stripeMethod?: 'card' | 'us_bank_account' | null
): string {
  if (!method) return '';
  if (method === 'crypto') return 'USDC';
  if (
    (method === 'usd' || method === 'combined') &&
    stripeMethod === 'us_bank_account'
  ) {
    return method === 'combined' ? 'ACH + COINS' : 'ACH';
  }
  return method.toUpperCase();
}

/**
 * Format the right-side "Purchase Amount" cell. Crypto/USD use 2 decimals;
 * coins/combined fall back to integer formatting.
 */
function formatPurchaseAmount(
  method: string | undefined,
  total: number | undefined,
  stripeMethod?: 'card' | 'us_bank_account' | null
): string {
  const label = formatPaymentLabel(method, stripeMethod);
  if (total == null) return label;
  if (method === 'crypto') {
    // Crypto reads naturally as "15.00 USDC" rather than "USDC 15.00".
    return `${total.toFixed(2)} USDC`;
  }
  if (method === 'usd' || method === 'combined') {
    return `${label} ${total.toFixed(2)}`;
  }
  return `${label} ${total.toLocaleString()}`;
}

/**
 * Render an order status as a pill. ACH (us_bank_account) orders sit in
 * `payment_processing` for 3-5 business days while Stripe settles the
 * bank debit — treat that as a first-class state with a clear sky-blue
 * "Settling" label so buyers don't think their order vanished.
 */
function StatusPill({
  status,
  stripeMethod,
}: {
  status: string;
  stripeMethod?: 'card' | 'us_bank_account' | null;
}) {
  if (status === 'payment_processing') {
    const isAch = stripeMethod === 'us_bank_account';
    return (
      <span
        className="px-2 py-1 rounded font-bold text-xs bg-sky-500/15 text-sky-300 border border-sky-500/30"
        title={
          isAch
            ? 'ACH bank debit authorised — funds typically settle in 3-5 business days.'
            : 'Payment is still being confirmed by the processor.'
        }
      >
        {isAch ? 'ACH Settling' : 'Processing'}
      </span>
    );
  }
  return (
    <span className="px-2 py-1 rounded font-bold text-xs bg-[#23272F]">
      {_.startCase(status)}
    </span>
  );
}

interface PurchaseTransactionHistoryProps {
  /** Called with an orderId when the user clicks the review button on a row. */
  onOpenReview?: (orderId: string) => void;
}

const PurchaseTransactionHistory: React.FC<PurchaseTransactionHistoryProps> = ({
  onOpenReview,
}) => {
  const isMobile = useIsMobile();
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);

  const { data: transactions, refetch: refetchTransactions, isLoading } = useQuery({
    queryKey: ['prize-orders'],
    queryFn: async () => {
      const data = await api.prize.getMyOrders();
      // Include `payment_processing` so buyers who just paid by ACH can
      // see their in-flight order while Stripe takes 3-5 business days
      // to settle the bank debit. Without this, the buyer hits the
      // success page and then sees nothing in their purchase history
      // until the funds clear, which looks like the order vanished.
      return data?.filter(t =>
        ['paid', 'shipped', 'payment_processing'].includes(t.status)
      );
    },
  });

  const { data: reviewableOrders } = useQuery({
    queryKey: ['my-reviewable-orders'],
    queryFn: () => api.review.getMyReviewable(),
    staleTime: 60_000,
  });

  const reviewSideByOrderId = useMemo(() => {
    const map = new Map<string, ReviewableOrderSide>();
    for (const s of reviewableOrders ?? []) {
      if (s.myRole === 'buyer') map.set(s.orderId, s);
    }
    return map;
  }, [reviewableOrders]);

  return (
    <div>
      <div
        className={`${isMobile ? 'block' : 'flex bg-[#0D0D0D] p-6 border-l border-r border-t border-[#191D24] rounded-tl-md rounded-tr-md'} items-center justify-between`}
      >
        <h1 className={`text-lg font-medium ${isMobile ? 'pb-2' : ''}`}>Purchases</h1>
      </div>
      <>
        {isLoading ? (
          <TableLoader label="Loading purchases..." />
        ) : transactions?.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-base">
            No purchase history found matching
          </div>
        ) : (
          <>
            {isMobile ? (
              <>
                {transactions?.map(transaction => (
                  <Card
                    key={transaction.id}
                    className="bg-[#181A20] border border-[#23272F] rounded-lg shadow-sm cursor-pointer hover:border-[#7AFF14]/30 transition-colors"
                    onClick={() => setSelectedTransaction(transaction)}
                  >
                    <CardContent className="p-3 space-y-2">
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Date</span>
                          <span className="font-medium text-xs">
                            {transaction.createdAt
                              ? new Date(transaction.createdAt).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : ''}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Type</span>
                          <span className="px-2 py-1 rounded font-bold text-xs bg-[#23272F]">
                            {transaction.prizeConfig.name}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Amount</span>
                          <span
                            className="text-xs font-semibold"
                            style={{
                              color: '#7AFF14',
                            }}
                          >
                            {formatPurchaseAmount(
                              transaction.paymentMethod,
                              transaction.totalPrice,
                              transaction.stripePaymentMethod
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Status</span>
                          <StatusPill
                            status={transaction.status}
                            stripeMethod={transaction.stripePaymentMethod}
                          />
                        </div>
                        {onOpenReview && reviewSideByOrderId.get(transaction.id) && (
                          <div className="flex justify-between items-center pt-1">
                            <span className="text-xs text-muted-foreground">Review</span>
                            <ReviewOrderButton
                              side={reviewSideByOrderId.get(transaction.id)}
                              onOpen={onOpenReview}
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left">Date</TableHead>
                      <TableHead className="text-left">Prize</TableHead>
                      <TableHead className="text-right">Purchase Amount</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                      {onOpenReview && <TableHead className="text-right">Review</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions?.map(transaction => (
                      <TableRow
                        key={transaction.id}
                        className="cursor-pointer hover:bg-[#23272F]/50 transition-colors"
                        onClick={() => setSelectedTransaction(transaction)}
                      >
                        <TableCell className="text-left">
                          {transaction.createdAt
                            ? new Date(transaction.createdAt).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : ''}
                        </TableCell>
                        <TableCell className="text-left text-[#7AFF14] hover:underline">
                          {transaction.prizeConfig.name}
                        </TableCell>
                        <TableCell
                          className="text-right"
                          style={{
                            color: '#7AFF14',
                          }}
                        >
                          {formatPurchaseAmount(
                            transaction.paymentMethod,
                            transaction.totalPrice,
                            transaction.stripePaymentMethod
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <StatusPill
                            status={transaction.status}
                            stripeMethod={transaction.stripePaymentMethod}
                          />
                        </TableCell>
                        {onOpenReview && (
                          <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                            <ReviewOrderButton
                              side={reviewSideByOrderId.get(transaction.id)}
                              onOpen={onOpenReview}
                            />
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </>
        )}
      </>

      <OrderItemDetailDialog
        open={!!selectedTransaction}
        onOpenChange={open => {
          if (!open) setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
        variant="purchase"
      />
    </div>
  );
};

export default PurchaseTransactionHistory;
