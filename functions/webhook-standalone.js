const { initializeApp } = require('firebase-admin/app');
const { onRequest } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const Stripe = require('stripe');
const { getFirestore } = require('firebase-admin/firestore');

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
      logger.error('❌ STRIPE_WEBHOOK_SECRET not found');
      response.status(500).json({ error: 'Webhook configuration error' });
      return;
    }

    // Initialize Stripe
    const stripeSecretKey = (process.env.STRIPE_SECRET_KEY || '').trim();
    if (!stripeSecretKey) {
      logger.error('❌ STRIPE_SECRET_KEY not found');
      response.status(500).json({ error: 'Stripe configuration error' });
      return;
    }
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

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

    // Handle payment_intent.succeeded event
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      logger.info('✅ Payment succeeded', { paymentIntentId: paymentIntent.id });

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

      logger.info('🔄 Would create order from webhook for payment intent', { 
        paymentIntentId: paymentIntent.id 
      });
      // TODO: Add full order creation logic here
    }

    logger.info('✅ Webhook processed successfully');
    response.status(200).json({ received: true });

  } catch (error) {
    logger.error('❌ Webhook error:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
});
