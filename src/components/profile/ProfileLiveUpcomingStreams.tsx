import { FaInstagram, FaTiktok, FaTwitch, FaYoutube } from 'react-icons/fa';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import api, { userAPI } from '@/integrations/api/client';
import { MainLayout } from '@/components/layout';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { formatUrl } from '@/utils/format';
import NotFound from '@/pages/NotFound';
import { format } from 'date-fns';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { StreamCard } from '../StreamCard';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '../ui/pagination';
import { Skeleton } from '../ui/skeleton';

export default function ProfileLiveUpcomingStreams({
  username
} : {
  username: string
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  const rangeStart = (currentPage - 1) * itemsPerPage;
  const rangeEnd = itemsPerPage;

  const { data: streams, isLoading } = useQuery({
    queryKey: [
      'userLiveStreams', 
      { 
        username,
        range: `[${rangeStart},${rangeEnd}]`
      }
    ],
  
    queryFn: async () => {
      const response = await api.userStream.getStreams({
        range: `[${rangeStart},${rangeEnd}]`,
        sort:  '["scheduledStartTime","ASC"]' ,
        filter: JSON.stringify({ q: '' }),
        username,
        pagination: true,
      });
      return response;
    }
    // refetchInterval: 10000, // Refresh more frequently (every 10 seconds)
  });

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const totalPages = Math.ceil((streams?.total || 0) / itemsPerPage);

  return (
    <div className='flex flex-col gap-4'>
      <h2>Live and Upcoming Streams</h2>
      {isLoading ?
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-80">
          {Array(3).fill('').map((_, i) => <Skeleton className='h-full flex' key={i} />)}
        </div> :
        <>
          {(!streams || streams.data?.length === 0) ? 
            <div className='text-muted'>
              No live and upcoming streams yet.
            </div> : 
            <div className='flex flex-col gap-8'>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {streams.data?.sort((a, b) => (a.streamName?.toLowerCase().includes('mrbeast') ? 1 : 0) - (b.streamName?.toLowerCase().includes('mrbeast') ? 1 : 0)).map(stream => (
                  <StreamCard
                    key={stream.id}
                    stream={stream}
                  />
                ))}
              </div>
              <Pagination className='!justify-center'>
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
          }
        </>
      }
    </div>
  );
};