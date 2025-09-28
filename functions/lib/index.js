/**
 * Complete Stripe Webhook Implementation - JavaScript Version
 * Handles payment_intent.succeeded events to create orders from Stripe metadata
 */

const { onRequest } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const Stripe = require('stripe');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fetch = require('node-fetch');

// Initialize Firebase Admin SDK
initializeApp();

// Initialize Firestore with named database
const db = getFirestore('b8s-reseller-db');

exports.stripeWebhookV2 = onRequest({
  region: 'us-central1',
  memory: '256MiB',
  timeoutSeconds: 60,
  secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
  invoker: 'public', // Allow Stripe to call this webhook
}, async (request, response) => {
  try {
    logger.info('🔍 Webhook received', { 
      method: request.method,
      headers: Object.keys(request.headers),
      hasSignature: !!request.headers['stripe-signature']
    });

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

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        request.rawBody || request.body,
        sig,
        webhookSecret
      );
    } catch (err) {
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
      const paymentIntent = event.data.object;
      
      // Check if this is a B2C order (has our enhanced metadata)
      if (!paymentIntent.metadata?.source || paymentIntent.metadata.source !== 'b2c_shop') {
        logger.info('⏭️ Skipping non-B2C payment intent', { paymentIntentId: paymentIntent.id });
        response.status(200).json({ received: true, skipped: 'not_b2c' });
        return;
      }

      // Check if order already exists (idempotency)
      const existingOrders = await db.collection('orders')
        .where('payment.paymentIntentId', '==', paymentIntent.id)
        .get();
      
      if (!existingOrders.empty) {
        logger.info('✅ Order already exists for payment intent', { 
          paymentIntentId: paymentIntent.id,
          orderId: existingOrders.docs[0].id 
        });
        response.status(200).json({ received: true, existing: true });
        return;
      }

      // Extract order data from enhanced metadata
      const metadata = paymentIntent.metadata;
      
      // Validate required metadata
      if (!metadata.customerEmail || !metadata.itemDetails) {
        logger.error('❌ Missing required metadata for order creation', { 
          paymentIntentId: paymentIntent.id,
          hasEmail: !!metadata.customerEmail,
          hasItems: !!metadata.itemDetails
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

      // Create order data matching the exact structure from normal checkout
      const orderData = {
        orderNumber,
        status: 'confirmed',
        source: 'b2c_webhook', // Mark as webhook-created for tracking
        
        // Customer information (matching checkout structure)
        customerInfo: {
          email: metadata.customerEmail,
          firstName: metadata.customerFirstName || metadata.shippingFirstName || '',
          lastName: metadata.customerLastName || metadata.shippingLastName || '',
          marketingOptIn: metadata.customerMarketing === 'true',
          preferredLang: metadata.customerLang || 'sv-SE'
        },

        // Shipping information (matching checkout structure)
        shippingInfo: {
          firstName: metadata.shippingFirstName || metadata.customerFirstName || '',
          lastName: metadata.shippingLastName || metadata.customerLastName || '',
          address: metadata.shippingAddress || '',
          apartment: metadata.shippingApartment || '',
          city: metadata.shippingCity || '',
          postalCode: metadata.shippingPostalCode || '',
          country: metadata.shippingCountry || 'SE'
        },

        // Order items (matching checkout structure)
        items: cartItems.map(item => ({
          productId: item.id,
          sku: item.sku,
          name: item.name,
          price: parseFloat(item.price || '0'),
          quantity: parseInt(item.quantity || '1', 10),
          color: item.color || '',
          size: item.size || '',
          image: item.image || '',
          total: parseFloat(item.price || '0') * parseInt(item.quantity || '1', 10)
        })),

        // Financial totals (matching checkout structure)
        subtotal: parseFloat(metadata.subtotal || '0'),
        vat: parseFloat(metadata.vat || '0'),
        shipping: parseFloat(metadata.shipping || metadata.shippingCost || '0'),
        discountAmount: parseFloat(metadata.discountAmount || '0'),
        total: parseFloat(metadata.total || '0'),

        // Affiliate information (matching checkout structure)
        ...(metadata.affiliateCode && {
          affiliate: {
            code: metadata.affiliateCode,
            discountPercentage: parseFloat(metadata.discountPercentage || '0'),
            clickId: metadata.affiliateClickId || null
          },
          affiliateCode: metadata.affiliateCode, // Also add at root level for compatibility
          affiliateClickId: metadata.affiliateClickId || null
        }),

        // Discount code (matching checkout structure)
        ...(metadata.discountCode && {
          discountCode: metadata.discountCode
        }),

        // Payment information (matching checkout structure)
        payment: {
          method: 'stripe',
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount / 100, // Convert from cents
          currency: paymentIntent.currency.toUpperCase(),
          status: paymentIntent.status,
          // Enhanced payment method details (matching checkout)
          ...(paymentIntent.payment_method?.type && {
            paymentMethodType: paymentIntent.payment_method.type
          }),
          ...(paymentIntent.payment_method?.card && {
            paymentMethodDetails: {
              brand: paymentIntent.payment_method.card.brand,
              last4: paymentIntent.payment_method.card.last4,
              ...(paymentIntent.payment_method.card.wallet?.type && {
                wallet: paymentIntent.payment_method.card.wallet.type
              })
            }
          }),
          ...(paymentIntent.payment_method?.klarna && {
            paymentMethodDetails: { type: 'klarna' }
          })
        },

        // Timestamps (using Firestore serverTimestamp would be better, but this works)
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Create order in Firestore
      logger.info('📦 Creating order from webhook', { 
        paymentIntentId: paymentIntent.id,
        orderNumber,
        customerEmail: metadata.customerEmail,
        itemCount: cartItems.length
      });

      const orderRef = await db.collection('orders').add(orderData);

      logger.info('✅ Order created successfully from webhook', { 
        paymentIntentId: paymentIntent.id,
        orderId: orderRef.id,
        orderNumber
      });

      // Call post-order processing function (same as normal checkout)
      try {
        logger.info('📧 Calling post-order processing function for webhook order...');
        const timestamp = Date.now();
        const functionUrl = `https://us-central1-b8shield-reseller-app.cloudfunctions.net/processB2COrderCompletionHttpV2?_=${timestamp}`;
        
        const fetchResponse = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
          body: JSON.stringify({ orderId: orderRef.id }),
        });

        if (!fetchResponse.ok) {
          logger.error('❌ Failed to call post-order processing function for webhook order', { 
            status: fetchResponse.status,
            statusText: fetchResponse.statusText,
            orderId: orderRef.id
          });
        } else {
          const result = await fetchResponse.json();
          logger.info('✅ Post-order processing completed successfully for webhook order', { 
            orderId: orderRef.id,
            result
          });
        }
      } catch (error) {
        logger.error('❌ Error calling post-order processing function for webhook order', { 
          error: error.message,
          orderId: orderRef.id
        });
        // Don't fail the webhook - order was created successfully
      }

      response.status(200).json({ 
        received: true, 
        created: true,
        orderId: orderRef.id,
        orderNumber
      });
      return;
    }

    // For other event types, just acknowledge receipt
    logger.info('✅ Webhook processed successfully (non-payment event)', { 
      type: event.type,
      id: event.id 
    });
    response.status(200).json({ received: true });

  } catch (error) {
    logger.error('❌ Webhook error:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
});