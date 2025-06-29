export const DiningWagonManifest = {
  // Basic wagon identity
  id: 'dining-wagon',
  name: 'The Dining Wagon™',
  version: '1.0.0',
  description: 'Professional CRM system for wining, dining, and closing deals',
  type: 'crm', // Category of functionality
  enabled: true, // Easy on/off switch

  // Wagon author and metadata
  author: 'B8Shield Development Team',
  license: 'proprietary',
  tags: ['crm', 'contacts', 'sales', 'relationships', 'follow-ups', 'swedish'],

  // Dependencies and requirements
  requirements: {
    // Minimum app version this wagon supports
    minAppVersion: '1.0.0',
    // Shared services this wagon uses
    services: ['firebase', 'auth', 'notifications'],
    // External APIs this wagon uses (none for CRM)
    externalApis: []
  },

  // Admin interface integration
  adminMenu: {
    title: 'Dining Wagon',
    icon: 'BuildingStorefrontIcon',
    path: '/admin/dining',
    order: 50, // Position in admin menu
    description: 'CRM - Kundrelationer & Säljuppföljning',
    component: 'DiningDashboard'
  },

  // Routes this wagon provides
  routes: [
    {
      path: '/admin/dining',
      component: 'DiningDashboard',
      private: true,
      adminOnly: true,
      title: 'The Dining Wagon™ - CRM Dashboard'
    },
    {
      path: '/admin/dining/contacts',
      component: 'ContactList',
      private: true,
      adminOnly: true,
      title: 'Kontakter - The Dining Wagon™'
    },
    {
      path: '/admin/dining/contacts/new',
      component: 'ContactForm',
      private: true,
      adminOnly: true,
      title: 'Ny Kontakt - The Dining Wagon™'
    },
    {
      path: '/admin/dining/contacts/:id',
      component: 'ContactDetail',
      private: true,
      adminOnly: true,
      title: 'Kontaktdetaljer - The Dining Wagon™'
    },
    {
      path: '/admin/dining/activities',
      component: 'ActivityCenter',
      private: true,
      adminOnly: true,
      title: 'Aktiviteter - The Dining Wagon™'
    },
    {
      path: '/admin/dining/follow-ups',
      component: 'FollowUpCenter',
      private: true,
      adminOnly: true,
      title: 'Uppföljningar - The Dining Wagon™'
    },
    {
      path: '/admin/dining/documents',
      component: 'DocumentCenter',
      private: true,
      adminOnly: true,
      title: 'Dokument - The Dining Wagon™'
    }
  ],

  // Services this wagon exposes to other wagons
  services: {
    'addContact': {
      description: 'Add new contact to CRM',
      method: 'addContact',
      parameters: ['contactData']
    },
    'recordActivity': {
      description: 'Record activity with contact',
      method: 'recordActivity',
      parameters: ['contactId', 'activityData']
    },
    'scheduleFollowUp': {
      description: 'Schedule follow-up with contact',
      method: 'scheduleFollowUp',
      parameters: ['contactId', 'followUpData']
    }
  },

  // Configuration options
  config: {
    // Default settings
    defaults: {
      defaultContactStatus: 'prospect',
      defaultPriority: 'medium',
      followUpReminderDays: 7,
      activityRetentionDays: 365
    },
    // Settings UI for admin configuration
    settings: [
      {
        key: 'followUpReminderDays',
        type: 'number',
        label: 'Påminnelse för uppföljning (dagar)',
        min: 1,
        max: 30,
        default: 7
      },
      {
        key: 'defaultContactStatus',
        type: 'select',
        label: 'Standard kontaktstatus',
        options: [
          { value: 'prospect', label: 'Prospekt' },
          { value: 'active', label: 'Aktiv' },
          { value: 'inactive', label: 'Inaktiv' }
        ]
      }
    ]
  },

  // Feature flags
  features: {
    'contact-management': true,
    'activity-tracking': true,
    'follow-up-reminders': true,
    'document-storage': true,
    'advanced-analytics': false, // Future feature
    'email-integration': false,  // Future feature
    'calendar-sync': false      // Future feature
  },

  // Permissions this wagon needs
  permissions: [
    'admin-interface',  // Can show admin UI
    'read-contacts',    // Can read contact data
    'write-contacts',   // Can create/update contacts
    'read-activities',  // Can read activity data
    'write-activities', // Can create activities
    'notifications'     // Can send notifications
  ],

  // Database collections this wagon uses
  collections: [
    'diningContacts',
    'diningActivities', 
    'diningFollowUps',
    'diningDocuments'
  ],

  // Restaurant-themed terminology
  terminology: {
    contacts: 'Gäster', // Guests
    prospects: 'Reservationer', // Reservations
    activities: 'Service', // Service
    followUps: 'Bordsbokningar', // Table bookings
    meetings: 'Middagar', // Dinners
    calls: 'Samtal', // Conversations
    emails: 'Meddelanden', // Messages
    hotLeads: 'Dagens Rätt', // Today's Special
    closedDeals: 'Nöjda Gäster' // Satisfied Guests
  },

  // Cost information
  costs: {
    type: 'included',
    currency: 'SEK',
    description: 'Included with B8Shield platform - no additional cost'
  },

  // Development and debugging
  development: {
    testMode: false,
    debugLogging: true,
    mockMode: false
  }
}; 