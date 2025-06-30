// FishTrip Wagon - Main Entry Point
// Advanced Swedish fishing intelligence system
// Self-contained wagon following B8Shield architecture

import { FishTripWagonManifest } from './FishTripWagonManifest.js';
import FishTripDashboard from './components/FishTripDashboard.jsx';

// Wagon structure for auto-discovery
const FishTripWagon = {
  manifest: FishTripWagonManifest,
  
  // Components provided by this wagon
  components: {
    FishTripDashboard: FishTripDashboard
  },
  
  // Admin component (if needed)
  AdminComponent: null,
  
  // Services this wagon provides
  services: {},
  
  // Integration hooks
  hooks: {}
};

// Default export for wagon registry auto-discovery
export default FishTripWagon;

// Named exports for compatibility
export const manifest = FishTripWagonManifest;
export const components = FishTripWagon.components;
export { default as FishTripDashboard } from './components/FishTripDashboard.jsx'; 