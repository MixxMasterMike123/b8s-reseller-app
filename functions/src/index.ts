// V2 FUNCTIONS BATCH 4 - Direct imports to avoid circular dependencies
// EMAIL ORCHESTRATOR SYSTEM - Unified email functions

// Initialize Firebase Admin SDK
import { initializeApp } from 'firebase-admin/app';
initializeApp();

import { onRequest } from 'firebase-functions/v2/https';
import { corsHandler } from './protection/cors/cors-handler';
import { rateLimiter } from './protection/rate-limiting/rate-limiter';

// NEW UNIFIED EMAIL ORCHESTRATOR FUNCTIONS
export { 
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
  sendOrderNotificationAdmin,
  sendPasswordResetEmail,
  sendLoginCredentialsEmail,
  sendAffiliateWelcomeEmail,
  approveAffiliate,
  sendEmailVerification,
  sendCustomEmailVerification,
  verifyEmailCode,
  sendAffiliateApplicationEmails,
  testEmailOrchestrator
} from './email-orchestrator/functions';

// Import confirmPasswordReset separately for aliasing
import { confirmPasswordReset } from './email-orchestrator/functions';

// Import affiliate functions directly (avoiding export * circular imports)
import { logAffiliateClickV2 } from './affiliate/callable/logAffiliateClick';
import { logAffiliateClickHttpV2 } from './affiliate/http/logAffiliateClickHttp';
import { processAffiliateConversionV2 } from './affiliate/triggers/processAffiliateConversion';

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
import {
  processB2COrderCompletionHttp, // RE-ENABLED: Critical for affiliate processing
  processB2COrderCompletion,
  manualStatusUpdate
} from './order-processing/functions';

// Import geo functions for B2C shop currency detection
import {
  getGeoData,
  testGeoHeaders
} from './geo/functions';

// Import Google Merchant Center sync functions
import {
  syncAllProductsToGoogle,
  syncProductsToGoogleHttp,
  syncSingleProductToGoogle,
  testGoogleMerchantConnection,
  onProductCreated as googleMerchantOnProductCreated,
  onProductUpdated as googleMerchantOnProductUpdated,
  onProductDeleted as googleMerchantOnProductDeleted
} from './google-merchant/sync-functions';

// Import Google Merchant Center admin functions
import {
  getGoogleMerchantStats,
  getProductSyncStatus,
  forceSyncProducts
} from './google-merchant/admin-functions';

// Import customer-admin functions directly with original names
import {
  deleteCustomerAccount,
  deleteB2CCustomerAccount,
  toggleCustomerActiveStatus,
  createAdminUser,
  checkNamedDatabase,
  debugDatabase
} from './customer-admin/functions';

// Import payment functions for Stripe integration
import {
  createPaymentIntentV2
} from './payment/createPaymentIntent';
import {
  createPaymentIntentMinimalV2
} from './payment/createPaymentIntentMinimal';

// Import website scraper functions for DiningWagon
import {
  scrapeWebsiteMeta
} from './website-scraper/functions';

// Re-export affiliate functions individually with V2 names (avoid V1 conflicts)
export { logAffiliateClickV2, logAffiliateClickHttpV2, processAffiliateConversionV2 };

// OLD EMAIL FUNCTIONS MOVED TO QUARANTINE - NO LONGER EXPORTED
// All email functionality now handled by Email Orchestrator system
// sendStatusUpdateHttp and sendUserActivationEmail moved to quarantine

// Re-export order processing functions individually with V2 names (avoid V1 conflicts)
export {
  processB2COrderCompletionHttp as processB2COrderCompletionHttpV2, // RE-ENABLED: Critical for affiliate processing
  processB2COrderCompletion as processB2COrderCompletionV2,
  manualStatusUpdate as manualStatusUpdateV2
};

// Re-export geo functions for B2C shop currency detection
export {
  getGeoData as getGeoDataV2,
  testGeoHeaders as testGeoHeadersV2
};

// Re-export customer-admin functions individually with V2 names (avoid V1 conflicts)
export {
  deleteCustomerAccount as deleteCustomerAccountV2,
  deleteB2CCustomerAccount as deleteB2CCustomerAccountV2,
  toggleCustomerActiveStatus as toggleCustomerActiveStatusV2,
  createAdminUser as createAdminUserV2,
  checkNamedDatabase as checkNamedDatabaseV2,
  debugDatabase as debugDatabaseV2
};

// Re-export payment functions for Stripe integration
export {
  createPaymentIntentV2,
  createPaymentIntentMinimalV2
};

// Re-export website scraper functions for DiningWagon
export {
  scrapeWebsiteMeta as scrapeWebsiteMetaV2
};

// Re-export orchestrator functions with V2 aliases for backward compatibility
export { confirmPasswordReset as confirmPasswordResetV2 };

// Also export the main function
export { confirmPasswordReset };

// Example protected HTTP function - TESTING
export const exampleProtectedFunction = onRequest(
  { cors: true },
  async (request, response) => {
    // Apply CORS protection
    if (!corsHandler(request, response)) {
      return;
    }

    // Apply rate limiting
    if (!await rateLimiter(request, response)) {
      return;
    }

    // Function logic here
    response.json({ message: 'Protected function executed successfully' });
  }
);

// Test function for debugging email issues
// OLD FUNCTION MOVED TO QUARANTINE - testPasswordResetMinimal no longer available
// Use Email Orchestrator system for password reset testing

// Create V2 alias for backward compatibility with existing frontend code
// (moved to re-export section below)

// Google Merchant Center Integration
export {
  syncAllProductsToGoogle,
  syncProductsToGoogleHttp,
  syncSingleProductToGoogle,
  testGoogleMerchantConnection,
  googleMerchantOnProductCreated,
  googleMerchantOnProductUpdated,
  googleMerchantOnProductDeleted,
  getGoogleMerchantStats,
  getProductSyncStatus,
  forceSyncProducts
};

// OLD V1/V2/V3 EMAIL SYSTEM FUNCTIONS - MOVED TO QUARANTINE
// All old email functions have been migrated to the new Email Orchestrator system
// Old files moved to: functions/quarantine/old-email-systems/
// New system: functions/src/email-orchestrator/ 