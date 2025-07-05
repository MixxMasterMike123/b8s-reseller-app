// Demo configuration for Trustpilot integration
// This file shows how to easily switch from manual to Trustpilot reviews

export const TRUSTPILOT_CONFIG = {
  // Set these when your Trustpilot profile is ready
  BUSINESS_ID: '', // Get this from your Trustpilot business dashboard
  DOMAIN: 'shop.b8shield.com',
  
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
🚀 HOW TO ENABLE TRUSTPILOT:

1. Go to https://business.trustpilot.com
2. Claim your profile for "shop.b8shield.com"
3. Verify your business
4. Get your Business Unit ID from Settings > Business Information
5. Update TRUSTPILOT_CONFIG in this file:
   - Set BUSINESS_ID to your Business Unit ID
   - Set IS_PROFILE_READY to true
   - Set SHOW_TRUSTPILOT to true
6. Rebuild and deploy

📍 CURRENT STATUS: Manual reviews only
📍 NEXT STEP: Set up Trustpilot business profile
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