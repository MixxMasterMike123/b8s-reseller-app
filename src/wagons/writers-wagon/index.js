// index.js - The Writer's Wagon™ main export
// This is the SINGLE connection point between wagon and train 🚂

import WritersWagonManifest from './WagonManifest.js';
import { writersWagonAPI } from './api/WritersWagonAPI.js';
import WritersWagonPanel from './components/WritersWagonPanel.jsx';
import WritersWagonTest from './WritersWagonTest.jsx';

// Import integration components
import ProductIntegrationButton from './components/ProductIntegrationButton.jsx';

/**
 * The Writer's Wagon™ - Self-contained AI content generation wagon
 * 
 * This wagon can be completely removed by:
 * 1. Deleting the /writers-wagon directory
 * 2. That's it! No core app changes needed.
 */
class WritersWagon {
  constructor() {
    this.manifest = WritersWagonManifest;
    this.api = writersWagonAPI;
    this.initialized = false;
  }

  /**
   * Initialize the wagon when connected to train
   */
  async initialize(trainServices) {
    if (this.initialized) return true;

    try {
      console.log('🎨 Writer\'s Wagon: Initializing AI content generation...');

      // Store references to shared train services (the "electricity" connection)
      this.trainServices = trainServices;

      // Perform health checks
      const healthStatus = await this.performHealthChecks();
      if (!healthStatus.healthy) {
        console.warn('⚠️ Writer\'s Wagon: Health checks failed, wagon may not function properly');
      }

      // Initialize API
      await this.api.initializeAPIKey();

      this.initialized = true;
      console.log('✅ Writer\'s Wagon: Ready for AI content generation');
      return true;

    } catch (error) {
      console.error('❌ Writer\'s Wagon: Initialization failed:', error);
      return false;
    }
  }

  /**
   * Perform wagon health checks
   */
  async performHealthChecks() {
    const results = {
      healthy: true,
      checks: {}
    };

    // Check API key configuration
    try {
      const apiKey = import.meta.env.VITE_CLAUDE_API_KEY;
      results.checks['api-key-configured'] = {
        status: apiKey ? 'pass' : 'fail',
        message: apiKey ? 'API key configured' : 'API key missing from environment'
      };
      if (!apiKey) results.healthy = false;
    } catch (error) {
      results.checks['api-key-configured'] = {
        status: 'fail',
        message: 'Error checking API key: ' + error.message
      };
      results.healthy = false;
    }

    // Test API connectivity (optional - can be slow)
    if (import.meta.env.NODE_ENV === 'development') {
      try {
        // Simple connectivity test could go here
        results.checks['api-connectivity'] = {
          status: 'skip',
          message: 'Skipped in development mode'
        };
      } catch (error) {
        results.checks['api-connectivity'] = {
          status: 'fail',
          message: 'API connectivity test failed: ' + error.message
        };
      }
    }

    return results;
  }

  /**
   * Get usage statistics
   */
  getStats() {
    return this.api.getUsageStats();
  }

  /**
   * Generate content (service method exposed to other wagons)
   */
  async generateContent(contentType, data, options = {}) {
    return this.api.generateContent(contentType, data, options);
  }

  /**
   * Optimize text (service method exposed to other wagons)
   */
  async optimizeText(text, context = '', options = {}) {
    return this.api.optimizeTitle(text, context, options);
  }

  /**
   * Shutdown wagon (cleanup)
   */
  async shutdown() {
    console.log('🔌 Writer\'s Wagon: Shutting down...');
    this.initialized = false;
    // Any cleanup logic would go here
  }
}

// Create wagon instance
const writersWagon = new WritersWagon();

// Export wagon with all its components and services
export default {
  // Wagon manifest and instance
  manifest: WritersWagonManifest,
  wagon: writersWagon,

  // Components that can be used by the train
  components: {
    // Admin interface components
    AdminComponent: WritersWagonTest,    // Main admin page
    TestComponent: WritersWagonTest,     // Test interface
    
    // Integration components (hooks into existing pages)
    ProductIntegrationButton: ProductIntegrationButton,
    
    // Utility components
    Panel: WritersWagonPanel,            // Main AI generation panel
  },

  // Services exposed to other wagons
  services: {
    generateContent: writersWagon.generateContent.bind(writersWagon),
    optimizeText: writersWagon.optimizeText.bind(writersWagon),
    getStats: writersWagon.getStats.bind(writersWagon),
    api: writersWagon.api
  },

  // Direct API access for advanced usage
  api: writersWagonAPI,

  // Initialize method
  initialize: writersWagon.initialize.bind(writersWagon),

  // Health check method
  healthCheck: writersWagon.performHealthChecks.bind(writersWagon),

  // Shutdown method
  shutdown: writersWagon.shutdown.bind(writersWagon)
};

// Named exports for convenience
export {
  WritersWagon,
  WritersWagonManifest,
  WritersWagonPanel,
  writersWagonAPI
}; 