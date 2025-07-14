import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { 
  getCountryConfig, 
  isCountrySupported,
  DEFAULT_COUNTRY,
  FALLBACK_LANGUAGE 
} from '../../utils/internationalCountries';
import { getOptimalLanguageForCountry } from '../../utils/translationDetection';

const GeoRedirect = () => {
  const [targetCountry, setTargetCountry] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [detectionInfo, setDetectionInfo] = useState(null);

  useEffect(() => {
    const performAdvancedGeoDetection = async () => {
      try {
        console.log('🌍 GeoRedirect: Starting advanced geo-detection for international e-commerce...');
        
        // Get CloudFlare country detection
        let detectedCountry = null;
        
        // Check CloudFlare data
        if (typeof window !== 'undefined' && window.CF_COUNTRY) {
          detectedCountry = window.CF_COUNTRY.toLowerCase();
          console.log(`🌍 CloudFlare country detected: ${detectedCountry.toUpperCase()}`);
        }
        
        // Fallback detection methods
        if (!detectedCountry) {
          console.log('⚠️ CloudFlare country not available, using fallback detection...');
          
          // Try browser language as country hint
          if (navigator.language) {
            const langParts = navigator.language.toLowerCase().split('-');
            if (langParts.length > 1) {
              detectedCountry = langParts[1];
              console.log(`🗣️ Country hint from browser language: ${detectedCountry}`);
            }
          }
          
          // Ultimate fallback
          if (!detectedCountry) {
            detectedCountry = DEFAULT_COUNTRY;
            console.log(`🏠 Using default country: ${detectedCountry}`);
          }
        }
        
        // Get country configuration
        const countryConfig = getCountryConfig(detectedCountry);
        
        if (!countryConfig) {
          console.log(`❓ Unknown country ${detectedCountry}, using default: ${DEFAULT_COUNTRY}`);
          setTargetCountry(DEFAULT_COUNTRY);
          setDetectionInfo({
            detectedCountry,
            targetCountry: DEFAULT_COUNTRY,
            reason: 'Unknown country - fallback to default',
            countryConfig: getCountryConfig(DEFAULT_COUNTRY)
          });
          return;
        }
        
        // Check if country has translation support
        const isSupported = countryConfig.isSupported;
        
        let finalCountry = detectedCountry;
        let detectionReason = '';
        
        if (isSupported) {
          // Supported country - verify translations exist
          const optimalLanguage = await getOptimalLanguageForCountry(detectedCountry);
          
          if (optimalLanguage === countryConfig.language) {
            detectionReason = `Supported country with native translations (${countryConfig.language})`;
            console.log(`✅ Supported country: ${detectedCountry} → /${detectedCountry}/ (${countryConfig.language} + ${countryConfig.currency})`);
          } else {
            detectionReason = `Configured country but translations missing - using fallback language`;
            console.log(`⚠️ Supported country: ${detectedCountry} → /${detectedCountry}/ (${optimalLanguage} + ${countryConfig.currency}) - translations missing`);
          }
        } else {
          // Unsupported country - use English with local currency
          detectionReason = `Unsupported country - English interface with local currency (${countryConfig.currency})`;
          console.log(`🌍 Unsupported country: ${detectedCountry} → /${detectedCountry}/ (${FALLBACK_LANGUAGE} + ${countryConfig.currency})`);
        }
        
        setTargetCountry(finalCountry);
        setDetectionInfo({
          detectedCountry,
          targetCountry: finalCountry,
          reason: detectionReason,
          countryConfig,
          isSupported,
          optimalLanguage: await getOptimalLanguageForCountry(detectedCountry)
        });
        
        console.log(`🎯 GeoRedirect: Final decision → /${finalCountry}/ (${detectionReason})`);
        
      } catch (error) {
        console.error('❌ GeoRedirect: Error during advanced geo-detection:', error);
        // Fallback to default country
        setTargetCountry(DEFAULT_COUNTRY);
        setDetectionInfo({
          detectedCountry: 'unknown',
          targetCountry: DEFAULT_COUNTRY,
          reason: 'Error in geo-detection - fallback to default',
          countryConfig: getCountryConfig(DEFAULT_COUNTRY),
          error: error.message
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Add small delay to ensure CloudFlare data is loaded (reduced for better UX)
    const timeoutId = setTimeout(performAdvancedGeoDetection, 50);
    
    return () => clearTimeout(timeoutId);
  }, []);

  // Show enhanced loading state while detecting
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="relative mb-8">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-b-2 border-blue-300 opacity-20"></div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            🌍 Detecting Your Location
          </h2>
          
          <div className="space-y-2 text-gray-600">
            <p className="text-lg">Finding the best experience for you...</p>
            <p className="text-sm">• Optimal language detection</p>
            <p className="text-sm">• Local currency selection</p>
            <p className="text-sm">• Regional pricing</p>
          </div>
          
          <div className="mt-6 p-4 bg-white/60 rounded-lg border border-white/80">
            <p className="text-xs text-gray-500">
              🔒 Secure • 🌐 Global • ⚡ Fast
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show detection info for debugging in development
  if (process.env.NODE_ENV === 'development' && detectionInfo) {
    console.log('🔍 GeoRedirect Detection Info:', detectionInfo);
  }

  // Redirect to the detected country
  if (targetCountry) {
    const redirectUrl = `/${targetCountry}/`;
    console.log(`➡️ GeoRedirect: Redirecting to ${redirectUrl}`);
    return <Navigate to={redirectUrl} replace />;
  }

  // Fallback - should never reach here
  console.log(`🏠 GeoRedirect: Ultimate fallback to /${DEFAULT_COUNTRY}/`);
  return <Navigate to={`/${DEFAULT_COUNTRY}/`} replace />;
};

export default GeoRedirect; 