// V2 FUNCTIONS BATCH 4 - Direct imports to avoid circular dependencies

import { onRequest } from 'firebase-functions/v2/https';
import { corsHandler } from './protection/cors/cors-handler';
import { rateLimiter } from './protection/rate-limiting/rate-limiter';

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

// Keep only non-email functions from the legacy system
import { 
  sendStatusUpdateHttp,
  sendUserActivationEmail  // TODO: Migrate to V3
} from './email/functions';

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

// LEGACY EMAIL FUNCTIONS DISABLED - ALL EMAIL NOW USES V3 SYSTEM
// Only keep non-email functions from legacy system
export { 
  sendStatusUpdateHttp as sendStatusUpdateHttpV2,
  sendUserActivationEmail as sendUserActivationEmailV2  // TODO: Migrate to V3
};

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
export { testPasswordResetMinimal } from './email/testPasswordReset';

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

// New V3 Email System Functions
export { sendPasswordResetV3, confirmPasswordResetV3 } from './email-v2/functions';
export { 
  sendCustomerWelcomeEmailV3,
  sendAffiliateWelcomeEmailV3,
  sendB2COrderPendingEmailV3,
  sendB2COrderNotificationAdminV3,
  sendB2BOrderConfirmationCustomerV3,
  sendOrderStatusEmailV3,
  sendB2BOrderConfirmationAdminV3,
  sendVerificationEmailV3,
  sendAffiliateCredentialsV3,
  approveAffiliateV3
} from './email-v2/functions-main';

// Debug functions removed - found the real issue

// V3 Email System Triggers
export { sendOrderConfirmationEmailsV3 } from './email-v2/triggers'; 