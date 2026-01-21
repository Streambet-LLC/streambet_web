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
import api from '@/integrations/api/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from './ui/pagination';
import { Input } from './ui/input';
import { Search } from 'lucide-react';
import { CurrencyType, HistoryType } from '@/enums';
import { SearchInput } from './ui/SearchInput';
import { Separator } from './ui/separator';

export default function CreatorPayoutsHistory() {
  const [page, setPage] = useState(1);
  
  const { data: payouts, refetch } = useQuery({
    queryKey: ["creator-payouts-history", { page }],
    queryFn: async () => {
      const data = await api.creator.getCreatorPayoutsHistory({ page, limit: 10 });

      return data.data;
    },
  });

  const totalPages = payouts?.pagination?.totalPages;

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setPage(page);
    }
  };

  return (
    <div className='flex flex-col bg-[#0D0D0D] border border-[#191D24] rounded-md'>
      <div className='flex items-center justify-between p-6 text-lg font-medium'>
        Creator Payouts History
        <SearchInput id="search" value="" onChange={() => {}} />
      </div>
      <Separator />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-left">Date</TableHead>
            <TableHead className="text-left">Round</TableHead>
            <TableHead className="text-left">Payout Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {totalPages === 0 ?
            <TableRow>
              <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                No transactions history found
              </TableCell>
            </TableRow> : 
            payouts?.data && payouts.data.map((payout) => (
              <TableRow key={payout.id}>
                <TableCell className="text-left">{payout?.createdAt ? new Date(payout.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</TableCell>
                <TableCell className="text-left">{payout?.bettingRoundName || payout?.bettingRoundId}</TableCell>
                <TableCell className="text-left"><span className='text-[#44E644BF]'>{payout?.amount} Pro Coins</span></TableCell>
              </TableRow>
            ))
          }
        </TableBody>
      </Table>
      <div className={`flex w-full justify-between bg-black items-center p-4`}>
        <div className="text-sm w-full ml-4" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
          Page {page} of {totalPages}
        </div>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                  onClick={() => handlePageChange(page - 1)}
                  className={cn(
                    'text-white border-white hover:bg-white/10',
                    page === 1 && 'pointer-events-none opacity-50'
                  )}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(page + 1)}
                  className={cn(
                    'text-white border-white hover:bg-white/10',
                    page === totalPages && 'pointer-events-none opacity-50'
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>         
    );
};
