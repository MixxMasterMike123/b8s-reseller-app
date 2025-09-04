"use strict";
// V2 FUNCTIONS BATCH 4 - Direct imports to avoid circular dependencies
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAffiliateWelcomeEmailV3 = exports.sendCustomerWelcomeEmailV3 = exports.confirmPasswordResetV3 = exports.sendPasswordResetV3 = exports.forceSyncProducts = exports.getProductSyncStatus = exports.getGoogleMerchantStats = exports.googleMerchantOnProductDeleted = exports.googleMerchantOnProductUpdated = exports.googleMerchantOnProductCreated = exports.testGoogleMerchantConnection = exports.syncSingleProductToGoogle = exports.syncProductsToGoogleHttp = exports.syncAllProductsToGoogle = exports.testPasswordResetMinimal = exports.exampleProtectedFunction = exports.scrapeWebsiteMetaV2 = exports.createPaymentIntentMinimalV2 = exports.createPaymentIntentV2 = exports.debugDatabaseV2 = exports.checkNamedDatabaseV2 = exports.createAdminUserV2 = exports.toggleCustomerActiveStatusV2 = exports.deleteB2CCustomerAccountV2 = exports.deleteCustomerAccountV2 = exports.testGeoHeadersV2 = exports.getGeoDataV2 = exports.manualStatusUpdateV2 = exports.processB2COrderCompletionV2 = exports.processB2COrderCompletionHttpV2 = exports.confirmPasswordResetV2 = exports.sendPasswordResetEmailV2 = exports.sendAffiliateCredentialsV2 = exports.sendVerificationEmailV2 = exports.sendStatusUpdateHttpV2 = exports.approveAffiliateV2 = exports.testEmailV2 = exports.updateCustomerEmailV2 = exports.sendOrderStatusUpdateEmailV2 = exports.sendUserActivationEmailV2 = exports.sendB2COrderPendingEmailV2 = exports.sendB2COrderNotificationAdminV2 = exports.sendOrderStatusEmailV2 = exports.sendB2BOrderConfirmationCustomerV2 = exports.sendB2BOrderConfirmationAdminV2 = exports.sendAffiliateWelcomeEmailV2 = exports.sendCustomerWelcomeEmailV2 = exports.processAffiliateConversionV2 = exports.logAffiliateClickHttpV2 = exports.logAffiliateClickV2 = void 0;
exports.sendOrderConfirmationEmailsV3 = exports.approveAffiliateV3 = exports.sendAffiliateCredentialsV3 = exports.sendVerificationEmailV3 = exports.sendB2BOrderConfirmationAdminV3 = exports.sendOrderStatusEmailV3 = exports.sendB2BOrderConfirmationCustomerV3 = exports.sendB2COrderNotificationAdminV3 = exports.sendB2COrderPendingEmailV3 = void 0;
const https_1 = require("firebase-functions/v2/https");
const cors_handler_1 = require("./protection/cors/cors-handler");
const rate_limiter_1 = require("./protection/rate-limiting/rate-limiter");
// Import affiliate functions directly (avoiding export * circular imports)
const logAffiliateClick_1 = require("./affiliate/callable/logAffiliateClick");
Object.defineProperty(exports, "logAffiliateClickV2", { enumerable: true, get: function () { return logAffiliateClick_1.logAffiliateClickV2; } });
const logAffiliateClickHttp_1 = require("./affiliate/http/logAffiliateClickHttp");
Object.defineProperty(exports, "logAffiliateClickHttpV2", { enumerable: true, get: function () { return logAffiliateClickHttp_1.logAffiliateClickHttpV2; } });
const processAffiliateConversion_1 = require("./affiliate/triggers/processAffiliateConversion");
Object.defineProperty(exports, "processAffiliateConversionV2", { enumerable: true, get: function () { return processAffiliateConversion_1.processAffiliateConversionV2; } });
// Debug functions removed - found the real issue
// Import email functions directly with original names from email/functions.ts
const functions_1 = require("./email/functions");
Object.defineProperty(exports, "sendCustomerWelcomeEmailV2", { enumerable: true, get: function () { return functions_1.sendCustomerWelcomeEmail; } });
Object.defineProperty(exports, "sendAffiliateWelcomeEmailV2", { enumerable: true, get: function () { return functions_1.sendAffiliateWelcomeEmail; } });
Object.defineProperty(exports, "sendB2BOrderConfirmationAdminV2", { enumerable: true, get: function () { return functions_1.sendB2BOrderConfirmationAdmin; } });
Object.defineProperty(exports, "sendB2BOrderConfirmationCustomerV2", { enumerable: true, get: function () { return functions_1.sendB2BOrderConfirmationCustomer; } });
Object.defineProperty(exports, "sendOrderStatusEmailV2", { enumerable: true, get: function () { return functions_1.sendOrderStatusEmail; } });
Object.defineProperty(exports, "sendB2COrderNotificationAdminV2", { enumerable: true, get: function () { return functions_1.sendB2COrderNotificationAdmin; } });
Object.defineProperty(exports, "sendB2COrderPendingEmailV2", { enumerable: true, get: function () { return functions_1.sendB2COrderPendingEmail; } });
Object.defineProperty(exports, "sendUserActivationEmailV2", { enumerable: true, get: function () { return 
    // sendOrderConfirmationEmails, // DISABLED: Using V3 instead
    functions_1.sendUserActivationEmail; } });
