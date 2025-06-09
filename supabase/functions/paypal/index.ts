// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { getPayPalAccessToken, createPayPalOrder, capturePayPalPayment } from './paypal-api.ts';
import {
  createSupabaseClient,
  updateOrderStatus,
  createWalletTransaction,
  updateWalletBalance,
} from './db-operations.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async req => {
  console.log('PayPal function called with method:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('Request body:', requestBody);

    const { action } = requestBody;

    if (action === 'get_client_id') {
      console.log('Returning PayPal Client ID');
      return new Response(JSON.stringify({ clientId: Deno.env.get('PAYPAL_CLIENT_ID') }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('No authorization header found');
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = await createSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized', details: authError }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user has accepted ToS
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('tos_accepted')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw profileError;
    }

    if (!profile.tos_accepted) {
      return new Response(JSON.stringify({ error: 'Must accept Terms of Service' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Authenticated user:', user.id);

    const accessToken = await getPayPalAccessToken();
    console.log('Got PayPal access token');

    if (action === 'create_order') {
      const { amount } = requestBody;
      console.log('Creating PayPal order for amount:', amount);

      const order = await createPayPalOrder(amount, accessToken);

      if (order.id) {
        const { error: insertError } = await supabaseClient.from('paypal_orders').insert({
          user_id: user.id,
          order_id: order.id,
          amount: amount,
        });

        if (insertError) {
          console.error('Error inserting order:', insertError);
          throw insertError;
        }
      }

      return new Response(JSON.stringify(order), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'capture_order') {
      const { orderId } = requestBody;
      console.log('Capturing PayPal order:', orderId);

      const captureData = await capturePayPalPayment(orderId, accessToken);

      if (captureData.status === 'COMPLETED') {
        // Get order amount
        const { data: orderData, error: orderError } = await supabaseClient
          .from('paypal_orders')
          .select('amount')
          .eq('order_id', orderId)
          .single();

        if (orderError) {
          console.error('Error fetching order:', orderError);
          throw orderError;
        }

        // Update order status
        await updateOrderStatus(supabaseClient, orderId, 'completed');

        // Create wallet transaction
        await createWalletTransaction(supabaseClient, user.id, orderData.amount, orderId);

        // Update wallet balance using RPC function
        const { data: newBalance, error: rpcError } = await supabaseClient.rpc('increment', {
          p_user_id: user.id,
          p_amount: orderData.amount,
        });

        if (rpcError) {
          console.error('Error incrementing balance:', rpcError);
          throw rpcError;
        }

        console.log('New balance after increment:', newBalance);
      }

      return new Response(JSON.stringify(captureData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('PayPal function error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.stack,
      }),
      {
        status: error.message === 'Unauthorized' ? 401 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
