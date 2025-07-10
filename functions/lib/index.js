"use strict";
// V2 FUNCTIONS BATCH 4 - Direct imports to avoid circular dependencies
Object.defineProperty(exports, "__esModule", { value: true });
exports.exampleProtectedFunction = exports.debugDatabaseV2 = exports.checkNamedDatabaseV2 = exports.createAdminUserV2 = exports.toggleCustomerActiveStatusV2 = exports.deleteCustomerAccountV2 = exports.testOrderUpdateV2 = exports.manualStatusUpdateV2 = exports.processB2COrderCompletionV2 = exports.processB2COrderCompletionHttpV2 = exports.approveAffiliateV2 = exports.testEmailV2 = exports.updateCustomerEmailV2 = exports.sendOrderStatusUpdateEmailV2 = exports.sendUserActivationEmailV2 = exports.sendOrderConfirmationEmailsV2 = exports.sendB2COrderPendingEmailV2 = exports.sendB2COrderNotificationAdminV2 = exports.sendOrderStatusEmailV2 = exports.sendB2BOrderConfirmationCustomerV2 = exports.sendB2BOrderConfirmationAdminV2 = exports.sendAffiliateWelcomeEmailV2 = exports.sendCustomerWelcomeEmailV2 = exports.processAffiliateConversionV2 = exports.logAffiliateClickHttpV2 = exports.logAffiliateClickV2 = void 0;
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
// Import email functions directly (V2 with suffixes to avoid V1 conflicts)
const functions_1 = require("./email/functions");
Object.defineProperty(exports, "sendCustomerWelcomeEmailV2", { enumerable: true, get: function () { return functions_1.sendCustomerWelcomeEmail; } });
Object.defineProperty(exports, "sendAffiliateWelcomeEmailV2", { enumerable: true, get: function () { return functions_1.sendAffiliateWelcomeEmail; } });
Object.defineProperty(exports, "sendB2BOrderConfirmationAdminV2", { enumerable: true, get: function () { return functions_1.sendB2BOrderConfirmationAdmin; } });
Object.defineProperty(exports, "sendB2BOrderConfirmationCustomerV2", { enumerable: true, get: function () { return functions_1.sendB2BOrderConfirmationCustomer; } });
Object.defineProperty(exports, "sendOrderStatusEmailV2", { enumerable: true, get: function () { return functions_1.sendOrderStatusEmail; } });
Object.defineProperty(exports, "sendB2COrderNotificationAdminV2", { enumerable: true, get: function () { return functions_1.sendB2COrderNotificationAdmin; } });
Object.defineProperty(exports, "sendB2COrderPendingEmailV2", { enumerable: true, get: function () { return functions_1.sendB2COrderPendingEmail; } });
Object.defineProperty(exports, "sendOrderConfirmationEmailsV2", { enumerable: true, get: function () { return functions_1.sendOrderConfirmationEmails; } });
Object.defineProperty(exports, "sendUserActivationEmailV2", { enumerable: true, get: function () { return functions_1.sendUserActivationEmail; } });
Object.defineProperty(exports, "sendOrderStatusUpdateEmailV2", { enumerable: true, get: function () { return functions_1.sendOrderStatusUpdateEmail; } });
Object.defineProperty(exports, "updateCustomerEmailV2", { enumerable: true, get: function () { return functions_1.updateCustomerEmail; } });
Object.defineProperty(exports, "testEmailV2", { enumerable: true, get: function () { return functions_1.testEmail; } });
Object.defineProperty(exports, "approveAffiliateV2", { enumerable: true, get: function () { return functions_1.approveAffiliate; } });
// Import order processing functions directly (V2 with suffixes to avoid V1 conflicts)
const functions_2 = require("./order-processing/functions");
Object.defineProperty(exports, "processB2COrderCompletionHttpV2", { enumerable: true, get: function () { return functions_2.processB2COrderCompletionHttp; } });
Object.defineProperty(exports, "processB2COrderCompletionV2", { enumerable: true, get: function () { return functions_2.processB2COrderCompletion; } });
Object.defineProperty(exports, "manualStatusUpdateV2", { enumerable: true, get: function () { return functions_2.manualStatusUpdate; } });
Object.defineProperty(exports, "testOrderUpdateV2", { enumerable: true, get: function () { return functions_2.testOrderUpdate; } });
// Import customer-admin functions directly (V2 with suffixes to avoid V1 conflicts)
const functions_3 = require("./customer-admin/functions");
Object.defineProperty(exports, "deleteCustomerAccountV2", { enumerable: true, get: function () { return functions_3.deleteCustomerAccount; } });
Object.defineProperty(exports, "toggleCustomerActiveStatusV2", { enumerable: true, get: function () { return functions_3.toggleCustomerActiveStatus; } });
Object.defineProperty(exports, "createAdminUserV2", { enumerable: true, get: function () { return functions_3.createAdminUser; } });
Object.defineProperty(exports, "checkNamedDatabaseV2", { enumerable: true, get: function () { return functions_3.checkNamedDatabase; } });
Object.defineProperty(exports, "debugDatabaseV2", { enumerable: true, get: function () { return functions_3.debugDatabase; } });
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
//# sourceMappingURL=index.js.map