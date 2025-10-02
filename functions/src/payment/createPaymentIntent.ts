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
    color?: string; // Product color
    size?: string;  // Product size
    image?: string; // Product image URL
  }>;
  customerInfo: {
    email: string;
    name: string;
    firstName?: string; // For enhanced metadata
    lastName?: string;  // For enhanced metadata
    marketing?: boolean; // Marketing consent
    preferredLang?: string; // Language preference
  };
  shippingInfo: {
    country: string;
    cost: number;
    firstName?: string;   // Shipping address details
    lastName?: string;
    address?: string;
    apartment?: string;
    city?: string;
    postalCode?: string;
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
  // Enhanced totals for complete order reconstruction
  totals?: {
    subtotal: number;
    vat: number;
    shipping: number;
    discountAmount: number;
    total: number;
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
        apiVersion: '2023-10-16',
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
        affiliateInfo,
        totals
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

      // DEBUG: Log received data
      logger.info('🔍 DEBUG: createPaymentIntent received data', {
        customerInfo,
        shippingInfo,
        totals
      });

      // Create Payment Intent with simplified configuration for live mode
      let paymentIntent;
      try {
        paymentIntent = await stripe.paymentIntents.create({
          amount: amountInOre,
          currency: currency.toLowerCase(),
          automatic_payment_methods: {
            enabled: true,
          },
          metadata: {
            // ✅ ENHANCED METADATA FOR COMPLETE ORDER RECOVERY
            
            // Customer Information (enhanced)
            customerEmail: customerInfo.email,
            customerName: customerInfo.name || '',
            customerFirstName: customerInfo.firstName || shippingInfo.firstName || '',
            customerLastName: customerInfo.lastName || shippingInfo.lastName || '',
            customerMarketing: (customerInfo.marketing || false).toString(),
            customerLang: customerInfo.preferredLang || 'sv-SE',
            
            // Shipping Information (complete address)
            shippingFirstName: shippingInfo.firstName || '',
            shippingLastName: shippingInfo.lastName || '',
            shippingAddress: shippingInfo.address || '',
            shippingApartment: shippingInfo.apartment || '',
            shippingCity: shippingInfo.city || '',
            shippingPostalCode: shippingInfo.postalCode || '',
            shippingCountry: shippingInfo.country || 'SE',
            shippingCost: (shippingInfo.cost || 0).toString(),
            
            // Order Totals (complete breakdown)
            subtotal: (totals?.subtotal || 0).toString(),
            vat: (totals?.vat || 0).toString(),
            shipping: (totals?.shipping || shippingInfo.cost || 0).toString(),
            discountAmount: (totals?.discountAmount || discountInfo?.amount || 0).toString(),
            total: (totals?.total || amount).toString(),
            
            // Discount Information
            ...(discountInfo && {
              discountCode: discountInfo.code,
              discountPercentage: discountInfo.percentage?.toString() || '',
            }),
            
            // Affiliate Information (enhanced)
            ...(affiliateInfo && {
              affiliateCode: affiliateInfo.code,
              affiliateClickId: affiliateInfo.clickId,
            }),
            
            // Cart Items (detailed for recovery)
            itemCount: cartItems.length.toString(),
            totalItems: cartItems.reduce((sum, item) => sum + item.quantity, 0).toString(),
            
            // Store complete item details as JSON (within Stripe limits)
            itemDetails: JSON.stringify(cartItems.map(item => ({
              id: item.id,
              sku: item.sku,
              name: typeof item.name === 'string' ? item.name : item.name?.['sv-SE'] || item.name?.['en-US'] || 'B8Shield',
              price: item.price,
              quantity: item.quantity,
              color: item.color || '',
              size: item.size || '',
              image: item.image || ''
            }))),
            
            // Legacy compatibility (keep existing fields)
            itemIds: cartItems.map(item => item.id.substring(0, 8)).join(','),
            cartSummary: cartItems.map(item => `${item.quantity}x${item.sku}`).join(','),
            
            // System identifiers
            source: 'b2c_shop',
            platform: 'b8shield',
            version: 'enhanced_v1', // For tracking metadata versions
            debugTimestamp: Date.now().toString(), // TEMP: Track if this function is called
            debugTest: 'ENHANCED_METADATA_ACTIVE' // TEMP: Confirm enhanced function
          },
          receipt_email: customerInfo.email,
          description: `B8Shield Order - ${cartItems.length} item${cartItems.length > 1 ? 's' : ''}`,
        });
      } catch (stripeError: any) {
        logger.error('❌ Stripe Payment Intent creation failed', {
          error: stripeError.message,
          type: stripeError.type,
          code: stripeError.code,
          statusCode: stripeError.statusCode,
          requestParams: {
            amount: amountInOre,
            currency: currency.toLowerCase(),
            customerEmail: customerInfo.email
          }
        });
        
        response.status(400).json({ 
          error: 'Payment intent creation failed',
          details: stripeError.message,
          success: false
        });
        return;
      }

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