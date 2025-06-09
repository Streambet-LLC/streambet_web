import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function createSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

export async function updateOrderStatus(supabaseClient: any, orderId: string, status: string) {
  console.log('Updating order status:', orderId, status);
  const { error: updateOrderError } = await supabaseClient
    .from('paypal_orders')
    .update({ status })
    .eq('order_id', orderId);

  if (updateOrderError) {
    console.error('Error updating order:', updateOrderError);
    throw updateOrderError;
  }
}

export async function createWalletTransaction(
  supabaseClient: any,
  userId: string,
  amount: number,
  orderId: string
) {
  console.log('Creating wallet transaction for user:', userId, 'amount:', amount);
  const { error: transactionError } = await supabaseClient.from('wallet_transactions').insert({
    user_id: userId,
    amount: amount,
    type: 'deposit',
    description: `PayPal deposit (Order ID: ${orderId})`,
  });

  if (transactionError) {
    console.error('Error creating transaction:', transactionError);
    throw transactionError;
  }
}
