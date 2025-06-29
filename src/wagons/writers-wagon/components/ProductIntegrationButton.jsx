// ProductIntegrationButton.jsx - Integration component for existing product pages
// This component hooks into AdminProducts.jsx to add AI generation functionality

import React, { useState } from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import WritersWagonPanel from './WritersWagonPanel.jsx';

const ProductIntegrationButton = ({ 
  product, 
  onContentGenerated, 
  variant = 'button', 
  className = '',
  disabled = false 
}) => {
  const [showPanel, setShowPanel] = useState(false);

  const handleContentGenerated = (generatedContent) => {
    // Call the parent callback if provided
    if (onContentGenerated) {
      onContentGenerated(generatedContent, product);
    }
    
    // Close the panel
    setShowPanel(false);
  };

  // Different button variants
  const variants = {
    button: {
      className: `inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`,
      icon: 'h-4 w-4 mr-2'
    },
    'icon-button': {
      className: `inline-flex items-center p-2 border border-transparent rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`,
      icon: 'h-5 w-5'
    },
    'toolbar-button': {
      className: `inline-flex items-center px-2 py-1 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`,
      icon: 'h-4 w-4 mr-1'
    }
  };

  const buttonConfig = variants[variant] || variants.button;

  // Check if product data is available
  const hasProductData = product && (product.name || product.id);
  const isDisabled = disabled || !hasProductData;

  return (
    <>
      <button
        onClick={() => setShowPanel(true)}
        disabled={isDisabled}
        className={buttonConfig.className}
        title={hasProductData ? 'Generera AI-innehåll för denna produkt' : 'Ingen produktdata tillgänglig'}
      >
        <SparklesIcon className={buttonConfig.icon} />
        {variant !== 'icon-button' && (
          <span>
            {variant === 'toolbar-button' ? 'AI' : 'Generera AI-innehåll'}
          </span>
        )}
      </button>

      {/* Writers Wagon Panel */}
      {showPanel && hasProductData && (
        <WritersWagonPanel
          productData={product}
          onContentGenerated={handleContentGenerated}
          onClose={() => setShowPanel(false)}
        />
      )}
    </>
  );
};

export default ProductIntegrationButton; 