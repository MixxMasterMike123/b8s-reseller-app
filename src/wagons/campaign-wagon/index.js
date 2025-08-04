// The Campaign Wagon™ - Advanced Affiliate Campaign Management System
// Main entry point for wagon integration

import { CampaignWagonManifest } from './CampaignWagonManifest.js';

// Lazy-loaded components for performance
import { lazy } from 'react';

// Main components
const CampaignDashboard = lazy(() => import('./components/CampaignDashboard.jsx'));
const CampaignCreate = lazy(() => import('./components/CampaignCreate.jsx'));
const CampaignEdit = lazy(() => import('./components/CampaignEdit.jsx'));
const CampaignAnalytics = lazy(() => import('./components/CampaignAnalytics.jsx'));

// Hooks for external wagon services
import { useCampaigns } from './hooks/useCampaigns.js';

// Utility functions
import * as campaignUtils from './utils/campaignUtils.js';

// The Campaign Wagon™ - Complete Campaign Management System
const CampaignWagon = {
  manifest: CampaignWagonManifest,
  
  // Component mapping for routing
  components: {
    CampaignDashboard,
    CampaignCreate,
    CampaignEdit,
    CampaignAnalytics
  },
  
  // External hooks for other wagons/components
  hooks: {
    useCampaigns
  },
  
  // Utility functions for external use
  utils: campaignUtils,
  
  // Campaign-specific constants
  constants: {
    CAMPAIGN_TYPES: {
      COMPETITION: 'competition',
      OFFER: 'offer', 
      PRODUCT_LAUNCH: 'product_launch',
      SPECIAL_DISCOUNT: 'special_discount',
      SEASONAL: 'seasonal'
    },
    
    CAMPAIGN_STATUS: {
      DRAFT: 'draft',
      ACTIVE: 'active',
      PAUSED: 'paused',
      COMPLETED: 'completed',
      CANCELLED: 'cancelled'
    },
    
    AFFILIATE_SELECTION: {
      ALL: 'all',
      SELECTED: 'selected',
      NONE: 'none'
    },
    
    BANNER_PLATFORMS: CampaignWagonManifest.config.banners.platforms
  }
};

// Export for wagon registry
export default CampaignWagon;

// Named exports for direct component access
export {
  CampaignDashboard,
  CampaignCreate,
  CampaignEdit,
  CampaignAnalytics,
  useCampaigns,
  campaignUtils
};

// Export manifest for external access
export { CampaignWagonManifest };