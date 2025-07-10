"use strict";
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exampleProtectedFunction = exports.updateCustomerEmail = exports.testEmail = exports.sendOrderStatusUpdateEmail = exports.sendUserActivationEmail = exports.sendOrderConfirmationEmails = exports.sendB2COrderPendingEmail = exports.sendB2COrderNotificationAdmin = exports.sendOrderStatusEmail = void 0;
const https_1 = require("firebase-functions/v2/https");
const cors_handler_1 = require("./protection/cors/cors-handler");
const rate_limiter_1 = require("./protection/rate-limiting/rate-limiter");
// Export email functions
__exportStar(require("./email/functions"), exports);
// Order status update email
var functions_1 = require("./email/functions");
Object.defineProperty(exports, "sendOrderStatusEmail", { enumerable: true, get: function () { return functions_1.sendOrderStatusEmail; } });
// B2C order emails
var functions_2 = require("./email/functions");
Object.defineProperty(exports, "sendB2COrderNotificationAdmin", { enumerable: true, get: function () { return functions_2.sendB2COrderNotificationAdmin; } });
Object.defineProperty(exports, "sendB2COrderPendingEmail", { enumerable: true, get: function () { return functions_2.sendB2COrderPendingEmail; } });
// Firestore triggers for email notifications
var functions_3 = require("./email/functions");
Object.defineProperty(exports, "sendOrderConfirmationEmails", { enumerable: true, get: function () { return functions_3.sendOrderConfirmationEmails; } });
Object.defineProperty(exports, "sendUserActivationEmail", { enumerable: true, get: function () { return functions_3.sendUserActivationEmail; } });
Object.defineProperty(exports, "sendOrderStatusUpdateEmail", { enumerable: true, get: function () { return functions_3.sendOrderStatusUpdateEmail; } });
Object.defineProperty(exports, "testEmail", { enumerable: true, get: function () { return functions_3.testEmail; } });
// Customer email update
var functions_4 = require("./email/functions");
Object.defineProperty(exports, "updateCustomerEmail", { enumerable: true, get: function () { return functions_4.updateCustomerEmail; } });
// Example protected HTTP function
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