Object.defineProperty(exports, "sendOrderStatusUpdateEmailV2", { enumerable: true, get: function () { return functions_1.sendOrderStatusUpdateEmail; } });
Object.defineProperty(exports, "updateCustomerEmailV2", { enumerable: true, get: function () { return functions_1.updateCustomerEmail; } });
Object.defineProperty(exports, "testEmailV2", { enumerable: true, get: function () { return functions_1.testEmail; } });
Object.defineProperty(exports, "approveAffiliateV2", { enumerable: true, get: function () { return functions_1.approveAffiliate; } });
Object.defineProperty(exports, "sendStatusUpdateHttpV2", { enumerable: true, get: function () { return functions_1.sendStatusUpdateHttp; } });
Object.defineProperty(exports, "sendVerificationEmailV2", { enumerable: true, get: function () { return functions_1.sendVerificationEmail; } });
Object.defineProperty(exports, "sendAffiliateCredentialsV2", { enumerable: true, get: function () { return functions_1.sendAffiliateCredentialsV2; } });
Object.defineProperty(exports, "sendPasswordResetEmailV2", { enumerable: true, get: function () { return functions_1.sendPasswordResetEmailV2; } });
Object.defineProperty(exports, "confirmPasswordResetV2", { enumerable: true, get: function () { return functions_1.confirmPasswordResetV2; } });
// Import order processing functions directly with original names
const functions_2 = require("./order-processing/functions");
Object.defineProperty(exports, "processB2COrderCompletionHttpV2", { enumerable: true, get: function () { return functions_2.processB2COrderCompletionHttp; } });
Object.defineProperty(exports, "processB2COrderCompletionV2", { enumerable: true, get: function () { return functions_2.processB2COrderCompletion; } });
Object.defineProperty(exports, "manualStatusUpdateV2", { enumerable: true, get: function () { return functions_2.manualStatusUpdate; } });
// Import geo functions for B2C shop currency detection
const functions_3 = require("./geo/functions");
Object.defineProperty(exports, "getGeoDataV2", { enumerable: true, get: function () { return functions_3.getGeoData; } });
Object.defineProperty(exports, "testGeoHeadersV2", { enumerable: true, get: function () { return functions_3.testGeoHeaders; } });
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
const functions_4 = require("./customer-admin/functions");
Object.defineProperty(exports, "deleteCustomerAccountV2", { enumerable: true, get: function () { return functions_4.deleteCustomerAccount; } });
Object.defineProperty(exports, "deleteB2CCustomerAccountV2", { enumerable: true, get: function () { return functions_4.deleteB2CCustomerAccount; } });
Object.defineProperty(exports, "toggleCustomerActiveStatusV2", { enumerable: true, get: function () { return functions_4.toggleCustomerActiveStatus; } });
Object.defineProperty(exports, "createAdminUserV2", { enumerable: true, get: function () { return functions_4.createAdminUser; } });
Object.defineProperty(exports, "checkNamedDatabaseV2", { enumerable: true, get: function () { return functions_4.checkNamedDatabase; } });
Object.defineProperty(exports, "debugDatabaseV2", { enumerable: true, get: function () { return functions_4.debugDatabase; } });
// Import payment functions for Stripe integration
const createPaymentIntent_1 = require("./payment/createPaymentIntent");
Object.defineProperty(exports, "createPaymentIntentV2", { enumerable: true, get: function () { return createPaymentIntent_1.createPaymentIntentV2; } });
const createPaymentIntentMinimal_1 = require("./payment/createPaymentIntentMinimal");
Object.defineProperty(exports, "createPaymentIntentMinimalV2", { enumerable: true, get: function () { return createPaymentIntentMinimal_1.createPaymentIntentMinimalV2; } });
// Import website scraper functions for DiningWagon
const functions_5 = require("./website-scraper/functions");
Object.defineProperty(exports, "scrapeWebsiteMetaV2", { enumerable: true, get: function () { return functions_5.scrapeWebsiteMeta; } });
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
// Test function for debugging email issues
var testPasswordReset_1 = require("./email/testPasswordReset");
Object.defineProperty(exports, "testPasswordResetMinimal", { enumerable: true, get: function () { return testPasswordReset_1.testPasswordResetMinimal; } });
// New V3 Email System Functions
var functions_6 = require("./email-v2/functions");
Object.defineProperty(exports, "sendPasswordResetV3", { enumerable: true, get: function () { return functions_6.sendPasswordResetV3; } });
Object.defineProperty(exports, "confirmPasswordResetV3", { enumerable: true, get: function () { return functions_6.confirmPasswordResetV3; } });
var functions_main_1 = require("./email-v2/functions-main");
Object.defineProperty(exports, "sendCustomerWelcomeEmailV3", { enumerable: true, get: function () { return functions_main_1.sendCustomerWelcomeEmailV3; } });
Object.defineProperty(exports, "sendAffiliateWelcomeEmailV3", { enumerable: true, get: function () { return functions_main_1.sendAffiliateWelcomeEmailV3; } });
Object.defineProperty(exports, "sendB2COrderPendingEmailV3", { enumerable: true, get: function () { return functions_main_1.sendB2COrderPendingEmailV3; } });
Object.defineProperty(exports, "sendB2COrderNotificationAdminV3", { enumerable: true, get: function () { return functions_main_1.sendB2COrderNotificationAdminV3; } });
Object.defineProperty(exports, "sendB2BOrderConfirmationCustomerV3", { enumerable: true, get: function () { return functions_main_1.sendB2BOrderConfirmationCustomerV3; } });
Object.defineProperty(exports, "sendOrderStatusEmailV3", { enumerable: true, get: function () { return functions_main_1.sendOrderStatusEmailV3; } });
Object.defineProperty(exports, "sendB2BOrderConfirmationAdminV3", { enumerable: true, get: function () { return functions_main_1.sendB2BOrderConfirmationAdminV3; } });
Object.defineProperty(exports, "sendVerificationEmailV3", { enumerable: true, get: function () { return functions_main_1.sendVerificationEmailV3; } });
Object.defineProperty(exports, "sendAffiliateCredentialsV3", { enumerable: true, get: function () { return functions_main_1.sendAffiliateCredentialsV3; } });
Object.defineProperty(exports, "approveAffiliateV3", { enumerable: true, get: function () { return functions_main_1.approveAffiliateV3; } });
// Debug functions removed - found the real issue
// V3 Email System Triggers
var triggers_1 = require("./email-v2/triggers");
Object.defineProperty(exports, "sendOrderConfirmationEmailsV3", { enumerable: true, get: function () { return triggers_1.sendOrderConfirmationEmailsV3; } });
//# sourceMappingURL=index.js.map