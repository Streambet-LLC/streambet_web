import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting scheduled thumbnail update');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all active Kick.com streams
    const { data: streams, error: streamsError } = await supabase
      .from('streams')
      .select('*')
      .eq('platform', 'kick')
      .not('embed_url', 'is', null);

    if (streamsError) {
      throw streamsError;
    }

    console.log(`Found ${streams?.length || 0} Kick.com streams to update`);

    const updates = await Promise.all(
      (streams || []).map(async stream => {
        try {
          if (!stream.embed_url) return null;

          const channelName = stream.embed_url.split('/').pop();
          if (!channelName) return null;

          const thumbnailUrl = `https://thumb.kick.com/thumbnails/${channelName}_1920x1080.jpg`;
          console.log(`Updating thumbnail for stream ${stream.id} from ${thumbnailUrl}`);

          // Fetch new thumbnail
          const response = await fetch(thumbnailUrl);
          if (!response.ok) {
            console.error(`Failed to fetch thumbnail for stream ${stream.id}: ${response.status}`);
            return null;
          }

          const imageData = await response.arrayBuffer();

          // Upload to Supabase Storage
          const filePath = `thumbnails/${stream.id}-${Date.now()}.jpg`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('stream-thumbnails')
            .upload(filePath, imageData, {
              contentType: 'image/jpeg',
              upsert: true,
            });

          if (uploadError) {
            console.error(`Error uploading thumbnail for stream ${stream.id}:`, uploadError);
            return null;
          }

          // Get public URL
          const {
            data: { publicUrl },
          } = supabase.storage.from('stream-thumbnails').getPublicUrl(filePath);

          // Update stream with new thumbnail
          const { error: updateError } = await supabase
            .from('streams')
            .update({ thumbnail_url: publicUrl })
            .eq('id', stream.id);

          if (updateError) {
            console.error(`Error updating stream ${stream.id}:`, updateError);
            return null;
          }

          return { streamId: stream.id, success: true };
        } catch (error) {
          console.error(`Error processing stream ${stream.id}:`, error);
          return { streamId: stream.id, success: false, error };
        }
      })
    );

    const successCount = updates.filter(u => u?.success).length;
    console.log(`Successfully updated ${successCount} thumbnails`);

    return new Response(
      JSON.stringify({
        success: true,
        updated: successCount,
        total: streams?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in update-kick-thumbnails function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
