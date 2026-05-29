export { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail, sendOrderNotificationAdmin, sendPasswordResetEmail, sendLoginCredentialsEmail, sendAffiliateWelcomeEmail, approveAffiliate, sendEmailVerification, sendCustomEmailVerification, verifyEmailCode, sendAffiliateApplicationEmails } from './email-orchestrator/functions';
import { confirmPasswordReset } from './email-orchestrator/functions';
import { logAffiliateClickV2 } from './affiliate/callable/logAffiliateClick';
import { logAffiliateClickHttpV2 } from './affiliate/http/logAffiliateClickHttp';
import { processAffiliateConversionV2 } from './affiliate/triggers/processAffiliateConversion';
import { processB2COrderCompletionHttp, // RE-ENABLED: Critical for affiliate processing
processB2COrderCompletion } from './order-processing/functions';
import { getGeoData } from './geo/functions';
import { deleteCustomerAccount, deleteB2CCustomerAccount, toggleCustomerActiveStatus, createAdminUser } from './customer-admin/functions';
import { createPaymentIntentV2 } from './payment/createPaymentIntent';
import { stripeWebhookV2 } from './payment/stripeWebhook';
import { scrapeWebsiteMeta } from './website-scraper/functions';
export { logAffiliateClickV2, logAffiliateClickHttpV2, processAffiliateConversionV2 };
export { processB2COrderCompletionHttp as processB2COrderCompletionHttpV2, // RE-ENABLED: Critical for affiliate processing
processB2COrderCompletion as processB2COrderCompletionV2 };
export { getGeoData as getGeoDataV2 };
export { deleteCustomerAccount as deleteCustomerAccountV2, deleteB2CCustomerAccount as deleteB2CCustomerAccountV2, toggleCustomerActiveStatus as toggleCustomerActiveStatusV2, createAdminUser as createAdminUserV2 };
export { createPaymentIntentV2, stripeWebhookV2 };
export { scrapeWebsiteMeta as scrapeWebsiteMetaV2 };
export { confirmPasswordReset as confirmPasswordResetV2 };
export { confirmPasswordReset };
