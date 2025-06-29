// WritersWagonConfig.js - Configuration for The Writer's Wagon™
export const WRITERS_WAGON_CONFIG = {
  // Model Configuration - Claude AI
  MODELS: {
    'claude-3-5-sonnet': {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      cost: 'Low',
      description: 'Cost-effective, excellent for most content generation',
      tokensPerDollar: 4000, // Approximate
      bestFor: ['technical-specs', 'basic-descriptions']
    },
    'claude-3-haiku': {
      id: 'claude-3-haiku-20240307',
      name: 'Claude 3 Haiku',
      cost: 'Lowest',
      description: 'Fastest and most cost-effective for simple tasks',
      tokensPerDollar: 8000, // Approximate
      bestFor: ['title-corrections', 'short-descriptions']
    }
  },

  // Default model selection
  CURRENT_MODEL: 'claude-3-5-sonnet',

  // API Configuration
  API: {
    maxTokens: 2000, // Increased for longer product descriptions
    temperature: 0.3, // Slightly higher for more creative marketing copy
    retryAttempts: 3,
    retryDelay: 1000, // Base delay in ms
    timeout: 30000 // 30 second timeout
  },

  // Content Generation Types
  CONTENT_TYPES: {
    'b2b-technical': {
      model: 'claude-3-5-sonnet',
      maxTokens: 1500,
      temperature: 0.1, // Very factual
      systemRole: 'technical-writer'
    },
    'b2c-marketing': {
      model: 'claude-3-5-sonnet', 
      maxTokens: 1000,
      temperature: 0.4, // More creative
      systemRole: 'marketing-copywriter'
    },
    'title-optimization': {
      model: 'claude-3-haiku',
      maxTokens: 100,
      temperature: 0.1, // Precise
      systemRole: 'seo-optimizer'
    },
    'dual-content': {
      model: 'claude-3-5-sonnet',
      maxTokens: 2500,
      temperature: 0.25, // Balanced
      systemRole: 'product-content-specialist'
    }
  },

  // Quality thresholds
  QUALITY: {
    minScoreForImprovement: 70,
    excellentScoreThreshold: 85,
    autoApproveThreshold: 90
  },

  // Usage Tracking
  USAGE: {
    trackGenerations: true,
    trackCosts: true,
    monthlyLimit: 1000, // Default limit
    warningThreshold: 0.8 // Warn at 80% of limit
  },

  // Feature flags for The Writer's Wagon™
  FEATURES: {
    enableB2BGeneration: true,
    enableB2CGeneration: true,
    enableDualGeneration: true,
    enableQualityScoring: true,
    enableUsageTracking: true,
    enableModelSwitching: true,
    enablePreviewMode: true,
    enableSaveHistory: true
  },

  // Supported Languages
  LANGUAGES: {
    primary: 'sv', // Swedish
    secondary: 'en', // English
    supported: ['sv', 'en', 'no', 'da', 'fi'] // Nordic languages
  },

  // Brand Voice Configuration
  BRAND_VOICE: {
    b8shield: {
      tone: 'professional-friendly',
      vocabulary: 'fishing-technical',
      style: 'informative-confident',
      keywords: ['B8Shield', 'skydd', 'fiske', 'bete', 'effektiv']
    },
    default: {
      tone: 'professional',
      vocabulary: 'industry-standard', 
      style: 'clear-concise',
      keywords: []
    }
  }
};

// Helper functions
export function getCurrentModel() {
  return WRITERS_WAGON_CONFIG.MODELS[WRITERS_WAGON_CONFIG.CURRENT_MODEL];
}

export function getModelForContentType(contentType) {
  const config = WRITERS_WAGON_CONFIG.CONTENT_TYPES[contentType];
  return config ? WRITERS_WAGON_CONFIG.MODELS[config.model] : getCurrentModel();
}

export function getContentTypeConfig(contentType) {
  return WRITERS_WAGON_CONFIG.CONTENT_TYPES[contentType] || WRITERS_WAGON_CONFIG.CONTENT_TYPES['dual-content'];
}

export function setModel(modelKey) {
  if (WRITERS_WAGON_CONFIG.MODELS[modelKey]) {
    WRITERS_WAGON_CONFIG.CURRENT_MODEL = modelKey;
    console.log(`✅ Writer's Wagon: Switched to ${WRITERS_WAGON_CONFIG.MODELS[modelKey].name}`);
    return true;
  }
  console.error(`❌ Writer's Wagon: Unknown model: ${modelKey}`);
  return false;
}

export function getModelCost(modelKey = WRITERS_WAGON_CONFIG.CURRENT_MODEL) {
  return WRITERS_WAGON_CONFIG.MODELS[modelKey]?.cost || 'Unknown';
}

export function getAllModels() {
  return Object.entries(WRITERS_WAGON_CONFIG.MODELS).map(([key, model]) => ({
    key,
    ...model
  }));
}

export function getBrandVoice(brand = 'default') {
  return WRITERS_WAGON_CONFIG.BRAND_VOICE[brand] || WRITERS_WAGON_CONFIG.BRAND_VOICE.default;
}

export function getAPIKey() {
  const apiKey = import.meta.env.VITE_CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error('Claude API key not configured. Please set VITE_CLAUDE_API_KEY in your environment variables.');
  }
  return apiKey;
}

export default WRITERS_WAGON_CONFIG; 