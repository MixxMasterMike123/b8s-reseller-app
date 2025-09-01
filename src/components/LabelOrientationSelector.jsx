import React, { useState } from 'react';
import { formatAddressForLabel } from '../utils/labelPrinter';

const LabelOrientationSelector = ({ order, userData, onPrint }) => {
  const [selectedOrientation, setSelectedOrientation] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  // Generate preview data for both orientations
  React.useEffect(() => {
    if (order) {
      const autoData = formatAddressForLabel(order, userData);
      const portraitData = formatAddressForLabel(order, userData, 'portrait');
      const landscapeData = formatAddressForLabel(order, userData, 'landscape');
      
      setPreviewData({
        auto: autoData,
        portrait: portraitData,
        landscape: landscapeData
      });
    }
  }, [order, userData]);

  const handlePrint = (orientation) => {
    setSelectedOrientation(orientation);
    onPrint(orientation === 'auto' ? null : orientation);
  };

  if (!previewData) return null;

  return (
    <div className="flex items-center gap-2">
      {/* Auto/Recommended Option */}
      <div className="relative">
        <button
          onClick={() => handlePrint('auto')}
          className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
            selectedOrientation === 'auto' || selectedOrientation === null
              ? 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900 dark:border-blue-600 dark:text-blue-300'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
          }`}
          title={`Rekommenderat: ${previewData.auto.orientation === 'portrait' ? 'Stående' : 'Liggande'} (${previewData.auto.lines.length} rader)`}
        >
          🤖 Auto
          <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1 rounded-full">
            ✓
          </div>
        </button>
      </div>

      {/* Portrait Option */}
      <button
        onClick={() => handlePrint('portrait')}
        className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
          selectedOrientation === 'portrait'
            ? 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900 dark:border-blue-600 dark:text-blue-300'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
        }`}
        title={`Stående format: ${previewData.portrait.lines.length} rader, ${Math.max(...previewData.portrait.lines.map(l => l.length))} tecken/rad`}
      >
        📄 Stående
      </button>

      {/* Landscape Option */}
      <button
        onClick={() => handlePrint('landscape')}
        className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
          selectedOrientation === 'landscape'
            ? 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900 dark:border-blue-600 dark:text-blue-300'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
        }`}
        title={`Liggande format: ${previewData.landscape.lines.length} rader, ${Math.max(...previewData.landscape.lines.map(l => l.length))} tecken/rad`}
      >
        📄 Liggande
      </button>

      {/* Preview Info */}
      <div className="ml-2 text-xs text-gray-500 dark:text-gray-400">
        <div>Auto: <strong>{previewData.auto.orientation === 'portrait' ? 'Stående' : 'Liggande'}</strong></div>
        <div className="text-xs">
          {previewData.auto.rawData.country === 'US' && '🇺🇸 US → Stående'}
          {previewData.auto.lines.length > 5 && '📏 Många rader → Stående'}
          {previewData.auto.lines.some(l => l.length > 25) && '📝 Långa rader → Stående'}
        </div>
      </div>
    </div>
  );
};

export default LabelOrientationSelector;
