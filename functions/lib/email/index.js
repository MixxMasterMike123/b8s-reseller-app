"use strict";
// Email functions - modular exports
// V2 Firebase Functions organized by type
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOrderConfirmationEmails = exports.testEmail = exports.approveAffiliate = exports.sendAffiliateWelcomeEmail = exports.sendCustomerWelcomeEmail = void 0;
// === CALLABLE FUNCTIONS ===
var sendCustomerWelcomeEmail_1 = require("./callable/sendCustomerWelcomeEmail");
Object.defineProperty(exports, "sendCustomerWelcomeEmail", { enumerable: true, get: function () { return sendCustomerWelcomeEmail_1.sendCustomerWelcomeEmail; } });
var sendAffiliateWelcomeEmail_1 = require("./callable/sendAffiliateWelcomeEmail");
Object.defineProperty(exports, "sendAffiliateWelcomeEmail", { enumerable: true, get: function () { return sendAffiliateWelcomeEmail_1.sendAffiliateWelcomeEmail; } });
var approveAffiliate_1 = require("./callable/approveAffiliate");
Object.defineProperty(exports, "approveAffiliate", { enumerable: true, get: function () { return approveAffiliate_1.approveAffiliate; } });
// Note: The following functions still need to be extracted from functions.ts:
// - sendB2BOrderConfirmationAdmin
// - sendB2BOrderConfirmationCustomer  
// - sendOrderStatusEmail
// - sendB2COrderNotificationAdmin
// - sendB2COrderPendingEmail
// - updateCustomerEmail
// === HTTP FUNCTIONS ===
var testEmail_1 = require("./http/testEmail");
Object.defineProperty(exports, "testEmail", { enumerable: true, get: function () { return testEmail_1.testEmail; } });
// === FIRESTORE TRIGGERS ===
var sendOrderConfirmationEmails_1 = require("./triggers/sendOrderConfirmationEmails");
Object.defineProperty(exports, "sendOrderConfirmationEmails", { enumerable: true, get: function () { return sendOrderConfirmationEmails_1.sendOrderConfirmationEmails; } });
// Note: The following triggers still need to be extracted from functions.ts:
// - sendUserActivationEmail
// - sendOrderStatusUpdateEmail
// === SHARED UTILITIES ===
// These are used internally by the functions and not exported to the main index
// - shared-utils.ts contains common helper functions and types 
//# sourceMappingURL=index.js.map