import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/integrations/api/client';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from './ui/pagination';
import { Input } from './ui/input';
import { Search } from 'lucide-react';
import { CurrencyType } from '@/enums';


interface Props {
  searchUserQuery: string;
  currencyType?: CurrencyType;
}


export const WalletHistory: React.FC<Props> = ({ currencyType }) => {

  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const itemsPerPage = 7;

  const rangeStart = (currentPage - 1) * itemsPerPage;
  const rangeEnd = itemsPerPage;
  
  const { data: transactions, refetch: refetchTransactions } = useQuery({
    queryKey: ['getTransactions'],
    queryFn: async () => {
      const data = await api.wallet.getTransactions({
        range: `[${rangeStart},${rangeEnd}]`,
        sort: '["createdAt","DESC"]',
        filter: JSON.stringify({ q: searchUserQuery }),
        pagination: true,
        currencyType,
      });
      return data;
    },
    enabled: false,
  });

  useEffect(() => {
    refetchTransactions()
  }, [currentPage, searchUserQuery, currencyType, refetchTransactions]);


  const totalPages = Math.ceil((transactions?.total || 0) / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };


  const paginatedUsers = transactions?.data;

  return (
    <div>
      <div className={`${isMobile ? 'block' : 'flex'}  items-center justify-between mb-8`}>
        <h1 className={`text-lg font-medium ${isMobile ? 'pb-2' : ''}`}>{currencyType === CurrencyType.SWEEP_COINS ? 'Transaction History' : 'Betting History'}</h1>
        <div className={`relative rounded-md ${isMobile ? 'w-full' : 'ml-4'}`} style={{ border: '1px solid #2D343E', minWidth: isMobile ? undefined : 180 }}>
          <Input
            id="search-streams"
            type="text"
            placeholder="Search"
            value={searchUserQuery}
            onChange={e => setSearchUserQuery(e.target.value)}
            className="pl-9 rounded-md w-[300px]"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      {isMobile ? (
        // Mobile Card View
        <div className="space-y-4">
          {paginatedUsers?.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              {currencyType === CurrencyType.SWEEP_COINS ? 'No transactions history found matching' : 'No betting history found matching'}
            </div>
          ) : (
            paginatedUsers?.map(user => (
              <Card key={user.id} className="bg-[#0D0D0D] border-gray-800">
                <CardContent className="p-4 space-y-3">

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Date</span>
                    <span className="font-medium">
                      {user?.createdat ? new Date(user.createdat).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Type</span>
                    <span
                      className="px-2 py-1 rounded-md font-bold text-xs"
                    >
                      {user.type}
                    </span>
                  </div>  
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Amount</span>
                    <span className="text-sm" style={{ color: user?.amount > 0 ? '#7AFF14' : user?.amount < 0 ? '#FF5656' : undefined }}>
                      {user?.amount < 0 ? '-' : ''}{Math.abs(user?.amount)?.toLocaleString('en-US')}{user?.currencytype === CurrencyType.SWEEP_COINS ? ' Sweep Coin(s)' : ' Gold Coin(s)'}
                    </span>
                  </div>

           
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        // Desktop Table View
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-left">Date</TableHead>
                <TableHead className="text-left">Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                    {currencyType === CurrencyType.SWEEP_COINS ? 'No transactions history found matching' : 'No betting history found matching'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers?.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="text-left">{user?.createdat ? new Date(user.createdat).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</TableCell>
                    <TableCell className="text-left">{user?.type}</TableCell>
                    <TableCell className="text-right">
                      <span style={{ color: user?.amount > 0 ? '#7AFF14' : user?.amount < 0 ? '#FF5656' : undefined }}>
                      {user?.amount < 0 ? '-' : ''}{Math.abs(user?.amount)?.toLocaleString('en-US')}{user?.currencytype === CurrencyType.SWEEP_COINS ? ' Sweep Coin(s)' : ' Gold Coin(s)'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex w-full justify-between bg-black rounded-md mt-4">
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
