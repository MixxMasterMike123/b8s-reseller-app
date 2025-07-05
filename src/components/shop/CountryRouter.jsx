import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '../../contexts/TranslationContext';
import { 
  COUNTRIES, 
  getCountryFromPath, 
  getStoredCountry, 
  getBrowserLanguage 
} from '../../config/countries';

const CountryRouter = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { changeLanguage } = useTranslation();
  const [isInitialized, setIsInitialized] = useState(false);

  // Determine which country to redirect to
  const getTargetCountry = () => {
    // 1. Check if we're already on a country route
    const currentCountry = getCountryFromPath(location.pathname);
    if (currentCountry) return currentCountry;

    // 2. Check stored preference
    const storedCountry = getStoredCountry();
    if (storedCountry && COUNTRIES[storedCountry]) return storedCountry;

    // 3. Check browser language
    const browserCountry = getBrowserLanguage();
    if (browserCountry && COUNTRIES[browserCountry]) return browserCountry;

    // 4. Default to Sweden
    return 'se';
  };

  // Update language based on country
  const updateLanguageForCountry = async (countryCode) => {
    const country = COUNTRIES[countryCode];
    if (country) {
      await changeLanguage(country.language);
      localStorage.setItem('b8shield-country', countryCode);
    }
  };

  // Handle country redirects
  useEffect(() => {
    if (isInitialized) return;

    const targetCountry = getTargetCountry();
    const currentCountry = getCountryFromPath(location.pathname);

    // If we're not on a country route, redirect
    if (!currentCountry) {
      const newPath = `/${targetCountry}${location.pathname}`;
      console.log(`🌍 CountryRouter: Redirecting from ${location.pathname} to ${newPath}`);
      navigate(newPath, { replace: true });
      return;
    }

    // If we're on a country route, update language and mark as initialized
    if (currentCountry) {
      updateLanguageForCountry(currentCountry);
      setIsInitialized(true);
    }
  }, [location.pathname, isInitialized, navigate, changeLanguage]);

  // Handle language updates when country changes in URL
  useEffect(() => {
    if (!isInitialized) return;
    
    const currentCountry = getCountryFromPath(location.pathname);
    if (currentCountry) {
      console.log(`🌍 CountryRouter: Country changed to ${currentCountry}, updating language`);
      updateLanguageForCountry(currentCountry);
    }
  }, [location.pathname, isInitialized, changeLanguage]);

  // Don't render children until we've determined the country
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return children;
};

export default CountryRouter; 