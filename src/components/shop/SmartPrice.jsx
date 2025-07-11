/**
 * Smart Price Display Component
 * Automatically converts SEK prices to user's detected/selected currency
 * Handles loading states, error scenarios, and currency formatting
 */

import React, { useState, useEffect } from 'react';
import { useLanguageCurrency } from '../../contexts/LanguageCurrencyContext';

const SmartPrice = ({ 
  sekPrice, 
  className = '',
  showOriginal = false,
  size = 'normal', // 'small', 'normal', 'large'
  loading: externalLoading = false
}) => {
  const [convertedPrice, setConvertedPrice] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState(null);
  
  const { 
    currency, 
    convertSEKPrice, 
    isLoading: currencyLoading,
    isShopDomain 
  } = useLanguageCurrency();

  // Convert price when currency or sekPrice changes
  useEffect(() => {
    const convertPrice = async () => {
      if (!sekPrice || sekPrice <= 0) {
        setConvertedPrice(null);
        return;
      }

      // Skip conversion for B2B portal
      if (!isShopDomain) {
        setConvertedPrice({
          originalPrice: sekPrice,
          convertedPrice: sekPrice,
          formatted: `${sekPrice.toFixed(2)} kr`,
          currency: 'SEK',
          exchangeRate: 1.0
        });
        return;
      }

      try {
        setIsConverting(true);
        setError(null);
        
        const result = await convertSEKPrice(sekPrice);
        setConvertedPrice(result);
        
      } catch (err) {
        console.error('Error converting price:', err);
        setError(err.message);
        
        // Fallback to SEK
        setConvertedPrice({
          originalPrice: sekPrice,
          convertedPrice: sekPrice,
          formatted: `${sekPrice.toFixed(2)} kr`,
          currency: 'SEK',
          exchangeRate: 1.0,
          error: err.message
        });
        
      } finally {
        setIsConverting(false);
      }
    };

    convertPrice();
  }, [sekPrice, currency, convertSEKPrice, isShopDomain]);

  // Size-specific classes
  const sizeClasses = {
    small: {
      price: 'text-sm font-medium',
      original: 'text-xs',
      currency: 'text-xs'
    },
    normal: {
      price: 'text-lg font-semibold',
      original: 'text-sm',
      currency: 'text-sm'
    },
    large: {
      price: 'text-2xl font-bold',
      original: 'text-base',
      currency: 'text-base'
    }
  };

  const currentSize = sizeClasses[size] || sizeClasses.normal;

  // Loading state
  if (currencyLoading || isConverting || externalLoading) {
    return (
      <div className={`${className}`}>
        <div className={`${currentSize.price} text-gray-400 animate-pulse`}>
          Loading price...
        </div>
      </div>
    );
  }

  // Error state
  if (error && !convertedPrice) {
    return (
      <div className={`${className}`}>
        <div className={`${currentSize.price} text-red-500`}>
          Price unavailable
        </div>
        {showOriginal && (
          <div className={`${currentSize.original} text-gray-500 mt-1`}>
            SEK {sekPrice?.toFixed(2)}
          </div>
        )}
      </div>
    );
  }

  // No price provided
  if (!sekPrice || sekPrice <= 0) {
    return (
      <div className={`${className}`}>
        <div className={`${currentSize.price} text-gray-400`}>
          Price not available
        </div>
      </div>
    );
  }

  // No conversion result yet
  if (!convertedPrice) {
    return (
      <div className={`${className}`}>
        <div className={`${currentSize.price} text-gray-400`}>
          Calculating...
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Main converted price */}
      <div className={`${currentSize.price} text-gray-900`}>
        {convertedPrice.formatted}
      </div>
      
      {/* Original SEK price (if different currency and showOriginal is true) */}
      {showOriginal && convertedPrice.currency !== 'SEK' && (
        <div className={`${currentSize.original} text-gray-500 mt-1`}>
          SEK {convertedPrice.originalPrice?.toFixed(2)}
          {convertedPrice.markup && (
            <span className="ml-2 text-xs text-blue-600">
              (+{convertedPrice.markup}%)
            </span>
          )}
        </div>
      )}
      
      {/* Error indicator (if conversion had issues but fallback worked) */}
      {convertedPrice.error && (
        <div className={`${currentSize.currency} text-orange-500 mt-1`}>
          ⚠️ Using fallback rate
        </div>
      )}
    </div>
  );
};

/**
 * Compact price display for lists/cards
 */
export const CompactPrice = ({ sekPrice, className = '', ...props }) => {
  return (
    <SmartPrice 
      sekPrice={sekPrice}
      size="small"
      className={className}
      {...props}
    />
  );
};

/**
 * Large price display for product pages
 */
export const LargePrice = ({ sekPrice, className = '', showOriginal = true, ...props }) => {
  return (
    <SmartPrice 
      sekPrice={sekPrice}
      size="large"
      showOriginal={showOriginal}
      className={className}
      {...props}
    />
  );
};

/**
 * Price with currency badge
 */
export const PriceWithBadge = ({ sekPrice, className = '', ...props }) => {
  const { currency, detectionSource } = useLanguageCurrency();
  
  return (
    <div className={`flex items-center ${className}`}>
      <SmartPrice sekPrice={sekPrice} {...props} />
      
      {detectionSource === 'geo-primary' && currency !== 'SEK' && (
        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
          Auto-detected
        </span>
      )}
    </div>
  );
};

/**
 * Price comparison (before/after or multiple currencies)
 */
export const PriceComparison = ({ 
  sekPrice, 
  compareWith = null, 
  className = '',
  label = null 
}) => {
  return (
    <div className={`${className}`}>
      {label && (
        <div className="text-sm text-gray-600 mb-1">{label}</div>
      )}
      
      <div className="flex items-center space-x-3">
        <SmartPrice sekPrice={sekPrice} size="normal" />
        
        {compareWith && (
          <>
            <span className="text-gray-400">vs</span>
            <SmartPrice sekPrice={compareWith} size="small" className="text-gray-600" />
          </>
        )}
      </div>
    </div>
  );
};

export default SmartPrice; 