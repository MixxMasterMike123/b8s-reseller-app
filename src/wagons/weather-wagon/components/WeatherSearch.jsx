// WeatherSearch.jsx - Main search interface for The Weather Wagon
// Self-contained component with minimal dependencies

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPinIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import AppLayout from '../../../components/layout/AppLayout';

const WeatherSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const navigate = useNavigate();

  // Handle location search
  const handleSearch = useCallback(async (location) => {
    if (!location.trim()) return;
    
    setIsSearching(true);
    try {
      // Encode location for URL
      const encodedLocation = encodeURIComponent(location.trim());
      navigate(`/weather/results/${encodedLocation}`);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [navigate]);

  // Handle form submission
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    handleSearch(searchTerm);
  }, [searchTerm, handleSearch]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion) => {
    setSearchTerm(suggestion);
    setSuggestions([]);
    handleSearch(suggestion);
  }, [handleSearch]);

  // Popular Swedish fishing locations for quick access
  const popularLocations = [
    'Kultsjön, Saxnäs, Västerbotten',
    'Vänern, Värmland',
    'Vättern, Jönköping',
    'Siljan, Dalarna',
    'Storsjön, Jämtland',
    'Bolmen, Småland'
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4">
            <div className="flex items-center space-x-3">
              <MapPinIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">10-dagars Fiskeprognos</h1>
                <p className="text-gray-600">Planera din fisketrip med väderprognos och fiskeförhållanden</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
        
          {/* Search Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Få 10-dagars fiskeprognos för din plats
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                  Ange plats (sjö, å, kust)
                </label>
                <div className="relative">
                  <input
                    id="location"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="t.ex. Kultsjön Saxnäs, Västerbotten"
                    className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    disabled={isSearching}
                  />
                  <button
                    type="submit"
                    disabled={isSearching || !searchTerm.trim()}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                  >
                    <MagnifyingGlassIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isSearching || !searchTerm.trim()}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {isSearching ? 'Hämtar prognos...' : 'Visa 10-dagars prognos'}
              </button>
            </form>
          </div>

          {/* Popular Locations */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Populära fiskevatten
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {popularLocations.map((location, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(location)}
                  className="text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  disabled={isSearching}
                >
                  <div className="flex items-center space-x-2">
                    <MapPinIcon className="h-4 w-4 text-blue-600" />
                    <span className="text-gray-900">{location}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Info Section */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h4 className="font-semibold text-blue-900 mb-2">
              Perfekt för fiskeplanering!
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
              <div>
                <h5 className="font-medium mb-1">10-dagars väderprognos:</h5>
                <ul className="space-y-1 ml-4">
                  <li>• Temperatur min/max varje dag</li>
                  <li>• Vindförhållanden & styrka</li>
                  <li>• Nederbörd & molnighet</li>
                  <li>• Lufttryck & luftfuktighet</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium mb-1">Fiskeanalys:</h5>
                <ul className="space-y-1 ml-4">
                  <li>• Daglig fiskescore (0-100)</li>
                  <li>• Bästa fiskedagar markerade</li>
                  <li>• Månfaser & påverkan</li>
                  <li>• Rekommendationer & tips</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default WeatherSearch; 