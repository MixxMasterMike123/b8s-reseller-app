/**
 * Simple Stripe Webhook Handler - No CORS, No Dependencies
 */

import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';

export const stripeWebhookSimple = onRequest(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    invoker: 'public', // Allow Stripe to call this webhook
  },
  async (request, response) => {
    try {
      logger.info('🔍 Simple webhook received', { 
        method: request.method,
        hasSignature: !!request.headers['stripe-signature'],
        contentType: request.headers['content-type']
      });

      // Only allow POST requests
      if (request.method !== 'POST') {
        logger.info('❌ Method not allowed:', request.method);
        response.status(405).json({ error: 'Method not allowed' });
        return;
      }

      // Check for Stripe signature
      const sig = request.headers['stripe-signature'];
      if (!sig) {
        logger.info('❌ Missing Stripe signature');
        response.status(400).json({ error: 'Missing signature' });
        return;
      }

      logger.info('✅ Webhook received successfully');
      response.status(200).json({ received: true, message: 'Webhook processed' });

    } catch (error: any) {
      logger.error('❌ Webhook error:', error);
      response.status(500).json({ error: 'Internal server error' });
    }
  }
);
