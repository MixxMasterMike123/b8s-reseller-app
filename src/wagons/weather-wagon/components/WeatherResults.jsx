// WeatherResults.jsx - Display 7-10 day fishing weather forecast
// Self-contained results component for The Weather Wagon
// NOW FOCUSED ON FORECAST PLANNING instead of current conditions

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeftIcon, 
  MapPinIcon, 
  CloudIcon,
  SunIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BeakerIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import AppLayout from '../../../components/layout/AppLayout';
import { getLocationWeatherForecast } from '../utils/weatherAPI.js';

const WeatherResults = () => {
  const { location } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);

  useEffect(() => {
    const fetchForecastData = async () => {
      if (!location) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const decodedLocation = decodeURIComponent(location);
        const forecastData = await getLocationWeatherForecast(decodedLocation);
        setData(forecastData);
      } catch (err) {
        setError(err.message);
        console.error('Forecast fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchForecastData();
  }, [location]);

  const formatWindDirection = (degrees) => {
    if (degrees === null || degrees === undefined) return 'N/A';
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (color) => {
    const colors = {
      green: 'text-green-700 bg-green-100 border-green-300',
      yellow: 'text-yellow-700 bg-yellow-100 border-yellow-300',
      orange: 'text-orange-700 bg-orange-100 border-orange-300',
      red: 'text-red-700 bg-red-100 border-red-300'
    };
    return colors[color] || colors.yellow;
  };

  const getScoreBgColor = (color) => {
    const colors = {
      green: 'bg-green-50 border-green-200',
      yellow: 'bg-yellow-50 border-yellow-200', 
      orange: 'bg-orange-50 border-orange-200',
      red: 'bg-red-50 border-red-200'
    };
    return colors[color] || colors.yellow;
  };

  const isToday = (dateStr) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  const isTomorrow = (dateStr) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return dateStr === tomorrow.toISOString().split('T')[0];
  };

  const getDayLabel = (day) => {
    if (isToday(day.date)) return 'Idag';
    if (isTomorrow(day.date)) return 'Imorgon';
    return day.dayName;
  };

  const toggleExpandDay = (dayIndex) => {
    setExpandedDay(expandedDay === dayIndex ? null : dayIndex);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Hämtar 10-dagarsrapport...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <div className="bg-white rounded-lg shadow p-8 text-center max-w-md">
            <div className="text-red-500 mb-4">
              <CloudIcon className="h-16 w-16 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Kunde inte hämta prognosdata</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/weather')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Tillbaka till sökning
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!data || !data.dailyForecasts || data.dailyForecasts.length === 0) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">Ingen prognosdata tillgänglig</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Find the best fishing days (top 3)
  const bestDays = [...data.dailyForecasts]
    .sort((a, b) => b.fishing.score - a.fishing.score)
    .slice(0, 3);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/weather')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
                <span>Ny sökning</span>
              </button>
              <div className="text-sm text-gray-500">
                Uppdaterad: {new Date(data.updated).toLocaleString('sv-SE')}
              </div>
            </div>
          </div>
        </div>

        {/* Location Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <MapPinIcon className="h-6 w-6 text-blue-600 mt-1" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{data.location.name}</h1>
                <p className="text-gray-600">
                  10-dagars fiskeprognos • {data.dailyForecasts.length} dagar tillgänglig
                  {data.summary?.hasWaterData && ' • Inkl. vattendata'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-blue-600">
              <BeakerIcon className="h-5 w-5" />
              <span className="text-sm font-medium">Fiskeprognos</span>
            </div>
          </div>
          
          {/* Enhanced Water Data Summary with Comprehensive Information */}
          {(data.waterData?.available || data.waterData?.availability?.limitations?.length > 0) && (
            <div className="mt-4">
              {data.waterData.available && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center space-x-2">
                    <span>Omfattande vattenförhållanden</span>
                    {data.waterData.availability.fishingInsights?.length > 0 && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        {data.waterData.availability.fishingInsights.length} fisketips
                      </span>
                    )}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Water Level (Real Variation) */}
                    {data.waterData.level?.availability?.hasData && (
                      <div className="bg-white rounded-lg p-3 border border-blue-100">
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                          <span>🌊 Vattenstånd</span>
                          {data.waterData.level.availability.dataType === 'reference' && (
                            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                              Referens
                            </span>
                          )}
                        </h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Nivåvariation:</span>
                            <span className={`font-medium ${data.waterData.level.current > 5 ? 'text-blue-600' : data.waterData.level.current < -5 ? 'text-orange-600' : 'text-green-600'}`}>
                              {data.waterData.level.current > 0 ? '+' : ''}{data.waterData.level.current?.toFixed(1)} {data.waterData.level.unit}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <span className="font-medium">{data.waterData.level.status}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Trend:</span>
                            <span className="font-medium">{data.waterData.level.trend}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
                            Station: {data.waterData.level.station}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Water Flow */}
                    {data.waterData.flow?.availability?.hasData && (
                      <div className="bg-white rounded-lg p-3 border border-blue-100">
                        <h4 className="font-medium text-gray-900 mb-2">🌊 Vattenföring</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Aktuellt flöde:</span>
                            <span className="font-medium">{data.waterData.flow.current?.toFixed(1)} {data.waterData.flow.unit}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Variation från normal:</span>
                            <span className={`font-medium ${data.waterData.flow.variation > 20 ? 'text-blue-600' : data.waterData.flow.variation < -20 ? 'text-orange-600' : 'text-green-600'}`}>
                              {data.waterData.flow.variation > 0 ? '+' : ''}{data.waterData.flow.variation?.toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <span className="font-medium">{data.waterData.flow.status}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Trend:</span>
                            <span className="font-medium">{data.waterData.flow.trend}</span>
                          </div>
                          {data.waterData.flow.fishingImpact && (
                            <div className="text-xs text-blue-700 bg-blue-50 p-2 rounded mt-2">
                              💡 {data.waterData.flow.fishingImpact}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Water Quality */}
                    {data.waterData.quality?.availability?.hasData && (
                      <div className="bg-white rounded-lg p-3 border border-blue-100">
                        <h4 className="font-medium text-gray-900 mb-2">🧪 Vattenkvalitet</h4>
                        <div className="space-y-2 text-sm">
                          {data.waterData.quality.oxygen && (
                            <div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Syrgashalt:</span>
                                <span className="font-medium">{data.waterData.quality.oxygen.value?.toFixed(1)} mg/l</span>
                              </div>
                              <div className="text-xs text-gray-500">{data.waterData.quality.oxygen.status}</div>
                              {data.waterData.quality.oxygen.fishingImpact && (
                                <div className="text-xs text-green-700 bg-green-50 p-1 rounded mt-1">
                                  {data.waterData.quality.oxygen.fishingImpact}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {data.waterData.quality.pH && (
                            <div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">pH-värde:</span>
                                <span className="font-medium">{data.waterData.quality.pH.value?.toFixed(1)}</span>
                              </div>
                              <div className="text-xs text-gray-500">{data.waterData.quality.pH.status}</div>
                            </div>
                          )}
                          
                          {data.waterData.quality.clarity && (
                            <div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Siktdjup:</span>
                                <span className="font-medium">{data.waterData.quality.clarity.visibility?.toFixed(1)} m</span>
                              </div>
                              <div className="text-xs text-gray-500">{data.waterData.quality.clarity.status}</div>
                              {data.waterData.quality.clarity.fishingImpact && (
                                <div className="text-xs text-blue-700 bg-blue-50 p-1 rounded mt-1">
                                  {data.waterData.quality.clarity.fishingImpact}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Ice Conditions */}
                    {data.waterData.ice?.availability?.hasData && (
                      <div className="bg-white rounded-lg p-3 border border-blue-100">
                        <h4 className="font-medium text-gray-900 mb-2">🧊 Isförhållanden</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Istjocklek:</span>
                            <span className="font-medium">{data.waterData.ice.thickness?.toFixed(0)} {data.waterData.ice.unit}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Säkerhet:</span>
                            <span className={`font-medium text-sm ${data.waterData.ice.safety?.includes('OSÄKER') ? 'text-red-600' : data.waterData.ice.safety?.includes('BRA') ? 'text-green-600' : 'text-yellow-600'}`}>
                              {data.waterData.ice.safety}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Trend:</span>
                            <span className="font-medium">{data.waterData.ice.trend}</span>
                          </div>
                          {data.waterData.ice.fishingAdvice && (
                            <div className="text-xs text-blue-700 bg-blue-50 p-2 rounded mt-2 flex items-center space-x-2">
                              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2L8.5 8.5L2 12l6.5 3.5L12 22l3.5-6.5L22 12l-6.5-3.5L12 2zm0 3l2.5 4.5L19 12l-4.5 2.5L12 19l-2.5-4.5L5 12l4.5-2.5L12 5z"/>
                              </svg>
                              <span>{data.waterData.ice.fishingAdvice}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Water Temperature (Enhanced) */}
                    {data.waterData.temperature?.availability?.hasData && (
                      <div className="bg-white rounded-lg p-3 border border-blue-100">
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M15 13V5c0-1.66-1.34-3-3-3S9 3.34 9 5v8c-1.21.91-2 2.37-2 4 0 2.76 2.24 5 5 5s5-2.24 5-5c0-1.63-.79-3.09-2-4zm-4-8c0-.55.45-1 1-1s1 .45 1 1h-1v1h1v1h-1v1h1v1h-1v1h1c0 .55-.45 1-1 1s-1-.45-1-1V5z"/>
                          </svg>
                          <span>Vattentemperatur</span>
                          {data.waterData.temperature.availability.dataType === 'reference' && (
                            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                              Referens
                            </span>
                          )}
                        </h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Aktuell temp:</span>
                            <span className="font-medium">{data.waterData.temperature.current?.toFixed(1)}°C</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Trend:</span>
                            <span className="font-medium">{data.waterData.temperature.trend}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Fiskzon:</span>
                            <span className="font-medium text-blue-600">{data.waterData.temperature.fishingZone}</span>
                          </div>
                          {data.waterData.temperature.thermocline && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Termoklindjup:</span>
                              <span className="font-medium">{data.waterData.temperature.thermocline} m</span>
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-2">
                            Station: {data.waterData.temperature.station}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Comprehensive Fishing Insights */}
                  {data.waterData.availability.fishingInsights?.length > 0 && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="font-medium text-green-900 mb-2 flex items-center space-x-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2C7.582 4 4 7.582 4 12s3.582 8 8 8 8-3.582 8-8-3.582-8-8-8zm3.5 6a1.5 1.5 0 110 3 1.5 1.5 0 010-3z"/>
                        </svg>
                        <span>Fiskeinsikter baserat på vattendata</span>
                      </h4>
                      <div className="space-y-2">
                        {data.waterData.availability.fishingInsights.map((insight, index) => (
                          <div key={index} className="text-sm text-green-800 bg-white p-2 rounded border-l-4 border-green-400">
                            <span className="font-medium">{insight.parameter}:</span> {insight.insight}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Data Limitations and Suggestions */}
              {data.waterData.availability?.limitations?.length > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="font-medium text-yellow-900 mb-2 flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                    </svg>
                    <span>Begränsad vattendata för denna plats</span>
                  </h4>
                  <div className="space-y-2">
                    {data.waterData.availability.limitations.map((limitation, index) => (
                      <div key={index} className="text-sm">
                        <div className="text-yellow-800">
                          <span className="font-medium">{limitation.parameter}:</span> {limitation.message}
                        </div>
                        {limitation.suggestion && (
                          <div className="text-yellow-700 text-xs mt-1 flex items-center space-x-1">
                            <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 21c0 .5.4 1 1 1h4c.6 0 1-.5 1-1v-1H9v1zm3-19C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .5.4 1 1 1h6c.6 0 1-.5 1-1v-2.3c1.8-1.3 3-3.4 3-5.7 0-3.9-3.1-7-7-7z"/>
                            </svg>
                            <span>{limitation.suggestion}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Best Fishing Days Highlight */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg shadow p-6 border-l-4 border-blue-500">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <SunIcon className="h-5 w-5 text-yellow-500" />
            <span>Bästa fiskedagarna</span>
            {data.summary?.hasWaterData && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                Inkl. vattendata
              </span>
            )}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.bestFishingDays.map((day, index) => (
              <div key={day.date} className={`p-4 rounded-lg border-2 ${getScoreBgColor(day.fishing.color)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{getDayLabel(day)} {day.dayMonth}</span>
                  <span className={`px-2 py-1 rounded-full text-sm font-medium border ${getScoreColor(day.fishing.color)}`}>
                    #{index + 1}
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{day.fishing.score}/100</div>
                <div className="text-sm text-gray-600 mb-2">{day.fishing.rating}</div>
                <div className="space-y-1">
                  {day.fishing.factors.slice(0, 2).map((factor, i) => (
                    <div key={i} className="text-xs text-gray-600">• {factor}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Forecast Cards */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
            <span>Detaljerad prognos</span>
          </h2>
          
          {data.dailyForecasts.map((day, index) => (
            <div key={day.date} className={`bg-white rounded-lg shadow border-l-4 ${getScoreBgColor(day.fishing.color)}`}>
              {/* Day Summary */}
              <div 
                className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleExpandDay(index)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="font-semibold text-gray-900">{getDayLabel(day)}</div>
                      <div className="text-sm text-gray-500">{day.dayMonth}</div>
                    </div>
                    
                    <div className={`px-4 py-2 rounded-lg ${getScoreColor(day.fishing.color)}`}>
                      <div className="text-2xl font-bold">{day.fishing.score}</div>
                      <div className="text-xs">{day.fishing.rating}</div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="text-sm text-gray-500">Temperatur</div>
                        <div className="font-semibold">
                          {day.tempMin?.toFixed(0)}° - {day.tempMax?.toFixed(0)}°C
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm text-gray-500">Vind</div>
                        <div className="font-semibold">
                          {day.windAvg?.toFixed(1)} m/s
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm text-gray-500">Nederbörd</div>
                        <div className="font-semibold">
                          {day.precipTotal?.toFixed(1)} mm
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm text-gray-500">Månfas</div>
                        <div className="font-semibold">
                          {day.moon?.illumination}%
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Detaljer</span>
                    {expandedDay === index ? (
                      <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
              
              {/* Expanded Day Details */}
              {expandedDay === index && (
                <div className="border-t border-gray-200 p-6 bg-gray-50">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Fishing Factors */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Fiskeförhållanden</h4>
                      <div className="space-y-2">
                        {day.fishing.factors.map((factor, i) => (
                          <div key={i} className="flex items-start space-x-2 text-sm">
                            <span className="text-blue-500 mt-1">•</span>
                            <span className="text-gray-700">{factor}</span>
                          </div>
                        ))}
                      </div>
                      {day.waterData?.available && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <h5 className="text-sm font-medium text-blue-900 mb-2">Vattenförhållanden</h5>
                          <div className="text-sm text-blue-800 space-y-1">
                            {day.waterData.temperature && (
                              <div>Temp: {day.waterData.temperature.current.toFixed(1)}°C ({day.waterData.temperature.trend.toLowerCase()})</div>
                            )}
                            {day.waterData.level && (
                              <div>Nivå: {day.waterData.level.current} {day.waterData.level.unit} ({day.waterData.level.trend.toLowerCase()})</div>
                            )}
                            {day.waterData.temperature?.fishingZone && (
                              <div>Fiskezone: {day.waterData.temperature.fishingZone}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Weather Details */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Väderdetaljer</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Lufttryck:</span>
                          <span className="ml-2 font-medium">{day.pressureAvg?.toFixed(0)} hPa</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Luftfuktighet:</span>
                          <span className="ml-2 font-medium">{day.humidityAvg?.toFixed(0)}%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Vind min-max:</span>
                          <span className="ml-2 font-medium">{day.windMin?.toFixed(1)} - {day.windMax?.toFixed(1)} m/s</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Månfas:</span>
                          <span className="ml-2 font-medium">{day.moon?.phase}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Best Fishing Times for This Day */}
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h5 className="font-medium text-blue-900 mb-2">Rekommenderade fisketider</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-blue-800">
                      <div>Gryning: 05:00-07:00</div>
                      <div>Förmiddag: 08:00-11:00</div>
                      <div>Skymning: 18:00-21:00</div>
                      <div>Natt: 22:00-02:00</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Comprehensive Footer Info */}
        <div className="bg-gray-50 rounded-lg p-6 text-center text-sm text-gray-500">
          <p>
            <strong>Datakällor:</strong> SMHI väderdata • SMHI hydrologiska data{data.waterData?.available && ' (vattenstånd, vattenföring, temperatur)'} • 
            {data.waterData?.quality?.availability?.hasData && 'SMHI miljöövervakning (syrgashalt, pH, siktdjup) • '}
            {data.waterData?.ice?.availability?.hasData && 'SMHI isdata • '}
            Astronomiska beräkningar för månfaser
          </p>
          <p className="mt-1">
            <strong>Fiskeanalys:</strong> Beräkningar baserat på meteorologiska{data.waterData?.available && ', hydrologiska'}{data.waterData?.quality?.availability?.hasData && ' och vattenkvalitetsdata'} • 
            Omfattande vattenförhållanden för svensk fiskemiljö
          </p>
          <p className="mt-2 text-xs">
            Väderdata uppdateras var 6:e timme • Vattendata från närmaste SMHI-stationer • 
            Använd som vägledning för fiskeplanering • Kontrollera alltid lokala förhållanden
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default WeatherResults; 