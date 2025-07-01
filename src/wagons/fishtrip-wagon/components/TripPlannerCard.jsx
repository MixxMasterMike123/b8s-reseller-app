// TripPlannerCard component - Multi-day fishing trip planning
// Mobile-optimized trip planner with AI enhancement

import React, { useState, useEffect } from 'react';
import { CalendarIcon, MapPinIcon, ClockIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

const TripPlannerCard = ({ location, fishTripService, onLocationChange, className = '' }) => {
  const [days, setDays] = useState(3);
  const [loading, setLoading] = useState(false);
  const [tripPlan, setTripPlan] = useState(null);
  const [lastLocationKey, setLastLocationKey] = useState(null);

  // Reset trip plan when location changes
  useEffect(() => {
    if (location) {
      const locationKey = `${location.lat}_${location.lon}`;
      if (lastLocationKey && lastLocationKey !== locationKey) {
        console.log('🗺️ Location changed, resetting trip plan');
        setTripPlan(null);
        toast('Ny plats vald - skapa en ny fiskeplan');
      }
      setLastLocationKey(locationKey);
    }
  }, [location, lastLocationKey]);

  const handlePlanTrip = async () => {
    if (!location || !fishTripService) return;

    setLoading(true);
    try {
      const plan = await fishTripService.planFishingTrip(location, days);
      setTripPlan(plan);
      toast.success(`${days}-dagars fiskeplan skapad!`);
    } catch (error) {
      console.error('Trip planning failed:', error);
      toast.error(`Planering misslyckades: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sv-SE', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-blue-600 bg-blue-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const handleLocationSuggestion = (suggestedLocation) => {
    if (onLocationChange) {
      onLocationChange(suggestedLocation);
      toast.success(`Byter till ${suggestedLocation} för bättre fiskeförhållanden`);
    }
  };

  // Swedish fishing locations for variety
  const alternativeLocations = [
    'Vänern', 'Vättern', 'Mälaren', 'Storsjön', 'Siljan', 'Bolmen', 
    'Kultsjön', 'Hornavan', 'Torneträsk', 'Åsnen'
  ];

  const getSuggestedLocation = (currentLocation, dayIndex) => {
    // Suggest different locations for variety, excluding current
    const alternatives = alternativeLocations.filter(loc => 
      !currentLocation.name.toLowerCase().includes(loc.toLowerCase())
    );
    return alternatives[dayIndex % alternatives.length];
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center space-x-3 mb-6">
        <CalendarIcon className="h-6 w-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Fiskereseplaner</h3>
      </div>

      {!tripPlan ? (
        <div>
          <p className="text-gray-600 mb-6">
            Planera en flerdagars fiskeresa med optimala tider och rekommendationer.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Antal dagar
              </label>
              <select
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              >
                <option value={2}>2 dagar</option>
                <option value={3}>3 dagar</option>
                <option value={4}>4 dagar</option>
                <option value={5}>5 dagar</option>
                <option value={7}>7 dagar</option>
              </select>
            </div>

            <button
              onClick={handlePlanTrip}
              disabled={loading || !location}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <CalendarIcon className="h-5 w-5" />
              <span>{loading ? 'Planerar...' : 'Skapa fiskeplan'}</span>
            </button>
          </div>

          <div className="mt-6 bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Vad ingår i planen?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Daglig väderprognos och fiskepoäng</li>
              <li>• Bästa fisketider för varje dag</li>
              <li>• Anpassade rekommendationer</li>
              <li>• AI-förstärkta fisketips</li>
            </ul>
          </div>
        </div>
      ) : (
        <div>
          {/* Trip Overview */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-blue-900">
                {tripPlan.duration}-dagars fiskeresa
              </h4>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(tripPlan.overallScore)}`}>
                Genomsnitt: {tripPlan.overallScore}/100
              </span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-blue-800">
              <MapPinIcon className="h-4 w-4" />
              <span>{tripPlan.location.name}</span>
            </div>
          </div>

          {/* Desktop: Side-by-side layout, Mobile: Stacked */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Daily Plan */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Daglig plan</h4>
              {tripPlan.days.map((day, index) => (
                <div 
                  key={day.date} 
                  className={`border rounded-lg p-4 ${
                    index === tripPlan.bestDay ? 'border-green-300 bg-green-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h5 className="font-medium text-gray-900">
                        Dag {index + 1} - {formatDate(day.date)}
                      </h5>
                      <div className="flex items-center space-x-2 text-xs text-gray-600 mt-1">
                        <MapPinIcon className="h-3 w-3" />
                        <span>{tripPlan.location.name}</span>
                        {index === tripPlan.bestDay && (
                          <span className="text-green-600 font-medium">• Bästa dagen</span>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(day.fishingScore)}`}>
                      {day.fishingScore}/100
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-600">Temperatur:</span>
                      <span className="ml-1 font-medium">
                        {day.weather?.temperature ? (
                          `${Math.round(day.weather.temperature.min)}° - ${Math.round(day.weather.temperature.max)}°C`
                        ) : (
                          'N/A'
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Vind:</span>
                      <span className="ml-1 font-medium">
                        {day.weather?.wind?.avgSpeed ? (
                          `${Math.round(day.weather.wind.avgSpeed)} m/s`
                        ) : (
                          'N/A'
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Best times */}
                  <div className="mb-3">
                    <h6 className="text-xs font-medium text-gray-700 mb-2">Bästa fisketider:</h6>
                    <div className="flex flex-wrap gap-2">
                      {day.bestTimes.map((time, timeIndex) => (
                        <span 
                          key={timeIndex}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800"
                        >
                          <ClockIcon className="h-3 w-3 mr-1" />
                          {time.period}: {time.time}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  {day.recommendations.length > 0 && (
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Tips:</span>
                      <ul className="ml-2 mt-1">
                        {day.recommendations.slice(0, 2).map((rec, recIndex) => (
                          <li key={recIndex}>• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Location suggestion for poor conditions */}
                  {day.fishingScore < 50 && onLocationChange && (
                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-yellow-800">
                          Svåra förhållanden. Överväg att byta plats?
                        </span>
                        <button
                          onClick={() => handleLocationSuggestion(getSuggestedLocation(tripPlan.location, index))}
                          className="flex items-center space-x-1 text-yellow-700 hover:text-yellow-900 font-medium"
                        >
                          <span>Prova {getSuggestedLocation(tripPlan.location, index)}</span>
                          <ArrowRightIcon className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* AI Enhancement */}
            {tripPlan.aiEnhancement && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">AI-förbättrad plan</h4>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 h-fit">
                  <div className="text-sm text-purple-800 whitespace-pre-wrap">
                    {tripPlan.aiEnhancement}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={() => setTripPlan(null)}
              className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Ny plan
            </button>
            <button
              onClick={handlePlanTrip}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              Uppdatera
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripPlannerCard; 