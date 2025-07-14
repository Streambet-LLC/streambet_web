import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { StreamCard } from '@/components/StreamCard';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useEffect, useRef, useState } from 'react';
import api from '@/integrations/api/client';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { cn } from '@/lib/utils';
import { UpcomingStreams } from '@/components/stream/UpcomingStreams';
import { TabSwitch } from '@/components/navigation/TabSwitch';
import { useAuthContext } from '@/contexts/AuthContext';

const Index = () => {
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);
  const [activeTab, setActiveTab] = useState('live');

  // Store last page per tab
  const [tabPages, setTabPages] = useState<{ [key: string]: number }>({ live: 1, upcoming: 1 });
  const currentPage = tabPages[activeTab] || 1;
  const itemsPerPage = 9;

  const rangeStart = (currentPage - 1) * itemsPerPage;
  const rangeEnd = itemsPerPage;

  const tabs = [
    { key: 'live', label: 'Live' },
    { key: 'upcoming', label: 'Upcoming' },
  ];

  const isLive = activeTab === 'live';

  const { session } = useAuthContext();

  const { data: streams, refetch: refetchStreams } = useQuery({
    queryKey: ['userStreams'],
    queryFn: async () => {
      const response = await api.userStream.getStreams({
        range: `[${rangeStart},${rangeEnd}]`,
        sort: '["createdAt","DESC"]',
        filter: JSON.stringify({ q: '' }),
        pagination: true,
        streamStatus: isLive ? 'live' : 'scheduled',
      });
      return response;
    },
    refetchInterval: 10000, // Refresh more frequently (every 10 seconds)
  });

  useEffect(() => {
    refetchStreams()
  }, [currentPage, activeTab, refetchStreams]);

  const totalPages = Math.ceil((streams?.total || 0) / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setTabPages(prev => ({ ...prev, [activeTab]: page }));
    }
  };

  // Handle tab switch: save current page, reset to 1 if switching, restore if returning
  const handleTabSwitch = (tabKey: string) => {
    setTabPages(prev => {
      // If switching to a new tab, reset to 1 if not visited before, else restore last page
      if (tabKey === activeTab) return prev;
      return {
        ...prev,
        [activeTab]: currentPage, // Save current page for current tab
        [tabKey]: prev[tabKey] || 1, // Restore or reset
      };
    });
    setActiveTab(tabKey);
  };

  const updateThumbnails = async () => {
    if (!streams || streams.data?.length === 0) return;

    console.log('Updating thumbnails for active streams');

    for (const stream of streams)
    {
      try
      {
        if (stream.is_live)
        {
          console.log('Updating thumbnail for live stream:', stream.id);

          // Update Livepeer stream thumbnails
          if (stream.platform === 'custom' && stream.livepeer_stream_id)
          {
            const { error } = await supabase.functions.invoke('update-thumbnail', {
              body: { streamId: stream.id },
            });

            if (error)
            {
              console.error('Error updating thumbnail for stream:', stream.id, error);
            }
          }

          // Update Kick stream thumbnails
          if (stream.platform === 'kick' && stream.embed_url)
          {
            const { error } = await supabase.functions.invoke('capture-thumbnail', {
              body: {
                streamId: stream.id,
                embedUrl: stream.embed_url,
              },
            });

            if (error)
            {
              console.error('Error capturing Kick stream thumbnail:', error);
            }
          }
        }
      } catch (error)
      {
        console.error('Failed to update thumbnail for stream:', stream.id, error);
      }
    }

    // Refetch streams to get updated thumbnail URLs
    refetchStreams();
  };

  useEffect(() => {
    // On first load, capture thumbnails
    updateThumbnails();

    // Set up regular refresh every 60 seconds
    refreshInterval.current = setInterval(() => {
      updateThumbnails();
    }, 60000); // Every 60 seconds

    return () => {
      if (refreshInterval.current)
      {
        clearInterval(refreshInterval.current);
      }
    };
  }, [streams]);

  useEffect(() => {
    if (streams)
    {
      console.log('All streams with live status:');
      streams.data?.forEach(stream => {
        console.log(`${stream.id}: is_live=${stream.is_live}, title=${stream.title}`);
      });
    }
  }, [streams]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <main className="container flex-1 pt-24 pb-8">
        <div className="space-y-8">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">
              Bet on the internet's <br />
              <span className="text-[#BDFF00]">stupidest</span> moments
            </h1>
            <p className='text-[#FFFFFFBF]'>
              Live betting for games created on the internet.
              <br />
              Bet on the unexpected.
            </p>
          </div>

          <TabSwitch
            className='!justify-center !mt-12 !mb-14'
            tabs={tabs}
            activeTab={activeTab}
            setActiveTab={handleTabSwitch} />

          <div className="mt-16">

            {(!streams || streams.data?.length === 0) && isLive ? (
              <Alert variant="default" className="bg-muted">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Live Streams</AlertTitle>
                <AlertDescription>
                  Uh-oh! Looks like there aren't any streams happening right now. Check back later!
                </AlertDescription>
              </Alert>
            ) : isLive ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {streams.data?.map(stream => (
                  <StreamCard
                    key={stream.id}
                    stream={stream}
                    isLive={isLive}
                    isAdmin={session?.role === 'admin'}
                    showAdminControls={false}
                  />
                ))}
              </div>
            ) : (
              <div>
                <UpcomingStreams streams={streams?.data} />
              </div>
            )}
          </div>
          {streams?.data?.length > 0 && <Pagination className='!justify-center'>
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
          </Pagination>}
        </div>
      </main>

      {/* <Footer /> */}
    </div>
  );
};

export default Index;
