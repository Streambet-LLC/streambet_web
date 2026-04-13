import { useIsMobile } from '@/hooks/use-mobile';
import React from 'react';
import { Input } from './ui/input';
import { Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/integrations/api/client';
import { Card, CardContent } from './ui/card';
import { TableBody, TableCell, TableHead, TableHeader, TableRow, Table } from './ui/table';
import _ from 'lodash';

const ShopPurchaseTransactionHistory = () => {
  const isMobile = useIsMobile();

  const { data: transactions, refetch: refetchTransactions } = useQuery({
    queryKey: ['shop-orders'],
    queryFn: async () => {
      const data = await api.prize.getShopOrders();
      return data;
    },
  });

  return (
    <div>
      <div
        className={`${isMobile ? 'block' : 'flex bg-[#0D0D0D] p-6 border-l border-r border-t border-[#191D24] rounded-tl-md rounded-tr-md'} items-center justify-between`}
      >
        <h1 className={`text-lg font-medium ${isMobile ? 'pb-2' : ''}`}>Sales</h1>
      </div>
      <>
        {transactions?.length === 0 ? (
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
                    className="bg-[#181A20] border border-[#23272F] rounded-lg shadow-sm"
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
                            {transaction.paymentMethod.toUpperCase()}{' '}
                            {transaction.totalPrice.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Status</span>
                          <span className="px-2 py-1 rounded font-bold text-xs bg-[#23272F]">
                            {_.startCase(transaction.status)}
                          </span>
                        </div>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions?.map(transaction => (
                      <TableRow key={transaction.id}>
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
                        <TableCell className="text-left">{transaction.prizeConfig.name}</TableCell>
                        <TableCell
                          className="text-right"
                          style={{
                            color: '#7AFF14',
                          }}
                        >
                          {transaction.paymentMethod.toUpperCase()}{' '}
                          {transaction.totalPrice.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {_.startCase(transaction.status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </>
        )}
      </>
    </div>
  );
};

export default ShopPurchaseTransactionHistory;
