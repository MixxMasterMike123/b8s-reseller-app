// WagonManifest.js - The Writer's Wagon™ manifest
// This defines how the wagon connects to the B8Shield train

export const WritersWagonManifest = {
  // Basic wagon identity
  id: 'writers-wagon',
  name: 'The Writer\'s Wagon™',
  version: '1.0.0',
  description: 'AI-powered content generation for B2B and B2C product descriptions',
  type: 'ai-content', // Category of functionality
  enabled: false, // Easy on/off switch

  // Wagon author and metadata
  author: 'B8Shield Development Team',
  license: 'proprietary',
  tags: ['ai', 'content-generation', 'claude', 'swedish', 'b2b', 'b2c'],

  // Dependencies and requirements
  requirements: {
    // Environment variables this wagon needs
    environment: [
      {
        name: 'VITE_CLAUDE_API_KEY',
        required: true,
        description: 'Claude AI API key for content generation'
      }
    ],
    // Minimum app version this wagon supports
    minAppVersion: '1.0.0',
    // Shared services this wagon uses
    services: ['firebase', 'auth', 'notifications'],
    // External APIs this wagon calls
    externalApis: ['anthropic.com']
  },

  // Admin interface integration
  adminMenu: {
    title: 'AI Innehåll',
    icon: 'SparklesIcon',
    path: '/admin/writers-wagon',
    order: 90, // Position in admin menu (higher = later)
    description: 'Generera AI-innehåll för produkter',
    component: 'AdminComponent'
  },

  // Routes this wagon provides
  routes: [
    {
      path: '/admin/writers-wagon',
      component: 'AdminComponent',
      private: true,
      adminOnly: true,
      title: 'The Writer\'s Wagon™'
    },
    {
      path: '/admin/writers-wagon/test',
      component: 'TestComponent',  
      private: true,
      adminOnly: true,
      title: 'AI Content Test'
    }
  ],

  // Integration hooks - where this wagon adds functionality to existing pages
  integrations: {
    // Add AI generation button to product editing
    'admin-product-edit': {
      type: 'button',
      label: 'Generera AI-innehåll',
      icon: 'SparklesIcon',
      component: 'ProductIntegrationButton',
      position: 'toolbar', // Where to place the integration
      order: 10
    },
    // Add AI panel to product management
    'admin-product-list': {
      type: 'bulk-action',
      label: 'Generera AI-innehåll (bulk)',
      icon: 'SparklesIcon', 
      component: 'BulkGenerationPanel',
      position: 'toolbar',
      order: 20
    }
  },

  // Services this wagon exposes to other wagons
  services: {
    'generateContent': {
      description: 'Generate AI content for any data',
      method: 'generateContent',
      parameters: ['contentType', 'data', 'options']
    },
    'optimizeText': {
      description: 'Optimize existing text content',
      method: 'optimizeText', 
      parameters: ['text', 'context', 'options']
    }
  },

  // Configuration options
  config: {
    // Default settings that can be overridden
    defaults: {
      model: 'claude-3-5-sonnet',
      temperature: 0.3,
      maxTokens: 2000,
      language: 'sv'
    },
    // Settings UI for admin configuration
    settings: [
      {
        key: 'model',
        type: 'select',
        label: 'Standard AI-modell',
        options: [
          { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet (Balanserad)' },
          { value: 'claude-3-haiku', label: 'Claude 3 Haiku (Snabb & Billig)' }
        ]
      },
      {
        key: 'monthlyLimit',
        type: 'number',
        label: 'Månadsgräns (antal förfrågningar)',
        min: 100,
        max: 10000,
        default: 1000
      }
    ]
  },

  // Feature flags
  features: {
    'b2b-generation': true,
    'b2c-generation': true, 
    'dual-generation': true,
    'title-optimization': true,
    'bulk-processing': false, // Future feature
    'translation': false,     // Future feature
    'quality-scoring': false  // Future feature
  },

  // Wagon health checks
  healthChecks: [
    {
      name: 'api-key-configured',
      description: 'Claude API key is properly configured',
      critical: true
    },
    {
      name: 'api-connectivity',
      description: 'Can connect to Claude API',
      critical: true
    },
    {
      name: 'usage-within-limits',
      description: 'API usage is within configured limits',
      critical: false
    }
  ],

  // Permissions this wagon needs
  permissions: [
    'read-products',    // Can read product data
    'write-products',   // Can update product descriptions (optional)
    'admin-interface',  // Can show admin UI
    'external-api',     // Can make external API calls
    'user-data'        // Can access user preferences
  ],

  // Cost information
  costs: {
    type: 'usage-based',
    currency: 'SEK',
    estimates: {
      'per-generation': '0.015-0.045', // 1.5-4.5 öre
      'monthly-typical': '10-50'        // 10-50 SEK per month
    }
  },

  // Documentation and help
  documentation: {
    setupGuide: '/wagons/writers-wagon/SETUP.md',
    userGuide: '/wagons/writers-wagon/USER_GUIDE.md',
    apiDocs: '/wagons/writers-wagon/API.md',
    troubleshooting: '/wagons/writers-wagon/TROUBLESHOOTING.md'
  },

  // Development and debugging
  development: {
    testMode: true,
    debugLogging: true,
    mockMode: false // Can run without real API for development
  }
};

export default WritersWagonManifest; 