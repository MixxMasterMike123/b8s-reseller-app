// The Weather Wagon - Auto-Discovery Entry Point
// Minimal connection to the "train" - just registry discovery

import WeatherWagonManifest from './WeatherWagonManifest.js';
import WeatherSearch from './components/WeatherSearch.jsx';
import WeatherResults from './components/WeatherResults.jsx';

// Export for WagonRegistry auto-discovery
export default {
  manifest: WeatherWagonManifest,
  components: {
    WeatherSearch,
    WeatherResults
  }
}; 