import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const livepeerApiKey = Deno.env.get('LIVEPEER_API_KEY');

    if (!livepeerApiKey) {
      throw new Error('LIVEPEER_API_KEY is not set');
    }

    // Return the configuration
    return new Response(
      JSON.stringify({
        livepeerApiKey,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
