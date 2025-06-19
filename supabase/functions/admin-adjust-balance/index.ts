// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, amount, description } = await req.json();
    console.log(`Adjusting balance for user ${userId} by ${amount}`);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify that the requesting user is an admin
    const {
      data: { user },
    } = await supabaseClient.auth.getUser(req.headers.get('Authorization')?.split(' ')[1] ?? '');
    if (!user) throw new Error('Not authenticated');

    const { data: adminProfile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminProfile?.role !== 'admin') {
      throw new Error('Not authorized');
    }

    // Create transaction record for the target user (not the admin)
    const { error: transactionError } = await supabaseClient.from('wallet_transactions').insert({
      user_id: userId, // Use the target user's ID
      amount: amount,
      type: amount >= 0 ? 'deposit' : 'withdrawal',
      description: description || 'Admin balance adjustment',
    });

    if (transactionError) {
      console.error('Transaction error:', transactionError);
      throw transactionError;
    }

    // Update wallet balance for the target user
    const { data: newBalance, error: balanceError } = await supabaseClient.rpc('increment', {
      p_user_id: userId, // Use the target user's ID
      p_amount: amount,
    });

    if (balanceError) {
      console.error('Balance error:', balanceError);
      throw balanceError;
    }

    return new Response(JSON.stringify({ success: true, newBalance }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error adjusting balance:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
