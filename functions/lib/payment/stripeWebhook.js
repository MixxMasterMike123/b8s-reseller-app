"use strict";
/**
 * Stripe Webhook Handler for B2C Order Recovery
 * Handles payment_intent.succeeded events to create orders from Stripe metadata
 * This serves as a backup mechanism when client-side order creation fails
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhookV2 = void 0;
const https_1 = require("firebase-functions/v2/https");
const firebase_functions_1 = require("firebase-functions");
const stripe_1 = __importDefault(require("stripe"));
const firestore_1 = require("firebase-admin/firestore");
// CORS not needed for webhooks - server-to-server communication
// Initialize Firestore with named database
const db = (0, firestore_1.getFirestore)('b8s-reseller-db');
exports.stripeWebhookV2 = (0, https_1.onRequest)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    invoker: 'public', // Allow Stripe to call this webhook
}, async (request, response) => {
    try {
        firebase_functions_1.logger.info('🔍 Webhook received', {
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
            firebase_functions_1.logger.error('❌ STRIPE_WEBHOOK_SECRET not found in environment');
            response.status(500).json({ error: 'Webhook configuration error' });
            return;
        }
        // Initialize Stripe
        const stripeSecretKey = (process.env.STRIPE_SECRET_KEY || '').trim();
        if (!stripeSecretKey) {
            firebase_functions_1.logger.error('❌ STRIPE_SECRET_KEY not found in environment');
            response.status(500).json({ error: 'Stripe configuration error' });
            return;
        }
        const stripe = new stripe_1.default(stripeSecretKey, {
            apiVersion: '2023-10-16',
        });
        // Verify webhook signature
        const sig = request.headers['stripe-signature'];
        if (!sig) {
            firebase_functions_1.logger.error('❌ Missing Stripe signature');
            response.status(400).json({ error: 'Missing signature' });
            return;
        }
        let event;
        try {
            event = stripe.webhooks.constructEvent(request.rawBody || request.body, sig, webhookSecret);
        }
        catch (err) {
            firebase_functions_1.logger.error('❌ Webhook signature verification failed', { error: err.message });
            response.status(400).json({ error: `Webhook Error: ${err.message}` });
            return;
        }
        firebase_functions_1.logger.info('🔔 Stripe webhook received', {
            type: event.type,
            id: event.id,
            paymentIntentId: event.data.object.id
        });
        // Handle payment_intent.succeeded events
        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;
            // Check if this is a B2C order (has our enhanced metadata)
            if (!paymentIntent.metadata?.source || paymentIntent.metadata.source !== 'b2c_shop') {
                firebase_functions_1.logger.info('⏭️ Skipping non-B2C payment intent', { paymentIntentId: paymentIntent.id });
                response.status(200).json({ received: true, skipped: 'not_b2c' });
                return;
            }
            // Check if order already exists (idempotency)
            const existingOrders = await db.collection('orders')
                .where('payment.paymentIntentId', '==', paymentIntent.id)
                .get();
            if (!existingOrders.empty) {
                firebase_functions_1.logger.info('✅ Order already exists for payment intent', {
                    paymentIntentId: paymentIntent.id,
                    orderId: existingOrders.docs[0].id
                });
                response.status(200).json({ received: true, existing: true });
                return;
            }
            // Extract order data from enhanced metadata
            const metadata = paymentIntent.metadata;
            // Log metadata sizes to detect Stripe truncation issues
            firebase_functions_1.logger.info('📊 Webhook: Metadata size check', {
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
                firebase_functions_1.logger.error('❌ Missing required metadata for order creation', {
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
            }
            catch (err) {
                firebase_functions_1.logger.error('❌ Failed to parse itemDetails JSON', {
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
                source: 'b2c',
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
                    amount: paymentIntent.amount / 100,
                    currency: paymentIntent.currency,
                    status: paymentIntent.status,
                    // ✅ Conditionally add paymentMethodType to match frontend
                    ...(paymentIntent.payment_method && typeof paymentIntent.payment_method === 'object' && {
                        paymentMethodType: paymentIntent.payment_method.type
                    }),
                    // ✅ Add payment method details if available (card/klarna)
                    ...(paymentIntent.payment_method && typeof paymentIntent.payment_method === 'object' && paymentIntent.payment_method.card && {
                        paymentMethodDetails: {
                            brand: paymentIntent.payment_method.card.brand,
                            last4: paymentIntent.payment_method.card.last4,
                            ...(paymentIntent.payment_method.card.wallet?.type && {
                                wallet: paymentIntent.payment_method.card.wallet.type
                            })
                        }
                    }),
                    ...(paymentIntent.payment_method && typeof paymentIntent.payment_method === 'object' && paymentIntent.payment_method.klarna && {
                        paymentMethodDetails: { type: 'klarna' }
                    })
                },
                // ✅ Affiliate information - structure matches frontend (null when absent, no discountAmount field)
                affiliate: metadata.affiliateCode ? {
                    code: metadata.affiliateCode,
                    discountPercentage: parseFloat(metadata.discountPercentage || '0'),
                    clickId: metadata.affiliateClickId || ''
                } : null,
                // ✅ Timestamps using FieldValue for consistency with frontend
                createdAt: new Date(),
                updatedAt: new Date(),
                // ✅ Webhook tracking flags (help identify recovery orders)
                webhookProcessed: true,
                webhookEventId: event.id,
                recoveredFromStripe: true // Flag to indicate this was recovered from webhook
            };
            // Create order in Firestore
            const orderRef = await db.collection('orders').add(orderData);
            firebase_functions_1.logger.info('✅ Order created from Stripe webhook', {
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
            // Trigger email and affiliate processing via existing HTTP function
            // This reuses the same logic as the frontend order flow
            try {
                firebase_functions_1.logger.info('📧 Webhook: Calling processB2COrderCompletionHttpV2', {
                    orderId: orderRef.id,
                    orderNumber
                });
                // Call the same function the frontend uses for order processing
                // Using internal function call (not HTTP) for better performance
                const { processB2COrderCompletionHttp } = require('../order-processing/functions');
                // Simulate HTTP request object for the function
                const mockRequest = {
                    body: { orderId: orderRef.id },
                    ip: 'webhook-internal',
                    method: 'POST'
                };
                const mockResponse = {
                    status: (code) => ({
                        json: (data) => {
                            firebase_functions_1.logger.info('📧 Webhook: Email processing result', {
                                statusCode: code,
                                result: data
                            });
                        }
                    })
                };
                await processB2COrderCompletionHttp(mockRequest, mockResponse);
                firebase_functions_1.logger.info('✅ Webhook: Order processing completed successfully');
            }
            catch (emailError) {
                firebase_functions_1.logger.error('❌ Webhook: Failed to trigger order processing', {
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
        }
        else {
            // Handle other webhook events if needed
            firebase_functions_1.logger.info('⏭️ Unhandled webhook event type', { type: event.type });
            response.status(200).json({ received: true, handled: false });
        }
    }
    catch (error) {
        firebase_functions_1.logger.error('❌ Webhook processing error', error);
        response.status(500).json({ error: 'Webhook processing failed' });
    }
});
//# sourceMappingURL=stripeWebhook.js.map