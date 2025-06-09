import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async req => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LIVEPEER_API_KEY = Deno.env.get('LIVEPEER_API_KEY');

    if (!LIVEPEER_API_KEY) {
      throw new Error('LIVEPEER_API_KEY is not set');
    }

    const { streamId, playbackId } = await req.json();
    console.log('Checking status for stream:', streamId);

    const response = await fetch(`https://livepeer.studio/api/stream/${streamId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${LIVEPEER_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Livepeer API error:', error);
      throw new Error(`Livepeer API error: ${error}`);
    }

    const streamData = await response.json();
    console.log('Livepeer stream data:', streamData);

    return new Response(
      JSON.stringify({
        isActive: streamData.isActive,
        status: streamData.status,
        lastSeen: streamData.lastSeen,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
