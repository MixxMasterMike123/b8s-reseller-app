// LocationSearch component for FishTrip Wagon
// Mobile-optimized location search with Swedish fishing locations

import React, { useState, useRef, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  MapPinIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { geocodeLocation, getKnownLocations } from '../utils/geocoding.js';

const LocationSearch = ({ onLocationSelect, onCurrentLocation, loading }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  const knownLocations = getKnownLocations();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = async (e) => {
    const value = e.target.value;
    setQuery(value);

    if (value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Filter known locations
    const filteredKnown = knownLocations.filter(location =>
      location.name.toLowerCase().includes(value.toLowerCase()) ||
      location.key.toLowerCase().includes(value.toLowerCase())
    );

    // Show known locations immediately
    setSuggestions(filteredKnown.map(loc => ({
      ...loc,
      type: 'known',
      displayName: loc.name
    })));
    setShowSuggestions(true);

    // Search for additional locations if query is longer
    if (value.length >= 3) {
      setSearching(true);
      try {
        const results = await geocodeLocation(value);
        const searchResults = results.slice(0, 5).map(result => ({
          ...result,
          type: 'search',
          displayName: result.name
        }));

        // Combine known and search results, avoiding duplicates
        const combined = [...filteredKnown.map(loc => ({
          ...loc,
          type: 'known',
          displayName: loc.name
        })), ...searchResults];

        const unique = combined.filter((item, index, self) =>
          index === self.findIndex(t => 
            Math.abs(t.lat - item.lat) < 0.01 && Math.abs(t.lon - item.lon) < 0.01
          )
        );

        setSuggestions(unique.slice(0, 8));
      } catch (error) {
        console.error('Location search failed:', error);
        // Keep known locations even if search fails
      } finally {
        setSearching(false);
      }
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion.displayName);
    setShowSuggestions(false);
    onLocationSelect(suggestion);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query && query.trim() && !loading) {
      setShowSuggestions(false);
      onLocationSelect(query);
    }
  };

  const handleCurrentLocation = () => {
    if (!loading) {
      onCurrentLocation();
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="flex space-x-3">
        {/* Search Input */}
        <div className="flex-1 relative">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Sök fiskeplats (t.ex. Kultsjön, Vänern, Siljan...)"
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.lat}-${suggestion.lon}-${index}`}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center space-x-3">
                    <MapPinIcon className={`h-4 w-4 flex-shrink-0 ${
                      suggestion.type === 'known' ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {suggestion.displayName}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>{suggestion.lat.toFixed(4)}°N, {suggestion.lon.toFixed(4)}°E</span>
                        {suggestion.type === 'known' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">
                            Känd fiskeplats
                          </span>
                        )}
                        {suggestion.source === 'fallback' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium">
                            Lokal databas
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              
              {searching && (
                <div className="px-4 py-3 text-center text-sm text-gray-500">
                  Söker fler platser...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Current Location Button */}
        <button
          type="button"
          onClick={handleCurrentLocation}
          disabled={loading}
          className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          title="Använd nuvarande position"
        >
          <MapPinIcon className="h-5 w-5" />
          <span className="hidden sm:inline">Min position</span>
        </button>

        {/* Search Button */}
        <button
          type="submit"
          disabled={!query || !query.trim() || loading}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <MagnifyingGlassIcon className="h-5 w-5" />
          <span className="hidden sm:inline">Analysera</span>
        </button>
      </form>

      {/* Quick Location Buttons */}
      <div className="mt-4">
        <p className="text-sm text-gray-600 mb-2">Populära fiskeplatser:</p>
        <div className="flex flex-wrap gap-2">
          {knownLocations.slice(0, 6).map((location) => (
            <button
              key={location.key}
              onClick={() => handleSuggestionClick(location)}
              disabled={loading}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50"
            >
              {location.key.charAt(0).toUpperCase() + location.key.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LocationSearch; 