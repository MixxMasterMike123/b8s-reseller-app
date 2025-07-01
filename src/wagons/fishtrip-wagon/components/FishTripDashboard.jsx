// FishTrip Dashboard - Main component for fishing intelligence
// Mobile-first design with Swedish localization
// Self-contained following B8Shield wagon architecture

import React, { useState } from 'react';
import { 
  MapPinIcon, 
  CloudIcon, 
  BeakerIcon, 
  CalendarIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  SunIcon,
  MoonIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import FishTripService from '../utils/FishTripService.js';
import LocationSearch from './LocationSearch.jsx';
import WeatherCard from './WeatherCard.jsx';
import WaterConditionsCard from './WaterConditionsCard.jsx';
import FishingScoreCard from './FishingScoreCard.jsx';
import RecommendationsCard from './RecommendationsCard.jsx';
import TripPlannerCard from './TripPlannerCard.jsx';
import AIAnalysisCard from './AIAnalysisCard.jsx';

const FishTripDashboard = () => {
  const [fishTripService] = useState(() => new FishTripService());
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Shared trip planning state for both mobile and desktop
  const [tripPlan, setTripPlan] = useState(null);
  const [tripLoading, setTripLoading] = useState(false);

  // No auto-loading on mount - user must explicitly search

  const handleLocationSearch = async (location) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await fishTripService.getFishingAnalysis(location);
      setAnalysis(result);
      setSelectedLocation(result.location);
      
      toast.success(`Fiskanalys klar för ${result.location.name}`);
    } catch (error) {
      console.error('Location search failed:', error);
      setError(error.message);
      toast.error(`Fel: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCurrentLocation = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await fishTripService.getFishingAnalysis('current');
      setAnalysis(result);
      setSelectedLocation(result.location);
      
      toast.success('Nuvarande plats analyserad');
    } catch (error) {
      console.error('Current location failed:', error);
      setError(error.message);
      // Don't show error toast for geolocation failures on initial load
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!selectedLocation) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Clear cache and get fresh data
      fishTripService.clearCache();
      const result = await fishTripService.getFishingAnalysis(selectedLocation);
      setAnalysis(result);
      
      toast.success('Data uppdaterad');
    } catch (error) {
      console.error('Refresh failed:', error);
      setError(error.message);
      toast.error(`Uppdatering misslyckades: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', name: 'Översikt', icon: InformationCircleIcon },
    { id: 'weather', name: 'Väder', icon: CloudIcon },
    { id: 'water', name: 'Vatten', icon: BeakerIcon },
    { id: 'planner', name: 'Planera', icon: CalendarIcon }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <MapPinIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  FishTrip
                </h1>
                <p className="text-sm text-gray-500">
                  Svensk fiskeintelligens
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {selectedLocation && (
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  title="Uppdatera data"
                >
                  <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Location Search */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <LocationSearch
            onLocationSelect={handleLocationSearch}
            onCurrentLocation={handleCurrentLocation}
            loading={loading}
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && !analysis && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <ArrowPathIcon className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Analyserar fiskeförhållanden...</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      {analysis && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Location Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                  {analysis.location.name}
                </h2>
                <p className="text-sm text-gray-500 mb-2">
                  {analysis.location.lat.toFixed(4)}°N, {analysis.location.lon.toFixed(4)}°E
                </p>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>Uppdaterad: {new Date(analysis.timestamp).toLocaleString('sv-SE')}</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    analysis.dataQuality.level === 'good' 
                      ? 'bg-green-100 text-green-800'
                      : analysis.dataQuality.level === 'fair'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    Datakvalitet: {analysis.dataQuality.level === 'good' ? 'Bra' : 
                                   analysis.dataQuality.level === 'fair' ? 'Okej' : 'Dålig'}
                  </span>
                </div>
              </div>
              
              <FishingScoreCard score={analysis.fishingScore} />
            </div>
          </div>

          {/* Mobile Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 lg:hidden">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center px-4 py-3 text-sm font-medium whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              ))}
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Mobile: Tab-based content */}
              <div className="lg:hidden">
                {activeTab === 'overview' && (
                  <>
                    <WeatherCard weather={analysis.weather} />
                    <WaterConditionsCard water={analysis.water} />
                  </>
                )}

                {activeTab === 'weather' && (
                  <WeatherCard weather={analysis.weather} detailed={true} />
                )}

                {activeTab === 'water' && (
                  <WaterConditionsCard water={analysis.water} detailed={true} />
                )}
              </div>

              {/* Desktop: Always show all content */}
              <div className="hidden lg:block space-y-6">
                <WeatherCard weather={analysis.weather} detailed={false} />
                <WaterConditionsCard water={analysis.water} detailed={false} />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Always show recommendations */}
              <RecommendationsCard recommendations={analysis.recommendations} />
              
              {/* AI Analysis (if available) */}
              {analysis.aiAnalysis && (
                <AIAnalysisCard analysis={analysis.aiAnalysis} />
              )}

              {/* Quick Stats */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Snabbfakta
                </h3>
                
                <div className="space-y-3">
                  {analysis.weather.daily && analysis.weather.daily.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Temperatur idag</span>
                      <span className="text-sm font-medium">
                        {Math.round(analysis.weather.daily[0].temperature.min)}° - {Math.round(analysis.weather.daily[0].temperature.max)}°C
                      </span>
                    </div>
                  )}
                  
                  {analysis.water.temperature && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Vattentemperatur</span>
                      <span className="text-sm font-medium">
                        {Math.round(analysis.water.temperature.temperature)}°C
                      </span>
                    </div>
                  )}
                  
                  {analysis.weather.daily && analysis.weather.daily.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Vindstyrka</span>
                      <span className="text-sm font-medium">
                        {Math.round(analysis.weather.daily[0].wind.avgSpeed)} m/s
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Månskede</span>
                    <span className="text-sm font-medium">
                      {fishTripService.calculateMoonPhase().phase}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Unified Trip Planner - Full width below main content */}
          <div className="mt-6">
            {/* Show on mobile only when planner tab is active, always show on desktop */}
            <div className={`${activeTab === 'planner' ? 'block lg:block' : 'hidden lg:block'}`}>
              <TripPlannerCard 
                location={analysis.location}
                fishTripService={fishTripService}
                onLocationChange={handleLocationSearch}
              />
            </div>
          </div>
        </div>
      )}

      {/* Welcome State */}
      {!analysis && !loading && !error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <MapPinIcon className="h-16 w-16 text-gray-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Välkommen till FishTrip
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Få avancerad fiskeintelligens för svenska vatten. Sök efter en plats eller använd din nuvarande position för att komma igång.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <CloudIcon className="h-8 w-8 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  SMHI Väderdata
                </h3>
                <p className="text-gray-600">
                  Officiella väderförutsägelser från SMHI för optimala fisketider
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <BeakerIcon className="h-8 w-8 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Vattenförhållanden
                </h3>
                <p className="text-gray-600">
                  Vattentemperatur och nivåer från svenska mätstationer
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <MagnifyingGlassIcon className="h-8 w-8 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  AI-förstärkning
                </h3>
                <p className="text-gray-600">
                  Intelligenta fisketips och lokalkännedom från Claude AI
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FishTripDashboard; 