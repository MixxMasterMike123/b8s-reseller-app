import React, { useEffect, useRef } from 'react';
import CookieBot from 'react-cookiebot';

// Cookiebot Domain Group ID obtained from account setup
const DOMAIN_GROUP_ID = '51150c10-e895-4814-b11b-04512c3782ed';

/**
 * Cookiebot CMP Component
 * Loads with minimal performance impact
 */
const CookiebotCMP = () => {
  const hasInitialized = useRef(false);
  
  // Optional: hook consent events for future analytics initialisation
  useEffect(() => {
    const handler = () => {
      // Example: you can initialise Google Analytics here when statistics consent is given
      // if (window.Cookiebot?.consent?.statistics) initGA4();
      // Similarly, marketing pixels etc.
      console.log('🍪 Cookiebot consent declaration received');
    };

    // Add error handling for Cookiebot events
    const errorHandler = (error) => {
      console.warn('Cookiebot CMP error (non-critical):', error);
    };

    window.addEventListener('CookieConsentDeclaration', handler);
    window.addEventListener('error', errorHandler);
    
    return () => {
      window.removeEventListener('CookieConsentDeclaration', handler);
      window.removeEventListener('error', errorHandler);
    };
  }, []);

  // Prevent duplicate script loading
  if (hasInitialized.current) {
    return null;
  }
  
  hasInitialized.current = true;

  try {
    return (
      <CookieBot
        domainGroupId={DOMAIN_GROUP_ID}
        scriptProps={{ 'data-blockingmode': 'auto' }}
      />
    );
  } catch (error) {
    console.warn('Cookiebot CMP failed to load (non-critical):', error);
    return null;
  }
};

export default CookiebotCMP; 