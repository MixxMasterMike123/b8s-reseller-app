// Demo configuration for Trustpilot integration
// This file shows how to easily switch from manual to Trustpilot reviews

export const TRUSTPILOT_CONFIG = {
  // B8Shield Trustpilot Configuration
  BUSINESS_EMAIL: 'info@b8shield.com', // Trustpilot login email
  DOMAIN: 'shop.b8shield.com',
  BUSINESS_ID: '', // Get this from your Trustpilot business dashboard after setup
  
  // Trustpilot URLs
  PROFILE_URL: 'https://www.trustpilot.com/review/shop.b8shield.com',
  REVIEW_URL: 'https://www.trustpilot.com/evaluate/shop.b8shield.com',
  BUSINESS_DASHBOARD: 'https://business.trustpilot.com',
  
  // Current status
  IS_PROFILE_READY: false, // Change to true when Trustpilot profile is set up
  
  // Integration settings
  SHOW_TRUSTPILOT: false, // Enable when profile is ready
  SHOW_MANUAL_REVIEWS: true, // Keep manual reviews as fallback
  
  // Widget configuration
  LOCALE: 'sv-SE',
  THEME: 'light'
};

// Instructions for enabling Trustpilot:
export const TRUSTPILOT_SETUP_INSTRUCTIONS = `
🚀 B8SHIELD TRUSTPILOT SETUP:

📧 LOGIN CREDENTIALS:
   Email: info@b8shield.com
   Password: AAAtpb8s
   URL: https://business.trustpilot.com

🔧 SETUP STEPS:
1. Login to Trustpilot Business Dashboard
2. Claim/verify profile for "shop.b8shield.com"
3. Complete business verification process
4. Get your Business Unit ID from Settings > Business Information
5. Update TRUSTPILOT_CONFIG in this file:
   - Set BUSINESS_ID to your Business Unit ID
   - Set IS_PROFILE_READY to true
   - Set SHOW_TRUSTPILOT to true
6. Rebuild and deploy

🔗 PROFILE LINKS ADDED:
   - Read reviews: https://www.trustpilot.com/review/shop.b8shield.com
   - Leave review: https://www.trustpilot.com/evaluate/shop.b8shield.com

📍 CURRENT STATUS: Manual reviews + Trustpilot links active
📍 NEXT STEP: Complete Trustpilot business verification
`;

// Function to get current review configuration
export const getReviewConfig = () => {
  return {
    businessId: TRUSTPILOT_CONFIG.BUSINESS_ID,
    domain: TRUSTPILOT_CONFIG.DOMAIN,
    showTrustpilot: TRUSTPILOT_CONFIG.SHOW_TRUSTPILOT && TRUSTPILOT_CONFIG.IS_PROFILE_READY,
    showManualReviews: TRUSTPILOT_CONFIG.SHOW_MANUAL_REVIEWS,
    locale: TRUSTPILOT_CONFIG.LOCALE,
    theme: TRUSTPILOT_CONFIG.THEME
  };
};

// Example of how to update PublicStorefront.jsx when ready:
export const EXAMPLE_INTEGRATION = `
// In PublicStorefront.jsx, replace the ReviewsSection with:

import { getReviewConfig } from '../../utils/trustpilotDemo';

const reviewConfig = getReviewConfig();

<ReviewsSection 
  businessId={reviewConfig.businessId}
  domain={reviewConfig.domain}
  showTrustpilot={reviewConfig.showTrustpilot}
  showManualReviews={reviewConfig.showManualReviews}
  className="w-full"
/>
`;

export default TRUSTPILOT_CONFIG; 