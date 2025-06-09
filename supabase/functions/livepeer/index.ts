const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LIVEPEER_API_KEY = Deno.env.get('LIVEPEER_API_KEY');
    console.log('Checking LIVEPEER_API_KEY:', LIVEPEER_API_KEY ? 'Key exists' : 'Key is missing');

    if (!LIVEPEER_API_KEY) {
      throw new Error('LIVEPEER_API_KEY is not set');
    }

    const { action, streamId } = await req.json();
    console.log('Received action:', action, 'streamId:', streamId);

    if (action === 'create') {
      console.log('Creating new stream with Livepeer...');

      // First create the webhook
      const webhookResponse = await fetch('https://livepeer.studio/api/webhook', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${LIVEPEER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Supabase Stream Status',
          url: 'https://axuufjquzqqopjlfvnuv.supabase.co/functions/v1/livepeer-webhook',
          events: ['stream.started', 'stream.idle'],
        }),
      });

      if (!webhookResponse.ok) {
        const error = await webhookResponse.text();
        console.error('Error creating webhook:', error);
        // Continue anyway as the webhook might already exist
      } else {
        console.log('Successfully created webhook');
      }

      // Then create the stream
      const response = await fetch('https://livepeer.studio/api/stream', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${LIVEPEER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'BetStream Live',
          profiles: [
            {
              name: '720p',
              fps: 30,
              bitrate: 3000000,
              width: 1280,
              height: 720,
            },
            {
              name: '480p',
              fps: 30,
              bitrate: 1000000,
              width: 854,
              height: 480,
            },
          ],
          record: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Livepeer API error:', error);
        throw new Error(`Livepeer API error: ${error}`);
      }

      const stream = await response.json();
      console.log('Created Livepeer stream:', stream);

      return new Response(
        JSON.stringify({
          streamKey: stream.streamKey,
          playbackId: stream.playbackId,
          livepeerStreamId: stream.id,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
