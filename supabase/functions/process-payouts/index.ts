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

    const { streamId, winningOption } = await req.json();
    console.log(`Processing payouts for stream ${streamId}, winning option: ${winningOption}`);

    // First update stream betting outcome to ensure real-time notifications go out
    // BUT keep betting_locked as true - admin will unlock it when ready for next round
    // DO NOT modify is_live - keep it as it is
    const { error: streamUpdateError } = await supabaseClient
      .from('streams')
      .update({
        betting_locked: true,
        betting_outcome: winningOption,
      })
      .eq('id', streamId);

    if (streamUpdateError) {
      console.error('Error updating stream outcome:', streamUpdateError);
      throw streamUpdateError;
    }

    // Get all bets for this stream
    const { data: bets, error: betsError } = await supabaseClient
      .from('stream_bets')
      .select('*')
      .eq('stream_id', streamId)
      .eq('status', 'pending');

    if (betsError) {
      console.error('Error fetching bets:', betsError);
      throw betsError;
    }

    console.log(`Found ${bets?.length} bets to process`);

    // Calculate total pool and winning/losing pools after platform fee
    const PLATFORM_FEE = 0.05; // 5% fee
    const totalBets = bets || [];

    // Apply 5% fee to each bet
    const processedBets = totalBets.map(bet => ({
      ...bet,
      amount: Number(bet.amount) * (1 - PLATFORM_FEE), // Remove platform fee and ensure number
    }));

    const winningBets = processedBets.filter(bet => bet.bet_option === winningOption);
    const losingBets = processedBets.filter(bet => bet.bet_option !== winningOption);

    const winningPool = winningBets.reduce((sum, bet) => sum + Number(bet.amount), 0);
    const losingPool = losingBets.reduce((sum, bet) => sum + Number(bet.amount), 0);

    console.log(`Total after fees - Winning pool: ${winningPool}, Losing pool: ${losingPool}`);

    // If there are no winning bets, we need a special case
    if (winningBets.length === 0) {
      console.log('No winning bets found. Marking all bets as lost.');
      // Process all bets as losing bets
      for (const bet of totalBets) {
        const { error: updateBetError } = await supabaseClient
          .from('stream_bets')
          .update({ status: 'lost' })
          .eq('id', bet.id);

        if (updateBetError) {
          console.error('Error updating bet status:', updateBetError);
          throw updateBetError;
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'No winning bets found. All bets marked as lost.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Process each winning bet
    for (const bet of winningBets) {
      // Calculate proportion of winning pool this bet represents
      const proportion = Number(bet.amount) / winningPool;
      // Calculate payout: original bet + proportion of losing pool
      const payout = Number(bet.amount) + proportion * losingPool;

      console.log(`Processing winning bet ${bet.id}, proportion: ${proportion}, payout: ${payout}`);

      // Update bet status
      const { error: updateBetError } = await supabaseClient
        .from('stream_bets')
        .update({ status: 'won' })
        .eq('id', bet.id);

      if (updateBetError) {
        console.error('Error updating bet status:', updateBetError);
        throw updateBetError;
      }

      // Add winning amount to user's wallet using RPC function
      const { data: newBalance, error: rpcError } = await supabaseClient.rpc('increment', {
        p_user_id: bet.user_id,
        p_amount: payout,
      });

      if (rpcError) {
        console.error('Error updating wallet:', rpcError);
        throw rpcError;
      }

      console.log(`Updated balance for user ${bet.user_id} to ${newBalance}`);

      // Record transaction - Using 'deposit' type which is definitely valid
      const { error: transactionError } = await supabaseClient.from('wallet_transactions').insert({
        user_id: bet.user_id,
        amount: payout,
        type: 'deposit', // Changed to a safe type that's definitely accepted
        description: `Won bet on stream ${streamId} (${winningOption})`,
      });

      if (transactionError) {
        console.error('Transaction error:', transactionError);
        throw transactionError;
      }
    }

    // Process losing bets - just update their status, money was already taken
    for (const bet of losingBets) {
      console.log(`Processing losing bet ${bet.id}, amount lost: ${bet.amount}`);

      // Update bet status
      const { error: updateBetError } = await supabaseClient
        .from('stream_bets')
        .update({ status: 'lost' })
        .eq('id', bet.id);

      if (updateBetError) {
        console.error('Error updating bet status:', updateBetError);
        throw updateBetError;
      }

      // No need to record a transaction for losses since the money was already deducted when placing the bet
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error processing payouts:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
