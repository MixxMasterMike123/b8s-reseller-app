/**
 * Firebase Function: Create Stripe Payment Intent
 * Handles server-side payment intent creation for B2C checkout
 */

import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import Stripe from 'stripe';
import { corsHandler } from '../protection/cors/cors-handler';

interface CreatePaymentIntentRequest {
  amount: number; // Amount in öre (Swedish cents)
  currency: string; // Should be 'sek'
  cartItems: Array<{
    id: string;
    name: string | { 'sv-SE'?: string; 'en-GB'?: string; 'en-US'?: string; [key: string]: string | undefined };
    price: number;
    quantity: number;
    sku: string;
    image?: string; // Optional since we don't store in Stripe metadata
  }>;
  customerInfo: {
    email: string;
    name: string;
  };
  shippingInfo: {
    country: string;
    cost: number;
  };
  discountInfo?: {
    code: string;
    amount: number;
    percentage: number;
  };
  affiliateInfo?: {
    code: string;
    clickId: string;
  };
}

export const createPaymentIntentV2 = onRequest(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    secrets: ['STRIPE_SECRET_KEY'],
  },
  async (request, response) => {
    try {
      // Handle CORS
      if (!corsHandler(request, response)) {
        return;
      }

      // Handle preflight OPTIONS request
      if (request.method === 'OPTIONS') {
        response.status(200).send('OK');
        return;
      }

      // Only allow POST requests
      if (request.method !== 'POST') {
        response.status(405).json({ error: 'Method not allowed' });
        return;
      }

      // Initialize Stripe with secret key from environment variable
      const stripeSecretKey = (process.env.STRIPE_SECRET_KEY || '').trim();
      
      if (!stripeSecretKey) {
        logger.error('❌ STRIPE_SECRET_KEY not found in environment');
        response.status(500).json({ error: 'Payment service configuration error' });
        return;
      }

      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-07-30.basil',
      });

      logger.info('💳 Creating Stripe Payment Intent', { 
        data: { ...request.body, customerInfo: { email: request.body.customerInfo?.email } }
      });

      // Validate request
      if (!request.body) {
        response.status(400).json({ error: 'Request body is required' });
        return;
      }

      const {
        amount,
        currency = 'sek',
        cartItems,
        customerInfo,
        shippingInfo,
        discountInfo,
        affiliateInfo
      }: CreatePaymentIntentRequest = request.body;

      // Validate required fields
      if (!amount || amount <= 0) {
        response.status(400).json({ error: 'Valid amount is required' });
        return;
      }

      if (!cartItems || cartItems.length === 0) {
        response.status(400).json({ error: 'Cart items are required' });
        return;
      }

      if (!customerInfo?.email) {
        response.status(400).json({ error: 'Customer email is required' });
        return;
      }

      // Convert amount to öre (Swedish cents) if not already
      const amountInOre = Math.round(amount * 100);

      logger.info('💰 Payment details', {
        amountInSEK: amount,
        amountInOre,
        currency,
        itemCount: cartItems.length,
        customerEmail: customerInfo.email
      });

      // Create Payment Intent with automatic payment methods
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInOre,
        currency: currency.toLowerCase(),
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          // Store order information in metadata
          customerEmail: customerInfo.email,
          customerName: customerInfo.name || '',
          itemCount: cartItems.length.toString(),
          shippingCountry: shippingInfo.country || 'SE',
          shippingCost: (shippingInfo.cost || 0).toString(),
          ...(discountInfo && {
            discountCode: discountInfo.code,
            discountAmount: discountInfo.amount.toString(),
            discountPercentage: discountInfo.percentage.toString(),
          }),
          ...(affiliateInfo && {
            affiliateCode: affiliateInfo.code,
            affiliateClickId: affiliateInfo.clickId,
          }),
          // Store simplified cart items for metadata (Stripe 500-char limit)
          cartItems: JSON.stringify(cartItems.map(item => ({
            id: item.id,
            name: typeof item.name === 'string' ? item.name : item.name['sv-SE'] || item.name['en-GB'] || item.name['en-US'] || 'B8Shield',
            price: item.price,
            quantity: item.quantity,
            sku: item.sku
            // Note: image URLs can be very long, so we don't store them in Stripe metadata
            // Full cart items with images are stored in our database during order creation
          }))),
          source: 'b2c_shop',
          platform: 'b8shield'
        },
        receipt_email: customerInfo.email,
        description: `B8Shield Order - ${cartItems.length} item${cartItems.length > 1 ? 's' : ''}`,
      });

      logger.info('✅ Payment Intent created successfully', {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status
      });

      response.status(200).json({
        success: true,
        paymentIntent: {
          id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status
        }
      });

    } catch (error) {
      logger.error('❌ Error creating Payment Intent', error);
      
      // Handle Stripe errors
      if (error instanceof Stripe.errors.StripeError) {
        response.status(400).json({ error: `Stripe error: ${error.message}` });
        return;
      }

      response.status(500).json({ error: 'Failed to create payment intent' });
    }
  }
);