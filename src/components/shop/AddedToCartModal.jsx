import React, { useState, useEffect } from 'react';
import { XMarkIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import { useCart } from '../../contexts/CartContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { useContentTranslation } from '../../hooks/useContentTranslation';
import SmartPrice from './SmartPrice';

const AddedToCartModal = ({ isVisible, onClose, addedItem, cartCount }) => {
  const { t } = useTranslation();
  const { getContentValue } = useContentTranslation();
  const { getTotalItems } = useCart();
  
  useEffect(() => {
    if (isVisible) {
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible || !addedItem) return null;

  return (
    <>
      {/* Mobile: Full backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-25 z-40 transition-opacity duration-300 md:hidden"
        onClick={onClose}
      />
      
      {/* Mobile: Slide up from bottom */}
      <div className={`
        fixed z-50 md:hidden
        bottom-0 left-0 right-0 p-4
        transform transition-all duration-300 ease-out
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
      `}>
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
          {/* Mobile content - same as before */}
          <MobileContent addedItem={addedItem} onClose={onClose} t={t} getTotalItems={getTotalItems} isVisible={isVisible} getContentValue={getContentValue} />
        </div>
      </div>

      {/* Desktop: Small modal connected to cart icon */}
      <div className={`
        hidden md:block fixed z-50 
        top-16 right-4 w-80
        transform transition-all duration-200 ease-out
        ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-2 opacity-0 scale-95'}
      `}>
        
        {/* Arrow pointing to cart icon */}
        <div className="absolute -top-2 right-8 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45"></div>
        
        {/* Desktop modal content */}
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
          <DesktopContent addedItem={addedItem} onClose={onClose} t={t} getTotalItems={getTotalItems} getContentValue={getContentValue} />
        </div>
      </div>
    </>
  );
};

// Mobile content component
const MobileContent = ({ addedItem, onClose, t, getTotalItems, isVisible, getContentValue }) => (
  <>
    {/* Header */}
    <div className="bg-green-50 border-b border-green-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <CheckIcon className="w-4 h-4 text-white" />
          </div>
          <span className="font-medium text-green-800">
            {t('added_to_cart', 'Added to Cart')}
          </span>
        </div>
        
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
    
    {/* Product Details */}
    <div className="p-4">
      <div className="flex space-x-4">
        <div className="flex-shrink-0">
          <img
            src={addedItem.image || '/images/B8S_logo.png'}
            alt={getContentValue(addedItem.name) || 'Product'}
            className="w-16 h-16 object-cover rounded-lg border border-gray-200"
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">
            {getContentValue(addedItem.name) || 'Product'}
          </h3>
          
          <div className="mt-1 space-y-1">
            {addedItem.color && (
              <p className="text-sm text-gray-600">
                {t('color', 'Color')}: {getContentValue(addedItem.color)}
              </p>
            )}
            
            {addedItem.size && (
              <p className="text-sm text-gray-600">
                {t('size', 'Size')}: {getContentValue(addedItem.size)}
              </p>
            )}
            
            <p className="text-sm text-gray-600">
              {t('quantity', 'Quantity')}: {addedItem.quantity}
            </p>
            
            <div className="font-medium text-gray-900">
              <SmartPrice 
                sekPrice={addedItem.price} 
                size="small"
                className="font-medium text-gray-900"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    
    {/* Action Buttons */}
    <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
      <div className="flex space-x-3">
        <button
          onClick={() => {
            onClose();
            window.location.href = `/${window.location.pathname.split('/')[1]}/cart`;
          }}
          className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
        >
          <ShoppingBagIcon className="w-4 h-4" />
          <span>
            {t('view_cart_count', 'View Cart ({{count}})', { count: getTotalItems() })}
          </span>
        </button>
        
        <button
          onClick={() => {
            onClose();
            window.location.href = `/${window.location.pathname.split('/')[1]}/checkout`;
          }}
          className="flex-1 bg-black text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          {t('checkout', 'Checkout')}
        </button>
      </div>
    </div>
    
    {/* Progress Bar */}
    <div className="h-1 bg-gray-200">
      <div 
        className="h-full bg-green-500 transition-all duration-5000 ease-linear"
        style={{ width: isVisible ? '0%' : '100%' }}
      />
    </div>
  </>
);

// Desktop content component - more compact
const DesktopContent = ({ addedItem, onClose, t, getTotalItems, getContentValue }) => (
  <>
    {/* Compact header */}
    <div className="bg-green-50 px-4 py-2 border-b border-green-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
            <CheckIcon className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-medium text-green-800">
            {t('added_to_cart', 'Added to Cart')}
          </span>
        </div>
        
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
    
    {/* Compact product details */}
    <div className="p-3">
      <div className="flex space-x-3">
        <div className="flex-shrink-0">
          <img
            src={addedItem.image || '/images/B8S_logo.png'}
            alt={getContentValue(addedItem.name) || 'Product'}
            className="w-12 h-12 object-cover rounded border border-gray-200"
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {getContentValue(addedItem.name) || 'Product'}
          </h3>
          <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
            <span>{addedItem.quantity} ×</span>
            <SmartPrice 
              sekPrice={addedItem.price} 
              size="small"
              className="text-xs text-gray-600"
            />
          </div>
        </div>
      </div>
    </div>
    
    {/* Compact action buttons */}
    <div className="bg-gray-50 px-3 py-2 border-t border-gray-200">
      <div className="flex space-x-2">
        <button
          onClick={() => {
            onClose();
            window.location.href = `/${window.location.pathname.split('/')[1]}/cart`;
          }}
          className="flex-1 bg-white border border-gray-300 rounded px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors text-center"
        >
          {t('view_cart_count', 'Cart ({{count}})', { count: getTotalItems() })}
        </button>
        
        <button
          onClick={() => {
            onClose();
            window.location.href = `/${window.location.pathname.split('/')[1]}/checkout`;
          }}
          className="flex-1 bg-black text-white rounded px-3 py-1.5 text-xs font-medium hover:bg-gray-800 transition-colors text-center"
        >
          {t('checkout', 'Checkout')}
        </button>
      </div>
    </div>
  </>
);

export default AddedToCartModal; 