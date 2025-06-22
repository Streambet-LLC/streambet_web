import { Navigation } from '@/components/Navigation';
import { useStreamManagement } from '@/hooks/useStreamManagement';
import { AdminManagement } from '@/components/admin/AdminManagement';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Admin = () => {
  const [newStreamTitle, setNewStreamTitle] = useState('');
  const [newStreamDescription, setNewStreamDescription] = useState('');
  const {
    profile,
    streams,
    searchStreamQuery,
    deleteStream,
    refetchStreams,
    setSearchStreamQuery
  } = useStreamManagement();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState('current');

  const createStream = async (bettingOptions: string[], thumbnailUrl?: string) => {
    if (!newStreamTitle.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a stream title',
        variant: 'destructive',
      });
      return;
    }

    if (bettingOptions.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one betting option',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('Creating new stream with Livepeer...');

      const { data: livepeerStream, error: livepeerError } = await supabase.functions.invoke(
        'livepeer',
        {
          body: { action: 'create' },
        }
      );

      if (livepeerError) {
        console.error('Livepeer function error:', livepeerError);
        throw livepeerError;
      }

      console.log('Livepeer stream created:', livepeerStream);

      // Create stream in Supabase
      const { error: dbError } = await supabase.from('streams').insert([
        {
          title: newStreamTitle,
          description: newStreamDescription.trim() || null,
          stream_key: livepeerStream.streamKey,
          livepeer_stream_id: livepeerStream.livepeerStreamId,
          playback_id: livepeerStream.playbackId,
          platform: 'custom',
          created_by: profile?.id,
          betting_options: bettingOptions,
          thumbnail_url: thumbnailUrl,
          // Explicitly set is_live to null to start (until we confirm it's streaming)
          is_live: null,
        },
      ]);

      if (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }

      toast({
        title: 'Success',
        description: 'Stream created successfully',
      });

      setNewStreamTitle('');
      setNewStreamDescription('');

      // Explicitly refetch streams to update the UI
      await refetchStreams();

      setActiveSection('current');
    } catch (error: any) {
      console.error('Error creating stream:', error);
      toast({
        title: 'Error creating stream',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (profile && profile.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // All streams that have not been completely deleted
  const allStreams = streams || [];

  // Past streams are only those explicitly marked as not live
  const pastStreams = allStreams.filter(stream => stream.is_live === false);

  // Current streams are all streams that are still live
  const currentStreams = allStreams.filter(stream => stream.is_live !== false);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
        <div className="container flex w-full pt-24 pb-8">
          <main className="flex-1 pl-4">{<AdminManagement
              streams={currentStreams}
              refetchStreams={() => refetchStreams()}
              searchStreamQuery={searchStreamQuery}
              setSearchStreamQuery={setSearchStreamQuery}
            />}
          </main>
        </div>
    </div>
  );
};

export default Admin;
