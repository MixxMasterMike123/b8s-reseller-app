import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { COUNTRIES, getCountryFromPath, getAvailableCountries } from '../../config/countries';

const CountrySwitcher = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Get current country from URL
  const getCurrentCountry = () => {
    const countryCode = getCountryFromPath(location.pathname);
    return countryCode || 'se';
  };

  const currentCountry = getCurrentCountry();
  const currentCountryData = COUNTRIES[currentCountry];

  const handleCountryChange = (countryCode) => {
    const country = COUNTRIES[countryCode];
    if (!country) return;

    // Get the path without the country prefix
    const segments = location.pathname.split('/').filter(Boolean);
    const pathWithoutCountry = segments.length > 1 ? `/${segments.slice(1).join('/')}` : '/';
    
    // Navigate to the new country URL
    const newPath = `/${countryCode}${pathWithoutCountry}`;
    console.log(`🌍 CountrySwitcher: Switching from ${location.pathname} to ${newPath}`);
    
    // Store country preference
    localStorage.setItem('b8shield-country', countryCode);
    
    // Navigate to new country URL
    navigate(newPath);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.country-switcher')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="relative country-switcher">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className="text-lg">{currentCountryData.flag}</span>
        <span className="hidden sm:inline">{currentCountryData.name}</span>
        <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
          <div className="py-1">
            {getAvailableCountries().map((country) => (
              <button
                key={country.code}
                onClick={() => handleCountryChange(country.code)}
                className={`w-full text-left px-4 py-2 text-sm flex items-center space-x-3 hover:bg-gray-50 ${
                  currentCountry === country.code ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                }`}
              >
                <span className="text-lg">{country.flag}</span>
                <span className="flex-1">{country.name}</span>
                {currentCountry === country.code && (
                  <CheckIcon className="h-4 w-4 text-blue-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CountrySwitcher; 