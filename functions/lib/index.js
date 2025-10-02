"use strict";
// V2 FUNCTIONS BATCH 4 - Direct imports to avoid circular dependencies
// EMAIL ORCHESTRATOR SYSTEM - Unified email functions
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugProductFields = exports.debugOrderData = exports.forceSyncProducts = exports.getProductSyncStatus = exports.getGoogleMerchantStats = exports.googleMerchantOnProductDeleted = exports.googleMerchantOnProductUpdated = exports.googleMerchantOnProductCreated = exports.testGoogleMerchantConnection = exports.syncSingleProductToGoogle = exports.syncProductsToGoogleHttp = exports.syncAllProductsToGoogle = exports.exampleProtectedFunction = exports.confirmPasswordReset = exports.confirmPasswordResetV2 = exports.scrapeWebsiteMetaV2 = exports.stripeWebhookSimple = exports.stripeWebhookV2 = exports.createPaymentIntentMinimalV2 = exports.createPaymentIntentV2 = exports.debugDatabaseV2 = exports.checkNamedDatabaseV2 = exports.createAdminUserV2 = exports.toggleCustomerActiveStatusV2 = exports.deleteB2CCustomerAccountV2 = exports.deleteCustomerAccountV2 = exports.testGeoHeadersV2 = exports.getGeoDataV2 = exports.manualStatusUpdateV2 = exports.processB2COrderCompletionV2 = exports.processB2COrderCompletionHttpV2 = exports.processAffiliateConversionV2 = exports.logAffiliateClickHttpV2 = exports.logAffiliateClickV2 = exports.testEmailOrchestrator = exports.sendAffiliateApplicationEmails = exports.verifyEmailCode = exports.sendCustomEmailVerification = exports.sendEmailVerification = exports.approveAffiliate = exports.sendAffiliateWelcomeEmail = exports.sendLoginCredentialsEmail = exports.sendPasswordResetEmail = exports.sendOrderNotificationAdmin = exports.sendOrderStatusUpdateEmail = exports.sendOrderConfirmationEmail = void 0;
// Initialize Firebase Admin SDK
const app_1 = require("firebase-admin/app");
(0, app_1.initializeApp)();
const https_1 = require("firebase-functions/v2/https");
const cors_handler_1 = require("./protection/cors/cors-handler");
const rate_limiter_1 = require("./protection/rate-limiting/rate-limiter");
// NEW UNIFIED EMAIL ORCHESTRATOR FUNCTIONS
var functions_1 = require("./email-orchestrator/functions");
Object.defineProperty(exports, "sendOrderConfirmationEmail", { enumerable: true, get: function () { return functions_1.sendOrderConfirmationEmail; } });
Object.defineProperty(exports, "sendOrderStatusUpdateEmail", { enumerable: true, get: function () { return functions_1.sendOrderStatusUpdateEmail; } });
Object.defineProperty(exports, "sendOrderNotificationAdmin", { enumerable: true, get: function () { return functions_1.sendOrderNotificationAdmin; } });
Object.defineProperty(exports, "sendPasswordResetEmail", { enumerable: true, get: function () { return functions_1.sendPasswordResetEmail; } });
Object.defineProperty(exports, "sendLoginCredentialsEmail", { enumerable: true, get: function () { return functions_1.sendLoginCredentialsEmail; } });
Object.defineProperty(exports, "sendAffiliateWelcomeEmail", { enumerable: true, get: function () { return functions_1.sendAffiliateWelcomeEmail; } });
Object.defineProperty(exports, "approveAffiliate", { enumerable: true, get: function () { return functions_1.approveAffiliate; } });
Object.defineProperty(exports, "sendEmailVerification", { enumerable: true, get: function () { return functions_1.sendEmailVerification; } });
Object.defineProperty(exports, "sendCustomEmailVerification", { enumerable: true, get: function () { return functions_1.sendCustomEmailVerification; } });
Object.defineProperty(exports, "verifyEmailCode", { enumerable: true, get: function () { return functions_1.verifyEmailCode; } });
Object.defineProperty(exports, "sendAffiliateApplicationEmails", { enumerable: true, get: function () { return functions_1.sendAffiliateApplicationEmails; } });
// sendB2BApplicationEmails, // TEMPORARILY DISABLED - compilation errors
Object.defineProperty(exports, "testEmailOrchestrator", { enumerable: true, get: function () { return functions_1.testEmailOrchestrator; } });
// Import confirmPasswordReset separately for aliasing
const functions_2 = require("./email-orchestrator/functions");
Object.defineProperty(exports, "confirmPasswordResetV2", { enumerable: true, get: function () { return functions_2.confirmPasswordReset; } });
Object.defineProperty(exports, "confirmPasswordReset", { enumerable: true, get: function () { return functions_2.confirmPasswordReset; } });
// Import affiliate functions directly (avoiding export * circular imports)
const logAffiliateClick_1 = require("./affiliate/callable/logAffiliateClick");
Object.defineProperty(exports, "logAffiliateClickV2", { enumerable: true, get: function () { return logAffiliateClick_1.logAffiliateClickV2; } });
const logAffiliateClickHttp_1 = require("./affiliate/http/logAffiliateClickHttp");
Object.defineProperty(exports, "logAffiliateClickHttpV2", { enumerable: true, get: function () { return logAffiliateClickHttp_1.logAffiliateClickHttpV2; } });
const processAffiliateConversion_1 = require("./affiliate/triggers/processAffiliateConversion");
Object.defineProperty(exports, "processAffiliateConversionV2", { enumerable: true, get: function () { return processAffiliateConversion_1.processAffiliateConversionV2; } });
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
const functions_3 = require("./order-processing/functions");
Object.defineProperty(exports, "processB2COrderCompletionHttpV2", { enumerable: true, get: function () { return functions_3.processB2COrderCompletionHttp; } });
Object.defineProperty(exports, "processB2COrderCompletionV2", { enumerable: true, get: function () { return functions_3.processB2COrderCompletion; } });
Object.defineProperty(exports, "manualStatusUpdateV2", { enumerable: true, get: function () { return functions_3.manualStatusUpdate; } });
// Import geo functions for B2C shop currency detection
const functions_4 = require("./geo/functions");
Object.defineProperty(exports, "getGeoDataV2", { enumerable: true, get: function () { return functions_4.getGeoData; } });
Object.defineProperty(exports, "testGeoHeadersV2", { enumerable: true, get: function () { return functions_4.testGeoHeaders; } });
// Import Google Merchant Center sync functions
const sync_functions_1 = require("./google-merchant/sync-functions");
Object.defineProperty(exports, "syncAllProductsToGoogle", { enumerable: true, get: function () { return sync_functions_1.syncAllProductsToGoogle; } });
Object.defineProperty(exports, "syncProductsToGoogleHttp", { enumerable: true, get: function () { return sync_functions_1.syncProductsToGoogleHttp; } });
Object.defineProperty(exports, "syncSingleProductToGoogle", { enumerable: true, get: function () { return sync_functions_1.syncSingleProductToGoogle; } });
Object.defineProperty(exports, "testGoogleMerchantConnection", { enumerable: true, get: function () { return sync_functions_1.testGoogleMerchantConnection; } });
Object.defineProperty(exports, "googleMerchantOnProductCreated", { enumerable: true, get: function () { return sync_functions_1.onProductCreated; } });
Object.defineProperty(exports, "googleMerchantOnProductUpdated", { enumerable: true, get: function () { return sync_functions_1.onProductUpdated; } });
Object.defineProperty(exports, "googleMerchantOnProductDeleted", { enumerable: true, get: function () { return sync_functions_1.onProductDeleted; } });
// Import Google Merchant Center admin functions
const admin_functions_1 = require("./google-merchant/admin-functions");
Object.defineProperty(exports, "getGoogleMerchantStats", { enumerable: true, get: function () { return admin_functions_1.getGoogleMerchantStats; } });
Object.defineProperty(exports, "getProductSyncStatus", { enumerable: true, get: function () { return admin_functions_1.getProductSyncStatus; } });
Object.defineProperty(exports, "forceSyncProducts", { enumerable: true, get: function () { return admin_functions_1.forceSyncProducts; } });
// Import customer-admin functions directly with original names
const functions_5 = require("./customer-admin/functions");
Object.defineProperty(exports, "deleteCustomerAccountV2", { enumerable: true, get: function () { return functions_5.deleteCustomerAccount; } });
Object.defineProperty(exports, "deleteB2CCustomerAccountV2", { enumerable: true, get: function () { return functions_5.deleteB2CCustomerAccount; } });
Object.defineProperty(exports, "toggleCustomerActiveStatusV2", { enumerable: true, get: function () { return functions_5.toggleCustomerActiveStatus; } });
Object.defineProperty(exports, "createAdminUserV2", { enumerable: true, get: function () { return functions_5.createAdminUser; } });
Object.defineProperty(exports, "checkNamedDatabaseV2", { enumerable: true, get: function () { return functions_5.checkNamedDatabase; } });
Object.defineProperty(exports, "debugDatabaseV2", { enumerable: true, get: function () { return functions_5.debugDatabase; } });
// Import payment functions for Stripe integration
const createPaymentIntent_1 = require("./payment/createPaymentIntent");
Object.defineProperty(exports, "createPaymentIntentV2", { enumerable: true, get: function () { return createPaymentIntent_1.createPaymentIntentV2; } });
const createPaymentIntentMinimal_1 = require("./payment/createPaymentIntentMinimal");
Object.defineProperty(exports, "createPaymentIntentMinimalV2", { enumerable: true, get: function () { return createPaymentIntentMinimal_1.createPaymentIntentMinimalV2; } });
const stripeWebhook_1 = require("./payment/stripeWebhook");
Object.defineProperty(exports, "stripeWebhookV2", { enumerable: true, get: function () { return stripeWebhook_1.stripeWebhookV2; } });
const stripeWebhookSimple_1 = require("./payment/stripeWebhookSimple");
Object.defineProperty(exports, "stripeWebhookSimple", { enumerable: true, get: function () { return stripeWebhookSimple_1.stripeWebhookSimple; } });
// Import website scraper functions for DiningWagon
const functions_6 = require("./website-scraper/functions");
Object.defineProperty(exports, "scrapeWebsiteMetaV2", { enumerable: true, get: function () { return functions_6.scrapeWebsiteMeta; } });
// Example protected HTTP function - TESTING
exports.exampleProtectedFunction = (0, https_1.onRequest)({ cors: true }, async (request, response) => {
    // Apply CORS protection
    if (!(0, cors_handler_1.corsHandler)(request, response)) {
        return;
    }
    // Apply rate limiting
    if (!await (0, rate_limiter_1.rateLimiter)(request, response)) {
        return;
    }
    // Function logic here
    response.json({ message: 'Protected function executed successfully' });
});
// Debug functions
var debug_order_data_1 = require("./debug-order-data");
Object.defineProperty(exports, "debugOrderData", { enumerable: true, get: function () { return debug_order_data_1.debugOrderData; } });
var debug_product_fields_1 = require("./debug-product-fields");
Object.defineProperty(exports, "debugProductFields", { enumerable: true, get: function () { return debug_product_fields_1.debugProductFields; } });
// OLD V1/V2/V3 EMAIL SYSTEM FUNCTIONS - MOVED TO QUARANTINE
// All old email functions have been migrated to the new Email Orchestrator system
// Old files moved to: functions/quarantine/old-email-systems/
// New system: functions/src/email-orchestrator/ 
//# sourceMappingURL=index.js.map