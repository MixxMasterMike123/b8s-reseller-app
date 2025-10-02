"use strict";
/**
 * MINIMAL Payment Intent Creation for Testing
 * Strips out all complex logic to isolate Stripe API issues
 */
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
exports.createPaymentIntentMinimalV2 = void 0;
var https_1 = require("firebase-functions/v2/https");
var stripe_1 = require("stripe");
var cors_handler_1 = require("../protection/cors/cors-handler");
// Minimal Stripe configuration
var stripeSecretKey = process.env.STRIPE_SECRET_KEY;
// Initialize Stripe only when function is called (not during build)
var getStripe = function () {
    if (!stripeSecretKey) {
        throw new Error('Missing STRIPE_SECRET_KEY environment variable');
    }
    return new stripe_1["default"](stripeSecretKey, {
        apiVersion: '2023-10-16'
    });
};
exports.createPaymentIntentMinimalV2 = (0, https_1.onRequest)({
    cors: true,
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60
}, function (request, response) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, amount, _b, currency, customerEmail, customerInfo, email, stripe, paymentIntent, error_1;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                // Apply CORS
                (0, cors_handler_1.corsHandler)(request, response);
                // Only accept POST requests
                if (request.method !== 'POST') {
                    response.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                console.log('🧪 MINIMAL: Creating test payment intent...');
                _a = request.body, amount = _a.amount, _b = _a.currency, currency = _b === void 0 ? 'sek' : _b, customerEmail = _a.customerEmail, customerInfo = _a.customerInfo;
                email = customerEmail || (customerInfo === null || customerInfo === void 0 ? void 0 : customerInfo.email);
                // Basic validation
                if (!amount || amount <= 0) {
                    response.status(400).json({ error: 'Valid amount is required' });
                    return [2 /*return*/];
                }
                if (!email) {
                    response.status(400).json({ error: 'Customer email is required' });
                    return [2 /*return*/];
                }
                console.log("\uD83E\uDDEA MINIMAL: Creating payment intent for ".concat(amount, " ").concat(currency));
                stripe = getStripe();
                return [4 /*yield*/, stripe.paymentIntents.create({
                        amount: Math.round(amount * 100),
                        currency: currency.toLowerCase(),
                        automatic_payment_methods: {
                            enabled: true
                        },
                        metadata: {
                            customerEmail: email,
                            testMode: 'minimal'
                        }
                    })];
            case 1:
                paymentIntent = _c.sent();
                console.log('✅ MINIMAL: Payment intent created:', paymentIntent.id);
                response.json({
                    success: true,
                    paymentIntent: {
                        id: paymentIntent.id,
                        client_secret: paymentIntent.client_secret,
                        amount: paymentIntent.amount,
                        currency: paymentIntent.currency
                    }
                });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _c.sent();
                console.error('❌ MINIMAL: Payment intent creation failed:', error_1);
                // Detailed error logging for debugging
                if (error_1 instanceof stripe_1["default"].errors.StripeError) {
                    console.error('Stripe Error Details:', {
                        type: error_1.type,
                        code: error_1.code,
                        message: error_1.message,
                        statusCode: error_1.statusCode
                    });
                    response.status(400).json({
                        error: error_1.message,
                        type: error_1.type,
                        code: error_1.code,
                        details: 'Stripe API error - check logs for details'
                    });
                }
                else {
                    response.status(500).json({
                        error: 'Internal server error',
                        details: error_1 instanceof Error ? error_1.message : 'Unknown error'
                    });
                }
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
