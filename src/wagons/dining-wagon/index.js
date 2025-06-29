// The Dining Wagon™ - Professional CRM System
// Main entry point for wagon integration

import { DiningWagonManifest } from './DiningWagonManifest.js';

// Lazy-loaded components for performance
import { lazy } from 'react';

// Main components
const DiningDashboard = lazy(() => import('./components/DiningDashboard.jsx'));
const ContactList = lazy(() => import('./components/ContactList.jsx'));
const ContactForm = lazy(() => import('./components/ContactForm.jsx'));
const ContactDetail = lazy(() => import('./components/ContactDetail.jsx'));
const ActivityCenter = lazy(() => import('./components/ActivityCenter.jsx'));
const FollowUpCenter = lazy(() => import('./components/FollowUpCenter.jsx'));
const DocumentCenter = lazy(() => import('./components/DocumentCenter.jsx'));

// Hooks for external wagon services
import { useDiningContacts } from './hooks/useDiningContacts.js';
import { useDiningActivities } from './hooks/useDiningActivities.js';

// The Dining Wagon™ - Complete CRM System
const DiningWagon = {
  manifest: DiningWagonManifest,
  
  // Component mapping for routing
  components: {
    DiningDashboard,
    ContactList,
    ContactForm,
    ContactDetail,
    ActivityCenter,
    FollowUpCenter,
    DocumentCenter
  },

  // Services this wagon exposes to other wagons
  services: {
    // Add new contact to CRM
    addContact: async (contactData) => {
      const { addContact } = useDiningContacts();
      return await addContact(contactData);
    },
    
    // Record activity with contact
    recordActivity: async (contactId, activityData) => {
      const { addActivity } = useDiningActivities();
      return await addActivity({ ...activityData, contactId });
    },
    
    // Quick contact lookup
    findContact: (query) => {
      const { contacts, filterContacts } = useDiningContacts();
      return filterContacts({ search: query });
    }
  },

  // Quick access methods
  isEnabled: () => DiningWagonManifest.enabled,
  getRoutes: () => DiningWagonManifest.routes,
  
  // Dining-themed welcome message
  welcome: () => console.log('🍽️ The Dining Wagon™ - Where relationships are served with excellence!'),
  
  // Wagon health check
  healthCheck: () => {
    return {
      status: 'healthy',
      message: 'The Dining Wagon™ is ready to serve!',
      timestamp: new Date().toISOString()
    };
  }
};

// Default export for WagonRegistry auto-discovery
export default DiningWagon;

// Named export for explicit imports
export { DiningWagon };

// Individual component exports for direct access
export {
  DiningDashboard,
  ContactList,
  ContactForm,
  ContactDetail,
  ActivityCenter,
  FollowUpCenter,
  DocumentCenter
}; 