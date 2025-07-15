import React, { useEffect, useState, useRef } from 'react';

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
  const [isVisible, setIsVisible] = useState(false);
  const widgetRef = useRef(null);

  const REVIEW_URL = 'https://www.trustpilot.com/review/b8shield.com?languages=all';

  // PERFORMANCE OPTIMIZATION: Use IntersectionObserver for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Only load once when visible
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before widget comes into view
        threshold: 0.1
      }
    );

    if (widgetRef.current) {
      observer.observe(widgetRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Load Trustpilot script only when widget becomes visible
  useEffect(() => {
    if (!isVisible) return;

    // Check if script is already loaded
    if (document.querySelector('script[src*="trustpilot"]')) {
      setLoaded(true);
      return;
    }

    // Load Trustpilot widget script asynchronously
    const script = document.createElement('script');
    script.src = '//widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js';
    script.async = true;
    script.defer = true; // Defer execution until page is parsed
    script.onload = () => setLoaded(true);
    script.onerror = () => setError('Failed to load Trustpilot widget');
    
    document.head.appendChild(script);

    return () => {
      // Cleanup only if component unmounts before script loads
      if (!loaded) {
        const existingScript = document.querySelector('script[src*="trustpilot"]');
        if (existingScript) {
          existingScript.remove();
        }
      }
    };
  }, [isVisible, loaded]);

  if (error) {
    return (
      <div className="text-center text-gray-500 text-sm">
        Unable to load reviews
      </div>
    );
  }

  if (!loaded) {
    return (
      <div ref={widgetRef} className="animate-pulse">
        <div className="h-12 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
      </div>
    );
  }

  return (
    <div ref={widgetRef} className={className}>
      {/* Trustpilot widget will be rendered here when script loads */}
      <div 
        className="trustpilot-widget" 
        data-locale={locale}
        data-template-id="53aa8912dec7e10d38f59f36"
        data-businessunit-id="5f7f7f7f7f7f7f7f7f7f7f7f"
        data-style-height="240px"
        data-style-width="100%"
        data-theme={theme}
        data-stars="1,2,3,4,5"
        data-review-languages="sv,en"
      >
        <a href={REVIEW_URL} target="_blank" rel="noopener noreferrer">
          Trustpilot
        </a>
      </div>
    </div>
  );
};

export default TrustpilotWidget; 