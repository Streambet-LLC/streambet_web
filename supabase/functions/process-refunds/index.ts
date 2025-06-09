import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { streamId } = await req.json();
    console.log(`Processing refunds for stream ${streamId}`);

    // Get all pending bets for this stream
    const { data: bets, error: betsError } = await supabaseClient
      .from('stream_bets')
      .select('*')
      .eq('stream_id', streamId)
      .eq('status', 'pending');

    if (betsError) {
      throw betsError;
    }

    console.log(`Found ${bets?.length} bets to refund`);

    // Process each bet refund
    for (const bet of bets || []) {
      console.log(`Processing refund for bet ${bet.id}`);

      // Update bet status
      const { error: updateBetError } = await supabaseClient
        .from('stream_bets')
        .update({ status: 'refunded' })
        .eq('id', bet.id);

      if (updateBetError) {
        throw updateBetError;
      }

      // Add refund amount to user's wallet using RPC function
      const { data: newBalance, error: rpcError } = await supabaseClient.rpc('increment', {
        p_user_id: bet.user_id,
        p_amount: bet.amount,
      });

      if (rpcError) {
        console.error('Error updating wallet:', rpcError);
        throw rpcError;
      }

      console.log(`Updated balance for user ${bet.user_id} to ${newBalance}`);

      // Record refund transaction
      const { error: transactionError } = await supabaseClient.from('wallet_transactions').insert({
        user_id: bet.user_id,
        amount: bet.amount,
        type: 'refund',
        description: `Refund for cancelled stream ${streamId}`,
      });

      if (transactionError) {
        console.error('Transaction error:', transactionError);
        throw transactionError;
      }
    }

    // Update stream status
    const { error: streamError } = await supabaseClient
      .from('streams')
      .update({
        betting_locked: true,
        betting_outcome: 'cancelled',
      })
      .eq('id', streamId);

    if (streamError) {
      throw streamError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error processing refunds:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
