import BetCard from '../BetCard';
import { useQuery } from '@tanstack/react-query';
import api from '@/integrations/api/client';
import { Skeleton } from '../ui/skeleton';
import { useState } from 'react';
import { QuickPickModal } from '../stream/QuickPickModal';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '../ui/pagination';
import { cn } from '@/lib/utils';

export default function ProfileLiveUpcomingNonVideoBets({ username }: { username: string }) {
  const [quickPickOpen, setQuickPickOpen] = useState(false);
  const [quickPickModalSettings, setQuickPickModalSettings] = useState({
    streamId: null,
    roundId: null,
    streamName: null,
    selectedOption: null,
  });
  const [currentPage, setCurrentPage] = useState(1);

  const { data: nonVideoBets, isLoading } = useQuery({
    queryKey: ['creator-profile-non-video-bets', { page: currentPage }],
    queryFn: async () => {
      const response = await api.bets.getCreatorProfileNonVideoBets({
        page: currentPage,
        limit: 4,
        username,
      });

      return response;
    },
  });

  const totalPages = Math.ceil((nonVideoBets?.total || 0) / 4);

  const handlePageChange = (page: number) => {
    console.log(page);
    console.log(totalPages);
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2>Live and Upcoming Non-Video Bets</h2>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isLoading
            ? Array(4)
                .fill('')
                .map((_, i) => <Skeleton key={i} className="w-full h-64" />)
            : nonVideoBets?.data?.map(bet => (
                <BetCard
                  key={`${bet.streamId}-${bet.roundId}`}
                  {...bet}
                  setQuickPick={(streamId, roundId, streamName, selectedOption) => {
                    setQuickPickModalSettings({
                      streamId,
                      streamName,
                      roundId,
                      selectedOption,
                    });
                    setQuickPickOpen(true);
                  }}
                />
              ))}
        </div>
        {!isLoading && nonVideoBets?.data?.length === 0 ? (
          <div className="text-gray-400 text-sm font-normal mx-auto">
            No live and upcoming non-video bets yet.
          </div>
        ) : (
          <Pagination className="!justify-center">
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
        )}
      </div>
      {quickPickOpen && (
        <QuickPickModal
          open={quickPickOpen}
          onOpenChange={setQuickPickOpen}
          streamId={quickPickModalSettings.streamId}
          roundId={quickPickModalSettings.roundId}
          streamName={quickPickModalSettings.streamName}
          selectedOption={quickPickModalSettings.selectedOption}
        />
      )}
    </div>
  );
}
