import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../ui/pagination';
import api from '@/integrations/api/client';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { DeleteUserDialog } from './DeleteUserDialog';
import { Eye, Network, Pencil, Play, Wifi, Lock } from 'lucide-react';

interface Props {
  streams: any;
  refetchStreams: VoidFunction;
}

export const StreamTable: React.FC<Props> = ({ streams, refetchStreams }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const rangeStart = (currentPage - 1) * itemsPerPage;
  const rangeEnd = rangeStart + itemsPerPage - 1;

  // const { data: streams, refetch: refetchStreams } = useQuery({
  //   queryKey: ['streams'],
  //   queryFn: async () => {
  //     const data = await api.admin.getUsers({
  //       range: `[${rangeStart},${rangeEnd}]`,
  //       sort: '["createdAt","DESC"]',
  //       filter: JSON.stringify({ q: searchStreamQuery }),
  //       pagination: true,
  //     })
  //     return data;
  //   },
  //   enabled: false,
  // });

  useEffect(() => {
    refetchStreams();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // const mutation = useMutation({
  //   mutationFn: async ({ userId, userStatus }: { userId: string; userStatus: boolean }) => {
  //     return await api.admin.updateUsersStatus({ userId, userStatus });
  //   },
  //   onSuccess: () => {
  //     refetchProfiles();
  //   },
  // });

  const totalPages = Math.ceil((streams?.total || 0) / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div>
      <div className="rounded-md border">
      <Table className='bg-[#0D0D0D]'>
         <TableHeader>
           <TableRow>
             <TableHead>Stream Title</TableHead>
             <TableHead>Stream Status</TableHead>
             <TableHead>Betting Status</TableHead>
             <TableHead>Users</TableHead>
             <TableHead>Actions</TableHead>
           </TableRow>
         </TableHeader>
         <TableBody className="[&_td]:font-light">
           {streams?.length ? streams?.map(stream => (
             <TableRow key={stream?.id}>
               <TableCell className="font-medium">{stream?.name}</TableCell>
               <TableCell>
               <span
                      className="px-2 py-1 rounded-md font-bold text-sm"
                      style={{
                        backgroundColor: stream?.status === 'scheduled' ? 'rgb(87 115 243)'
                          : stream?.status === 'active' ? '#7AFF14'
                            : '#FF1418',
                        color: stream?.status === 'inactive' ?
                          '#000' : '#FFFFFF',
                      }}
                    >
                     {stream?.status?.charAt(0)?.toUpperCase() + stream?.status?.slice(1)}
                 </span>
               </TableCell>
               <TableCell>{stream?.bettingStatus}</TableCell>
               <TableCell>{stream?.viewerCount}</TableCell>
               <TableCell>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Eye color="#FFFFFFBF" size={18} />
                  <Pencil color="#FFFFFFBF" size={18} />
                  <Wifi color="#FFFFFFBF" size={18} />
                  <Network color="#FFFFFFBF" size={18} />
                  <Lock color="#FFFFFFBF" size={18} />
                  <Play color="#FFFFFFBF" size={18} />
                </div>
               </TableCell>
             </TableRow>
           )) : <div className='m-3'>
              No stream(s) available to display
            </div>}
         </TableBody>
       </Table>
      </div>

      {/* <div className="flex w-full justify-between bg-black rounded-md mt-4">
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
                  currentPage === streams?.total && 'pointer-events-none opacity-50'
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div> */}
    </div>
  );
};
