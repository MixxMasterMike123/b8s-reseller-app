// Trustpilot Account & Profile Checker
// Helps determine what integration options are available

export const checkTrustpilotStatus = async (domain) => {
  try {
    const response = await fetch(`https://www.trustpilot.com/review/${domain}`, { 
      method: 'HEAD',
      mode: 'no-cors' // Due to CORS restrictions
    });
    
    // Since we can't read the response due to CORS, 
    // we'll use alternative methods to check profile existence
    return {
      profileExists: false, // Will need manual verification
      hasReviews: false,
      trustScore: null,
      reviewCount: 0,
      checkMethod: 'manual_required'
    };
  } catch (error) {
    return {
      profileExists: false,
      hasReviews: false,
      trustScore: null,
      reviewCount: 0,
      checkMethod: 'failed',
      error: error.message
    };
  }
};

export const getTrustpilotIntegrationOptions = (accountType = 'basic') => {
  return {
    basic: {
      available: true,
      methods: ['widget', 'manual'],
      features: {
        widget: true,
        api: false,
        webhooks: false,
        customization: 'limited'
      },
      description: 'Free Trustpilot account with widget integration'
    },
    business: {
      available: true,
      methods: ['widget', 'api', 'manual'],
      features: {
        widget: true,
        api: true,
        webhooks: true,
        customization: 'full'
      },
      description: 'Paid business account with full API access'
    },
    none: {
      available: true,
      methods: ['manual', 'scraping'],
      features: {
        widget: false,
        api: false,
        webhooks: false,
        customization: 'full'
      },
      description: 'No Trustpilot account - manual integration only'
    }
  }[accountType];
};

export const generateTrustpilotSetupGuide = (domain, businessName) => {
  return {
    step1: {
      title: 'Claim Your Trustpilot Profile',
      description: 'Go to business.trustpilot.com and claim your profile',
      url: `https://business.trustpilot.com/signup?domain=${domain}`,
      required: true
    },
    step2: {
      title: 'Verify Your Business',
      description: 'Verify ownership of your domain and business details',
      requirements: ['Domain verification', 'Business registration', 'Contact details'],
      required: true
    },
    step3: {
      title: 'Get Your Business ID',
      description: 'Find your Business Unit ID in Trustpilot dashboard',
      location: 'Settings > Business Information > Business Unit ID',
      required: true
    },
    step4: {
      title: 'Configure Widget',
      description: 'Set up the Trustpilot widget on your website',
      implementation: 'widget',
      required: false
    },
    step5: {
      title: 'Invite Customers',
      description: 'Start collecting reviews from your customers',
      methods: ['Email invitations', 'Post-purchase follow-up', 'QR codes'],
      required: false
    }
  };
};

export const mockTrustpilotData = {
  // Fallback data while setting up real Trustpilot
  profile: {
    businessName: 'B8Shield',
    domain: 'shop.b8shield.com',
    trustScore: 4.5,
    reviewCount: 15,
    overallRating: 'Excellent'
  },
  reviews: [
    {
      id: 'tp_mock_1',
      rating: 5,
      title: 'Excellent product!',
      text: 'Med B8Shield kunde jag obehindrat fiska på platser som annars hade varit omöjliga, utan att tappa ett enda fiskedrag – otroligt effektivt skydd!',
      author: 'Paul Wieringa',
      date: '2024-11-15',
      verified: true,
      source: 'trustpilot'
    },
    {
      id: 'tp_mock_2',
      rating: 5,
      title: 'Great quality',
      text: 'Fantastisk produkt! Har använt B8Shield i över 6 månader och har inte förlorat en enda jigg sedan dess.',
      author: 'Erik S.',
      date: '2024-11-20',
      verified: true,
      source: 'trustpilot'
    },
    {
      id: 'tp_mock_3',
      rating: 4,
      title: 'Good value',
      text: 'Mycket bra kvalitet och fungerar som det ska. Lite dyrt men värt pengarna.',
      author: 'Maria L.',
      date: '2024-11-25',
      verified: true,
      source: 'trustpilot'
    }
  ]
};

export const trustpilotWidgetConfigs = {
  // Pre-configured widget templates
  minimal: {
    templateId: '5419b6ffb0d04a076446a9af', // TrustBox
    height: '52px',
    width: '100%',
    description: 'Simple star rating display'
  },
  reviews: {
    templateId: '5419b6a8b0d04a076446a9ae', // Review carousel
    height: '350px',
    width: '100%',
    description: 'Shows individual reviews'
  },
  micro: {
    templateId: '5419b732b0d04a076446a9a0', // Micro review
    height: '24px',
    width: '100%',
    description: 'Compact rating for product pages'
  }
};

// Helper to determine best integration strategy
export const recommendIntegrationStrategy = (accountStatus, businessNeeds) => {
  const { hasAccount, accountType, hasReviews, needsCustomization } = businessNeeds;
  
  if (!hasAccount) {
    return {
      primary: 'manual',
      secondary: 'trustpilot_setup',
      timeline: 'immediate',
      recommendation: 'Start with manual reviews, set up Trustpilot in parallel'
    };
  }
  
  if (hasAccount && accountType === 'basic') {
    return {
      primary: 'widget',
      secondary: 'manual',
      timeline: 'immediate',
      recommendation: 'Use Trustpilot widget with manual fallback'
    };
  }
  
  if (hasAccount && accountType === 'business') {
    return {
      primary: 'api',
      secondary: 'widget',
      timeline: 'immediate',
      recommendation: 'Full API integration with real-time updates'
    };
  }
  
  return {
    primary: 'manual',
    secondary: 'trustpilot_setup',
    timeline: 'plan_first',
    recommendation: 'Assess needs and set up appropriate Trustpilot account'
  };
}; 