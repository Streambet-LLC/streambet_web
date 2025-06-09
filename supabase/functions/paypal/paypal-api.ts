const PAYPAL_API_URL = 'https://api-m.paypal.com';

export async function getPayPalAccessToken() {
  console.log('Getting PayPal access token');
  const auth = btoa(`${Deno.env.get('PAYPAL_CLIENT_ID')}:${Deno.env.get('PAYPAL_SECRET_KEY')}`);

  try {
    const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('PayPal token error:', error);
      throw new Error('Failed to get PayPal access token');
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting PayPal access token:', error);
    throw error;
  }
}

export async function createPayPalOrder(amount: number, accessToken: string) {
  console.log('Creating PayPal order for amount:', amount);
  try {
    const response = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: amount.toString(),
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('PayPal create order error:', error);
      throw new Error('Failed to create PayPal order');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating PayPal order:', error);
    throw error;
  }
}

export async function capturePayPalPayment(orderId: string, accessToken: string) {
  console.log('Capturing PayPal payment for order:', orderId);
  try {
    const response = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('PayPal capture error:', error);
      throw new Error('Failed to capture PayPal payment');
    }

    return await response.json();
  } catch (error) {
    console.error('Error capturing PayPal payment:', error);
    throw error;
  }
}
