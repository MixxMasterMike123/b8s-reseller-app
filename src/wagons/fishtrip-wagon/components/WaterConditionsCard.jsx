// WaterConditionsCard component - Display water conditions
// Shows temperature, level, and SMHI station data

import React from 'react';
import { BeakerIcon, FireIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

const WaterConditionsCard = ({ water, detailed = false, className = '' }) => {
  if (!water || !water.available) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center space-x-3 mb-4">
          <BeakerIcon className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Vattenförhållanden</h3>
        </div>
        <div className="text-center py-8">
          <BeakerIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Vattendata ej tillgänglig</p>
          <p className="text-sm text-gray-500 mt-2">
            Inga SMHI-stationer i närheten
          </p>
        </div>
      </div>
    );
  }

  const formatDistance = (distance) => {
    if (distance < 1) return `${Math.round(distance * 1000)} m`;
    return `${distance.toFixed(1)} km`;
  };

  const getTemperatureStatus = (temp) => {
    if (temp < 5) return { status: 'Mycket kallt', color: 'blue', advice: 'Fiska djupt och långsamt' };
    if (temp < 10) return { status: 'Kallt', color: 'blue', advice: 'Fiska på djupet' };
    if (temp < 15) return { status: 'Svalt', color: 'yellow', advice: 'Bra för gädda och abborre' };
    if (temp < 20) return { status: 'Optimalt', color: 'green', advice: 'Utmärkta förhållanden' };
    if (temp < 25) return { status: 'Varmt', color: 'yellow', advice: 'Fiska tidigt/sent' };
    return { status: 'Mycket varmt', color: 'red', advice: 'Fiska på natten' };
  };

  const getLevelStatus = (level) => {
    const absLevel = Math.abs(level);
    if (absLevel < 10) return { status: 'Normal', color: 'green', advice: 'Normala förhållanden' };
    if (absLevel < 30) return { status: level > 0 ? 'Lite högt' : 'Lite lågt', color: 'yellow', advice: 'Anpassa fisketeknik' };
    if (absLevel < 50) return { status: level > 0 ? 'Högt' : 'Lågt', color: 'yellow', advice: 'Svårare förhållanden' };
    return { status: level > 0 ? 'Mycket högt' : 'Mycket lågt', color: 'red', advice: 'Extrema förhållanden' };
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center space-x-3 mb-6">
        <BeakerIcon className="h-6 w-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Vattenförhållanden</h3>
        <span className="text-sm text-gray-500">SMHI</span>
      </div>

      <div className="space-y-6">
        {/* Water Temperature */}
        {water.temperature && (
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <FireIcon className="h-5 w-5 text-blue-600" />
              <h4 className="font-medium text-gray-900">Vattentemperatur</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {Math.round(water.temperature.temperature)}°C
                </p>
                <p className="text-sm text-gray-600">
                  Station: {water.temperature.station.name}
                </p>
                <p className="text-xs text-gray-500">
                  Avstånd: {formatDistance(water.temperature.distance)}
                </p>
              </div>
              
              <div>
                {(() => {
                  const tempStatus = getTemperatureStatus(water.temperature.temperature);
                  return (
                    <div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        tempStatus.color === 'green' ? 'bg-green-100 text-green-800' :
                        tempStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                        tempStatus.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {tempStatus.status}
                      </span>
                      <p className="text-sm text-gray-600 mt-2">
                        {tempStatus.advice}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
            
            {detailed && (
              <div className="mt-4 pt-4 border-t border-blue-200">
                <p className="text-xs text-gray-500">
                  Uppdaterad: {new Date(water.temperature.updated).toLocaleString('sv-SE')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Water Level */}
        {water.level && (
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="flex items-center space-x-1">
                {water.level.level > 0 ? (
                  <ArrowUpIcon className="h-5 w-5 text-green-600" />
                ) : (
                  <ArrowDownIcon className="h-5 w-5 text-green-600" />
                )}
              </div>
              <h4 className="font-medium text-gray-900">Vattennivå</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {water.level.level > 0 ? '+' : ''}{water.level.level} cm
                </p>
                <p className="text-sm text-gray-600">
                  {water.level.unit}
                </p>
                <p className="text-sm text-gray-600">
                  Station: {water.level.station.name}
                </p>
                <p className="text-xs text-gray-500">
                  Avstånd: {formatDistance(water.level.distance)}
                </p>
              </div>
              
              <div>
                {(() => {
                  const levelStatus = getLevelStatus(water.level.level);
                  return (
                    <div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        levelStatus.color === 'green' ? 'bg-green-100 text-green-800' :
                        levelStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {levelStatus.status}
                      </span>
                      <p className="text-sm text-gray-600 mt-2">
                        {levelStatus.advice}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
            
            {detailed && (
              <div className="mt-4 pt-4 border-t border-green-200">
                <p className="text-xs text-gray-500">
                  Uppdaterad: {new Date(water.level.updated).toLocaleString('sv-SE')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* No data available */}
        {!water.temperature && !water.level && (
          <div className="text-center py-8">
            <BeakerIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Ingen vattendata tillgänglig</p>
            <p className="text-sm text-gray-500 mt-2">
              Inga SMHI-stationer rapporterar data för denna plats
            </p>
          </div>
        )}
      </div>

      {/* General water advice */}
      {(water.temperature || water.level) && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Allmänna vattenråd</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Vattentemperatur påverkar fiskens aktivitet och metabolism</p>
            <p>• Vattennivån påverkar tillgången till föda och skydd</p>
            <p>• Förändringar i vattenförhållanden kan utlösa fiskaktivitet</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaterConditionsCard; 