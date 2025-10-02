"use strict";
// V2 FUNCTIONS BATCH 4 - Direct imports to avoid circular dependencies
// EMAIL ORCHESTRATOR SYSTEM - Unified email functions
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
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
exports.debugProductFields = exports.debugOrderData = exports.forceSyncProducts = exports.getProductSyncStatus = exports.getGoogleMerchantStats = exports.googleMerchantOnProductDeleted = exports.googleMerchantOnProductUpdated = exports.googleMerchantOnProductCreated = exports.testGoogleMerchantConnection = exports.syncSingleProductToGoogle = exports.syncProductsToGoogleHttp = exports.syncAllProductsToGoogle = exports.exampleProtectedFunction = exports.confirmPasswordReset = exports.confirmPasswordResetV2 = exports.scrapeWebsiteMetaV2 = exports.stripeWebhookSimple = exports.stripeWebhookV2 = exports.createPaymentIntentMinimalV2 = exports.createPaymentIntentV2 = exports.debugDatabaseV2 = exports.checkNamedDatabaseV2 = exports.createAdminUserV2 = exports.toggleCustomerActiveStatusV2 = exports.deleteB2CCustomerAccountV2 = exports.deleteCustomerAccountV2 = exports.testGeoHeadersV2 = exports.getGeoDataV2 = exports.manualStatusUpdateV2 = exports.processB2COrderCompletionV2 = exports.processB2COrderCompletionHttpV2 = exports.processAffiliateConversionV2 = exports.logAffiliateClickHttpV2 = exports.logAffiliateClickV2 = exports.testEmailOrchestrator = exports.sendAffiliateApplicationEmails = exports.verifyEmailCode = exports.sendCustomEmailVerification = exports.sendEmailVerification = exports.approveAffiliate = exports.sendAffiliateWelcomeEmail = exports.sendLoginCredentialsEmail = exports.sendPasswordResetEmail = exports.sendOrderNotificationAdmin = exports.sendOrderStatusUpdateEmail = exports.sendOrderConfirmationEmail = void 0;
// Initialize Firebase Admin SDK
var app_1 = require("firebase-admin/app");
(0, app_1.initializeApp)();
var https_1 = require("firebase-functions/v2/https");
var cors_handler_1 = require("./protection/cors/cors-handler");
var rate_limiter_1 = require("./protection/rate-limiting/rate-limiter");
// NEW UNIFIED EMAIL ORCHESTRATOR FUNCTIONS
var functions_1 = require("./email-orchestrator/functions");
__createBinding(exports, functions_1, "sendOrderConfirmationEmail");
__createBinding(exports, functions_1, "sendOrderStatusUpdateEmail");
__createBinding(exports, functions_1, "sendOrderNotificationAdmin");
__createBinding(exports, functions_1, "sendPasswordResetEmail");
__createBinding(exports, functions_1, "sendLoginCredentialsEmail");
__createBinding(exports, functions_1, "sendAffiliateWelcomeEmail");
__createBinding(exports, functions_1, "approveAffiliate");
__createBinding(exports, functions_1, "sendEmailVerification");
__createBinding(exports, functions_1, "sendCustomEmailVerification");
__createBinding(exports, functions_1, "verifyEmailCode");
__createBinding(exports, functions_1, "sendAffiliateApplicationEmails");
// sendB2BApplicationEmails, // TEMPORARILY DISABLED - compilation errors
__createBinding(exports, functions_1, "testEmailOrchestrator");
// Import confirmPasswordReset separately for aliasing
var functions_2 = require("./email-orchestrator/functions");
exports.confirmPasswordResetV2 = functions_2.confirmPasswordReset;
exports.confirmPasswordReset = functions_2.confirmPasswordReset;
// Import affiliate functions directly (avoiding export * circular imports)
var logAffiliateClick_1 = require("./affiliate/callable/logAffiliateClick");
exports.logAffiliateClickV2 = logAffiliateClick_1.logAffiliateClickV2;
var logAffiliateClickHttp_1 = require("./affiliate/http/logAffiliateClickHttp");
exports.logAffiliateClickHttpV2 = logAffiliateClickHttp_1.logAffiliateClickHttpV2;
var processAffiliateConversion_1 = require("./affiliate/triggers/processAffiliateConversion");
exports.processAffiliateConversionV2 = processAffiliateConversion_1.processAffiliateConversionV2;
// Debug functions removed - found the real issue
// LEGACY EMAIL FUNCTIONS DISABLED - ALL EMAIL NOW USES V3 SYSTEM WITH GMAIL SMTP
// import { 
//   sendCustomerWelcomeEmail,        // → Use sendCustomerWelcomeEmailV3
//   sendAffiliateWelcomeEmail,       // → Use sendAffiliateWelcomeEmailV3
//   sendB2BOrderConfirmationAdmin,   // → Use sendB2BOrderConfirmationAdminV3
//   sendB2BOrderConfirmationCustomer,// → Use sendB2BOrderConfirmationCustomerV3
//   sendOrderStatusEmail,            // → Use sendOrderStatusEmailV3
//   sendB2COrderNotificationAdmin,   // → Use sendB2COrderNotificationAdminV3
//   sendB2COrderPendingEmail,        // → Use sendB2COrderPendingEmailV3
//   sendOrderConfirmationEmails,     // → Use sendOrderConfirmationEmailsV3 (trigger)
//   sendUserActivationEmail,         // → TODO: Create sendUserActivationEmailV3
//   sendOrderStatusUpdateEmail,      // → TODO: Create sendOrderStatusUpdateEmailV3
//   updateCustomerEmail,             // → TODO: Create updateCustomerEmailV3
//   testEmail,                       // → TODO: Create testEmailV3
//   approveAffiliate,                // → Use approveAffiliateV3
//   sendVerificationEmail,           // → Use sendVerificationEmailV3
//   sendAffiliateCredentialsV2,      // → Use sendAffiliateCredentialsV3
//   sendPasswordResetEmailV2,        // → Use sendPasswordResetV3
//   confirmPasswordResetV2           // → Use confirmPasswordResetV3
// } from './email/functions';
// OLD EMAIL FUNCTIONS MOVED TO QUARANTINE - NO LONGER AVAILABLE
// sendStatusUpdateHttp and sendUserActivationEmail moved to quarantine
// All email functionality now handled by Email Orchestrator system
// Import order processing functions directly with original names
var functions_3 = require("./order-processing/functions");
exports.processB2COrderCompletionHttpV2 = functions_3.processB2COrderCompletionHttp;
exports.processB2COrderCompletionV2 = functions_3.processB2COrderCompletion;
exports.manualStatusUpdateV2 = functions_3.manualStatusUpdate;
// Import geo functions for B2C shop currency detection
var functions_4 = require("./geo/functions");
exports.getGeoDataV2 = functions_4.getGeoData;
exports.testGeoHeadersV2 = functions_4.testGeoHeaders;
// Import Google Merchant Center sync functions
var sync_functions_1 = require("./google-merchant/sync-functions");
exports.syncAllProductsToGoogle = sync_functions_1.syncAllProductsToGoogle;
exports.syncProductsToGoogleHttp = sync_functions_1.syncProductsToGoogleHttp;
exports.syncSingleProductToGoogle = sync_functions_1.syncSingleProductToGoogle;
exports.testGoogleMerchantConnection = sync_functions_1.testGoogleMerchantConnection;
exports.googleMerchantOnProductCreated = sync_functions_1.onProductCreated;
exports.googleMerchantOnProductUpdated = sync_functions_1.onProductUpdated;
exports.googleMerchantOnProductDeleted = sync_functions_1.onProductDeleted;
// Import Google Merchant Center admin functions
var admin_functions_1 = require("./google-merchant/admin-functions");
exports.getGoogleMerchantStats = admin_functions_1.getGoogleMerchantStats;
exports.getProductSyncStatus = admin_functions_1.getProductSyncStatus;
exports.forceSyncProducts = admin_functions_1.forceSyncProducts;
// Import customer-admin functions directly with original names
var functions_5 = require("./customer-admin/functions");
exports.deleteCustomerAccountV2 = functions_5.deleteCustomerAccount;
exports.deleteB2CCustomerAccountV2 = functions_5.deleteB2CCustomerAccount;
exports.toggleCustomerActiveStatusV2 = functions_5.toggleCustomerActiveStatus;
exports.createAdminUserV2 = functions_5.createAdminUser;
exports.checkNamedDatabaseV2 = functions_5.checkNamedDatabase;
exports.debugDatabaseV2 = functions_5.debugDatabase;
// Import payment functions for Stripe integration
var createPaymentIntent_1 = require("./payment/createPaymentIntent");
exports.createPaymentIntentV2 = createPaymentIntent_1.createPaymentIntentV2;
var createPaymentIntentMinimal_1 = require("./payment/createPaymentIntentMinimal");
exports.createPaymentIntentMinimalV2 = createPaymentIntentMinimal_1.createPaymentIntentMinimalV2;
var stripeWebhook_1 = require("./payment/stripeWebhook");
exports.stripeWebhookV2 = stripeWebhook_1.stripeWebhookV2;
var stripeWebhookSimple_1 = require("./payment/stripeWebhookSimple");
exports.stripeWebhookSimple = stripeWebhookSimple_1.stripeWebhookSimple;
// Import website scraper functions for DiningWagon
var functions_6 = require("./website-scraper/functions");
exports.scrapeWebsiteMetaV2 = functions_6.scrapeWebsiteMeta;
// Example protected HTTP function - TESTING
exports.exampleProtectedFunction = (0, https_1.onRequest)({ cors: true }, function (request, response) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                // Apply CORS protection
                if (!(0, cors_handler_1.corsHandler)(request, response)) {
                    return [2 /*return*/];
                }
                return [4 /*yield*/, (0, rate_limiter_1.rateLimiter)(request, response)];
            case 1:
                // Apply rate limiting
                if (!(_a.sent())) {
                    return [2 /*return*/];
                }
                // Function logic here
                response.json({ message: 'Protected function executed successfully' });
                return [2 /*return*/];
        }
    });
}); });
// Debug functions
var debug_order_data_1 = require("./debug-order-data");
__createBinding(exports, debug_order_data_1, "debugOrderData");
var debug_product_fields_1 = require("./debug-product-fields");
__createBinding(exports, debug_product_fields_1, "debugProductFields");
// OLD V1/V2/V3 EMAIL SYSTEM FUNCTIONS - MOVED TO QUARANTINE
// All old email functions have been migrated to the new Email Orchestrator system
// Old files moved to: functions/quarantine/old-email-systems/
// New system: functions/src/email-orchestrator/ 
