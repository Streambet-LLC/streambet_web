import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async req => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    const { streamId } = await req.json();
    console.log('Updating thumbnail for stream:', streamId);

    // Validate required environment variables
    const LIVEPEER_API_KEY = Deno.env.get('LIVEPEER_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LIVEPEER_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing required environment variables:', {
        hasLivepeerKey: !!LIVEPEER_API_KEY,
        hasSupabaseUrl: !!SUPABASE_URL,
        hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
      });
      throw new Error('Server configuration error');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get stream details from database
    const { data: stream, error: dbError } = await supabase
      .from('streams')
      .select('livepeer_stream_id, playback_id')
      .eq('id', streamId)
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to fetch stream from database');
    }

    if (!stream?.livepeer_stream_id || !stream.playback_id) {
      console.error('Stream not found or missing required IDs:', {
        streamId,
        livepeerStreamId: stream?.livepeer_stream_id,
        playbackId: stream?.playback_id,
      });
      throw new Error('Stream not found or missing required IDs');
    }

    // Check if stream is active
    console.log('Checking stream status:', stream.livepeer_stream_id);
    const statusResponse = await fetch(
      `https://livepeer.studio/api/stream/${stream.livepeer_stream_id}`,
      {
        headers: {
          Authorization: `Bearer ${LIVEPEER_API_KEY}`,
        },
      }
    ).catch(error => {
      console.error('Error fetching stream status:', error);
      throw new Error('Failed to check stream status');
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error('Status response error:', errorText);
      throw new Error('Stream status check failed');
    }

    const streamStatus = await statusResponse.json();
    console.log('Stream status:', streamStatus);

    if (!streamStatus.isActive) {
      return new Response(
        JSON.stringify({
          message: 'Stream is not active',
          details: streamStatus,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 202,
        }
      );
    }

    // Generate thumbnail URL
    const thumbnailUrl = `https://livepeer.studio/api/playback/${stream.playback_id}/thumbnail.jpg`;
    console.log('Generated thumbnail URL:', thumbnailUrl);

    // Update stream thumbnail in database
    const { error: updateError } = await supabase
      .from('streams')
      .update({
        thumbnail_url: thumbnailUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', streamId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error('Failed to update thumbnail in database');
    }

    return new Response(
      JSON.stringify({
        success: true,
        thumbnail: thumbnailUrl,
        status: streamStatus,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in update-thumbnail function:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: 'Check function logs for more information',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message.includes('not active') ? 202 : 500,
      }
    );
  }
});
