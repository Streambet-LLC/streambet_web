import { Navigation } from '@/components/Navigation';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Footer } from '@/components/Footer';

const Index = () => {
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);
  const [activeTab, setActiveTab] = useState('live');
  const isInitialLoad = useRef(true);


  // Store last page per tab
  const [tabPages, setTabPages] = useState<{ [key: string]: number }>({ live: 1, upcoming: 1 });
  const currentPage = tabPages[activeTab] || 1;
  const itemsPerPage = activeTab === 'live' ? 9 : 6;

  const rangeStart = (currentPage - 1) * itemsPerPage;
  const rangeEnd = itemsPerPage;

  const tabs = [
    { key: 'live', label: 'Live' },
    { key: 'upcoming', label: 'Upcoming' },
  ];

  const isLive = activeTab === 'live';

  const { session } = useAuthContext();

  const { data: streams, refetch: refetchStreams, isLoading, isFetching } = useQuery({
    queryKey: ['userStreams', activeTab, currentPage],
  
    queryFn: async () => {
      if( activeTab === 'live') {
      const response = await api.userStream.getStreams({
        range: `[${rangeStart},${rangeEnd}]`,
        sort:  '["createdAt","DESC"]' ,
        filter: JSON.stringify({ q: '' }),
        pagination: true,
        streamStatus: 'live' ,
      });
      return response;
    }
    return null;
    },
    refetchInterval: 10000, // Refresh more frequently (every 10 seconds)
  });

  // State to hold the current streams data for display
  const [streamsData, setStreamsData] = useState<any>(undefined);
  const [loader, setLoader] = useState(true);
  
  // Clear data and refetch when tab or page changes
  useEffect(() => {
    setStreamsData(undefined); // Clear data immediately on tab/page change
    setLoader(true);
  }, [currentPage, activeTab]);
  

  // Update streamsData when new data arrives
  useEffect(() => {
    if (streams){
      // Only update if the data is for the current tab
      setStreamsData(streams);
      setLoader(false);
    } 
    else if (streams===null) {
      setLoader(false);
    }
    else if (isLoading) {
      setLoader(true);
    }

    if (!isLoading && !isFetching) {
      if (isInitialLoad.current && (!streams || streams?.data?.length === 0)) {
        setActiveTab('upcoming');
      }
      isInitialLoad.current = false;
    }
  }, [streams, isLoading, isFetching]);

  // Handle component mount and navigation back - ensure proper state synchronization
  useEffect(() => {
    // When component mounts or when navigating back, ensure we start with clean state
    setStreamsData(undefined);
    setLoader(true);
    // Force a refetch to ensure we have the correct data for the current tab
    refetchStreams();
    
    // Cleanup function to reset state when component unmounts
    return () => {
      setStreamsData(undefined);
      setLoader(true);
    };
  }, []); // Empty dependency array means this runs only on mount

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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


const [upcomingStreamData, setUpcomingStreamData] = useState([]);
const [hasMoreUpcoming, setHasMoreUpcoming] = useState(true);
const [rangeUpcomingStart, setRangeUpcomingStart] = useState(0);
const [isLoadingUpcoming, setIsLoadingUpcoming] = useState(false);
const loadingUpcomingRef = useRef(false);

const fetchUpcomingMore = async () => {
  if (loadingUpcomingRef.current || !hasMoreUpcoming) return;
  loadingUpcomingRef.current = true;
  setIsLoadingUpcoming(true);
  try {
    const response = await api.userStream.getStreams({
      range: `[${rangeUpcomingStart},${6}]`,
      sort: '["scheduledStartTime","ASC"]',
      filter: JSON.stringify({ q: '' }),
      pagination: true,
      streamStatus: 'scheduled',
    });

    const newData = response?.data || [];
    if (newData?.length < 6) {
      setHasMoreUpcoming(false); // No more data
    }
    setUpcomingStreamData((prev: any[] = []) => [...prev, ...newData]);
    setRangeUpcomingStart(prev => prev + 6);
  } catch (err) {
    console.error('Failed to fetch messages:', err);
    setHasMoreUpcoming(false);
  } finally {
    setIsLoadingUpcoming(false);
    loadingUpcomingRef.current = false;
  }
};

useEffect(() => {
  if (activeTab === 'upcoming' && upcomingStreamData.length === 0) {
    fetchUpcomingMore();
  }
  // eslint-disable-next-line
}, [activeTab]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <main className="container flex-1 pt-24 pb-8">
        <div className="space-y-8">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">
              Bet on the internet's <br />
              <span className="text-[#BDFF00]">randomest</span> moments
            </h1>
            <p className='text-[#FFFFFFBF]'>
              Live betting for games created on the internet.
              <br />
                <p className='text-[#FFFFFFBF] font-bold'>Bet on the unexpected.</p>
            </p>
          </div>

          <TabSwitch
            className='!justify-center !mt-12 !mb-14'
            tabs={tabs}
            activeTab={activeTab}
            setActiveTab={handleTabSwitch} />

          <div className="mt-16">

            {(loader) ? (
              isLive ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-[320px] w-full" />
                  ))}
                </div>
              ) : (
                <div className="mx-auto rounded-md border overflow-x-auto max-w-[750px]">
                  <Table className="bg-[#0D0D0D] min-w-[600px]">
                    <TableBody>
                      {Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i} className="h-[96px]">
                          <TableCell className="w-[220px] min-w-[220px] py-0">
                            <div className="flex items-center gap-0 h-[96px]">
                              <Skeleton className="w-[115px] h-[72px] rounded-lg" />
                              <div className="flex items-center justify-center h-full ml-2 w-full">
                                <Skeleton className="h-4 w-24" />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="w-[160px] min-w-[160px]">
                            <div className="flex flex-col justify-center h-full gap-1">
                              <Skeleton className="h-4 w-16 mb-2" />
                              <Skeleton className="h-4 w-20" />
                            </div>
                          </TableCell>
                          <TableCell className="w-[160px] min-w-[160px]">
                            <div className="flex items-center justify-center h-full">
                              <Skeleton className="h-10 w-32 rounded-lg" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            ) : isLive && (!streamsData || streamsData.data?.length === 0)  ? (
              <Alert variant="default" className="bg-muted">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Live Streams</AlertTitle>
                <AlertDescription>
                  Uh-oh! Looks like there aren't any streams happening right now. Check back later!
                </AlertDescription>
              </Alert>
            ) 
            // : 
            // !isLive && (!streamsData || streamsData.data?.length === 0) ? (
            //   <Alert variant="default" className="bg-muted">
            //     <AlertCircle className="h-4 w-4" />
            //     <AlertTitle>No Upcoming Streams</AlertTitle>
            //     <AlertDescription>
            //       No upcoming streams scheduled at the moment. Check back later!
            //     </AlertDescription>
            //   </Alert>
             : isLive ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {streamsData && streamsData.data?.map(stream => (
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
              
        <UpcomingStreams 
         upcomingStreams={upcomingStreamData}
         fetchMore={fetchUpcomingMore}
         hasMore={hasMoreUpcoming}
         isLoading={isLoadingUpcoming && upcomingStreamData.length === 0}
        // streams={streamsData?.data} 
        />
              
              </div>
            )}
          </div>
          {streamsData?.data?.length > 0 && isLive && <Pagination className='!justify-center'>
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

      <Footer />
    </div>
  );
};

export default Index;
