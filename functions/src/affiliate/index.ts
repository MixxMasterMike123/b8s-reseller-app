// Affiliate System V2 Functions
// Modular structure with individual files for each function

// Export all types
export * from './types';

// Export callable functions (V2 names to avoid V1 conflicts)
export { logAffiliateClickV2 } from './callable/logAffiliateClick';

// Export HTTP functions (V2 names to avoid V1 conflicts)
export { logAffiliateClickHttpV2 } from './http/logAffiliateClickHttp';

// Export triggers (V2 names to avoid V1 conflicts)
export { processAffiliateConversionV2 } from './triggers/processAffiliateConversion';

// Note: approveAffiliate is handled in the email functions module
// as it's primarily an email-sending function with affiliate creation as a side effect 