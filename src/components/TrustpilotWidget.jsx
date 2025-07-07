import React, { useEffect, useState } from 'react';

const TrustpilotWidget = ({ 
  businessId, 
  domain, 
  locale = 'sv-SE', 
  theme = 'light',
  showReviews = true,
  showStars = true,
  className = ''
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  const REVIEW_URL = 'https://www.trustpilot.com/review/b8shield.com?languages=all';

  useEffect(() => {
    // Load Trustpilot widget script
    const script = document.createElement('script');
    script.src = '//widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js';
    script.async = true;
    script.onload = () => setLoaded(true);
    script.onerror = () => setError('Failed to load Trustpilot widget');
    
    document.head.appendChild(script);

    return () => {
      // Cleanup
      const existingScript = document.querySelector('script[src*="trustpilot"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  if (error) {
    return (
      <div className="text-center text-gray-500 text-sm">
        Unable to load reviews
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="animate-pulse">
        <div className="h-12 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className={`trustpilot-integration ${className}`}>
      {showStars && (
        <div 
          className="trustpilot-widget" 
          data-locale={locale}
          data-template-id="5419b6ffb0d04a076446a9af"
          data-businessunit-id={businessId}
          data-style-height="52px"
          data-style-width="100%"
          data-theme={theme}
        >
          <a 
            href={REVIEW_URL} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800"
          >
            Trustpilot
          </a>
        </div>
      )}
      
      {showReviews && (
        <div 
          className="trustpilot-widget mt-4" 
          data-locale={locale}
          data-template-id="5419b6a8b0d04a076446a9ae"
          data-businessunit-id={businessId}
          data-style-height="350px"
          data-style-width="100%"
          data-theme={theme}
        >
          <a 
            href={REVIEW_URL} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800"
          >
            Trustpilot
          </a>
        </div>
      )}
    </div>
  );
};

export default TrustpilotWidget; 