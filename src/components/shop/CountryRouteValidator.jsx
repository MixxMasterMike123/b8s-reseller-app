import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { isValidCountryCode } from '../../utils/internationalCountries';
import GeoRedirect from './GeoRedirect';

/**
 * Validates country code in URL parameters and redirects invalid codes
 * Ensures only valid country codes are processed by the application
 */
const CountryRouteValidator = ({ children }) => {
  const { countryCode } = useParams();
  
  // If no country code in params, let GeoRedirect handle it
  if (!countryCode) {
    console.log('❓ No country code in URL, redirecting to geo-detection');
    return <GeoRedirect />;
  }
  
  // Validate the country code
  const isValid = isValidCountryCode(countryCode);
  
  if (!isValid) {
    console.log(`❌ Invalid country code: ${countryCode}, redirecting to geo-detection`);
    return <GeoRedirect />;
  }
  
  console.log(`✅ Valid country code: ${countryCode}`);
  return children;
};

export default CountryRouteValidator; 