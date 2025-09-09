import { useEffect, useState } from 'react';
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
  PaginationNext,
  PaginationPrevious,
} from '../ui/pagination';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Eye, Pen, ChartNoAxesColumnIncreasing, Trash2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { StreamStatus } from '@/enums';
import { toast } from '@/components/ui/use-toast';
import { BettingRoundStatus } from '@/enums';
import { useMutation } from '@tanstack/react-query';
import api from '@/integrations/api/client';
import { DeleteStreamDialog } from './DeleteStreamDialog';

interface Props {
  streams: any;
  refetchStreams: (range: string) => void;
  setViewStreamId: (streamId: string) => void;
  setEditStreamId: (streamId: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  setStreamAnalyticsId: (id: string) => void;
}

const BettingStatusBadge = ({ status }: { status?: string }) => {
  const normalized = status?.toLowerCase();
  const style: React.CSSProperties = {
    borderRadius: 8,
    padding: '0 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: 14,
    gap: 4,
    height: 28,
    minWidth: 54,
    width: 'fit-content',
  };
  const label = status?.charAt(0)?.toUpperCase() + status?.slice(1) || 'N/A';

  switch (normalized) {
    case BettingRoundStatus.LOCKED:
      style.background = 'orange';
      style.color = '#fff';
      break;
    case BettingRoundStatus.OPEN:
      style.background = '#007AFF';
      style.color = '#fff';
      break;
    case BettingRoundStatus.CLOSED:
      style.background = '#6c757d';
      style.color = '#fff';
      break;
    case BettingRoundStatus.CREATED:
      style.background = '#34C759';
      style.color = '#fff';
      break;
    default:
      style.background = '#222';
      style.color = '#fff';
      break;
  }

  return <span style={style}>{label}</span>;
};

const StreamStatusBadge = ({ status }: { status?: string }) => {
  const normalized = status?.toLowerCase();
  const style: React.CSSProperties = {
    borderRadius: 8,
    padding: '0 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 14,
    gap: 4,
    height: 28,
    minWidth: 54,
    width: 'fit-content',
  };
  let label = status?.charAt(0)?.toUpperCase() + status?.slice(1) || 'N/A';

  switch (normalized) {
    case StreamStatus.LIVE:
      style.background = '#FF1418';
      style.color = '#fff';
      label = 'Live';
      break;
    case StreamStatus.SCHEDULED:
      style.background = 'rgb(87 115 243)';
      style.color = '#fff';
      break;
    case StreamStatus.ACTIVE:
      style.background = '#7AFF14';
      style.color = '#fff';
      label = 'Active';
      break;
    case StreamStatus.INACTIVE:
      style.background = '#FF1418';
      style.color = '#000';
      break;
    default:
      style.background = '#222';
      style.color = '#fff';
      break;
  }

  return <span style={style}>{label}</span>;
};

export const StreamTable: React.FC<Props> = ({
  streams,
  refetchStreams,
  setViewStreamId,
  setEditStreamId,
  currentPage,
  setCurrentPage,
  setStreamAnalyticsId,
}) => {
  const isMobile = useIsMobile();
  const itemsPerPage = 7;
  const [deletingStreamId, setDeletingStreamId] = useState<string | null>(null);

  useEffect(() => {
    const rangeStart = (currentPage - 1) * itemsPerPage;
    refetchStreams(`[${rangeStart},${itemsPerPage}]`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const totalPages = Math.ceil((streams?.total || 0) / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const { mutate: deleteStream, isPending: isDeletingStream } = useMutation({
    mutationFn: async (streamId: string) => {
      await api.admin.deleteStream(streamId);
    },
    onSuccess: () => {
      toast({
        description: "Stream deleted successfully",
        variant: 'default',
      });
      // Refetch streams after successful deletion
      const rangeStart = (currentPage - 1) * itemsPerPage;
      refetchStreams(`[${rangeStart},${itemsPerPage}]`);
      setDeletingStreamId(null);
      setDeleteDialogOpen(false);
      setStreamToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to delete stream",
        variant: 'destructive',
      });
      setDeletingStreamId(null);
      setDeleteDialogOpen(false);
      setStreamToDelete(null);
    },
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [streamToDelete, setStreamToDelete] = useState<any>(null);

  const handleDeleteStream = (streamId: string) => {
    setDeletingStreamId(streamId);
    deleteStream(streamId);
  };

  const handleOpenDeleteDialog = (stream: any) => {
    setStreamToDelete(stream);
    setDeleteDialogOpen(true);
  };

  return (
    <div>
      {/* Table and Card View below, update ChartNoAxesColumnIncreasing triggers */}
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
                    <StreamStatusBadge status={stream?.streamStatus} />
                  </div>

                  {/* Betting Status */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Betting Status:</span>
                    <BettingStatusBadge status={stream?.bettingRoundStatus || 'N/A'} />
                  </div>

                  {/* Users */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Users:</span>
                    <span className="text-sm font-medium">
                      {stream?.userBetCount || '0'}
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
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <ChartNoAxesColumnIncreasing
                            size={16}
                            className="cursor-pointer transition-colors text-[#FFFFFFBF] hover:text-[#BDFF00]"
                            onClick={() => setStreamAnalyticsId(stream?.id)}
                          />
                        </TooltipTrigger>
                        <TooltipContent>Stream analytics</TooltipContent>
                      </Tooltip>
                                             {/* <Lock color="#FFFFFFBF" size={16} className="cursor-pointer" />
                       <Play color="#FFFFFFBF" size={16} className="cursor-pointer" /> */}
                       {stream?.streamStatus === StreamStatus.SCHEDULED && (
                         <Tooltip>
                           <TooltipTrigger asChild>
                             <Trash2 
                               size={16} 
                               className="cursor-pointer transition-colors text-[#FFFFFFBF] hover:text-[#BDFF00]"
                               onClick={() => handleOpenDeleteDialog(stream)}
                             />
                           </TooltipTrigger>
                           <TooltipContent>Delete stream</TooltipContent>
                         </Tooltip>
                       )}
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
                    <StreamStatusBadge status={stream?.streamStatus} />
                  </TableCell>
                  <TableCell>
                    <BettingStatusBadge status={stream?.bettingRoundStatus || 'N/A'} />
                  </TableCell>
                  <TableCell>{stream?.userBetCount}</TableCell>
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
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <ChartNoAxesColumnIncreasing
                            size={18}
                            className="cursor-pointer transition-colors text-[#FFFFFFBF] hover:text-[#BDFF00]"
                            onClick={() => setStreamAnalyticsId(stream?.id)}
                          />
                        </TooltipTrigger>
                        <TooltipContent>Stream analytics</TooltipContent>
                      </Tooltip>
                                             {/* <Lock color="#FFFFFFBF" size={18} />
                       <Play color="#FFFFFFBF" size={18} /> */}
                       {stream?.streamStatus === StreamStatus.SCHEDULED && (
                         <Tooltip>
                           <TooltipTrigger asChild>
                             <Trash2 
                               size={18}
                               className="cursor-pointer transition-colors text-[#FFFFFFBF] hover:text-[#BDFF00]"
                               onClick={() => handleOpenDeleteDialog(stream)}
                             />
                           </TooltipTrigger>
                           <TooltipContent>Delete stream</TooltipContent>
                         </Tooltip>
                       )}
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

       {/* Delete Stream Dialog */}
       {streamToDelete && (
         <DeleteStreamDialog
           streamName={streamToDelete?.streamName}
           onConfirm={() => handleDeleteStream(streamToDelete?.id)}
           isDeleting={isDeletingStream && deletingStreamId === streamToDelete?.id}
           isOpen={deleteDialogOpen}
           onOpenChange={setDeleteDialogOpen}
         />
       )}
     </div>
   );
 };
