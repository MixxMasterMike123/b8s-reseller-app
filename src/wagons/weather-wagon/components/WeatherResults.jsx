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
  BeakerIcon
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
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-blue-600">
              <BeakerIcon className="h-5 w-5" />
              <span className="text-sm font-medium">Fiskeprognos</span>
            </div>
          </div>
        </div>

        {/* Best Fishing Days Highlight */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg shadow p-6 border-l-4 border-blue-500">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <SunIcon className="h-5 w-5 text-yellow-500" />
            <span>Bästa fiskedagarna</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bestDays.map((day, index) => (
              <div key={day.date} className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{getDayLabel(day)}</span>
                  <span className="text-sm text-gray-500">{day.dayMonth}</span>
                </div>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(day.fishing.color)}`}>
                  {day.fishing.score}/100 - {day.fishing.rating}
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {day.tempMin?.toFixed(0)}° - {day.tempMax?.toFixed(0)}°C
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

        {/* Footer Info */}
        <div className="bg-gray-50 rounded-lg p-6 text-center text-sm text-gray-500">
          <p>
            <strong>Datakällor:</strong> SMHI väderdata • Astronomiska beräkningar för månfaser • 
            Fiskeförhållanden baserat på meteorologiska faktorer
          </p>
          <p className="mt-2">
            Prognosdata uppdateras var 6:e timme • Använd som vägledning för fiskeplanering
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default WeatherResults; 