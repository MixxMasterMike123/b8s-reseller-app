// V2 FUNCTIONS BATCH 4 - Direct imports to avoid circular dependencies

import { onRequest } from 'firebase-functions/v2/https';
import { corsHandler } from './protection/cors/cors-handler';
import { rateLimiter } from './protection/rate-limiting/rate-limiter';

// Import affiliate functions directly (avoiding export * circular imports)
import { logAffiliateClickV2 } from './affiliate/callable/logAffiliateClick';
import { logAffiliateClickHttpV2 } from './affiliate/http/logAffiliateClickHttp';
import { processAffiliateConversionV2 } from './affiliate/triggers/processAffiliateConversion';

// Import email functions directly with original names from email/functions.ts
import { 
  sendCustomerWelcomeEmail,
  sendAffiliateWelcomeEmail,
  sendB2BOrderConfirmationAdmin,
  sendB2BOrderConfirmationCustomer,
  sendOrderStatusEmail,
  sendB2COrderNotificationAdmin,
  sendB2COrderPendingEmail,
  sendOrderConfirmationEmails,
  sendUserActivationEmail,
  sendOrderStatusUpdateEmail,
  updateCustomerEmail,
  testEmail,
  approveAffiliate,
  sendStatusUpdateHttp,
  sendVerificationEmail,
  sendAffiliateCredentialsV2,
  sendPasswordResetEmailV2,
  confirmPasswordResetV2
} from './email/functions';

// Import order processing functions directly with original names
import {
  processB2COrderCompletionHttp,
  processB2COrderCompletion,
  manualStatusUpdate
} from './order-processing/functions';

// Import geo functions for B2C shop currency detection
import {
  getGeoData,
  testGeoHeaders
} from './geo/functions';

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

// Re-export email functions individually with V2 names (avoid V1 conflicts)
export { 
  sendCustomerWelcomeEmail as sendCustomerWelcomeEmailV2,
  sendAffiliateWelcomeEmail as sendAffiliateWelcomeEmailV2,
  sendB2BOrderConfirmationAdmin as sendB2BOrderConfirmationAdminV2,
  sendB2BOrderConfirmationCustomer as sendB2BOrderConfirmationCustomerV2,
  sendOrderStatusEmail as sendOrderStatusEmailV2,
  sendB2COrderNotificationAdmin as sendB2COrderNotificationAdminV2,
  sendB2COrderPendingEmail as sendB2COrderPendingEmailV2,
  sendOrderConfirmationEmails as sendOrderConfirmationEmailsV2,
  sendUserActivationEmail as sendUserActivationEmailV2,
  sendOrderStatusUpdateEmail as sendOrderStatusUpdateEmailV2,
  updateCustomerEmail as updateCustomerEmailV2,
  testEmail as testEmailV2,
  approveAffiliate as approveAffiliateV2,
  sendStatusUpdateHttp as sendStatusUpdateHttpV2,
  sendVerificationEmail as sendVerificationEmailV2,
  sendAffiliateCredentialsV2,
  sendPasswordResetEmailV2,
  confirmPasswordResetV2
};

// Re-export order processing functions individually with V2 names (avoid V1 conflicts)
export {
  processB2COrderCompletionHttp as processB2COrderCompletionHttpV2,
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