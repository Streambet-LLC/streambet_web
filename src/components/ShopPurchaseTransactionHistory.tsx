import { useIsMobile } from '@/hooks/use-mobile';
import React, { useMemo, useState } from 'react';
import { Input } from './ui/input';
import { Search, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/integrations/api/client';
import { Card, CardContent } from './ui/card';
import { TableBody, TableCell, TableHead, TableHeader, TableRow, Table } from './ui/table';
import _ from 'lodash';
import OrderItemDetailDialog from './OrderItemDetailDialog';
import ReviewOrderButton from './reviews/ReviewOrderButton';
import TableLoader from './TableLoader';
import { ReviewableOrderSide } from '@/types/review';
import { Button } from './ui/button';

interface ShopPurchaseTransactionHistoryProps {
  /** Called with an orderId when the user clicks the review button on a row. */
  onOpenReview?: (orderId: string) => void;
}

const ShopPurchaseTransactionHistory: React.FC<ShopPurchaseTransactionHistoryProps> = ({
  onOpenReview,
}) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);

  const {
    data: transactions,
    refetch: refetchTransactions,
    isLoading,
  } = useQuery({
    queryKey: ['shop-orders'],
    queryFn: async () => {
      const data = await api.prize.getShopOrders();
      return data?.filter(t => ['paid', 'shipped', 'payment_processing'].includes(t.status));
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
      if (s.myRole === 'seller') map.set(s.orderId, s);
    }
    return map;
  }, [reviewableOrders]);

  return (
    <div>
      <div
        className={`${isMobile ? 'block' : 'flex bg-[#0D0D0D] p-6 border-l border-r border-t border-[#191D24] rounded-tl-md rounded-tr-md'} items-center justify-between`}
      >
        <h1 className={`text-lg font-medium ${isMobile ? 'pb-2' : ''}`}>Sales</h1>
      </div>
      <>
        {isLoading ? (
          <TableLoader label="Loading sales..." />
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
                            {transaction.username}
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
                            {(() => {
                              if (transaction.paymentMethod === 'crypto') {
                                return `${transaction.totalPrice.toLocaleString()} USDC`;
                              }
                              const isAch =
                                (transaction.paymentMethod === 'usd' ||
                                  transaction.paymentMethod === 'combined') &&
                                transaction.stripePaymentMethod === 'us_bank_account';
                              const label = isAch
                                ? transaction.paymentMethod === 'combined'
                                  ? 'ACH + COINS'
                                  : 'ACH'
                                : transaction.paymentMethod.toUpperCase();
                              return `${label} ${transaction.totalPrice.toLocaleString()}`;
                            })()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Status</span>
                          <span className="px-2 py-1 rounded font-bold text-xs bg-[#23272F]">
                            {_.startCase(transaction.status)}
                          </span>
                        </div>
                        {['paid', 'shipped'].includes(transaction.status) && (
                          <div className="flex justify-end pt-1" onClick={e => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              onClick={() =>
                                navigate(`/seller/shop/manage?orderId=${transaction.id}`)
                              }
                            >
                              <Truck className="w-3.5 h-3.5 mr-1.5" />
                              {transaction.status === 'paid' ? 'Mark as Shipped' : 'View shipping'}
                            </Button>
                          </div>
                        )}
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
                      <TableHead className="text-left">Buyer</TableHead>
                      <TableHead className="text-left">Prize</TableHead>
                      <TableHead className="text-right">Purchase Amount</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                      <TableHead className="text-right">Manage</TableHead>
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
                        <TableCell className="text-left">{transaction.username}</TableCell>
                        <TableCell className="text-left text-[#7AFF14] hover:underline">
                          {transaction.prizeConfig.name}
                        </TableCell>
                        <TableCell
                          className="text-right"
                          style={{
                            color: '#7AFF14',
                          }}
                        >
                          {(() => {
                            if (transaction.paymentMethod === 'crypto') {
                              return `${transaction.totalPrice.toLocaleString()} USDC`;
                            }
                            const isAch =
                              (transaction.paymentMethod === 'usd' ||
                                transaction.paymentMethod === 'combined') &&
                              transaction.stripePaymentMethod === 'us_bank_account';
                            const label = isAch
                              ? transaction.paymentMethod === 'combined'
                                ? 'ACH + COINS'
                                : 'ACH'
                              : transaction.paymentMethod.toUpperCase();
                            return `${label} ${transaction.totalPrice.toLocaleString()}`;
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          {_.startCase(transaction.status)}
                        </TableCell>
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                          {['paid', 'shipped'].includes(transaction.status) ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              onClick={() =>
                                navigate(`/seller/shop/manage?orderId=${transaction.id}`)
                              }
                            >
                              <Truck className="w-3.5 h-3.5 mr-1.5" />
                              {transaction.status === 'paid' ? 'Ship' : 'View'}
                            </Button>
                          ) : null}
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
        variant="sale"
      />
    </div>
  );
};

export default ShopPurchaseTransactionHistory;
