import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { SearchInput } from '../ui/SearchInput';
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '@/integrations/api/client';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '../ui/pagination';
import { cn } from '@/lib/utils';
import _ from 'lodash';
import { getCurrencyLabel } from '@/utils/currency';

const ViewBettingDialog = ({ betRound }) => {
  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, refetch } = useQuery({
    queryKey: ['bets-per-round', betRound],
    queryFn: async () => {
      const rangeStart = (currentPage - 1) * itemsPerPage;
      const response = await adminAPI.getBetsPerRound({
        range: `[${rangeStart}, ${itemsPerPage}]`,
        search,
        roundId: betRound,
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

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="rounded-full font-bold w-1/2" style={{ height: '30px' }}>
          View Picks
        </Button>
      </DialogTrigger>
      <DialogContent className="border border-primary max-w-fit">
        <DialogHeader>
          <DialogTitle>Round Picks</DialogTitle>
        </DialogHeader>
        <SearchInput
          id="search"
          value={search}
          onChange={e => {
            setSearch(e);
          }}
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Pick Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Selected Option</TableHead>
              <TableHead>Payout</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="[&_td]:font-light">
            {data?.data.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.username}</TableCell>
                <TableCell>{item.email}</TableCell>
                <TableCell>{getCurrencyLabel(item.currency)}</TableCell>
                <TableCell>{(parseFloat(item.amount) || 0).toLocaleString('en-US')}</TableCell>
                <TableCell>{_.startCase(item.status)}</TableCell>
                <TableCell>{item.selectedOption}</TableCell>
                <TableCell>{(parseFloat(item.payoutAmount) || 0).toLocaleString('en-US')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

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
      </DialogContent>
    </Dialog>
  );
};

export default ViewBettingDialog;
