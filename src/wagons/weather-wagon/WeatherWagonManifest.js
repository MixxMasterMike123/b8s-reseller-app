// The Weather Wagon Manifest
// Completely self-contained wagon for fishing weather conditions

import { MapIcon, CloudIcon } from '@heroicons/react/24/outline';
import WeatherSearch from './components/WeatherSearch.jsx';
import WeatherResults from './components/WeatherResults.jsx';

export const WeatherWagonManifest = {
  // Basic wagon identity
  id: 'weather-wagon', 
  name: 'The Weather Wagon™',
  version: '1.0.0',
  description: 'Sophisticated fishing conditions forecasting with Swedish government data',
  type: 'weather-analytics',
  enabled: true, // Re-enabled - wasn't causing bundle size issue

  // Swedish Terminology
  displayName: 'Väder Vagnen',
  menuTitle: 'Fiskeväder',
  
  // Routes - completely self-contained
  routes: [
    {
      path: '/weather',
      component: 'WeatherSearch',
      private: true,
      adminOnly: false,
      exact: true,
      title: 'Fiskeväder Sök'
    },
    {
      path: '/weather/results/:location',
      component: 'WeatherResults',
      private: true,
      adminOnly: false,
      exact: true,
      title: 'Väderförhållanden'
    }
  ],

  // Navigation Integration (minimal connection to train)
  adminMenu: {
    title: 'Fiskeväder',
    path: '/weather',
    icon: 'CloudIcon',
    order: 25, // Place after marketing materials
    description: 'Väderförhållanden för fiske',
    component: 'WeatherSearch'
  },

  // Self-contained services
  services: {
    apis: ['SMHI', 'OpenWeather'], // Free APIs only
    storage: 'localStorage', // No Firebase dependency
    notifications: false // Keep it simple for MVP
  },

  // Health check
  healthCheck: () => ({
    status: 'healthy',
    services: {
      apis: 'available',
      storage: typeof localStorage !== 'undefined' ? 'available' : 'unavailable'
    }
  })
};

export default WeatherWagonManifest; 