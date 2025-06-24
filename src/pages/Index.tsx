import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { StreamCard } from '@/components/StreamCard';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useEffect, useRef } from 'react';

const Index = () => {
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ['profile', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session!.user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: streams, refetch: refetchStreams } = useQuery({
    queryKey: ['streams'],
    queryFn: async () => {
      console.log('Fetching active streams');
      const { data, error } = await supabase
        .from('streams')
        .select(
          `
          *,
          profiles (
            username
          )
        `
        )
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching streams:', error);
        throw error;
      }

      console.log('All fetched streams:', data);

      // Show any stream that is still live, regardless of betting outcome
      const activeStreams = data.filter(stream => stream.is_live !== false);

      console.log('Filtered active streams:', activeStreams);
      return activeStreams;
    },
    refetchInterval: 10000, // Refresh more frequently (every 10 seconds)
  });

  const updateThumbnails = async () => {
    if (!streams || streams.length === 0) return;

    console.log('Updating thumbnails for active streams');

    for (const stream of streams) {
      try {
        if (stream.is_live) {
          console.log('Updating thumbnail for live stream:', stream.id);

          // Update Livepeer stream thumbnails
          if (stream.platform === 'custom' && stream.livepeer_stream_id) {
            const { error } = await supabase.functions.invoke('update-thumbnail', {
              body: { streamId: stream.id },
            });

            if (error) {
              console.error('Error updating thumbnail for stream:', stream.id, error);
            }
          }

          // Update Kick stream thumbnails
          if (stream.platform === 'kick' && stream.embed_url) {
            const { error } = await supabase.functions.invoke('capture-thumbnail', {
              body: {
                streamId: stream.id,
                embedUrl: stream.embed_url,
              },
            });

            if (error) {
              console.error('Error capturing Kick stream thumbnail:', error);
            }
          }
        }
      } catch (error) {
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
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [streams]);

  useEffect(() => {
    if (streams) {
      console.log('All streams with live status:');
      streams.forEach(stream => {
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

          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-8">Live Streams</h2>

            {!streams || streams.length === 0 ? (
              <Alert variant="default" className="bg-muted">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Live Streams</AlertTitle>
                <AlertDescription>
                  Uh-oh! Looks like there aren't any streams happening right now. Check back later!
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {streams.map(stream => (
                  <StreamCard
                    key={stream.id}
                    stream={stream}
                    isAdmin={profile?.is_admin}
                    showAdminControls={false}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* <Footer /> */}
    </div>
  );
};

export default Index;
