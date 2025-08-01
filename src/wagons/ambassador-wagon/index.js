// 🚂 THE AMBASSADOR WAGON™ - Main Entry Point
// Professional influence partnership system for managing brand ambassadors and affiliate prospects

import React from 'react';
import { AmbassadorWagonManifest } from './AmbassadorWagonManifest.js';

// Lazy load components for better performance
const AmbassadorDashboard = React.lazy(() => import('./components/AmbassadorDashboard.jsx'));
const AmbassadorContactList = React.lazy(() => import('./components/AmbassadorContactList.jsx'));
const AmbassadorContactForm = React.lazy(() => import('./components/AmbassadorContactForm.jsx'));
const AmbassadorContactDetail = React.lazy(() => import('./components/AmbassadorContactDetail.jsx'));
const AmbassadorActivityCenter = React.lazy(() => import('./components/AmbassadorActivityCenter.jsx'));
const AmbassadorFollowUpCenter = React.lazy(() => import('./components/AmbassadorFollowUpCenter.jsx'));
const AmbassadorConversionCenter = React.lazy(() => import('./components/AmbassadorConversionCenter.jsx'));

// Export manifest for wagon registry auto-discovery
export const manifest = AmbassadorWagonManifest;

// Export routes for auto-registration
export const routes = [
  {
    path: '/admin/ambassadors',
    component: AmbassadorDashboard,
    private: true,
    adminOnly: true
  },
  {
    path: '/admin/ambassadors/prospects',
    component: AmbassadorContactList,
    private: true,
    adminOnly: true
  },
  {
    path: '/admin/ambassadors/prospects/new',
    component: AmbassadorContactForm,
    private: true,
    adminOnly: true
  },
  {
    path: '/admin/ambassadors/prospects/:id',
    component: AmbassadorContactDetail,
    private: true,
    adminOnly: true
  },
  {
    path: '/admin/ambassadors/activities',
    component: AmbassadorActivityCenter,
    private: true,
    adminOnly: true
  },
  {
    path: '/admin/ambassadors/follow-ups',
    component: AmbassadorFollowUpCenter,
    private: true,
    adminOnly: true
  },
  {
    path: '/admin/ambassadors/conversions',
    component: AmbassadorConversionCenter,
    private: true,
    adminOnly: true
  }
];

// Export menu items for auto-registration
export const menuItems = [
  {
    name: 'Ambassadör-vagn',
    path: '/admin/ambassadors',
    icon: 'UserGroupIcon',
    adminOnly: true,
    order: 55
  }
];

// Export services this wagon provides (for inter-wagon communication)
export const services = {
  addAmbassadorProspect: (prospectData) => {
    // Implementation will be in utils/ambassadorDatabase.js
    const { addAmbassadorContact } = require('./utils/ambassadorDatabase.js');
    return addAmbassadorContact(prospectData);
  },
  
  recordAmbassadorActivity: (prospectId, activityData) => {
    const { addAmbassadorActivity } = require('./utils/ambassadorDatabase.js');
    return addAmbassadorActivity(prospectId, activityData);
  },
  
  convertToAffiliate: (prospectId, affiliateData) => {
    const { convertProspectToAffiliate } = require('./utils/ambassadorConversion.js');
    return convertProspectToAffiliate(prospectId, affiliateData);
  }
};

// Export wagon metadata for debugging and management
export const wagonInfo = {
  id: 'ambassador-wagon',
  name: 'The Ambassador Wagon™',
  version: '1.0.0',
  type: 'influence-crm',
  collections: [
    'ambassadorContacts',
    'ambassadorActivities', 
    'ambassadorFollowUps',
    'ambassadorDocuments',
    'ambassadorConversions'
  ]
};

// Default export for direct imports
export default {
  manifest,
  routes,
  menuItems,
  services,
  wagonInfo
};