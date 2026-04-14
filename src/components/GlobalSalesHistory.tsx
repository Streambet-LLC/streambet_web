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
import OrderItemDetailDialog from './OrderItemDetailDialog';

/** Map a global sale row to the shape OrderItemDetailDialog expects */
const mapSaleToTransaction = (sale: any) => ({
  id: sale.id,
  createdAt: sale.createdAt,
  totalPrice: sale.totalPrice,
  paymentMethod: sale.paymentMethod,
  status: sale.status,
  username: sale.buyerUsername,
  prizeConfig: {
    name: sale.itemName,
    category: sale.itemCategory,
    image: sale.itemImage,
    images: sale.itemImages || [],
    sellerUsername: sale.sellerUsername,
  },
});

const GlobalSalesHistory = () => {
  const isMobile = useIsMobile();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const itemsPerPage = 7;

  const rangeStart = (currentPage - 1) * itemsPerPage;

  const { data: result } = useQuery({
    queryKey: ['global-sales', currentPage, searchQuery],
    queryFn: async () => {
      const data = await api.prize.getGlobalSales({
        range: `[${rangeStart},${itemsPerPage}]`,
        q: searchQuery || undefined,
      });
      return data;
    },
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const sales = result?.data || [];
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
        <h1 className={`text-lg font-medium ${isMobile ? 'pb-2' : ''}`}>Global Sales</h1>
        <div
          className={`relative rounded-md bg-[#0D0D0D] ${isMobile ? 'w-full' : 'ml-4'}`}
          style={{ border: '1px solid #2D343E', minWidth: isMobile ? undefined : 300 }}
        >
          <Input
            type="text"
            placeholder="Search by item, buyer, or seller"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 rounded-md bg-[#0D0D0D]"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {isMobile ? (
        <div className="space-y-3 px-2 pt-2 pb-4">
          {sales.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-base">No sales found</div>
          ) : (
            sales.map((sale: any) => (
              <Card
                key={sale.id}
                className="bg-[#181A20] border border-[#23272F] rounded-lg shadow-sm cursor-pointer hover:border-[#7AFF14]/30 transition-colors"
                onClick={() => setSelectedSale(mapSaleToTransaction(sale))}
              >
                <CardContent className="p-3 space-y-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Date</span>
                      <span className="font-medium text-xs">
                        {sale.createdAt
                          ? new Date(sale.createdAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : ''}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Item</span>
                      <span className="px-2 py-1 rounded font-bold text-xs bg-[#23272F]">
                        {sale.itemName}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Buyer</span>
                      <span className="text-xs font-medium">{sale.buyerUsername}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Seller</span>
                      <span className="text-xs font-medium">{sale.sellerDisplayName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Amount</span>
                      <span className="text-xs font-semibold" style={{ color: '#7AFF14' }}>
                        $
                        {sale.totalPrice?.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
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
                <TableHead className="text-left">Item</TableHead>
                <TableHead className="text-left">Buyer</TableHead>
                <TableHead className="text-left">Seller</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    No sales found
                  </TableCell>
                </TableRow>
              ) : (
                sales.map((sale: any) => (
                  <TableRow
                    key={sale.id}
                    className="cursor-pointer hover:bg-[#23272F]/50 transition-colors"
                    onClick={() => setSelectedSale(mapSaleToTransaction(sale))}
                  >
                    <TableCell className="text-left">
                      {sale.createdAt
                        ? new Date(sale.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : ''}
                    </TableCell>
                    <TableCell className="text-left text-[#7AFF14] hover:underline">{sale.itemName}</TableCell>
                    <TableCell className="text-left">{sale.buyerUsername}</TableCell>
                    <TableCell className="text-left">{sale.sellerDisplayName}</TableCell>
                    <TableCell className="text-right" style={{ color: '#7AFF14' }}>
                      $
                      {sale.totalPrice?.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
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

      <OrderItemDetailDialog
        open={!!selectedSale}
        onOpenChange={open => {
          if (!open) setSelectedSale(null);
        }}
        transaction={selectedSale}
        variant="purchase"
      />
    </div>
  );
};

export default GlobalSalesHistory;
