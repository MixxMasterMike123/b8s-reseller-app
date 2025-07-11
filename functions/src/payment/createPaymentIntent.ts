/**
 * Firebase Function for creating Stripe Payment Intents
 * Handles multi-currency payments with affiliate tracking
 */

import { https } from 'firebase-functions/v2';
import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { corsHandler } from '../protection/cors/cors-handler';
import { rateLimiter } from '../protection/rate-limiting/rate-limiter';
import { APP_URLS } from '../config/app-urls';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

interface PaymentIntentRequest {
  amount: number;
  currency: string;
  affiliateCode?: string;
  shippingAddress: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  contactInfo: {
    email: string;
  };
}

interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

/**
 * Creates a Stripe Payment Intent for B8Shield orders
 * Supports multi-currency and affiliate tracking
 */
export const createPaymentIntent = onRequest({
  region: 'us-central1',
  memory: '256MiB',
  timeoutSeconds: 30,
  cors: true,
}, async (req, res) => {
  try {
    // Apply CORS
    await corsHandler(req, res);
    
    // Apply rate limiting
    await rateLimiter(req, res, 'payment-intent', {
      maxRequests: 5,
      windowMs: 60 * 1000, // 1 minute
    });

    // Only allow POST requests
    if (req.method !== 'POST') {
      logger.warn('Invalid method for payment intent creation', { method: req.method });
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const {
      amount,
      currency,
      affiliateCode,
      shippingAddress,
      contactInfo
    } = req.body as PaymentIntentRequest;

    // Validate required fields
    if (!amount || !currency || !shippingAddress || !contactInfo) {
      logger.error('Missing required fields for payment intent');
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Validate amount (must be positive and reasonable)
    if (amount <= 0 || amount > 100000) { // Max 1000 SEK/USD/GBP
      logger.error('Invalid amount for payment intent', { amount });
      res.status(400).json({ error: 'Invalid amount' });
      return;
    }

    // Validate currency
    const allowedCurrencies = ['sek', 'usd', 'gbp'];
    if (!allowedCurrencies.includes(currency.toLowerCase())) {
      logger.error('Invalid currency for payment intent', { currency });
      res.status(400).json({ error: 'Invalid currency' });
      return;
    }

    // Prepare metadata
    const metadata: { [key: string]: string } = {
      source: 'b8shield-b2c',
      customer_email: contactInfo.email,
      customer_name: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
      shipping_country: shippingAddress.country,
    };

    // Add affiliate tracking if present
    if (affiliateCode) {
      metadata.affiliate_code = affiliateCode;
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Ensure it's an integer
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata,
      shipping: {
        name: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
        address: {
          line1: shippingAddress.address,
          city: shippingAddress.city,
          postal_code: shippingAddress.postalCode,
          country: shippingAddress.country,
        },
      },
      receipt_email: contactInfo.email,
      description: 'B8Shield Order - Fishing Lure Protection',
    });

    logger.info('Payment intent created successfully', {
      paymentIntentId: paymentIntent.id,
      amount,
      currency,
      affiliateCode,
      customerEmail: contactInfo.email,
    });

    const response: PaymentIntentResponse = {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Error creating payment intent', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      res.status(400).json({ 
        error: 'Payment processing error', 
        details: error.message 
      });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * Webhook handler for Stripe events
 * Processes payment confirmations and updates orders
 */
export const handleStripeWebhook = onRequest({
  region: 'us-central1',
  memory: '256MiB',
  timeoutSeconds: 30,
}, async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      logger.error('Webhook signature verification failed', err);
      res.status(400).send('Webhook signature verification failed');
      return;
    }

    // Handle payment intent events
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        logger.info('Unhandled event type', { type: event.type });
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Error processing webhook', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Handles successful payment processing
 */
async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  try {
    logger.info('Payment succeeded', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      customerEmail: paymentIntent.metadata.customer_email,
    });

    // Update order status in Firebase
    // Call order completion function
    const orderCompletionUrl = `${APP_URLS.FUNCTIONS_BASE_URL}/processB2COrderCompletionHttpV2`;
    
    await fetch(orderCompletionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentIntentId: paymentIntent.id,
        status: 'paid',
        paymentMethod: 'stripe',
      }),
    });

    // Process affiliate commission if applicable
    if (paymentIntent.metadata.affiliate_code) {
      await processAffiliateCommission(
        paymentIntent.metadata.affiliate_code,
        paymentIntent.amount,
        paymentIntent.currency,
        paymentIntent.id
      );
    }

    logger.info('Payment success processing completed', {
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    logger.error('Error processing payment success', error);
  }
}

/**
 * Handles failed payment processing
 */
async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  try {
    logger.warn('Payment failed', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      lastPaymentError: paymentIntent.last_payment_error,
    });

    // Update order status to failed
    // You might want to send notification emails here
    
  } catch (error) {
    logger.error('Error processing payment failure', error);
  }
}

/**
 * Processes affiliate commission for successful payments
 */
async function processAffiliateCommission(
  affiliateCode: string,
  amount: number,
  currency: string,
  paymentIntentId: string
) {
  try {
    // Convert amount back to SEK for commission calculation
    const sekAmount = await convertToSEK(amount, currency);
    
    // Call affiliate commission function
    const affiliateCommissionUrl = `${APP_URLS.FUNCTIONS_BASE_URL}/processAffiliateConversionV2`;
    
    await fetch(affiliateCommissionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        affiliateCode,
        orderAmount: sekAmount,
        paymentIntentId,
        currency,
      }),
    });

    logger.info('Affiliate commission processed', {
      affiliateCode,
      amount: sekAmount,
      paymentIntentId,
    });
  } catch (error) {
    logger.error('Error processing affiliate commission', error);
  }
}

/**
 * Converts amount to SEK for commission calculation
 */
async function convertToSEK(amount: number, currency: string): Promise<number> {
  // Simple conversion - in production you'd use real-time rates
  const rates: { [key: string]: number } = {
    sek: 1,
    usd: 10.5, // 1 USD = 10.5 SEK (approximate)
    gbp: 12.8, // 1 GBP = 12.8 SEK (approximate)
  };

  const rate = rates[currency.toLowerCase()] || 1;
  return Math.round((amount / 100) * rate); // Convert from cents/pence to SEK
} 