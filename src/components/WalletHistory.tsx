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


interface Props {
  searchUserQuery: string;
  historyType?: HistoryType;
}


export const WalletHistory: React.FC<Props> = ({ historyType }) => {
  const isTransaction = historyType === HistoryType.Transaction;
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const itemsPerPage = 7;

  const rangeStart = (currentPage - 1) * itemsPerPage;
  const rangeEnd = itemsPerPage;
  
  const { data: transactions, refetch: refetchTransactions } = useQuery({
    queryKey: isTransaction ? ['getTransactions'] : ['getUserBets'],
    queryFn: async () => {
      const data = isTransaction ? await api.wallet.getTransactions({
        range: `[${rangeStart},${rangeEnd}]`,
        sort: '["createdAt","DESC"]',
        filter: JSON.stringify({ q: searchUserQuery }),
        pagination: true,
        historyType,
      }) : await api.betting.getUserBets({
        range: `[${rangeStart},${rangeEnd}]`,
        sort: '["createdAt","DESC"]',
        filter: JSON.stringify({ q: searchUserQuery }),
        pagination: true,
      });
      return data;
    },
    enabled: false,
  });

  useEffect(() => {
    refetchTransactions()
  }, [currentPage, searchUserQuery, historyType, refetchTransactions]);


  const totalPages = Math.ceil((transactions?.total || 0) / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };


  const paginatedUsers = transactions?.data;

  return (
    <div>
    <div className={`${isMobile ? 'block' : 'flex bg-[#0D0D0D] p-6 border-l border-r border-t border-[#191D24] rounded-tl-md rounded-tr-md'} items-center justify-between`}>
          <h1 className={`text-lg font-medium ${isMobile ? 'pb-2' : ''}`}>{historyType === HistoryType.Transaction ? 'Transaction history' : 'Pick history'}</h1>
          <div className={`relative rounded-md bg-[#0D0D0D] ${isMobile ? 'w-full' : 'ml-4'}`} style={{ border: '1px solid #2D343E', minWidth: isMobile ? undefined : 300 }}>
            <Input
              id="search-streams"
              type="text"
              placeholder="Search"
              value={searchUserQuery}
              onChange={e => setSearchUserQuery(e.target.value)}
              className="pl-9 rounded-md bg-[#0D0D0D]"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        {isMobile ? (
          <div className="space-y-3 px-2 pt-2 pb-4">
            {isTransaction
              ? paginatedUsers?.length === 0
                ? (<div className="text-center py-6 text-muted-foreground text-base">No transactions history found matching</div>)
                : paginatedUsers?.map(user => (
                    <Card key={user.id} className="bg-[#181A20] border border-[#23272F] rounded-lg shadow-sm">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Date</span>
                            <span className="font-medium text-xs">
                              {user?.createdat ? new Date(user.createdat).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Type</span>
                            <span className="px-2 py-1 rounded font-bold text-xs bg-[#23272F]">
                              {user.type}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Amount</span>
                            <span className="text-xs font-semibold" style={{ color: user?.amount > 0 ? '#7AFF14' : user?.amount < 0 ? '#FF5656' : undefined }}>
                              {user?.amount < 0 ? '-' : ''}{Math.abs(user?.amount ?? 0)?.toLocaleString('en-US')}{user?.currencytype === CurrencyType.SWEEP_COINS ? ' Sweep Coin(s)' : ' Gold Coin(s)'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              : paginatedUsers?.length === 0
                ? (<div className="text-center py-6 text-muted-foreground text-base">No picking history found</div>)
                : paginatedUsers?.map(user => (
                    <Card key={user.id} className="bg-[#181A20] border border-[#23272F] rounded-lg shadow-sm">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Date</span>
                            <span className="font-medium text-xs">
                              {user?.date ? new Date(user.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Stream</span>
                            <span className="text-xs font-medium">{user?.streamName}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Round</span>
                            <span className="text-xs font-medium">{user?.roundName}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Option</span>
                            <span className="text-xs font-medium">{user?.optionName}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Coin Type</span>
                            <span className="text-xs font-medium">{user?.coinType === CurrencyType.GOLD_COINS ? 'Gold coins' : 'Sweep coins'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Amount</span>
                            <span className="text-xs font-semibold">
                              {user?.amountPlaced < 0 ? '-' : ''}{Math.abs(user?.amountPlaced ?? 0)?.toLocaleString('en-US')}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Result</span>
                            <span className="text-xs font-medium px-2 py-1 rounded bg-[#23272F]">
                              {user?.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : ''}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Won</span>
                            <span className="text-xs font-medium" style={{ color: Number(user?.amountWon || 0) > 0 ? '#44E644BF' : undefined }}>{(user?.amountWon ?? 0).toLocaleString('en-US')}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Lost</span>
                            <span className="text-xs font-medium" style={{ color: Number(user?.amountLost || 0) > 0 ? '#F84B4BBF' : undefined }}>{Number(user?.amountLost || 0) > 0 ? `-${Math.abs(user?.amountLost).toLocaleString('en-US')}` : '0'}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
          </div>
        ) : (
          <div className="border bg-[#0D0D0D]">
            {isTransaction ? (
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
                      <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                        No transactions history found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedUsers?.map(user => (
                      <TableRow key={user.id}>
                        <TableCell className="text-left">{user?.createdat ? new Date(user.createdat).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</TableCell>
                        <TableCell className="text-left">{user?.type}</TableCell>
                        <TableCell className="text-right">
                          <span style={{ color: user?.amount > 0 ? '#7AFF14' : user?.amount < 0 ? '#FF5656' : undefined }}>
                            {user?.amount < 0 ? '-' : ''}{Math.abs(user?.amount ?? 0)?.toLocaleString('en-US')}{user?.currencytype === CurrencyType.SWEEP_COINS ? ' Sweep Coin(s)' : ' Gold Coin(s)'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left">Date</TableHead>
                    <TableHead className="text-left">Stream</TableHead>
                    <TableHead className="text-left">Round</TableHead>
                    <TableHead className="text-left">Option</TableHead>
                    <TableHead className="text-left">Coin Type</TableHead>
                    <TableHead className="text-left">Amount</TableHead>
                    <TableHead className="text-left">Result</TableHead>
                    <TableHead className="text-left">Won</TableHead>
                    <TableHead className="text-left">Lost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                        No picking history found matching
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedUsers?.map(user => (
                      <TableRow key={user.id}>
                        <TableCell className="text-[14px] text-left">{user?.date ? new Date(user.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</TableCell>
                        <TableCell className="text-[14px] text-left">{user?.streamName}</TableCell>
                        <TableCell className="text-[14px] text-left">{user?.roundName}</TableCell>
                        <TableCell className="text-[14px] text-left">{user?.optionName}</TableCell>
                        <TableCell className="text-[14px] text-left">{user?.coinType === CurrencyType.GOLD_COINS ? 'Gold coins' : 'Sweep coins'}</TableCell>
                        <TableCell className="text-[14px] text-left">{Math.abs(user?.amountPlaced ?? 0)?.toLocaleString('en-US')}</TableCell>
                        <TableCell className="text-[16px] text-left">
                          <span className="px-2 py-1 bg-[#2C2C2C] rounded-md">
                            {user?.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : ''}
                          </span>
                        </TableCell>
                        <TableCell className={`text-[14px] text-left ${Number(user?.amountWon || 0) > 0 ? '!text-[#44E644BF]' : ''}`}>{(user?.amountWon ?? 0).toLocaleString('en-US')}</TableCell>
                        <TableCell className={`text-[14px] text-left ${Number(user?.amountLost || 0) > 0 ? '!text-[#F84B4BBF]' : ''}`}>{Number(user?.amountLost || 0) > 0 ? `-${Math.abs(user?.amountLost).toLocaleString('en-US')}` : '0'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        )}
        <div className={`flex w-full justify-between bg-black ${!isMobile ? 'p-4 border-l border-r border-b border-[#191D24] rounded-bl-md rounded-br-md' : ''} items-center`}>
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
