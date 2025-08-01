export const AmbassadorWagonManifest = {
  // Basic wagon identity
  id: 'ambassador-wagon',
  name: 'The Ambassador Wagon™',
  version: '1.0.0',
  description: 'Professional influence partnership system for managing brand ambassadors and affiliate prospects',
  descriptionSwedish: 'Professionellt system för att hantera märkesambassadörer och affiliate-prospekt',
  type: 'influence-crm', // Category of functionality
  enabled: true, // Easy on/off switch

  // Wagon author and metadata
  author: 'B8Shield Development Team',
  license: 'proprietary',
  tags: ['crm', 'ambassadors', 'affiliates', 'influencers', 'partnerships', 'social-media', 'swedish'],

  // Dependencies and requirements
  requirements: {
    // Minimum app version this wagon supports
    minAppVersion: '1.0.0',
    // Shared services this wagon uses
    services: ['firebase', 'auth', 'notifications'],
    // External APIs this wagon uses (social media APIs future)
    externalApis: []
  },

  // Admin interface integration
  adminMenu: {
    title: 'Ambassador Wagon',
    titleSwedish: 'Ambassadör-vagn',
    icon: 'UserGroupIcon',
    path: '/admin/ambassadors',
    order: 55, // Position after Dining Wagon
    description: 'Influencer CRM - Ambassadörer & Partnership-uppföljning',
    component: 'AmbassadorDashboard'
  },

  // Routes this wagon provides
  routes: [
    {
      path: '/admin/ambassadors',
      component: 'AmbassadorDashboard',
      private: true,
      adminOnly: true,
      title: 'The Ambassador Wagon™ - Influence CRM Dashboard'
    },
    {
      path: '/admin/ambassadors/prospects',
      component: 'AmbassadorContactList',
      private: true,
      adminOnly: true,
      title: 'Ambassadör-prospekt - The Ambassador Wagon™'
    },
    {
      path: '/admin/ambassadors/prospects/new',
      component: 'AmbassadorContactForm',
      private: true,
      adminOnly: true,
      title: 'Ny Ambassadör - The Ambassador Wagon™'
    },
    {
      path: '/admin/ambassadors/prospects/:id',
      component: 'AmbassadorContactDetail',
      private: true,
      adminOnly: true,
      title: 'Ambassadör-detaljer - The Ambassador Wagon™'
    },
    {
      path: '/admin/ambassadors/activities',
      component: 'AmbassadorActivityCenter',
      private: true,
      adminOnly: true,
      title: 'Aktiviteter - The Ambassador Wagon™'
    },
    {
      path: '/admin/ambassadors/follow-ups',
      component: 'AmbassadorFollowUpCenter',
      private: true,
      adminOnly: true,
      title: 'Uppföljningar - The Ambassador Wagon™'
    },
    {
      path: '/admin/ambassadors/conversions',
      component: 'AmbassadorConversionCenter',
      private: true,
      adminOnly: true,
      title: 'Konverteringar - The Ambassador Wagon™'
    }
  ],

  // Services this wagon exposes to other wagons
  services: {
    'addAmbassadorProspect': {
      description: 'Add new ambassador prospect to influence CRM',
      method: 'addAmbassadorProspect',
      parameters: ['prospectData']
    },
    'recordAmbassadorActivity': {
      description: 'Record activity with ambassador prospect',
      method: 'recordAmbassadorActivity',
      parameters: ['prospectId', 'activityData']
    },
    'convertToAffiliate': {
      description: 'Convert prospect to active affiliate',
      method: 'convertToAffiliate',
      parameters: ['prospectId', 'affiliateData']
    }
  },

  // Configuration options
  config: {
    // Default settings
    defaults: {
      defaultProspectStatus: 'prospect',
      defaultInfluencerTier: 'micro',
      defaultPriority: 'medium',
      followUpReminderDays: 5, // Faster pace than B2B
      activityRetentionDays: 365,
      minFollowersForMicro: 10000,
      minFollowersForMacro: 100000,
      minFollowersForMega: 1000000
    },
    // Settings UI for admin configuration
    settings: [
      {
        key: 'followUpReminderDays',
        type: 'number',
        label: 'Påminnelse för uppföljning (dagar)',
        min: 1,
        max: 14,
        default: 5
      },
      {
        key: 'defaultProspectStatus',
        type: 'select',
        label: 'Standard prospekt-status',
        options: [
          { value: 'prospect', label: 'Prospekt' },
          { value: 'contacted', label: 'Kontaktad' },
          { value: 'negotiating', label: 'Förhandlar' },
          { value: 'converted', label: 'Konverterad' },
          { value: 'declined', label: 'Avböjd' }
        ]
      },
      {
        key: 'minFollowersForMicro',
        type: 'number',
        label: 'Minsta följare för Micro-influencer',
        min: 1000,
        max: 50000,
        default: 10000
      }
    ]
  },

  // Feature flags
  features: {
    'prospect-management': true,
    'social-media-tracking': true,
    'influencer-tier-calculation': true,
    'smart-tagging': true,
    'activity-tracking': true,
    'follow-up-reminders': true,
    'conversion-tracking': true,
    'affiliate-integration': true,
    'platform-analytics': false, // Future feature
    'automated-outreach': false,  // Future feature
    'contract-management': false  // Future feature
  },

  // Permissions this wagon needs
  permissions: [
    'admin-interface',          // Can show admin UI
    'read-ambassador-prospects', // Can read prospect data
    'write-ambassador-prospects', // Can create/update prospects
    'read-ambassador-activities', // Can read activity data
    'write-ambassador-activities', // Can create activities
    'affiliate-conversion',     // Can convert to affiliates
    'notifications'            // Can send notifications
  ],

  // Database collections used by this wagon (completely isolated)
  collections: [
    'ambassadorContacts',       // Ambassador prospects
    'ambassadorActivities',     // Ambassador activities
    'ambassadorFollowUps',      // Ambassador follow-ups
    'ambassadorDocuments',      // Ambassador documents/contracts
    'ambassadorConversions'     // Conversion tracking
  ],

  // Influence-themed terminology
  terminology: {
    prospects: 'Ambassadörer',        // Ambassadors
    contacts: 'Influencers',          // Influencers
    activities: 'Samarbeten',         // Collaborations
    followUps: 'Uppföljningar',       // Follow-ups
    meetings: 'Partnerskap',          // Partnerships
    calls: 'Pitchar',                 // Pitches
    emails: 'Förfrågningar',          // Inquiries
    hotLeads: 'Heta Prospekt',        // Hot Prospects
    closedDeals: 'Aktiva Ambassadörer', // Active Ambassadors
    megaInfluencers: 'Mega-influencers',
    macroInfluencers: 'Makro-influencers',
    microInfluencers: 'Mikro-influencers',
    nanoInfluencers: 'Nano-influencers'
  },

  // Influencer tier configuration
  influencerTiers: {
    nano: {
      min: 1000,
      max: 10000,
      color: 'green',
      label: 'Nano',
      labelSwedish: 'Nano',
      commissionRate: 10,
      checkoutDiscount: 5
    },
    micro: {
      min: 10000,
      max: 100000,
      color: 'blue',
      label: 'Micro',
      labelSwedish: 'Mikro',
      commissionRate: 15,
      checkoutDiscount: 10
    },
    macro: {
      min: 100000,
      max: 1000000,
      color: 'purple',
      label: 'Macro',
      labelSwedish: 'Makro',
      commissionRate: 20,
      checkoutDiscount: 15
    },
    mega: {
      min: 1000000,
      max: Infinity,
      color: 'gold',
      label: 'Mega',
      labelSwedish: 'Mega',
      commissionRate: 25,
      checkoutDiscount: 20
    }
  },

  // Social media platforms
  platforms: {
    instagram: { name: 'Instagram', icon: 'instagram', priority: 1 },
    youtube: { name: 'YouTube', icon: 'youtube', priority: 2 },
    tiktok: { name: 'TikTok', icon: 'tiktok', priority: 3 },
    facebook: { name: 'Facebook', icon: 'facebook', priority: 4 },
    twitter: { name: 'Twitter/X', icon: 'twitter', priority: 5 },
    linkedin: { name: 'LinkedIn', icon: 'linkedin', priority: 6 },
    twitch: { name: 'Twitch', icon: 'twitch', priority: 7 },
    snapchat: { name: 'Snapchat', icon: 'snapchat', priority: 8 }
  },

  // Cost information
  costs: {
    type: 'included',
    currency: 'SEK',
    description: 'Included with B8Shield platform - no additional cost'
  },

  // Development and debugging
  development: {
    testMode: false,
    debugLogging: true,
    mockMode: false
  }
};