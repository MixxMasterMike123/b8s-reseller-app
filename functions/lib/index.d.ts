export { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail, sendOrderNotificationAdmin, sendPasswordResetEmail, sendLoginCredentialsEmail, sendAffiliateWelcomeEmail, approveAffiliate, sendEmailVerification, sendCustomEmailVerification, verifyEmailCode, sendAffiliateApplicationEmails, testEmailOrchestrator } from './email-orchestrator/functions';
import { confirmPasswordReset } from './email-orchestrator/functions';
import { logAffiliateClickV2 } from './affiliate/callable/logAffiliateClick';
import { logAffiliateClickHttpV2 } from './affiliate/http/logAffiliateClickHttp';
import { processAffiliateConversionV2 } from './affiliate/triggers/processAffiliateConversion';
import { processB2COrderCompletionHttp, // RE-ENABLED: Critical for affiliate processing
processB2COrderCompletion, manualStatusUpdate } from './order-processing/functions';
import { getGeoData, testGeoHeaders } from './geo/functions';
import { syncAllProductsToGoogle, syncProductsToGoogleHttp, syncSingleProductToGoogle, testGoogleMerchantConnection, onProductCreated as googleMerchantOnProductCreated, onProductUpdated as googleMerchantOnProductUpdated, onProductDeleted as googleMerchantOnProductDeleted } from './google-merchant/sync-functions';
import { getGoogleMerchantStats, getProductSyncStatus, forceSyncProducts } from './google-merchant/admin-functions';
import { deleteCustomerAccount, deleteB2CCustomerAccount, toggleCustomerActiveStatus, createAdminUser, checkNamedDatabase, debugDatabase } from './customer-admin/functions';
import { createPaymentIntentV2 } from './payment/createPaymentIntent';
import { createPaymentIntentMinimalV2 } from './payment/createPaymentIntentMinimal';
import { scrapeWebsiteMeta } from './website-scraper/functions';
export { logAffiliateClickV2, logAffiliateClickHttpV2, processAffiliateConversionV2 };
export { processB2COrderCompletionHttp as processB2COrderCompletionHttpV2, // RE-ENABLED: Critical for affiliate processing
processB2COrderCompletion as processB2COrderCompletionV2, manualStatusUpdate as manualStatusUpdateV2 };
export { getGeoData as getGeoDataV2, testGeoHeaders as testGeoHeadersV2 };
export { deleteCustomerAccount as deleteCustomerAccountV2, deleteB2CCustomerAccount as deleteB2CCustomerAccountV2, toggleCustomerActiveStatus as toggleCustomerActiveStatusV2, createAdminUser as createAdminUserV2, checkNamedDatabase as checkNamedDatabaseV2, debugDatabase as debugDatabaseV2 };
export { createPaymentIntentV2, createPaymentIntentMinimalV2 };
export { scrapeWebsiteMeta as scrapeWebsiteMetaV2 };
export { confirmPasswordReset as confirmPasswordResetV2 };
export { confirmPasswordReset };
export declare const exampleProtectedFunction: import("firebase-functions/v2/https").HttpsFunction;
export { syncAllProductsToGoogle, syncProductsToGoogleHttp, syncSingleProductToGoogle, testGoogleMerchantConnection, googleMerchantOnProductCreated, googleMerchantOnProductUpdated, googleMerchantOnProductDeleted, getGoogleMerchantStats, getProductSyncStatus, forceSyncProducts };
export { debugOrderData } from './debug-order-data';
export { debugProductFields } from './debug-product-fields';
