// WeatherCard component - Display weather information for fishing
// Mobile-optimized with 7-day forecast

import React from 'react';
import { 
  CloudIcon, 
  SunIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const WeatherCard = ({ weather, detailed = false, className = '' }) => {
  if (!weather || !weather.daily || weather.daily.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center space-x-3 mb-4">
          <CloudIcon className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Väderförutsägelse</h3>
        </div>
        <div className="text-center py-8">
          <CloudIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Väderdata ej tillgänglig</p>
          {weather?.error && (
            <p className="text-sm text-red-600 mt-2">{weather.error}</p>
          )}
        </div>
      </div>
    );
  }

  const today = weather.daily[0];
  const forecast = weather.daily.slice(1, detailed ? 7 : 4);

  const getWeatherIcon = (cloudCover, precipitation) => {
    if (precipitation) return CloudIcon; // Use CloudIcon for rain since CloudRainIcon doesn't exist
    if (cloudCover > 70) return CloudIcon;
    return SunIcon;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Idag';
    if (date.toDateString() === tomorrow.toDateString()) return 'Imorgon';
    
    return date.toLocaleDateString('sv-SE', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getWindDirection = (degrees) => {
    const directions = ['N', 'NÖ', 'Ö', 'SÖ', 'S', 'SV', 'V', 'NV'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center space-x-3 mb-6">
        <CloudIcon className="h-6 w-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Väderförutsägelse</h3>
        <span className="text-sm text-gray-500">SMHI</span>
      </div>

      {/* Today's Weather */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-lg font-medium text-gray-900">Idag</h4>
          <div className="flex items-center space-x-2">
            {React.createElement(getWeatherIcon(today.cloudCover, today.precipitation), {
              className: "h-6 w-6 text-blue-600"
            })}
            <span className="text-sm font-medium text-blue-800">
              Fiskepoäng: {today.fishingScore}/100
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Temperatur</p>
            <p className="text-lg font-semibold">
              {today.temperature ? (
                `${Math.round(today.temperature.min)}° - ${Math.round(today.temperature.max)}°C`
              ) : (
                'N/A'
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Vind</p>
            <p className="text-lg font-semibold">
              {today.wind ? `${Math.round(today.wind.avgSpeed)} m/s` : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Lufttryck</p>
            <p className="text-lg font-semibold">
              {today.pressure ? `${Math.round(today.pressure.avg)} hPa` : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Molnighet</p>
            <p className="text-lg font-semibold">
              {typeof today.cloudCover === 'number' ? `${Math.round(today.cloudCover)}%` : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Forecast */}
      <div>
        <h4 className="text-lg font-medium text-gray-900 mb-4">
          {detailed ? '7-dagars prognos' : 'Kommande dagar'}
        </h4>
        
        <div className="space-y-3">
          {forecast.map((day, index) => {
            const WeatherIcon = getWeatherIcon(day.cloudCover, day.precipitation);
            
            return (
              <div key={day.date} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <WeatherIcon className="h-5 w-5 text-gray-600" />
                  <span className="font-medium text-gray-900 min-w-0 flex-1">
                    {formatDate(day.date)}
                  </span>
                </div>
                
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-gray-600">
                    {day.temperature ? (
                      `${Math.round(day.temperature.min)}° - ${Math.round(day.temperature.max)}°C`
                    ) : (
                      'N/A'
                    )}
                  </span>
                  <span className="text-gray-600">
                    {day.wind ? `${Math.round(day.wind.avgSpeed)} m/s` : 'N/A'}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    day.fishingScore >= 70 
                      ? 'bg-green-100 text-green-800'
                      : day.fishingScore >= 50
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {day.fishingScore || 0}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed hourly forecast for today (if detailed view) */}
      {detailed && weather.hourly && (
        <div className="mt-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Timprognos idag</h4>
          <div className="overflow-x-auto">
            <div className="flex space-x-4 pb-2">
              {weather.hourly.slice(0, 12).map((hour, index) => {
                const time = new Date(hour.time);
                const isNow = Math.abs(time - new Date()) < 60 * 60 * 1000; // Within 1 hour
                
                return (
                  <div key={hour.time} className={`
                    flex-shrink-0 text-center p-3 rounded-lg min-w-0
                    ${isNow ? 'bg-blue-100 border border-blue-200' : 'bg-gray-50'}
                  `}>
                    <p className="text-xs text-gray-600 mb-1">
                      {time.getHours()}:00
                    </p>
                    <div className="mb-2">
                      {React.createElement(getWeatherIcon(hour.cloudCover, hour.precipitation > 0), {
                        className: "h-4 w-4 text-gray-600 mx-auto"
                      })}
                    </div>
                    <p className="text-sm font-medium">
                      {typeof hour.temperature === 'number' ? `${Math.round(hour.temperature)}°` : 'N/A'}
                    </p>
                    <p className="text-xs text-gray-600">
                      {typeof hour.windSpeed === 'number' ? `${Math.round(hour.windSpeed)} m/s` : 'N/A'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Data source info */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Väderdata från SMHI • Uppdaterad: {new Date(weather.referenceTime).toLocaleString('sv-SE')}
        </p>
      </div>
    </div>
  );
};

export default WeatherCard; 