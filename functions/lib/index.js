"use strict";
// V2 FUNCTIONS BATCH 4 - Direct imports to avoid circular dependencies
// EMAIL ORCHESTRATOR SYSTEM - Unified email functions
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmPasswordReset = exports.confirmPasswordResetV2 = exports.scrapeWebsiteMetaV2 = exports.refundOrder = exports.setShopCommission = exports.createConnectLoginLink = exports.refreshConnectStatus = exports.createConnectAccountLink = exports.createConnectAccount = exports.stripeWebhookV2 = exports.createPaymentIntentV2 = exports.syncAdminClaims = exports.createAdminUserV2 = exports.toggleCustomerActiveStatusV2 = exports.deleteB2CCustomerAccountV2 = exports.deleteCustomerAccountV2 = exports.getGeoDataV2 = exports.syncUserClaimsOnWrite = exports.createB2BOrder = exports.reverseAffiliateCommissionOnCancel = exports.processB2COrderCompletionHttpV2 = exports.validateDiscountCode = exports.logAffiliateClickV2 = exports.sendAffiliateApplicationEmails = exports.verifyEmailCode = exports.sendCustomEmailVerification = exports.sendEmailVerification = exports.createShopUser = exports.approveAffiliate = exports.sendAffiliateWelcomeEmail = exports.sendLoginCredentialsEmail = exports.sendPasswordResetEmail = exports.sendOrderNotificationAdmin = exports.sendOrderStatusUpdateEmail = exports.sendOrderConfirmationEmail = void 0;
// Initialize Firebase Admin SDK
const app_1 = require("firebase-admin/app");
(0, app_1.initializeApp)();
// NEW UNIFIED EMAIL ORCHESTRATOR FUNCTIONS
var functions_1 = require("./email-orchestrator/functions");
Object.defineProperty(exports, "sendOrderConfirmationEmail", { enumerable: true, get: function () { return functions_1.sendOrderConfirmationEmail; } });
Object.defineProperty(exports, "sendOrderStatusUpdateEmail", { enumerable: true, get: function () { return functions_1.sendOrderStatusUpdateEmail; } });
Object.defineProperty(exports, "sendOrderNotificationAdmin", { enumerable: true, get: function () { return functions_1.sendOrderNotificationAdmin; } });
Object.defineProperty(exports, "sendPasswordResetEmail", { enumerable: true, get: function () { return functions_1.sendPasswordResetEmail; } });
Object.defineProperty(exports, "sendLoginCredentialsEmail", { enumerable: true, get: function () { return functions_1.sendLoginCredentialsEmail; } });
Object.defineProperty(exports, "sendAffiliateWelcomeEmail", { enumerable: true, get: function () { return functions_1.sendAffiliateWelcomeEmail; } });
Object.defineProperty(exports, "approveAffiliate", { enumerable: true, get: function () { return functions_1.approveAffiliate; } });
Object.defineProperty(exports, "createShopUser", { enumerable: true, get: function () { return functions_1.createShopUser; } });
Object.defineProperty(exports, "sendEmailVerification", { enumerable: true, get: function () { return functions_1.sendEmailVerification; } });
Object.defineProperty(exports, "sendCustomEmailVerification", { enumerable: true, get: function () { return functions_1.sendCustomEmailVerification; } });
Object.defineProperty(exports, "verifyEmailCode", { enumerable: true, get: function () { return functions_1.verifyEmailCode; } });
Object.defineProperty(exports, "sendAffiliateApplicationEmails", { enumerable: true, get: function () { return functions_1.sendAffiliateApplicationEmails; } });
// Import confirmPasswordReset separately for aliasing
const functions_2 = require("./email-orchestrator/functions");
Object.defineProperty(exports, "confirmPasswordResetV2", { enumerable: true, get: function () { return functions_2.confirmPasswordReset; } });
Object.defineProperty(exports, "confirmPasswordReset", { enumerable: true, get: function () { return functions_2.confirmPasswordReset; } });
// Import affiliate functions directly (avoiding export * circular imports)
const logAffiliateClick_1 = require("./affiliate/callable/logAffiliateClick");
Object.defineProperty(exports, "logAffiliateClickV2", { enumerable: true, get: function () { return logAffiliateClick_1.logAffiliateClickV2; } });
const validateDiscountCode_1 = require("./affiliate/callable/validateDiscountCode");
Object.defineProperty(exports, "validateDiscountCode", { enumerable: true, get: function () { return validateDiscountCode_1.validateDiscountCode; } });
// logAffiliateClickHttpV2 removed: unauthenticated CORS-* endpoint allowed
// anyone to inflate any affiliate's click stats; the SPA uses the callable.
// processAffiliateConversionV2 removed: deprecated no-op trigger.
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
Object.defineProperty(exports, "processB2COrderCompletionHttpV2", { enumerable: true, get: function () { return functions_3.processB2COrderCompletionHttp // single order-completion engine (idempotent)
    ; } });
