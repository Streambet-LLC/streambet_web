import { Navigation } from '@/components/Navigation';
import { CreateLivestream } from '@/components/CreateLivestream';
import { useStreamManagement } from '@/hooks/useStreamManagement';
import { StreamList } from '@/components/admin/StreamList';
import { UserManagement } from '@/components/admin/UserManagement';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { StreamTabs } from '@/components/admin/StreamTabs';

const Admin = () => {
  const [newStreamTitle, setNewStreamTitle] = useState('');
  const [newStreamDescription, setNewStreamDescription] = useState('');
  const { profile, streams, deleteStream, refetchStreams } = useStreamManagement();
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

  if (profile && !profile.is_admin) {
    return <Navigate to="/" replace />;
  }

  // All streams that have not been completely deleted
  const allStreams = streams || [];

  // Past streams are only those explicitly marked as not live
  const pastStreams = allStreams.filter(stream => stream.is_live === false);

  // Current streams are all streams that are still live
  const currentStreams = allStreams.filter(stream => stream.is_live !== false);

  const renderContent = () => {
    switch (activeSection) {
      case 'create':
        return (
          <CreateLivestream
            newStreamTitle={newStreamTitle}
            newStreamDescription={newStreamDescription}
            onNewStreamTitleChange={setNewStreamTitle}
            onNewStreamDescriptionChange={setNewStreamDescription}
            onCreateStream={createStream}
          />
        );
      case 'current':
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold">Current Streams</h2>
            <StreamList
              streams={currentStreams}
              isAdmin={true}
              onDelete={deleteStream}
              onUpdate={refetchStreams}
              showAdminControls={true}
            />
          </div>
        );
      case 'history':
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold">Stream History</h2>
            <StreamTabs
              currentStreams={allStreams}
              pastStreams={pastStreams}
              isAdmin={true}
              onDelete={deleteStream}
              onUpdate={refetchStreams}
            />
          </div>
        );
      case 'users':
        return <UserManagement />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <SidebarProvider>
        <div className="container flex w-full pt-24 pb-8">
          <AdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
          <main className="flex-1 pl-4">{renderContent()}</main>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default Admin;
