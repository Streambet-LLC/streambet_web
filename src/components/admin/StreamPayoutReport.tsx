import { useCallback, useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '@/integrations/api/client';
import moment from 'moment';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '../ui/pagination';
import { cn } from '@/lib/utils';
import { SearchInput } from '../ui/SearchInput';

const StreamPayoutReport = () => {
  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, refetch } = useQuery({
    queryKey: ['stream-payout-report'],
    queryFn: async () => {
      const rangeStart = (currentPage - 1) * itemsPerPage;
      const response = await adminAPI.getStreamPayoutReport({
        range: `[${rangeStart}, ${itemsPerPage}]`,
        search,
      });

      return response;
    },
    enabled: false,
    // Increase refetch frequency to see new streams faster
    refetchInterval: 5000,
  });

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= (data ? data.total : 0)) {
      setCurrentPage(page);
    }
  };

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, search]);

  useEffect(() => {
    console.log(data);
  }, [data]);

  return (
    <>
      <SearchInput
        id="search-round"
        placeholder="Search round..."
        value={search}
        onChange={setSearch}
        width="lg"
      />
      <div className="rounded-md border">
        <Table className="bg-[#0D0D0D]">
          <TableHeader>
            <TableRow>
              <TableHead className=" text-center">Stream</TableHead>
              <TableHead className=" text-center">Bet Round</TableHead>
              <TableHead className=" text-right">Total Sweep Coins Bet</TableHead>
              <TableHead className=" text-right">Winning Side Total Bets</TableHead>
              <TableHead className=" text-right">Losing Side Total Bets</TableHead>
              <TableHead className=" text-right">Platform Payout</TableHead>
              <TableHead className=" text-center">Creator</TableHead>
              <TableHead className=" text-center">Creator Split%</TableHead>
              <TableHead className=" text-right">Creator Split Payout</TableHead>
              <TableHead className=" text-center">Payout Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="[&_td]:font-light">
            {data?.data.map(item => (
              <TableRow key={item.id}>
                <TableCell className=" text-center font-medium">{item.stream}</TableCell>
                <TableCell className=" text-center">{item.round}</TableCell>
                <TableCell className=" text-right">{item.totalSweepBets.toFixed(2)}</TableCell>
                <TableCell className=" text-right">{item.winningSideBets.toFixed(2)}</TableCell>
                <TableCell className=" text-right">{item.losingSideBets.toFixed(2)}</TableCell>
                <TableCell className=" text-right">{item.platformPayouts}</TableCell>
                <TableCell className=" text-center">{item.creator}</TableCell>
                <TableCell className=" text-center">{item.creatorSplit}%</TableCell>
                <TableCell className=" text-right">{item.creatorSplitAmount}</TableCell>
                <TableCell className=" text-center">
                  {moment(item.createdAt).format('YYYY-MM-DD')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data?.data?.length > 0 && (
        <div className="flex w-full justify-between bg-black rounded-md mt-4">
          <div className="text-sm w-full ml-4" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
            Page {currentPage} of {data?.total}
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
                    currentPage === (data ? data.total : 0) && 'pointer-events-none opacity-50'
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </>
  );
};

export default StreamPayoutReport;
