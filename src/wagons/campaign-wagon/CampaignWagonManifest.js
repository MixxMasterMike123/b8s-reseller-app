export const CampaignWagonManifest = {
  // Basic wagon identity
  id: 'campaign-wagon',
  name: 'The Campaign Wagon™',
  version: '1.0.0',
  description: 'Advanced affiliate campaign management system with multi-platform marketing tools',
  type: 'marketing', // Category of functionality
  enabled: true, // Easy on/off switch

  // Wagon author and metadata
  author: 'B8Shield Development Team',
  license: 'proprietary',
  tags: ['campaigns', 'affiliates', 'marketing', 'banners', 'lottery', 'tracking', 'swedish'],

  // Dependencies and requirements
  requirements: {
    // Minimum app version this wagon supports
    minAppVersion: '1.0.0',
    // Shared services this wagon uses
    services: ['firebase', 'auth', 'storage', 'functions'],
    // Related to affiliate system
    externalApis: []
  },

  // Admin interface integration
  adminMenu: {
    title: 'Campaign Wagon',
    icon: 'MegaphoneIcon',
    path: '/admin/campaigns',
    order: 45, // Position before Dining Wagon (50)
    description: 'Kampanjer - Affiliate Marknadsföring',
    component: 'CampaignDashboard'
  },

  // Routes this wagon provides
  routes: [
    {
      path: '/admin/campaigns',
      component: 'CampaignDashboard',
      private: true,
      adminOnly: true,
      title: 'The Campaign Wagon™ - Kampanj Dashboard'
    },
    {
      path: '/admin/campaigns/create',
      component: 'CampaignCreate',
      private: true,
      adminOnly: true,  
      title: 'Skapa Kampanj - The Campaign Wagon™'
    },
    {
      path: '/admin/campaigns/:id',
      component: 'CampaignEdit',
      private: true,
      adminOnly: true,
      title: 'Redigera Kampanj - The Campaign Wagon™'
    },
    {
      path: '/admin/campaigns/:id/analytics',
      component: 'CampaignAnalytics',
      private: true,
      adminOnly: true,
      title: 'Kampanj Analys - The Campaign Wagon™'
    }
  ],

  // Features this wagon provides
  features: {
    // Core campaign management
    campaignManagement: {
      enabled: true,
      description: 'Create, edit, and manage affiliate marketing campaigns'
    },
    
    // Multi-platform banner system
    bannerManagement: {
      enabled: true,
      description: 'Upload and manage banners for different social media platforms',
      supportedPlatforms: [
        'instagram_post',
        'instagram_story', 
        'tiktok_video',
        'twitter_post',
        'youtube_thumbnail',
        'facebook_post',
        'linkedin_post'
      ]
    },
    
    // Affiliate selection and targeting
    affiliateTargeting: {
      enabled: true,
      description: 'Select specific affiliates or target all affiliates for campaigns'
    },
    
    // Lottery/competition system
    lotterySystem: {
      enabled: true,
      description: 'Track product purchases as lottery tickets for prize draws'
    },
    
    // Multilingual content support
    multilingualContent: {
      enabled: true,
      description: 'Campaign content in Swedish, English UK, and English US',
      supportedLanguages: ['sv-SE', 'en-GB', 'en-US']
    },
    
    // Campaign analytics and tracking
    analytics: {
      enabled: true,
      description: 'Track campaign performance, clicks, conversions, and ROI'
    }
  },

  // Database collections this wagon manages
  collections: [
    {
      name: 'campaigns',
      description: 'Main campaign data with multilingual content',
      permissions: ['admin:read', 'admin:write']
    },
    {
      name: 'campaignParticipants', 
      description: 'Campaign participation tracking for lottery system',
      permissions: ['admin:read', 'admin:write', 'system:write']
    },
    {
      name: 'campaignBanners',
      description: 'Social media banner assets for campaigns', 
      permissions: ['admin:read', 'admin:write']
    },
    {
      name: 'campaignAnalytics',
      description: 'Campaign performance metrics and statistics',
      permissions: ['admin:read', 'system:write']
    }
  ],

  // Storage paths this wagon uses
  storage: {
    banners: 'campaigns/{campaignId}/banners/{platform}',
    assets: 'campaigns/{campaignId}/assets'
  },

  // Configuration options
  config: {
    // Default campaign settings
    defaults: {
      status: 'draft',
      type: 'offer',
      selectedAffiliates: 'all',
      customAffiliateRate: 15,
      customerDiscountRate: 10
    },
    
    // Banner size constraints
    banners: {
      maxFileSize: '5MB',
      allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
      platforms: {
        instagram_post: { width: 1080, height: 1080, name: 'Instagram Post' },
        instagram_story: { width: 1080, height: 1920, name: 'Instagram Story' },
        tiktok_video: { width: 1080, height: 1920, name: 'TikTok Video' },
        twitter_post: { width: 1200, height: 675, name: 'X (Twitter) Post' },
        youtube_thumbnail: { width: 1280, height: 720, name: 'YouTube Thumbnail' },
        facebook_post: { width: 1200, height: 630, name: 'Facebook Post' },
        linkedin_post: { width: 1200, height: 627, name: 'LinkedIn Post' }
      }
    }
  },

  // Health check endpoints for monitoring
  health: {
    endpoint: '/admin/campaigns/health',
    checks: ['database', 'storage', 'affiliates']
  }
};