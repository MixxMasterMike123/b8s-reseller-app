// 🚂 THE AMBASSADOR WAGON™ - Main Entry Point
// Professional influence partnership system for managing brand ambassadors and affiliate prospects

import { lazy } from 'react';
import { AmbassadorWagonManifest } from './AmbassadorWagonManifest.js';

// Lazy load components for better performance
const AmbassadorDashboard = lazy(() => import('./components/AmbassadorDashboard.jsx'));
const AmbassadorContactList = lazy(() => import('./components/AmbassadorContactList.jsx'));
const AmbassadorContactForm = lazy(() => import('./components/AmbassadorContactForm.jsx'));
const AmbassadorContactDetail = lazy(() => import('./components/AmbassadorContactDetail.jsx'));
const AmbassadorActivityCenter = lazy(() => import('./components/AmbassadorActivityCenter.jsx'));
const AmbassadorFollowUpCenter = lazy(() => import('./components/AmbassadorFollowUpCenter.jsx'));
const AmbassadorConversionCenter = lazy(() => import('./components/AmbassadorConversionCenter.jsx'));

// Hooks for external access (imported for re-export only)
import { useAmbassadorContacts } from './hooks/useAmbassadorContacts.js';
import { useAmbassadorActivities } from './hooks/useAmbassadorActivities.js';

// The Ambassador Wagon™ - Complete Influence CRM System
const AmbassadorWagon = {
  manifest: AmbassadorWagonManifest,
  
  // Component mapping for routing (CRITICAL: WagonRegistry expects this structure)
  components: {
    AmbassadorDashboard,
    AmbassadorContactList,
    AmbassadorContactForm,
    AmbassadorContactDetail,
    AmbassadorActivityCenter,
    AmbassadorFollowUpCenter,
    AmbassadorConversionCenter
  },

  // Services this wagon exposes to other wagons
  services: {
    // Add new ambassador prospect (direct database operations)
    addAmbassadorProspect: async (prospectData) => {
      // TODO: Implement direct database operations for inter-wagon communication
      console.log('Adding ambassador prospect:', prospectData);
      return { success: true, id: 'pending-implementation' };
    },
    
    // Record activity with ambassador prospect
    recordAmbassadorActivity: async (prospectId, activityData) => {
      // TODO: Implement direct database operations for inter-wagon communication
      console.log('Recording ambassador activity:', prospectId, activityData);
      return { success: true, activityId: 'pending-implementation' };
    },
    
    // Convert prospect to active affiliate
    convertToAffiliate: async (prospectId, affiliateData) => {
      // TODO: Implement conversion logic
      console.log('Converting prospect to affiliate:', prospectId, affiliateData);
      return { success: true, affiliateId: 'pending-implementation' };
    }
  },

  // Hooks for external access
  hooks: {
    useAmbassadorContacts,
    useAmbassadorActivities
  },

  // Metadata
  version: '1.0.0',
  type: 'influence-crm'
};

// Default export for WagonRegistry auto-discovery
export default AmbassadorWagon;