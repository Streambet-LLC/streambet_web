import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface UseStreamSettingsProps {
  stream: {
    id: string;
    title: string;
    description?: string;
    platform: string;
    platform_channel_id?: string | null;
    embed_url?: string | null;
  };
  onUpdate: () => void;
}

export const useStreamSettings = ({ stream, onUpdate }: UseStreamSettingsProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [title, setTitle] = useState(stream.title);
  const [description, setDescription] = useState(stream.description || '');
  const [platform, setPlatform] = useState(stream.platform);
  const [channelId, setChannelId] = useState(stream.platform_channel_id || '');
  const [embedUrl, setEmbedUrl] = useState(stream.embed_url || '');

  const handleSave = async () => {
    const { error } = await supabase
      .from('streams')
      .update({
        title,
        description,
        platform,
        platform_channel_id: channelId,
        embed_url: platform === 'kick' ? embedUrl : null,
      })
      .eq('id', stream.id);

    if (error) {
      toast({
        title: 'Error updating stream settings',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Stream settings updated successfully',
    });

    onUpdate();
  };

  // This function specifically ends the stream - only called when the End Stream button is clicked
  const handleEndStream = async () => {
    try {
      console.log('Ending stream:', stream.id);

      const { error } = await supabase
        .from('streams')
        .update({
          is_live: false,
        })
        .eq('id', stream.id);

      if (error) {
        toast({
          title: 'Error ending stream',
          description: error.message,
          variant: 'destructive',
        });
        throw error;
      }

      toast({
        title: 'Success',
        description: 'Stream has been ended successfully',
      });

      // Force a delay to allow the update to process before redirecting
      setTimeout(() => {
        navigate('/admin');
      }, 500);
    } catch (error: any) {
      console.error('Error in handleEndStream:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to end stream',
        variant: 'destructive',
      });
    }
  };

  return {
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
  };
};
