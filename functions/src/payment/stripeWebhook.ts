/**
 * Stripe Webhook Handler for B2C Order Recovery
 * Handles payment_intent.succeeded events to create orders from Stripe metadata
 * This serves as a backup mechanism when client-side order creation fails
 */

import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import Stripe from 'stripe';
import { getFirestore } from 'firebase-admin/firestore';
// CORS not needed for webhooks - server-to-server communication

// Initialize Firestore with named database
const db = getFirestore('b8s-reseller-db');

interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: Stripe.PaymentIntent;
  };
}

export const stripeWebhookV2 = onRequest(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    invoker: 'public', // Allow Stripe to call this webhook
  },
  async (request, response) => {
    try {
      logger.info('🔍 Webhook received', { 
        method: request.method,
        headers: Object.keys(request.headers),
        hasSignature: !!request.headers['stripe-signature']
      });

      // Webhooks are server-to-server - no CORS needed
      // Authentication is handled via Stripe signature verification

      // Only allow POST requests
      if (request.method !== 'POST') {
        response.status(405).json({ error: 'Method not allowed' });
        return;
      }

      // Get Stripe webhook secret
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        logger.error('❌ STRIPE_WEBHOOK_SECRET not found in environment');
        response.status(500).json({ error: 'Webhook configuration error' });
        return;
      }

      // Initialize Stripe
      const stripeSecretKey = (process.env.STRIPE_SECRET_KEY || '').trim();
      if (!stripeSecretKey) {
        logger.error('❌ STRIPE_SECRET_KEY not found in environment');
        response.status(500).json({ error: 'Stripe configuration error' });
        return;
      }

      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2023-10-16',
      });

      // Verify webhook signature
      const sig = request.headers['stripe-signature'];
      if (!sig) {
        logger.error('❌ Missing Stripe signature');
        response.status(400).json({ error: 'Missing signature' });
        return;
      }

      let event: StripeWebhookEvent;
      try {
        event = stripe.webhooks.constructEvent(
          request.rawBody || request.body,
          sig,
          webhookSecret
        ) as StripeWebhookEvent;
      } catch (err: any) {
        logger.error('❌ Webhook signature verification failed', { error: err.message });
        response.status(400).json({ error: `Webhook Error: ${err.message}` });
        return;
      }

      logger.info('🔔 Stripe webhook received', { 
        type: event.type, 
        id: event.id,
        paymentIntentId: event.data.object.id 
      });

      // Handle payment_intent.succeeded events
      if (event.type === 'payment_intent.succeeded') {
        let paymentIntent = event.data.object;

        // Check if this is a B2C order (has our enhanced metadata)
        if (!paymentIntent.metadata?.source || paymentIntent.metadata.source !== 'b2c_shop') {
          logger.info('⏭️ Skipping non-B2C payment intent', { paymentIntentId: paymentIntent.id });
          response.status(200).json({ received: true, skipped: 'not_b2c' });
          return;
        }

        // Idempotency: the order doc ID IS the payment intent ID, created
        // atomically with create() below. A second delivery (Stripe retry or
        // a concurrent execution) fails with ALREADY_EXISTS instead of racing
        // the old query-then-add pattern.
        const orderRef = db.collection('orders').doc(paymentIntent.id);

        // Expand payment_method so card/Klarna details are actually present
        // (the event payload only carries the payment_method ID as a string)
        try {
          paymentIntent = await stripe.paymentIntents.retrieve(paymentIntent.id, {
            expand: ['payment_method']
          }) as any;
        } catch (expandError) {
          logger.warn('⚠️ Could not expand payment_method, continuing without details', {
            paymentIntentId: paymentIntent.id
          });
        }

        // Extract order data from enhanced metadata
        const metadata = paymentIntent.metadata;

        // Log metadata sizes to detect Stripe truncation issues
        logger.info('📊 Webhook: Metadata size check', {
          paymentIntentId: paymentIntent.id,
          itemDetailsLength: metadata.itemDetails?.length || 0,
          totalMetadataKeys: Object.keys(metadata).length,
          largeFields: Object.entries(metadata)
            .filter(([_, value]) => value && value.length > 400)
            .map(([key, value]) => ({ key, length: value?.length || 0 })),
          possibleTruncation: metadata.itemDetails && metadata.itemDetails.length >= 490
        });

        // Validate required metadata
        if (!metadata.customerEmail || !metadata.itemDetails) {
          logger.error('❌ Missing required metadata for order creation', {
            paymentIntentId: paymentIntent.id,
            hasEmail: !!metadata.customerEmail,
            hasItems: !!metadata.itemDetails,
            allMetadataKeys: Object.keys(metadata)
          });
          response.status(400).json({ error: 'Insufficient metadata' });
          return;
        }

        // Parse item details from JSON
        let cartItems;
        try {
          cartItems = JSON.parse(metadata.itemDetails);
        } catch (err) {
          logger.error('❌ Failed to parse itemDetails JSON', { 
            paymentIntentId: paymentIntent.id,
            itemDetails: metadata.itemDetails 
          });
          response.status(400).json({ error: 'Invalid itemDetails format' });
          return;
        }

        // Generate order number
        const orderNumber = `B8S-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

        // Create order data from Stripe metadata
        // Structure MUST match frontend order creation in Checkout.jsx for consistency
        const orderData = {
          orderNumber,
          status: 'confirmed',
          source: 'b2c', // ✅ Match frontend (not 'b2c_webhook')
          
          // Customer information from metadata
          customerInfo: {
            email: metadata.customerEmail,
            // ✅ Construct name from first+last to match frontend
            name: `${metadata.shippingFirstName || metadata.customerFirstName || ''} ${metadata.shippingLastName || metadata.customerLastName || ''}`.trim(),
            firstName: metadata.shippingFirstName || metadata.customerFirstName || '',
            lastName: metadata.shippingLastName || metadata.customerLastName || '',
            marketingOptIn: metadata.customerMarketing === 'true',
            preferredLang: metadata.customerLang || 'sv-SE'
          },

          // Shipping information from metadata
          shippingInfo: {
            address: metadata.shippingAddress || '',
            apartment: metadata.shippingApartment || '',
            city: metadata.shippingCity || '',
            postalCode: metadata.shippingPostalCode || '',
            country: metadata.shippingCountry || 'SE'
          },

          // Order items from parsed JSON
          items: cartItems,

          // Financial data from metadata (flat structure to match frontend)
          subtotal: parseFloat(metadata.subtotal || '0'),
          shipping: parseFloat(metadata.shipping || '0'),
          vat: parseFloat(metadata.vat || '0'),
          discountAmount: parseFloat(metadata.discountAmount || '0'),
          total: parseFloat(metadata.total || '0'),

          // Payment information
          payment: {
            method: 'stripe',
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount / 100, // Convert from öre to SEK
            currency: paymentIntent.currency,
            status: paymentIntent.status,
            // ✅ Conditionally add paymentMethodType to match frontend
            ...(paymentIntent.payment_method && typeof paymentIntent.payment_method === 'object' && {
              paymentMethodType: (paymentIntent.payment_method as any).type
            }),
            // ✅ Add payment method details if available (card/klarna)
            ...(paymentIntent.payment_method && typeof paymentIntent.payment_method === 'object' && (paymentIntent.payment_method as any).card && {
              paymentMethodDetails: {
                brand: (paymentIntent.payment_method as any).card.brand,
                last4: (paymentIntent.payment_method as any).card.last4,
                ...((paymentIntent.payment_method as any).card.wallet?.type && {
                  wallet: (paymentIntent.payment_method as any).card.wallet.type
                })
              }
            }),
            ...(paymentIntent.payment_method && typeof paymentIntent.payment_method === 'object' && (paymentIntent.payment_method as any).klarna && {
              paymentMethodDetails: { type: 'klarna' }
            })
          },

          // ✅ Affiliate information - structure matches frontend (null when absent, no discountAmount field)
          affiliate: metadata.affiliateCode ? {
            code: metadata.affiliateCode,
            discountPercentage: parseFloat(metadata.discountPercentage || '0'),
            clickId: metadata.affiliateClickId || ''
          } : null,

          // ✅ B2C customer account linkage (from metadata, set at payment time)
          ...(metadata.b2cCustomerId && {
            b2cCustomerId: metadata.b2cCustomerId,
            b2cCustomerAuthId: metadata.b2cCustomerAuthId || '',
            hasAccount: true
          }),

          // ✅ Timestamps using FieldValue for consistency with frontend
          createdAt: new Date(),
          updatedAt: new Date(),

          // ✅ Webhook tracking flags
          webhookProcessed: true,
          webhookEventId: event.id
        };

        // Create order in Firestore with the deterministic ID; a duplicate
        // delivery fails here atomically and is treated as success
        try {
          await orderRef.create(orderData);
        } catch (createError: any) {
          if (createError.code === 6 /* ALREADY_EXISTS */) {
            logger.info('✅ Order already exists for payment intent', {
              paymentIntentId: paymentIntent.id
            });
            response.status(200).json({ received: true, existing: true });
            return;
          }
          throw createError;
        }

        logger.info('✅ Order created from Stripe webhook', {
          paymentIntentId: paymentIntent.id,
          orderId: orderRef.id,
          orderNumber,
          customerEmail: metadata.customerEmail,
          total: metadata.total,
          hasAffiliate: !!metadata.affiliateCode
        });

        // ⚠️ CRITICAL: Do NOT process affiliate commission here!
        // The processB2COrderCompletionHttp function handles ALL affiliate processing
        // to avoid duplicate commission credits. The order data contains the affiliate
        // structure, so the processing function will handle it correctly.

        // Trigger emails, customer stats and affiliate commission via the
        // shared core function (direct call — no mock req/res)
        try {
          const { processOrderCompletion } = require('../order-processing/functions');
          const result = await processOrderCompletion(orderRef.id);
          logger.info('✅ Webhook: Order processing completed', {
            orderId: orderRef.id,
            statusCode: result.statusCode,
            result: result.body
          });
        } catch (emailError) {
          logger.error('❌ Webhook: Failed to trigger order processing', {
            error: emailError,
            orderId: orderRef.id,
            orderNumber
          });
          // Don't fail the webhook - order is already created
          // Admin can manually trigger emails if needed
        }

        response.status(200).json({ 
          received: true, 
          orderCreated: true,
          orderId: orderRef.id,
          orderNumber,
          emailsTriggered: true
        });

      } else {
        // Handle other webhook events if needed
        logger.info('⏭️ Unhandled webhook event type', { type: event.type });
        response.status(200).json({ received: true, handled: false });
      }

    } catch (error) {
      logger.error('❌ Webhook processing error', error);
      response.status(500).json({ error: 'Webhook processing failed' });
    }
  }
);
