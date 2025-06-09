import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createHmac } from 'https://deno.land/std@0.210.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async req => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const WEBHOOK_SECRET = Deno.env.get('LIVEPEER_WEBHOOK_SECRET');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !WEBHOOK_SECRET) {
      console.error('Missing required environment variables:', {
        hasSupabaseUrl: !!SUPABASE_URL,
        hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
        hasWebhookSecret: !!WEBHOOK_SECRET,
      });
      throw new Error('Missing required environment variables');
    }

    // Get the raw body for signature verification
    const body = await req.text();
    console.log('Received webhook payload:', body);

    // Verify webhook signature
    const signature = req.headers.get('Livepeer-Signature');
    if (!signature) {
      console.error('No Livepeer signature found in request headers');
      return new Response(
        JSON.stringify({
          error: 'No signature provided',
          headers: Object.fromEntries(req.headers),
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const hmac = createHmac('sha256', WEBHOOK_SECRET);
    hmac.update(body);
    const expectedSignature = hmac.digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature:', {
        received: signature,
        expected: expectedSignature,
        bodyLength: body.length,
      });
      return new Response(
        JSON.stringify({
          error: 'Invalid signature',
          details: {
            receivedSignatureLength: signature.length,
            expectedSignatureLength: expectedSignature.length,
          },
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const payload = JSON.parse(body);
    console.log('Processing webhook event:', {
      type: payload.type,
      streamId: payload.id,
      playbackId: payload.playbackId,
      isActive: payload.isActive,
      event: payload.event,
      timestamp: new Date().toISOString(),
    });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find the stream by livepeer_stream_id
    const { data: streams, error: fetchError } = await supabase
      .from('streams')
      .select('*')
      .eq('livepeer_stream_id', payload.id);

    if (fetchError) {
      console.error('Error fetching streams:', {
        error: fetchError,
        livepeerStreamId: payload.id,
      });
      throw fetchError;
    }

    if (!streams || streams.length === 0) {
      console.error('No stream found with livepeer_stream_id:', {
        livepeerStreamId: payload.id,
        event: payload.event,
      });
      return new Response(
        JSON.stringify({
          error: 'Stream not found',
          details: {
            livepeerStreamId: payload.id,
            event: payload.event,
          },
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update all matching streams (should typically be just one)
    const updatePromises = streams.map(stream => {
      const updateData = {
        is_live: payload.isActive,
        playback_id: payload.playbackId,
        updated_at: new Date().toISOString(),
      };

      console.log('Updating stream:', {
        streamId: stream.id,
        livepeerStreamId: payload.id,
        currentStatus: stream.is_live,
        newStatus: payload.isActive,
        event: payload.event,
      });

      return supabase.from('streams').update(updateData).eq('id', stream.id).select();
    });

    const results = await Promise.all(updatePromises);
    const errors = results.filter(result => result.error);

    if (errors.length > 0) {
      console.error('Errors updating streams:', errors);
      throw new Error('Failed to update some streams');
    }

    console.log('Successfully processed webhook:', {
      event: payload.event,
      streamsUpdated: streams.length,
      newStatus: payload.isActive,
    });

    return new Response(
      JSON.stringify({
        success: true,
        streamsUpdated: streams.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing webhook:', {
      error: error.message,
      stack: error.stack,
    });
    return new Response(
      JSON.stringify({
        error: error.message,
        type: error.constructor.name,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
