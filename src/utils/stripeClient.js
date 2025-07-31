/**
 * Stripe Client Configuration for B8Shield B2C Shop
 * Handles Stripe initialization and payment processing
 */

import { loadStripe } from '@stripe/stripe-js';

// Get Stripe publishable key from environment
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.error('❌ VITE_STRIPE_PUBLISHABLE_KEY is not defined in environment');
}

// Initialize Stripe
let stripePromise;

export const getStripe = () => {
  if (!stripePromise) {
    console.log('🔄 Initializing Stripe with key:', stripePublishableKey?.substring(0, 20) + '...');
    stripePromise = loadStripe(stripePublishableKey);
  }
  return stripePromise;
};

// Stripe configuration
export const STRIPE_CONFIG = {
  currency: 'sek',
  country: 'SE',
  locale: 'sv',
  appearance: {
    theme: 'stripe',
    variables: {
      colorPrimary: '#459CA8', // B8Shield brand blue
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#ef4444',
      fontFamily: 'Inter, system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px'
    }
  }
};

// Test card numbers for development
export const TEST_CARDS = {
  VISA_SUCCESS: '4242424242424242',
  VISA_DECLINED: '4000000000000002',
  MASTERCARD_SUCCESS: '5555555555554444',
  AMEX_SUCCESS: '378282246310005',
  SWEDISH_VISA: '4000007520000007', // Swedish Visa card
  REQUIRE_3DS: '4000002500003155' // Requires 3D Secure authentication
};

console.log('✅ Stripe client configuration loaded');