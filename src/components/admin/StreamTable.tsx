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
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/integrations/api/client';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { DeleteUserDialog } from './DeleteUserDialog';
import { Eye, Pen, Play, Lock, ChartNoAxesColumnIncreasing } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { StreamStatus } from '@/enums';
import { toast } from '@/components/ui/use-toast';

interface Props {
  streams: any;
  refetchStreams: (range: string) => void;
  setViewStreamId: (streamId: string) => void;
  setEditStreamId: (streamId: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
}

export const StreamTable: React.FC<Props> = ({
  streams,
  refetchStreams,
  setViewStreamId,
  setEditStreamId,
  currentPage,
  setCurrentPage,
}) => {
  const isMobile = useIsMobile();
  const itemsPerPage = 7;

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
    const rangeStart = (currentPage - 1) * itemsPerPage;
    refetchStreams(`[${rangeStart},${itemsPerPage}]`);
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
      {isMobile ? (
        // Mobile Card View
        <div className="space-y-4">
          {streams?.data?.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No stream(s) available to display
            </div>
          ) : (
            streams?.data?.map(stream => (
              <Card key={stream?.id} className="bg-[#0D0D0D] border-gray-800">
                <CardContent className="p-4 space-y-3">
                  {/* Stream Title */}
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-sm truncate max-w-[200px]">
                      {stream?.streamName}
                    </h3>
                  </div>

                  {/* Stream Status */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Stream Status:</span>
                    <span
                      className="px-2 py-1 rounded-md font-bold text-xs"
                      style={{
                        backgroundColor: stream?.streamStatus === 'scheduled' ? 'rgb(87 115 243)'
                          : stream?.streamStatus === 'active' ? '#7AFF14'
                            : '#FF1418',
                        color: stream?.streamStatus === 'inactive' ?
                          '#000' : '#FFFFFF',
                      }}
                    >
                      {stream?.streamStatus?.charAt(0)?.toUpperCase() + stream?.streamStatus?.slice(1)}
                    </span>
                  </div>

                  {/* Betting Status */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Betting Status:</span>
                    <span className="text-sm font-medium">
                      {stream?.data?.bettingStatus || 'N/A'}
                    </span>
                  </div>

                  {/* Users */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Users:</span>
                    <span className="text-sm font-medium">
                      {stream?.data?.viewerCount || '0'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-800">
                    <span className="text-sm text-muted-foreground">Actions:</span>
                    <div className="flex gap-3">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Eye
                            size={16}
                            className="cursor-pointer transition-colors text-[#FFFFFFBF] hover:text-[#BDFF00]"
                            onClick={() => setViewStreamId(stream?.id)}
                          />
                        </TooltipTrigger>
                        <TooltipContent>View stream</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Pen
                            size={16}
                            className='cursor-pointer transition-colors text-[#FFFFFFBF] hover:text-[#BDFF00]'
                            onClick={() => {
                              if (stream?.streamStatus === StreamStatus.ENDED) {
                                toast({
                                  title: 'Stream Ended',
                                  description: 'You cannot edit stream as it is already ended',
                                  variant: 'destructive',
                                  duration: 5000,
                                });
                                return;
                              }
                              setEditStreamId(stream?.id);
                            }} />
                        </TooltipTrigger>
                        <TooltipContent>Manage stream</TooltipContent>
                      </Tooltip>
                      <ChartNoAxesColumnIncreasing color="#FFFFFFBF" size={16} className="cursor-pointer" />
                      <Lock color="#FFFFFFBF" size={16} className="cursor-pointer" />
                      <Play color="#FFFFFFBF" size={16} className="cursor-pointer" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        // Desktop Table View
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
              {streams?.data?.length ? streams?.data?.map(stream => (
                <TableRow key={stream?.id}>
                  <TableCell className="font-medium">{stream?.streamName}</TableCell>
                  <TableCell>
                    <span
                      className="px-2 py-1 rounded-md font-bold text-sm"
                      style={{
                        backgroundColor: stream?.streamStatus === 'scheduled' ? 'rgb(87 115 243)'
                          : stream?.streamStatus === 'active' ? '#7AFF14'
                            : '#FF1418',
                        color: stream?.streamStatus === 'inactive' ?
                          '#000' : '#FFFFFF',
                      }}
                    >
                      {stream?.streamStatus?.charAt(0)?.toUpperCase() + stream?.streamStatus?.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell>{stream?.data?.bettingStatus}</TableCell>
                  <TableCell>{stream?.data?.viewerCount}</TableCell>
                  <TableCell>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Eye
                            size={18}
                            className="cursor-pointer transition-colors text-[#FFFFFFBF] hover:text-[#BDFF00]"
                            onClick={() => setViewStreamId(stream?.id)}
                          />
                        </TooltipTrigger>
                        <TooltipContent>View stream</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Pen
                            size={18}
                            className='cursor-pointer transition-colors text-[#FFFFFFBF] hover:text-[#BDFF00]'
                            onClick={() => {
                              if (stream?.streamStatus === StreamStatus.ENDED) {
                                toast({
                                  title: 'Stream Ended',
                                  description: 'You cannot edit stream as it is already ended',
                                  variant: 'destructive',
                                  duration: 5000,
                                });
                                return;
                              }
                              setEditStreamId(stream?.id);
                            }} />
                        </TooltipTrigger>
                        <TooltipContent>Manage stream</TooltipContent>
                      </Tooltip>
                      <ChartNoAxesColumnIncreasing color="#FFFFFFBF" size={18} />
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
      )}

      {streams?.data?.length > 0 &&
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
        </div>}

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
