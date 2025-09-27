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
const cors_handler_1 = require("../protection/cors/cors-handler");
// Initialize Firestore with named database
const db = (0, firestore_1.getFirestore)('b8s-reseller-db');
exports.stripeWebhookV2 = (0, https_1.onRequest)({
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
        // Only allow POST requests
        if (request.method !== 'POST') {
            response.status(405).json({ error: 'Method not allowed' });
            return;
        }
        // Get Stripe webhook secret (optional for now - will be added later)
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
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
        // Verify webhook signature (skip for now - will be added later)
        let event;
        if (webhookSecret) {
            // Full signature verification when secret is available
            const sig = request.headers['stripe-signature'];
            if (!sig) {
                firebase_functions_1.logger.error('❌ Missing Stripe signature');
                response.status(400).json({ error: 'Missing signature' });
                return;
            }
            try {
                event = stripe.webhooks.constructEvent(request.rawBody || request.body, sig, webhookSecret);
            }
            catch (err) {
                firebase_functions_1.logger.error('❌ Webhook signature verification failed', { error: err.message });
                response.status(400).json({ error: `Webhook Error: ${err.message}` });
                return;
            }
        }
        else {
            // Temporary: Accept webhook without signature verification for testing
            firebase_functions_1.logger.warn('⚠️ Webhook signature verification disabled - webhook secret not configured');
            event = request.body;
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
            const existingOrderQuery = (0, firestore_1.query)((0, firestore_1.collection)(db, 'orders'), (0, firestore_1.where)('payment.paymentIntentId', '==', paymentIntent.id));
            const existingOrders = await (0, firestore_1.getDocs)(existingOrderQuery);
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
            // Validate required metadata
            if (!metadata.customerEmail || !metadata.itemDetails) {
                firebase_functions_1.logger.error('❌ Missing required metadata for order creation', {
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
            const orderData = {
                orderNumber,
                status: 'confirmed',
                source: 'b2c_webhook',
                // Customer information from metadata
                customerInfo: {
                    email: metadata.customerEmail,
                    name: metadata.customerName || '',
                    firstName: metadata.customerFirstName || '',
                    lastName: metadata.customerLastName || '',
                    marketingOptIn: metadata.customerMarketing === 'true',
                    preferredLang: metadata.customerLang || 'sv-SE'
                },
                // Shipping information from metadata
                shippingInfo: {
                    firstName: metadata.shippingFirstName || metadata.customerFirstName || '',
                    lastName: metadata.shippingLastName || metadata.customerLastName || '',
                    address: metadata.shippingAddress || '',
                    apartment: metadata.shippingApartment || '',
                    city: metadata.shippingCity || '',
                    postalCode: metadata.shippingPostalCode || '',
                    country: metadata.shippingCountry || 'SE'
                },
                // Order items from parsed JSON
                items: cartItems,
                // Financial data from metadata
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
                    // Store payment method details if available
                    ...(paymentIntent.payment_method && {
                        paymentMethodType: paymentIntent.payment_method.type
                    })
                },
                // Affiliate information (if present)
                ...(metadata.affiliateCode && {
                    affiliate: {
                        code: metadata.affiliateCode,
                        clickId: metadata.affiliateClickId || '',
                        discountAmount: parseFloat(metadata.discountAmount || '0'),
                        discountPercentage: parseFloat(metadata.discountPercentage || '0')
                    }
                }),
                // Timestamps
                createdAt: (0, firestore_1.serverTimestamp)(),
                updatedAt: (0, firestore_1.serverTimestamp)(),
                // Webhook tracking
                webhookProcessed: true,
                webhookEventId: event.id,
                recoveredFromStripe: true // Flag to indicate this was recovered from webhook
            };
            // Create order in Firestore
            const orderRef = await (0, firestore_1.addDoc)((0, firestore_1.collection)(db, 'orders'), orderData);
            firebase_functions_1.logger.info('✅ Order created from Stripe webhook', {
                paymentIntentId: paymentIntent.id,
                orderId: orderRef.id,
                orderNumber,
                customerEmail: metadata.customerEmail,
                total: metadata.total,
                hasAffiliate: !!metadata.affiliateCode
            });
            // Process affiliate commission if present
            if (metadata.affiliateCode && metadata.affiliateClickId) {
                try {
                    // Update affiliate click with conversion
                    const affiliateClicksQuery = (0, firestore_1.query)((0, firestore_1.collection)(db, 'affiliateClicks'), (0, firestore_1.where)('id', '==', metadata.affiliateClickId));
                    const clickDocs = await (0, firestore_1.getDocs)(affiliateClicksQuery);
                    if (!clickDocs.empty) {
                        const clickDoc = clickDocs.docs[0];
                        await clickDoc.ref.update({
                            converted: true,
                            orderId: orderRef.id,
                            commissionAmount: parseFloat(metadata.discountAmount || '0'),
                            convertedAt: (0, firestore_1.serverTimestamp)()
                        });
                        firebase_functions_1.logger.info('✅ Affiliate commission processed', {
                            affiliateCode: metadata.affiliateCode,
                            clickId: metadata.affiliateClickId,
                            commission: metadata.discountAmount
                        });
                    }
                }
                catch (affiliateError) {
                    firebase_functions_1.logger.error('❌ Failed to process affiliate commission', {
                        error: affiliateError,
                        affiliateCode: metadata.affiliateCode,
                        clickId: metadata.affiliateClickId
                    });
                    // Don't fail the order creation if affiliate processing fails
                }
            }
            // TODO: Send order confirmation emails
            // This would call the email orchestrator functions
            response.status(200).json({
                received: true,
                orderCreated: true,
                orderId: orderRef.id,
                orderNumber
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