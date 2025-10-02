"use strict";
/**
 * MINIMAL Payment Intent Creation for Testing
 * Strips out all complex logic to isolate Stripe API issues
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaymentIntentMinimalV2 = void 0;
const https_1 = require("firebase-functions/v2/https");
const stripe_1 = __importDefault(require("stripe"));
const cors_handler_1 = require("../protection/cors/cors-handler");
// Minimal Stripe configuration
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
// Initialize Stripe only when function is called (not during build)
const getStripe = () => {
    if (!stripeSecretKey) {
        throw new Error('Missing STRIPE_SECRET_KEY environment variable');
    }
    return new stripe_1.default(stripeSecretKey, {
        apiVersion: '2023-10-16',
    });
};
exports.createPaymentIntentMinimalV2 = (0, https_1.onRequest)({
    cors: true,
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
}, async (request, response) => {
    try {
        // Apply CORS
        (0, cors_handler_1.corsHandler)(request, response);
        // Only accept POST requests
        if (request.method !== 'POST') {
            response.status(405).json({ error: 'Method not allowed' });
            return;
        }
        console.log('🧪 MINIMAL: Creating test payment intent...');
        // Extract minimal required data
        const { amount, currency = 'sek', customerEmail, customerInfo } = request.body;
        // Extract email from either direct field or customerInfo object
        const email = customerEmail || customerInfo?.email;
        // Basic validation
        if (!amount || amount <= 0) {
            response.status(400).json({ error: 'Valid amount is required' });
            return;
        }
        if (!email) {
            response.status(400).json({ error: 'Customer email is required' });
            return;
        }
        console.log(`🧪 MINIMAL: Creating payment intent for ${amount} ${currency}`);
        // Get Stripe instance
        const stripe = getStripe();
        // Create minimal payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency: currency.toLowerCase(),
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                customerEmail: email,
                testMode: 'minimal',
            },
        });
        console.log('✅ MINIMAL: Payment intent created:', paymentIntent.id);
        response.json({
            success: true,
            paymentIntent: {
                id: paymentIntent.id,
                client_secret: paymentIntent.client_secret,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
            }
        });
    }
    catch (error) {
        console.error('❌ MINIMAL: Payment intent creation failed:', error);
        // Detailed error logging for debugging
        if (error instanceof stripe_1.default.errors.StripeError) {
            console.error('Stripe Error Details:', {
                type: error.type,
                code: error.code,
                message: error.message,
                statusCode: error.statusCode,
            });
            response.status(400).json({
                error: error.message,
                type: error.type,
                code: error.code,
                details: 'Stripe API error - check logs for details'
            });
        }
        else {
            response.status(500).json({
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
});
//# sourceMappingURL=createPaymentIntentMinimal.js.map