// FishTrip Wagon Manifest
// Advanced Swedish fishing intelligence system with AI enhancement
// Combines SMHI weather data, water conditions, and AI-powered fishing insights

import { MapIcon } from '@heroicons/react/24/outline';

export const FishTripWagonManifest = {
  id: 'fishtrip-wagon',
  name: 'FishTrip Wagon',
  displayName: 'FishTrip',
  description: 'Avancerad fiskeintelligens för svenska vatten med AI-förstärkning',
  version: '1.0.0',
  type: 'tool', // Required by wagon registry
  enabled: true,
  
  // Wagon metadata
  author: 'B8Shield Development Team',
  category: 'fishing',
  tags: ['fishing', 'weather', 'ai', 'sweden', 'water-conditions'],
  
  // UI Configuration
  icon: MapIcon,
  color: '#459CA8', // B8Shield primary color
  route: '/fishtrip',
  menuTitle: 'FishTrip',
  menuOrder: 3,
  
  // Admin menu integration
  adminMenu: {
    title: 'FishTrip',
    path: '/fishtrip',
    icon: 'MapIcon',
    order: 25, // Position in admin menu
    description: 'Avancerad fiskeintelligens för svenska vatten'
  },
  
  // Feature flags
  features: {
    aiEnhancement: true,
    weatherForecast: true,
    waterConditions: true,
    multiDayPlanning: true,
    nearbyWaters: true,
    fishingIntelligence: true,
    mobileOptimized: true
  },
  
  // Required permissions
  permissions: [
    'geolocation',
    'external-apis'
  ],
  
  // API dependencies
  apis: {
    smhi: {
      weather: 'https://opendata-download-metfcst.smhi.se/api',
      hydro: 'https://opendata-download-hydroobs.smhi.se/api'
    },
    viss: {
      base: 'https://viss.lansstyrelsen.se/API',
      key: 'c05b6194959f123ea6e9eab04c1855e9'
    },
    claude: {
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 4000
    },
    nominatim: 'https://nominatim.openstreetmap.org'
  },
  
  // Mobile-first design specifications
  responsive: {
    mobile: {
      breakpoint: '768px',
      layout: 'single-column',
      touchOptimized: true
    },
    tablet: {
      breakpoint: '1024px',
      layout: 'adaptive'
    },
    desktop: {
      layout: 'multi-column'
    }
  },
  
  // Swedish localization
  localization: {
    language: 'sv-SE',
    currency: 'SEK',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h'
  },
  
  // Routes for this wagon
  routes: [
    {
      path: '/fishtrip',
      component: 'FishTripDashboard', // Reference to component key
      name: 'FishTrip Dashboard',
      private: true, // Requires authentication
      adminOnly: true // Admin only access
    }
  ]
}; 