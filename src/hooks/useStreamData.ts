import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import api from '@/integrations/api/client';

export const useStreamData = (streamId: string) => {
  return useQuery({
    queryKey: ['stream', streamId],
    queryFn: async () => {
      const data = await api.betting.getStream(streamId);
      return data;
      // Return null if streamId is "new" since it's not a valid UUID
      // if (streamId === 'new') {
      //   console.log('Stream ID is "new", returning null');
      //   return null;
      // }

      // console.log('Fetching stream details for ID:', streamId);
      // const { data, error } = await supabase
      //   .from('streams')
      //   .select(
      //     `
      //     *,
      //     profiles (
      //       username
      //     )
      //   `
      //   )
      //   .eq('id', streamId)
      //   .single();

      // if (error) {
      //   console.error('Error fetching stream:', error);
      //   throw error;
      // }

      // console.log('Stream data fetched:', {
      //   id: data.id,
      //   title: data.title,
      //   is_live: data.is_live,
      //   platform: data.platform,
      // });

      // // Check Livepeer status directly
      // try {
      //   const { data: livepeerStatus } = await supabase.functions.invoke('check-stream-status', {
      //     body: {
      //       streamId: data.livepeer_stream_id,
      //       playbackId: data.playback_id,
      //     },
      //   });

      //   console.log('Livepeer status:', livepeerStatus);

      //   if (livepeerStatus?.isActive) {
      //     console.log('Stream is active according to Livepeer');

      //     // Update thumbnail if stream is live
      //     const { data: thumbnailData } = await supabase.functions.invoke('update-thumbnail', {
      //       body: { streamId },
      //     });

      //     console.log('Updated thumbnail:', thumbnailData);

      //     if (!data.is_live) {
      //       // Update stream status in our database
      //       const { error: updateError } = await supabase
      //         .from('streams')
      //         .update({ is_live: true })
      //         .eq('id', streamId);

      //       if (updateError) {
      //         console.error('Error updating stream status:', updateError);
      //       } else {
      //         console.log('Updated stream status to live');
      //         return { ...data, is_live: true };
      //       }
      //     }
      //   }
      // } catch (error) {
      //   console.error('Error checking Livepeer status:', error);
      // }

      // return data;
     },
    // refetchInterval: 20000, // Fetch every 20 seconds
    
  });
};
