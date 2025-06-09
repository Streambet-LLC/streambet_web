import { Card } from '@/components/ui/card';
import { StreamCredentialsSection } from './stream-settings/StreamCredentialsSection';
import { BasicSettingsForm } from './stream-settings/BasicSettingsForm';
import { BettingManagementSection } from './stream-settings/BettingManagementSection';
import { StreamHeader } from './stream-settings/StreamHeader';
import { BettingOptionsSection } from './stream-settings/BettingOptionsSection';
import { useStreamSettings } from '@/hooks/useStreamSettings';
import { useBettingManagement } from '@/hooks/useBettingManagement';
import { StreamPlayer } from './StreamPlayer';
import { ThumbnailUpload } from './stream/ThumbnailUpload';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CommentSection } from './CommentSection';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './ui/resizable';

interface StreamSettingsProps {
  stream: {
    id: string;
    title: string;
    description?: string;
    platform: string;
    stream_key?: string | null;
    platform_channel_id?: string | null;
    total_bets?: number | null;
    betting_locked?: boolean;
    betting_outcome?: string | null;
    betting_options?: string[];
    is_live?: boolean;
    embed_url?: string | null;
  };
  onUpdate: () => void;
  session?: any;
}

export const StreamSettings = ({ stream, onUpdate, session }: StreamSettingsProps) => {
  const { toast } = useToast();
  const {
    title,
    setTitle,
    description,
    setDescription,
    platform,
    setPlatform,
    channelId,
    setChannelId,
    embedUrl,
    setEmbedUrl,
    handleSave,
    handleEndStream,
  } = useStreamSettings({ stream, onUpdate });

  const {
    selectedOutcome,
    setSelectedOutcome,
    handleLockBets,
    handleUnlockBets,
    handleDeclareWinner,
  } = useBettingManagement({ streamId: stream.id, onUpdate });

  const handleThumbnailUpload = async (thumbnailUrl: string) => {
    try {
      const { error } = await supabase
        .from('streams')
        .update({ thumbnail_url: thumbnailUrl })
        .eq('id', stream.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Stream thumbnail updated successfully',
      });

      onUpdate();
    } catch (error) {
      console.error('Error updating thumbnail:', error);
      toast({
        title: 'Error',
        description: 'Failed to update stream thumbnail',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <StreamHeader
        streamId={stream.id}
        title={stream.title}
        isLive={stream.is_live || false}
        onEndStream={handleEndStream}
      />

      <Tabs defaultValue="stream" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="stream">Stream & Comments</TabsTrigger>
          <TabsTrigger value="betting">Betting Management</TabsTrigger>
          <TabsTrigger value="settings">Stream Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="stream" className="space-y-6">
          <ResizablePanelGroup direction="horizontal" className="min-h-[600px]">
            <ResizablePanel defaultSize={70} minSize={50}>
              <Card className="p-6 h-full">
                <h3 className="text-lg font-semibold mb-4">Stream Preview</h3>
                <StreamPlayer streamId={stream.id} />
              </Card>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={30} minSize={25}>
              <Card className="p-6 h-full">
                {stream.id && <CommentSection streamId={stream.id} session={session} />}
              </Card>
            </ResizablePanel>
          </ResizablePanelGroup>
        </TabsContent>

        <TabsContent value="betting" className="space-y-6">
          <Card className="p-6">
            <BettingManagementSection
              stream={stream}
              selectedOutcome={selectedOutcome}
              onOutcomeChange={setSelectedOutcome}
              onLockBets={handleLockBets}
              onDeclareWinner={handleDeclareWinner}
              onUnlockBets={handleUnlockBets}
            />
          </Card>

          <Card className="p-6">
            <BettingOptionsSection
              streamId={stream.id}
              bettingOptions={stream.betting_options || []}
              onUpdate={onUpdate}
            />
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card className="p-6">
            {platform === 'custom' && <StreamCredentialsSection streamKey={stream.stream_key} />}

            <BasicSettingsForm
              title={title}
              description={description}
              platform={platform}
              channelId={channelId}
              embedUrl={embedUrl}
              onTitleChange={setTitle}
              onDescriptionChange={setDescription}
              onPlatformChange={setPlatform}
              onChannelIdChange={setChannelId}
              onEmbedUrlChange={setEmbedUrl}
              onSave={handleSave}
            />

            <div className="mt-6 pt-6 border-t">
              <h3 className="text-lg font-semibold mb-4">Stream Thumbnail</h3>
              <ThumbnailUpload onUploadComplete={handleThumbnailUpload} />
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
