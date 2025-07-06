import React, { useEffect } from 'react';
import CookieBot from 'react-cookiebot';

// Cookiebot Domain Group ID obtained from account setup
const DOMAIN_GROUP_ID = '51150c10-e895-4814-b11b-04512c3782ed';

/**
 * Wraps the Cookiebot CMP script and exposes consent change events.
 * Loads only once (React 18 strict-mode safe).
 */
const CookiebotCMP = () => {
  // Optional: hook consent events for future analytics initialisation
  useEffect(() => {
    const handler = () => {
      // Example: you can initialise Google Analytics here when statistics consent is given
      // if (window.Cookiebot?.consent?.statistics) initGA4();
      // Similarly, marketing pixels etc.
    };

    window.addEventListener('CookieConsentDeclaration', handler);
    return () => window.removeEventListener('CookieConsentDeclaration', handler);
  }, []);

  return (
    <CookieBot
      domainGroupId={DOMAIN_GROUP_ID}
      scriptProps={{ 'data-blockingmode': 'auto' }}
    />
  );
};

export default CookiebotCMP; 