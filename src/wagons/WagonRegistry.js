// WagonRegistry.js - Central wagon discovery and registration system
// This is the "train coupling" system that connects wagons to the main B8Shield train

class WagonRegistry {
  constructor() {
    this.wagons = new Map();
    this.initialized = false;
  }

  /**
   * Auto-discover and register all wagons
   * This is the ONLY method the core app needs to call
   */
  async discoverWagons() {
    if (this.initialized) return;

    console.log('🚂 B8Shield Train: Discovering wagons...');

    try {
      // Auto-discover wagon directories
      const wagonModules = import.meta.glob('./*/index.js');
      
      for (const [path, importFn] of Object.entries(wagonModules)) {
        try {
          const wagonModule = await importFn();
          const wagon = wagonModule.default || wagonModule;
          
          if (wagon && wagon.manifest) {
            await this.registerWagon(wagon);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to load wagon from ${path}:`, error);
        }
      }

      this.initialized = true;
      console.log(`✅ B8Shield Train: ${this.wagons.size} wagons connected`);
      
    } catch (error) {
      console.error('❌ B8Shield Train: Wagon discovery failed:', error);
    }
  }

  /**
   * Register a single wagon
   */
  async registerWagon(wagon) {
    const { manifest } = wagon;
    
    // Validate wagon manifest
    if (!this.validateWagon(manifest)) {
      console.error(`❌ Invalid wagon manifest:`, manifest);
      return false;
    }

    // Check if wagon is enabled
    if (!manifest.enabled) {
      console.log(`⏸️ Wagon '${manifest.name}' is disabled, skipping`);
      return false;
    }

    // Register the wagon
    this.wagons.set(manifest.id, {
      ...wagon,
      registeredAt: new Date().toISOString()
    });

    console.log(`🔗 Connected wagon: ${manifest.name} v${manifest.version}`);
    return true;
  }

  /**
   * Validate wagon manifest structure
   */
  validateWagon(manifest) {
    const required = ['id', 'name', 'version', 'type', 'enabled'];
    return required.every(field => manifest.hasOwnProperty(field));
  }

  /**
   * Get all registered wagons
   */
  getWagons() {
    return Array.from(this.wagons.values());
  }

  /**
   * Get wagon by ID
   */
  getWagon(id) {
    return this.wagons.get(id);
  }

  /**
   * Get all admin menu items from wagons
   * Core app calls this to build navigation
   */
  getAdminMenuItems() {
    const menuItems = [];
    
    for (const wagon of this.wagons.values()) {
      if (wagon.manifest.adminMenu) {
        menuItems.push({
          ...wagon.manifest.adminMenu,
          wagonId: wagon.manifest.id,
          component: wagon.AdminComponent
        });
      }
    }

    return menuItems.sort((a, b) => (a.order || 999) - (b.order || 999));
  }

  /**
   * Get all routes from wagons
   * Core app calls this to register routes
   */
  getRoutes() {
    const routes = [];
    
    for (const wagon of this.wagons.values()) {
      if (wagon.manifest.routes) {
        wagon.manifest.routes.forEach(route => {
          routes.push({
            ...route,
            wagonId: wagon.manifest.id,
            component: wagon.components[route.component]
          });
        });
      }
    }

    return routes;
  }

  /**
   * Get integration hooks for existing pages
   * Allows wagons to add buttons/panels to existing admin pages
   */
  getIntegrationHooks(hookPoint) {
    const hooks = [];
    
    for (const wagon of this.wagons.values()) {
      if (wagon.manifest.integrations?.[hookPoint]) {
        const integration = wagon.manifest.integrations[hookPoint];
        hooks.push({
          ...integration,
          wagonId: wagon.manifest.id,
          component: wagon.components[integration.component]
        });
      }
    }

    return hooks;
  }

  /**
   * Get available services/utilities from wagons
   * Allows wagons to expose functionality to other wagons
   */
  getWagonService(wagonId, serviceName) {
    const wagon = this.wagons.get(wagonId);
    return wagon?.services?.[serviceName];
  }

  /**
   * Check if specific wagon is available
   */
  hasWagon(id) {
    return this.wagons.has(id);
  }

  /**
   * Get wagons by type
   */
  getWagonsByType(type) {
    return Array.from(this.wagons.values())
      .filter(wagon => wagon.manifest.type === type);
  }

  /**
   * Get wagon statistics
   */
  getStats() {
    const stats = {
      total: this.wagons.size,
      byType: {},
      byStatus: { enabled: 0, disabled: 0 }
    };

    for (const wagon of this.wagons.values()) {
      // Count by type
      const type = wagon.manifest.type;
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // Count by status
      if (wagon.manifest.enabled) {
        stats.byStatus.enabled++;
      } else {
        stats.byStatus.disabled++;
      }
    }

    return stats;
  }

  /**
   * Disconnect wagon (for development/testing)
   */
  disconnectWagon(id) {
    const success = this.wagons.delete(id);
    if (success) {
      console.log(`🔌 Disconnected wagon: ${id}`);
    }
    return success;
  }

  /**
   * Reset registry (for development/testing)
   */
  reset() {
    this.wagons.clear();
    this.initialized = false;
    console.log('🔄 Wagon registry reset');
  }
}

// Create singleton instance
const wagonRegistry = new WagonRegistry();

export default wagonRegistry;
export { WagonRegistry }; 