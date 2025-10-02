"use strict";
/**
 * Stripe Webhook Handler for B2C Order Recovery
 * Handles payment_intent.succeeded events to create orders from Stripe metadata
 * This serves as a backup mechanism when client-side order creation fails
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.stripeWebhookV2 = void 0;
var https_1 = require("firebase-functions/v2/https");
var firebase_functions_1 = require("firebase-functions");
var stripe_1 = require("stripe");
var firestore_1 = require("firebase-admin/firestore");
// CORS not needed for webhooks - server-to-server communication
// Initialize Firestore with named database
var db = (0, firestore_1.getFirestore)('b8s-reseller-db');
exports.stripeWebhookV2 = (0, https_1.onRequest)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    invoker: 'public'
}, function (request, response) { return __awaiter(void 0, void 0, void 0, function () {
    var webhookSecret, stripeSecretKey, stripe, sig, event_1, paymentIntent, existingOrders, metadata, cartItems, orderNumber, orderData, orderRef, clickDocs, clickDoc, affiliateError_1, processB2COrderCompletionHttp, mockRequest, mockResponse, emailError_1, error_1;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 14, , 15]);
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
                    return [2 /*return*/];
                }
                webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
                if (!webhookSecret) {
                    firebase_functions_1.logger.error('❌ STRIPE_WEBHOOK_SECRET not found in environment');
                    response.status(500).json({ error: 'Webhook configuration error' });
                    return [2 /*return*/];
                }
                stripeSecretKey = (process.env.STRIPE_SECRET_KEY || '').trim();
                if (!stripeSecretKey) {
                    firebase_functions_1.logger.error('❌ STRIPE_SECRET_KEY not found in environment');
                    response.status(500).json({ error: 'Stripe configuration error' });
                    return [2 /*return*/];
                }
                stripe = new stripe_1["default"](stripeSecretKey, {
                    apiVersion: '2023-10-16'
                });
                sig = request.headers['stripe-signature'];
                if (!sig) {
                    firebase_functions_1.logger.error('❌ Missing Stripe signature');
                    response.status(400).json({ error: 'Missing signature' });
                    return [2 /*return*/];
                }
                try {
                    event_1 = stripe.webhooks.constructEvent(request.rawBody || request.body, sig, webhookSecret);
                }
                catch (err) {
                    firebase_functions_1.logger.error('❌ Webhook signature verification failed', { error: err.message });
                    response.status(400).json({ error: "Webhook Error: ".concat(err.message) });
                    return [2 /*return*/];
                }
                firebase_functions_1.logger.info('🔔 Stripe webhook received', {
                    type: event_1.type,
                    id: event_1.id,
                    paymentIntentId: event_1.data.object.id
                });
                if (!(event_1.type === 'payment_intent.succeeded')) return [3 /*break*/, 12];
                paymentIntent = event_1.data.object;
                // Check if this is a B2C order (has our enhanced metadata)
                if (!((_a = paymentIntent.metadata) === null || _a === void 0 ? void 0 : _a.source) || paymentIntent.metadata.source !== 'b2c_shop') {
                    firebase_functions_1.logger.info('⏭️ Skipping non-B2C payment intent', { paymentIntentId: paymentIntent.id });
                    response.status(200).json({ received: true, skipped: 'not_b2c' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db.collection('orders')
                        .where('payment.paymentIntentId', '==', paymentIntent.id)
                        .get()];
            case 1:
                existingOrders = _d.sent();
                if (!existingOrders.empty) {
                    firebase_functions_1.logger.info('✅ Order already exists for payment intent', {
                        paymentIntentId: paymentIntent.id,
                        orderId: existingOrders.docs[0].id
                    });
                    response.status(200).json({ received: true, existing: true });
                    return [2 /*return*/];
                }
                metadata = paymentIntent.metadata;
                // Log metadata sizes to detect Stripe truncation issues
                firebase_functions_1.logger.info('📊 Webhook: Metadata size check', {
                    paymentIntentId: paymentIntent.id,
                    itemDetailsLength: ((_b = metadata.itemDetails) === null || _b === void 0 ? void 0 : _b.length) || 0,
                    totalMetadataKeys: Object.keys(metadata).length,
                    largeFields: Object.entries(metadata)
                        .filter(function (_a) {
                        var _ = _a[0], value = _a[1];
                        return value && value.length > 400;
                    })
                        .map(function (_a) {
                        var key = _a[0], value = _a[1];
                        return ({ key: key, length: (value === null || value === void 0 ? void 0 : value.length) || 0 });
                    }),
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
                    return [2 /*return*/];
                }
                cartItems = void 0;
                try {
                    cartItems = JSON.parse(metadata.itemDetails);
                }
                catch (err) {
                    firebase_functions_1.logger.error('❌ Failed to parse itemDetails JSON', {
                        paymentIntentId: paymentIntent.id,
                        itemDetails: metadata.itemDetails
                    });
                    response.status(400).json({ error: 'Invalid itemDetails format' });
                    return [2 /*return*/];
                }
                orderNumber = "B8S-".concat(Date.now().toString().slice(-6), "-").concat(Math.random().toString(36).substr(2, 4).toUpperCase());
                orderData = {
                    orderNumber: orderNumber,
                    status: 'confirmed',
                    source: 'b2c',
                    // Customer information from metadata
                    customerInfo: {
                        email: metadata.customerEmail,
                        // ✅ Construct name from first+last to match frontend
                        name: "".concat(metadata.shippingFirstName || metadata.customerFirstName || '', " ").concat(metadata.shippingLastName || metadata.customerLastName || '').trim(),
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
                    payment: __assign(__assign(__assign({ method: 'stripe', paymentIntentId: paymentIntent.id, amount: paymentIntent.amount / 100, currency: paymentIntent.currency, status: paymentIntent.status }, (paymentIntent.payment_method && typeof paymentIntent.payment_method === 'object' && {
                        paymentMethodType: paymentIntent.payment_method.type
                    })), (paymentIntent.payment_method && typeof paymentIntent.payment_method === 'object' && paymentIntent.payment_method.card && {
                        paymentMethodDetails: __assign({ brand: paymentIntent.payment_method.card.brand, last4: paymentIntent.payment_method.card.last4 }, (((_c = paymentIntent.payment_method.card.wallet) === null || _c === void 0 ? void 0 : _c.type) && {
                            wallet: paymentIntent.payment_method.card.wallet.type
                        }))
                    })), (paymentIntent.payment_method && typeof paymentIntent.payment_method === 'object' && paymentIntent.payment_method.klarna && {
                        paymentMethodDetails: { type: 'klarna' }
                    })),
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
                    webhookEventId: event_1.id,
                    recoveredFromStripe: true // Flag to indicate this was recovered from webhook
                };
                return [4 /*yield*/, db.collection('orders').add(orderData)];
            case 2:
                orderRef = _d.sent();
                firebase_functions_1.logger.info('✅ Order created from Stripe webhook', {
                    paymentIntentId: paymentIntent.id,
                    orderId: orderRef.id,
                    orderNumber: orderNumber,
                    customerEmail: metadata.customerEmail,
                    total: metadata.total,
                    hasAffiliate: !!metadata.affiliateCode
                });
                if (!(metadata.affiliateCode && metadata.affiliateClickId)) return [3 /*break*/, 8];
                _d.label = 3;
            case 3:
                _d.trys.push([3, 7, , 8]);
                return [4 /*yield*/, db.collection('affiliateClicks')
                        .where('id', '==', metadata.affiliateClickId)
                        .get()];
            case 4:
                clickDocs = _d.sent();
                if (!!clickDocs.empty) return [3 /*break*/, 6];
                clickDoc = clickDocs.docs[0];
                return [4 /*yield*/, clickDoc.ref.update({
                        converted: true,
                        orderId: orderRef.id,
                        commissionAmount: parseFloat(metadata.discountAmount || '0'),
                        convertedAt: new Date()
                    })];
            case 5:
                _d.sent();
                firebase_functions_1.logger.info('✅ Affiliate commission processed', {
                    affiliateCode: metadata.affiliateCode,
                    clickId: metadata.affiliateClickId,
                    commission: metadata.discountAmount
                });
                _d.label = 6;
            case 6: return [3 /*break*/, 8];
            case 7:
                affiliateError_1 = _d.sent();
                firebase_functions_1.logger.error('❌ Failed to process affiliate commission', {
                    error: affiliateError_1,
                    affiliateCode: metadata.affiliateCode,
                    clickId: metadata.affiliateClickId
                });
                return [3 /*break*/, 8];
            case 8:
                _d.trys.push([8, 10, , 11]);
                firebase_functions_1.logger.info('📧 Webhook: Calling processB2COrderCompletionHttpV2', {
                    orderId: orderRef.id,
                    orderNumber: orderNumber
                });
                processB2COrderCompletionHttp = require('../order-processing/functions').processB2COrderCompletionHttp;
                mockRequest = {
                    body: { orderId: orderRef.id },
                    ip: 'webhook-internal',
                    method: 'POST'
                };
                mockResponse = {
                    status: function (code) { return ({
                        json: function (data) {
                            firebase_functions_1.logger.info('📧 Webhook: Email processing result', {
                                statusCode: code,
                                result: data
                            });
                        }
                    }); }
                };
                return [4 /*yield*/, processB2COrderCompletionHttp(mockRequest, mockResponse)];
            case 9:
                _d.sent();
                firebase_functions_1.logger.info('✅ Webhook: Order processing completed successfully');
                return [3 /*break*/, 11];
            case 10:
                emailError_1 = _d.sent();
                firebase_functions_1.logger.error('❌ Webhook: Failed to trigger order processing', {
                    error: emailError_1,
                    orderId: orderRef.id,
                    orderNumber: orderNumber
                });
                return [3 /*break*/, 11];
            case 11:
                response.status(200).json({
                    received: true,
                    orderCreated: true,
                    orderId: orderRef.id,
                    orderNumber: orderNumber,
                    emailsTriggered: true
                });
                return [3 /*break*/, 13];
            case 12:
                // Handle other webhook events if needed
                firebase_functions_1.logger.info('⏭️ Unhandled webhook event type', { type: event_1.type });
                response.status(200).json({ received: true, handled: false });
                _d.label = 13;
            case 13: return [3 /*break*/, 15];
            case 14:
                error_1 = _d.sent();
                firebase_functions_1.logger.error('❌ Webhook processing error', error_1);
                response.status(500).json({ error: 'Webhook processing failed' });
                return [3 /*break*/, 15];
            case 15: return [2 /*return*/];
        }
    });
}); });
