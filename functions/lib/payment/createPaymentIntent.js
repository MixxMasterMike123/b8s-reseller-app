"use strict";
/**
 * Firebase Function: Create Stripe Payment Intent
 * Handles server-side payment intent creation for B2C checkout
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaymentIntentV2 = void 0;
const https_1 = require("firebase-functions/v2/https");
const firebase_functions_1 = require("firebase-functions");
const stripe_1 = __importDefault(require("stripe"));
const cors_handler_1 = require("../protection/cors/cors-handler");
exports.createPaymentIntentV2 = (0, https_1.onRequest)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    secrets: ['STRIPE_SECRET_KEY'],
}, async (request, response) => {
    try {
        // Handle CORS
        if (!(0, cors_handler_1.corsHandler)(request, response)) {
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
            firebase_functions_1.logger.error('❌ STRIPE_SECRET_KEY not found in environment');
            response.status(500).json({ error: 'Payment service configuration error' });
            return;
        }
        const stripe = new stripe_1.default(stripeSecretKey, {
            apiVersion: '2023-10-16',
        });
        firebase_functions_1.logger.info('💳 Creating Stripe Payment Intent', {
            data: { ...request.body, customerInfo: { email: request.body.customerInfo?.email } }
        });
        // Validate request
        if (!request.body) {
            response.status(400).json({ error: 'Request body is required' });
            return;
        }
        const { amount, currency = 'sek', cartItems, customerInfo, shippingInfo, discountInfo, affiliateInfo } = request.body;
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
        firebase_functions_1.logger.info('💰 Payment details', {
            amountInSEK: amount,
            amountInOre,
            currency,
            itemCount: cartItems.length,
            customerEmail: customerInfo.email
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
                    // Store order information in metadata
                    customerEmail: customerInfo.email,
                    customerName: customerInfo.name || '',
                    itemCount: cartItems.length.toString(),
                    shippingCountry: shippingInfo.country || 'SE',
                    shippingCost: (shippingInfo.cost || 0).toString(),
                    ...(discountInfo && {
                        discountCode: discountInfo.code,
                        discountAmount: discountInfo.amount.toString(),
                        discountPercentage: discountInfo.percentage?.toString() || '',
                    }),
                    ...(affiliateInfo && {
                        affiliateCode: affiliateInfo.code,
                        affiliateClickId: affiliateInfo.clickId,
                    }),
                    // Store minimal cart data for metadata (Stripe 500-char limit)
                    // Full cart items with images are used from current cart during order creation
                    totalItems: cartItems.reduce((sum, item) => sum + item.quantity, 0).toString(),
                    itemIds: cartItems.map(item => item.id.substring(0, 8)).join(','),
                    cartSummary: cartItems.map(item => `${item.quantity}x${item.sku}`).join(','),
                    source: 'b2c_shop',
                    platform: 'b8shield'
                },
                receipt_email: customerInfo.email,
                description: `B8Shield Order - ${cartItems.length} item${cartItems.length > 1 ? 's' : ''}`,
            });
        }
        catch (stripeError) {
            firebase_functions_1.logger.error('❌ Stripe Payment Intent creation failed', {
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
        firebase_functions_1.logger.info('✅ Payment Intent created successfully', {
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
    }
    catch (error) {
        firebase_functions_1.logger.error('❌ Error creating Payment Intent', error);
        // Handle Stripe errors
        if (error instanceof stripe_1.default.errors.StripeError) {
            response.status(400).json({ error: `Stripe error: ${error.message}` });
            return;
        }
        response.status(500).json({ error: 'Failed to create payment intent' });
    }
});
//# sourceMappingURL=createPaymentIntent.js.map