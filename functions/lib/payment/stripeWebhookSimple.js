"use strict";
/**
 * Simple Stripe Webhook Handler - No CORS, No Dependencies
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhookSimple = void 0;
const https_1 = require("firebase-functions/v2/https");
const firebase_functions_1 = require("firebase-functions");
exports.stripeWebhookSimple = (0, https_1.onRequest)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    invoker: 'public', // Allow Stripe to call this webhook
}, async (request, response) => {
    try {
        firebase_functions_1.logger.info('🔍 Simple webhook received', {
            method: request.method,
            hasSignature: !!request.headers['stripe-signature'],
            contentType: request.headers['content-type']
        });
        // Only allow POST requests
        if (request.method !== 'POST') {
            firebase_functions_1.logger.info('❌ Method not allowed:', request.method);
            response.status(405).json({ error: 'Method not allowed' });
            return;
        }
        // Check for Stripe signature
        const sig = request.headers['stripe-signature'];
        if (!sig) {
            firebase_functions_1.logger.info('❌ Missing Stripe signature');
            response.status(400).json({ error: 'Missing signature' });
            return;
        }
        firebase_functions_1.logger.info('✅ Webhook received successfully');
        response.status(200).json({ received: true, message: 'Webhook processed' });
    }
    catch (error) {
        firebase_functions_1.logger.error('❌ Webhook error:', error);
        response.status(500).json({ error: 'Internal server error' });
    }
});
//# sourceMappingURL=stripeWebhookSimple.js.map