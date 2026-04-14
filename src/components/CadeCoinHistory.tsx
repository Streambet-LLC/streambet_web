import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/use-mobile';
import api from '@/integrations/api/client';
import { Card, CardContent } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Input } from './ui/input';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from './ui/pagination';

const CadeCoinHistory = () => {
  const isMobile = useIsMobile();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 7;

  const rangeStart = (currentPage - 1) * itemsPerPage;

  const { data: result } = useQuery({
    queryKey: ['cadecoin-history', currentPage, searchQuery],
    queryFn: async () => {
      const data = await api.wallet.getTransactions({
        range: `[${rangeStart},${itemsPerPage}]`,
        sort: '["createdAt","DESC"]',
        filter: JSON.stringify({ q: searchQuery }),
        pagination: true,
        currencyType: 'cade_coins',
      });
      return data;
    },
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const transactions = result?.data || [];
  const totalPages = Math.max(1, Math.ceil((result?.total || 0) / itemsPerPage));

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div>
      <div
        className={`${isMobile ? 'block' : 'flex bg-[#0D0D0D] p-6 border-l border-r border-t border-[#191D24] rounded-tl-md rounded-tr-md'} items-center justify-between`}
      >
        <h1 className={`text-lg font-medium ${isMobile ? 'pb-2' : ''}`}>CadeCoins</h1>
        <div
          className={`relative rounded-md bg-[#0D0D0D] ${isMobile ? 'w-full' : 'ml-4'}`}
          style={{ border: '1px solid #2D343E', minWidth: isMobile ? undefined : 300 }}
        >
          <Input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 rounded-md bg-[#0D0D0D]"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {isMobile ? (
        <div className="space-y-3 px-2 pt-2 pb-4">
          {transactions.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-base">
              No CadeCoin transactions found
            </div>
          ) : (
            transactions.map((tx: any) => (
              <Card
                key={tx.transid || tx.id}
                className="bg-[#181A20] border border-[#23272F] rounded-lg shadow-sm"
              >
                <CardContent className="p-3 space-y-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Date</span>
                      <span className="font-medium text-xs">
                        {tx.createdat
                          ? new Date(tx.createdat).toLocaleDateString('en-GB', {
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
                        {tx.type}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Amount</span>
                      <span
                        className="text-xs font-semibold"
                        style={{
                          color: tx.amount > 0 ? '#7AFF14' : tx.amount < 0 ? '#FF5656' : undefined,
                        }}
                      >
                        {tx.amount < 0 ? '-' : '+'}
                        {Math.abs(tx.amount ?? 0).toLocaleString('en-US')} CadeCoins
                      </span>
                    </div>
                    {tx.description && (
                      <div className="flex justify-between items-start gap-4">
                        <span className="text-xs text-muted-foreground shrink-0">Description</span>
                        <span className="text-xs font-medium text-right break-words min-w-0">
                          {tx.description}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="border bg-[#0D0D0D]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-left">Date</TableHead>
                <TableHead className="text-left">Type</TableHead>
                <TableHead className="text-left">Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                    No CadeCoin transactions found
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx: any) => (
                  <TableRow key={tx.transid || tx.id}>
                    <TableCell className="text-left">
                      {tx.createdat
                        ? new Date(tx.createdat).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : ''}
                    </TableCell>
                    <TableCell className="text-left">{tx.type}</TableCell>
                    <TableCell className="text-left text-muted-foreground max-w-[300px] truncate">
                      {tx.description || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        style={{
                          color: tx.amount > 0 ? '#7AFF14' : tx.amount < 0 ? '#FF5656' : undefined,
                        }}
                      >
                        {tx.amount < 0 ? '-' : '+'}
                        {Math.abs(tx.amount ?? 0).toLocaleString('en-US')} CadeCoins
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <div
        className={`flex w-full justify-between bg-black ${!isMobile ? 'p-4 border-l border-r border-b border-[#191D24] rounded-bl-md rounded-br-md' : ''} items-center`}
      >
        <div className="text-sm w-full ml-4" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
          Page {currentPage} of {totalPages}
        </div>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => handlePageChange(currentPage - 1)}
                className={cn(
                  'text-white border-white hover:bg-white/10',
                  currentPage === 1 && 'pointer-events-none opacity-50'
                )}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={() => handlePageChange(currentPage + 1)}
                className={cn(
                  'text-white border-white hover:bg-white/10',
                  currentPage === totalPages && 'pointer-events-none opacity-50'
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
};

export default CadeCoinHistory;
