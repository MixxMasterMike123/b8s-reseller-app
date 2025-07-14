import React, { useEffect, useRef, useState } from 'react';
import CookieBot from 'react-cookiebot';

// Cookiebot Domain Group ID obtained from account setup
const DOMAIN_GROUP_ID = '51150c10-e895-4814-b11b-04512c3782ed';

/**
 * Wraps the Cookiebot CMP script and exposes consent change events.
 * Loads only once (React 18 strict-mode safe).
 */
const CookiebotCMP = () => {
  const hasInitialized = useRef(false);
  const [isReady, setIsReady] = useState(false);
  
  // Optional: hook consent events for future analytics initialisation
  useEffect(() => {
    const handler = () => {
      // Example: you can initialise Google Analytics here when statistics consent is given
      // if (window.Cookiebot?.consent?.statistics) initGA4();
      // Similarly, marketing pixels etc.
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

  // PERFORMANCE FIX: Prevent duplicate script loading
  if (hasInitialized.current) {
    return null;
  }
  
  hasInitialized.current = true;

  // Add error boundary for Cookiebot
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return null;
  }

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