// RecommendationsCard component - Display fishing recommendations
// Mobile-optimized recommendations based on conditions

import React from 'react';
import { 
  LightBulbIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

const RecommendationsCard = ({ recommendations, className = '' }) => {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center space-x-3 mb-4">
          <LightBulbIcon className="h-6 w-6 text-yellow-600" />
          <h3 className="text-lg font-semibold text-gray-900">Rekommendationer</h3>
        </div>
        <div className="text-center py-4">
          <LightBulbIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">Inga rekommendationer tillgängliga</p>
        </div>
      </div>
    );
  }

  const getRecommendationIcon = (type) => {
    switch (type) {
      case 'excellent':
        return CheckCircleIcon;
      case 'good':
        return InformationCircleIcon;
      case 'fair':
        return ExclamationTriangleIcon;
      case 'poor':
        return XCircleIcon;
      case 'wind':
      case 'rain':
      case 'cold_water':
      case 'warm_water':
        return ExclamationTriangleIcon;
      default:
        return InformationCircleIcon;
    }
  };

  const getRecommendationColor = (type, priority) => {
    if (type === 'excellent') return 'green';
    if (type === 'good') return 'blue';
    if (type === 'fair') return 'yellow';
    if (type === 'poor') return 'red';
    
    // For specific conditions, use priority
    if (priority === 'high') return 'red';
    if (priority === 'medium') return 'yellow';
    return 'blue';
  };

  const colorClasses = {
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: 'text-green-600',
      title: 'text-green-900'
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: 'text-blue-600',
      title: 'text-blue-900'
    },
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: 'text-yellow-600',
      title: 'text-yellow-900'
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: 'text-red-600',
      title: 'text-red-900'
    }
  };

  // Sort recommendations by priority
  const sortedRecommendations = [...recommendations].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
  });

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center space-x-3 mb-6">
        <LightBulbIcon className="h-6 w-6 text-yellow-600" />
        <h3 className="text-lg font-semibold text-gray-900">Rekommendationer</h3>
      </div>

      <div className="space-y-4">
        {sortedRecommendations.map((recommendation, index) => {
          const Icon = getRecommendationIcon(recommendation.type);
          const color = getRecommendationColor(recommendation.type, recommendation.priority);
          const classes = colorClasses[color];

          return (
            <div
              key={index}
              className={`${classes.bg} ${classes.border} border rounded-lg p-4`}
            >
              <div className="flex items-start space-x-3">
                <Icon className={`h-5 w-5 ${classes.icon} flex-shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <h4 className={`font-medium ${classes.title} mb-1`}>
                    {recommendation.title}
                  </h4>
                  <p className={`text-sm ${classes.text}`}>
                    {recommendation.message}
                  </p>
                  
                  {/* Priority indicator */}
                  {recommendation.priority && (
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        recommendation.priority === 'high' 
                          ? 'bg-red-100 text-red-800'
                          : recommendation.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {recommendation.priority === 'high' ? 'Hög prioritet' :
                         recommendation.priority === 'medium' ? 'Medel prioritet' :
                         'Låg prioritet'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional fishing tips */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="font-medium text-gray-900 mb-3">Allmänna fisketips</h4>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-start space-x-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>Gryning och skymning är ofta de bästa fisketiderna</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>Molniga dagar kan förbättra fisket under dagen</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>Tryckförändringar påverkar fiskens aktivitet</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>Anpassa bete och teknik efter vattentemperatur</span>
          </div>
        </div>
      </div>

      {/* Best fishing times today */}
      <div className="mt-4 bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Bästa fisketider idag</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <span className="text-gray-700">Gryning: 05:00-07:00</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <span className="text-gray-700">Skymning: 19:00-21:00</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecommendationsCard; 