const commissionReversal_1 = require("./order-processing/commissionReversal");
Object.defineProperty(exports, "reverseAffiliateCommissionOnCancel", { enumerable: true, get: function () { return commissionReversal_1.reverseAffiliateCommissionOnCancel; } });
// B2B Faktura ordering (Phase 4 v1): server-side order creation for the B2B
// wholesale portal (orders are client-uncreatable; totals computed from b2bPrice).
const createB2BOrder_1 = require("./order-processing/createB2BOrder");
Object.defineProperty(exports, "createB2BOrder", { enumerable: true, get: function () { return createB2BOrder_1.createB2BOrder; } });
// Tenant isolation: keep Auth custom claims (role/shopId/platform) in sync with
// the users doc on every write + revoke tokens on privilege reduction.
const syncUserClaimsOnWrite_1 = require("./auth/syncUserClaimsOnWrite");
Object.defineProperty(exports, "syncUserClaimsOnWrite", { enumerable: true, get: function () { return syncUserClaimsOnWrite_1.syncUserClaimsOnWrite; } });
// Import geo functions for B2C shop currency detection
const functions_4 = require("./geo/functions");
Object.defineProperty(exports, "getGeoDataV2", { enumerable: true, get: function () { return functions_4.getGeoData; } });
// Google Merchant Center integration removed (POD shops don't need Google Shopping feeds).
// Import customer-admin functions directly with original names
const functions_5 = require("./customer-admin/functions");
Object.defineProperty(exports, "deleteCustomerAccountV2", { enumerable: true, get: function () { return functions_5.deleteCustomerAccount; } });
Object.defineProperty(exports, "deleteB2CCustomerAccountV2", { enumerable: true, get: function () { return functions_5.deleteB2CCustomerAccount; } });
Object.defineProperty(exports, "toggleCustomerActiveStatusV2", { enumerable: true, get: function () { return functions_5.toggleCustomerActiveStatus; } });
Object.defineProperty(exports, "createAdminUserV2", { enumerable: true, get: function () { return functions_5.createAdminUser; } });
Object.defineProperty(exports, "syncAdminClaims", { enumerable: true, get: function () { return functions_5.syncAdminClaims; } });
// Import payment functions for Stripe integration
const createPaymentIntent_1 = require("./payment/createPaymentIntent");
Object.defineProperty(exports, "createPaymentIntentV2", { enumerable: true, get: function () { return createPaymentIntent_1.createPaymentIntentV2; } });
const stripeWebhook_1 = require("./payment/stripeWebhook");
Object.defineProperty(exports, "stripeWebhookV2", { enumerable: true, get: function () { return stripeWebhook_1.stripeWebhookV2; } });
// Stripe Connect — onboarding callables (Slice 1)
const connectOnboarding_1 = require("./payment/connectOnboarding");
Object.defineProperty(exports, "createConnectAccount", { enumerable: true, get: function () { return connectOnboarding_1.createConnectAccount; } });
Object.defineProperty(exports, "createConnectAccountLink", { enumerable: true, get: function () { return connectOnboarding_1.createConnectAccountLink; } });
Object.defineProperty(exports, "refreshConnectStatus", { enumerable: true, get: function () { return connectOnboarding_1.refreshConnectStatus; } });
Object.defineProperty(exports, "createConnectLoginLink", { enumerable: true, get: function () { return connectOnboarding_1.createConnectLoginLink; } });
Object.defineProperty(exports, "setShopCommission", { enumerable: true, get: function () { return connectOnboarding_1.setShopCommission; } });
const connectRefund_1 = require("./payment/connectRefund");
Object.defineProperty(exports, "refundOrder", { enumerable: true, get: function () { return connectRefund_1.refundOrder; } });
// Import website scraper functions for DiningWagon
const functions_6 = require("./website-scraper/functions");
Object.defineProperty(exports, "scrapeWebsiteMetaV2", { enumerable: true, get: function () { return functions_6.scrapeWebsiteMeta; } });
// OLD V1/V2/V3 EMAIL SYSTEM FUNCTIONS - MOVED TO QUARANTINE
// All old email functions have been migrated to the new Email Orchestrator system
// Old files moved to: functions/quarantine/old-email-systems/
// New system: functions/src/email-orchestrator/ 
//# sourceMappingURL=index.js.map