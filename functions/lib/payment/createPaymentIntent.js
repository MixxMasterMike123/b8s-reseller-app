"use strict";
/**
 * Firebase Function: Create Stripe Payment Intent
 * Handles server-side payment intent creation for B2C checkout
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
exports.createPaymentIntentV2 = void 0;
var https_1 = require("firebase-functions/v2/https");
var firebase_functions_1 = require("firebase-functions");
var stripe_1 = require("stripe");
var cors_handler_1 = require("../protection/cors/cors-handler");
exports.createPaymentIntentV2 = (0, https_1.onRequest)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    secrets: ['STRIPE_SECRET_KEY']
}, function (request, response) { return __awaiter(void 0, void 0, void 0, function () {
    var stripeSecretKey, stripe, _a, amount, _b, currency, cartItems, customerInfo, shippingInfo, discountInfo, affiliateInfo, totals, amountInOre, paymentIntent, stripeError_1, error_1;
    var _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 5, , 6]);
                // Handle CORS
                if (!(0, cors_handler_1.corsHandler)(request, response)) {
                    return [2 /*return*/];
                }
                // Handle preflight OPTIONS request
                if (request.method === 'OPTIONS') {
                    response.status(200).send('OK');
                    return [2 /*return*/];
                }
                // Only allow POST requests
                if (request.method !== 'POST') {
                    response.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                stripeSecretKey = (process.env.STRIPE_SECRET_KEY || '').trim();
                if (!stripeSecretKey) {
                    firebase_functions_1.logger.error('❌ STRIPE_SECRET_KEY not found in environment');
                    response.status(500).json({ error: 'Payment service configuration error' });
                    return [2 /*return*/];
                }
                stripe = new stripe_1["default"](stripeSecretKey, {
                    apiVersion: '2023-10-16'
                });
                firebase_functions_1.logger.info('💳 Creating Stripe Payment Intent', {
                    data: __assign(__assign({}, request.body), { customerInfo: { email: (_c = request.body.customerInfo) === null || _c === void 0 ? void 0 : _c.email } })
                });
                // Validate request
                if (!request.body) {
                    response.status(400).json({ error: 'Request body is required' });
                    return [2 /*return*/];
                }
                _a = request.body, amount = _a.amount, _b = _a.currency, currency = _b === void 0 ? 'sek' : _b, cartItems = _a.cartItems, customerInfo = _a.customerInfo, shippingInfo = _a.shippingInfo, discountInfo = _a.discountInfo, affiliateInfo = _a.affiliateInfo, totals = _a.totals;
                // Validate required fields
                if (!amount || amount <= 0) {
                    response.status(400).json({ error: 'Valid amount is required' });
                    return [2 /*return*/];
                }
                if (!cartItems || cartItems.length === 0) {
                    response.status(400).json({ error: 'Cart items are required' });
                    return [2 /*return*/];
                }
                if (!(customerInfo === null || customerInfo === void 0 ? void 0 : customerInfo.email)) {
                    response.status(400).json({ error: 'Customer email is required' });
                    return [2 /*return*/];
                }
                amountInOre = Math.round(amount * 100);
                firebase_functions_1.logger.info('💰 Payment details', {
                    amountInSEK: amount,
                    amountInOre: amountInOre,
                    currency: currency,
                    itemCount: cartItems.length,
                    customerEmail: customerInfo.email
                });
                // DEBUG: Log received data
                firebase_functions_1.logger.info('🔍 DEBUG: createPaymentIntent received data', {
                    customerInfo: customerInfo,
                    shippingInfo: shippingInfo,
                    totals: totals
                });
                paymentIntent = void 0;
                _e.label = 1;
            case 1:
                _e.trys.push([1, 3, , 4]);
                return [4 /*yield*/, stripe.paymentIntents.create({
                        amount: amountInOre,
                        currency: currency.toLowerCase(),
                        automatic_payment_methods: {
                            enabled: true
                        },
                        metadata: __assign(__assign(__assign({ 
                            // ✅ ENHANCED METADATA FOR COMPLETE ORDER RECOVERY
                            // Customer Information (enhanced)
                            customerEmail: customerInfo.email, customerName: customerInfo.name || '', customerFirstName: customerInfo.firstName || shippingInfo.firstName || '', customerLastName: customerInfo.lastName || shippingInfo.lastName || '', customerMarketing: (customerInfo.marketing || false).toString(), customerLang: customerInfo.preferredLang || 'sv-SE', 
                            // Shipping Information (complete address)
                            shippingFirstName: shippingInfo.firstName || '', shippingLastName: shippingInfo.lastName || '', shippingAddress: shippingInfo.address || '', shippingApartment: shippingInfo.apartment || '', shippingCity: shippingInfo.city || '', shippingPostalCode: shippingInfo.postalCode || '', shippingCountry: shippingInfo.country || 'SE', shippingCost: (shippingInfo.cost || 0).toString(), 
                            // Order Totals (complete breakdown)
                            subtotal: ((totals === null || totals === void 0 ? void 0 : totals.subtotal) || 0).toString(), vat: ((totals === null || totals === void 0 ? void 0 : totals.vat) || 0).toString(), shipping: ((totals === null || totals === void 0 ? void 0 : totals.shipping) || shippingInfo.cost || 0).toString(), discountAmount: ((totals === null || totals === void 0 ? void 0 : totals.discountAmount) || (discountInfo === null || discountInfo === void 0 ? void 0 : discountInfo.amount) || 0).toString(), total: ((totals === null || totals === void 0 ? void 0 : totals.total) || amount).toString() }, (discountInfo && {
                            discountCode: discountInfo.code,
                            discountPercentage: ((_d = discountInfo.percentage) === null || _d === void 0 ? void 0 : _d.toString()) || ''
                        })), (affiliateInfo && {
                            affiliateCode: affiliateInfo.code,
                            affiliateClickId: affiliateInfo.clickId
                        })), { 
                            // Cart Items (detailed for recovery)
                            itemCount: cartItems.length.toString(), totalItems: cartItems.reduce(function (sum, item) { return sum + item.quantity; }, 0).toString(), 
                            // Store complete item details as JSON (within Stripe limits)
                            itemDetails: JSON.stringify(cartItems.map(function (item) {
                                var _a, _b;
                                return ({
                                    id: item.id,
                                    sku: item.sku,
                                    name: typeof item.name === 'string' ? item.name : ((_a = item.name) === null || _a === void 0 ? void 0 : _a['sv-SE']) || ((_b = item.name) === null || _b === void 0 ? void 0 : _b['en-US']) || 'B8Shield',
                                    price: item.price,
                                    quantity: item.quantity,
                                    color: item.color || '',
                                    size: item.size || '',
                                    image: item.image || ''
                                });
                            })), 
                            // Legacy compatibility (keep existing fields)
                            itemIds: cartItems.map(function (item) { return item.id.substring(0, 8); }).join(','), cartSummary: cartItems.map(function (item) { return "".concat(item.quantity, "x").concat(item.sku); }).join(','), 
                            // System identifiers
                            source: 'b2c_shop', platform: 'b8shield', version: 'enhanced_v1', debugTimestamp: Date.now().toString(), debugTest: 'ENHANCED_METADATA_ACTIVE' // TEMP: Confirm enhanced function
                         }),
                        receipt_email: customerInfo.email,
                        description: "B8Shield Order - ".concat(cartItems.length, " item").concat(cartItems.length > 1 ? 's' : '')
                    })];
            case 2:
                paymentIntent = _e.sent();
                return [3 /*break*/, 4];
            case 3:
                stripeError_1 = _e.sent();
                firebase_functions_1.logger.error('❌ Stripe Payment Intent creation failed', {
                    error: stripeError_1.message,
                    type: stripeError_1.type,
                    code: stripeError_1.code,
                    statusCode: stripeError_1.statusCode,
                    requestParams: {
                        amount: amountInOre,
                        currency: currency.toLowerCase(),
                        customerEmail: customerInfo.email
                    }
                });
                response.status(400).json({
                    error: 'Payment intent creation failed',
                    details: stripeError_1.message,
                    success: false
                });
                return [2 /*return*/];
            case 4:
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
                return [3 /*break*/, 6];
            case 5:
                error_1 = _e.sent();
                firebase_functions_1.logger.error('❌ Error creating Payment Intent', error_1);
                // Handle Stripe errors
                if (error_1 instanceof stripe_1["default"].errors.StripeError) {
                    response.status(400).json({ error: "Stripe error: ".concat(error_1.message) });
                    return [2 /*return*/];
                }
                response.status(500).json({ error: 'Failed to create payment intent' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
