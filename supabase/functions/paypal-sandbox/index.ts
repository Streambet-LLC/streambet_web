// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAYPAL_SANDBOX_API_URL = 'https://api-m.sandbox.paypal.com';

async function getPayPalAccessToken() {
  const auth = btoa(
    `${Deno.env.get('PAYPAL_SANDBOX_CLIENT_ID')}:${Deno.env.get('PAYPAL_SANDBOX_SECRET_KEY')}`
  );

  try {
    console.log('Getting PayPal sandbox access token...');
    const response = await fetch(`${PAYPAL_SANDBOX_API_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('PayPal sandbox token error:', error);
      throw new Error('Failed to get PayPal sandbox access token');
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting PayPal sandbox access token:', error);
    throw error;
  }
}

async function createPayPalPayout(email: string, amount: number, accessToken: string) {
  try {
    console.log(`Creating PayPal sandbox payout for ${email} with amount ${amount}`);
    const payoutData = {
      sender_batch_header: {
        sender_batch_id: `Payout_${Date.now()}`,
        email_subject: 'You have a payout!',
        email_message: 'You have received a payout from your withdrawal request.',
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: {
            value: amount.toString(),
            currency: 'USD',
          },
          receiver: email,
          note: 'Thank you for using our platform!',
        },
      ],
    };

    console.log('PayPal sandbox payout request data:', JSON.stringify(payoutData));
    console.log('Using sandbox access token:', accessToken);

    const response = await fetch(`${PAYPAL_SANDBOX_API_URL}/v1/payments/payouts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payoutData),
    });

    const responseText = await response.text();
    console.log('PayPal sandbox payout response:', responseText);

    if (!response.ok) {
      throw new Error(
        `Failed to create PayPal sandbox payout: ${response.status} ${response.statusText} - ${responseText}`
      );
    }

    return JSON.parse(responseText);
  } catch (error) {
    console.error('Error creating PayPal sandbox payout:', error);
    throw error;
  }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing sandbox payout request...');
    const { amount, email } = await req.json();
    console.log(`Received sandbox request for amount: ${amount}, email: ${email}`);

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify PayPal sandbox credentials are set
    const clientId = Deno.env.get('PAYPAL_SANDBOX_CLIENT_ID');
    const secretKey = Deno.env.get('PAYPAL_SANDBOX_SECRET_KEY');

    if (!clientId || !secretKey) {
      console.error('PayPal sandbox credentials not configured');
      throw new Error('PayPal sandbox credentials not configured');
    }

    console.log('PayPal sandbox credentials found');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
      console.error('Authentication error:', authError);
      throw new Error('Unauthorized');
    }

    console.log('User authenticated:', user.id);

    const accessToken = await getPayPalAccessToken();
    console.log('Successfully obtained sandbox access token');

    const payoutResult = await createPayPalPayout(email, amount, accessToken);
    console.log('Sandbox payout successful:', payoutResult);

    return new Response(JSON.stringify(payoutResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('PayPal sandbox payout error:', error);
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
