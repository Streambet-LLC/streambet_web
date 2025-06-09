import { loadStripe, Stripe } from '@stripe/stripe-js';
import { api } from '../api/client';

// Get the Stripe publishable key from environment variables
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_example_key';

// Load the Stripe instance
let stripePromise: Promise<Stripe | null>;

// Initialize Stripe
export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

// Create a checkout session for purchasing coins
export async function createCoinPurchaseSession(coinAmount: number, priceId: string) {
  try {
    // Call the backend to create a Stripe checkout session
    const response = await api.wallet.createCheckoutSession({
      priceId,
      coinAmount,
      successUrl: `${window.location.origin}/deposit-success`,
      cancelUrl: `${window.location.origin}/deposit`,
    });

    const stripe = await getStripe();
    if (!stripe) {
      throw new Error('Failed to load Stripe');
    }

    // Redirect to Stripe checkout
    const { error } = await stripe.redirectToCheckout({
      sessionId: response.sessionId,
    });

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return { success: false, error };
  }
}

// Create a customer portal session for managing billing
export async function createCustomerPortalSession() {
  try {
    const response = await api.wallet.createCustomerPortalSession({
      returnUrl: `${window.location.origin}/settings`,
    });

    window.location.href = response.url;
    return { success: true };
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    return { success: false, error };
  }
}

// Setup a payment method for future use (e.g., auto-reload)
export async function setupPaymentMethod() {
  try {
    const response = await api.wallet.createSetupIntent();

    const stripe = await getStripe();
    if (!stripe) {
      throw new Error('Failed to load Stripe');
    }

    // Open the Stripe Elements modal for payment setup
    const { error, setupIntent } = await stripe.confirmCardSetup(response.clientSecret, {
      payment_method: {
        card: {
          token: 'tok_visa', // This is just for testing
        },
      },
    });

    if (error) {
      throw error;
    }

    // Save the payment method to the backend
    await api.wallet.savePaymentMethod({
      setupIntentId: setupIntent.id,
      paymentMethodId: setupIntent.payment_method,
    });

    return { success: true };
  } catch (error) {
    console.error('Error setting up payment method:', error);
    return { success: false, error };
  }
}
