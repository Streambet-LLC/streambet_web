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
    const { streamId, embedUrl } = await req.json();

    if (!streamId || !embedUrl) {
      console.error('Missing required parameters:', { streamId, embedUrl });
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log('Processing thumbnail for stream:', { streamId, embedUrl });

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract channel name from embedUrl
    let channelName = '';
    try {
      const url = new URL(embedUrl.startsWith('http') ? embedUrl : `https://${embedUrl}`);
      channelName = url.pathname.split('/').pop() || '';

      if (!channelName) {
        throw new Error('Could not extract channel name from URL');
      }

      console.log('Extracted channel name:', channelName);
    } catch (error) {
      console.error('Error extracting channel name:', error);
    }

    let thumbnailUrl = '/placeholder.svg';

    // For Kick.com streams, try to get their thumbnail directly
    if (channelName && embedUrl.includes('kick.com')) {
      // Kick provides thumbnails at a standardized URL
      thumbnailUrl = `https://thumb.kick.com/thumbnails/${channelName}_1920x1080.jpg?${Date.now()}`;
      console.log('Using Kick thumbnail URL:', thumbnailUrl);

      // Check if the Kick thumbnail is accessible
      try {
        const response = await fetch(thumbnailUrl, { method: 'HEAD' });
        if (!response.ok) {
          console.log('Kick thumbnail not found, using placeholder');
          thumbnailUrl = '/placeholder.svg';
        }
      } catch (error) {
        console.error('Error checking Kick thumbnail:', error);
        thumbnailUrl = '/placeholder.svg';
      }
    }

    console.log('Using thumbnail URL:', thumbnailUrl);

    // Update stream with thumbnail URL
    const { error: updateError } = await supabase
      .from('streams')
      .update({
        thumbnail_url: thumbnailUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', streamId);

    if (updateError) {
      console.error('Error updating stream:', updateError);
      throw updateError;
    }

    console.log('Stream updated with thumbnail');

    return new Response(
      JSON.stringify({
        success: true,
        thumbnail: thumbnailUrl,
        message: 'Stream thumbnail updated',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in capture-thumbnail function:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: 'Check function logs for more information',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
