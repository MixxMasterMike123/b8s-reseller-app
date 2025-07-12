import React, { useState, useEffect } from 'react';
import { XMarkIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import { useCart } from '../../contexts/CartContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { useContentTranslation } from '../../hooks/useContentTranslation';
import SmartPrice from './SmartPrice';

const AddedToCartModal = ({ isVisible, onClose, addedItem, cartCount }) => {
  const { t, currentLanguage } = useTranslation();
  const { getContentValue } = useContentTranslation();
  const { getTotalItems } = useCart();

  // Safety check: Don't render if translation context is not initialized
  if (!currentLanguage) {
    return null;
  }

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
      {/* Mobile: Full backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-25 z-50 transition-opacity duration-300 md:hidden"
        onClick={onClose}
      />
      
      {/* Mobile: Nike-style modal sliding up from bottom */}
      <div className={`
        fixed z-50 md:hidden
        bottom-0 left-0 right-0 p-6
        transform transition-all duration-300 ease-out
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
      `}>
        <div className="bg-white rounded-t-2xl shadow-2xl overflow-hidden">
          <MobileNikeContent 
            addedItem={addedItem} 
            onClose={onClose} 
            t={t} 
            getTotalItems={getTotalItems} 
            getContentValue={getContentValue}
          />
        </div>
      </div>

      {/* Desktop: Nike-style positioned modal */}
      <div className={`
        hidden md:block fixed z-50 
        top-20 right-6 w-96
        transform transition-all duration-200 ease-out
        ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-2 opacity-0 scale-95'}
      `}>
        
        {/* Arrow pointing to cart icon */}
        <div className="absolute -top-2 right-8 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45 shadow-sm"></div>
        
        {/* Desktop Nike modal content */}
        <div className="bg-white rounded-lg shadow-2xl border border-gray-100 overflow-hidden">
          <DesktopNikeContent 
            addedItem={addedItem} 
            onClose={onClose} 
            t={t} 
            getTotalItems={getTotalItems} 
            getContentValue={getContentValue}
          />
        </div>
      </div>
    </>
  );
};

// Mobile Nike-style content (clean and minimal)
const MobileNikeContent = ({ addedItem, onClose, t, getTotalItems, getContentValue }) => (
  <>
    {/* Nike-style header */}
    <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
      <div className="flex items-center space-x-3">
        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
          <CheckIcon className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">
          {t('added_to_cart', 'Added to Cart')}
        </h3>
      </div>
      
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-600 transition-colors"
      >
        <XMarkIcon className="w-6 h-6" />
      </button>
    </div>
    
    {/* Nike-style product info */}
    <div className="px-6 py-6">
      <div className="flex space-x-4">
        <div className="flex-shrink-0">
          <img
            src={addedItem.image || '/images/B8S_logo.png'}
            alt={getContentValue(addedItem.name) || 'Product'}
            className="w-20 h-20 object-cover rounded-lg"
          />
        </div>
        
        <div className="flex-1 space-y-2">
          <h4 className="font-medium text-gray-900 text-base leading-tight">
            {getContentValue(addedItem.name) || 'Product'}
          </h4>
          
          <div className="space-y-1 text-sm text-gray-600">
            {addedItem.color && (
              <p>{getContentValue(addedItem.color)}</p>
            )}
            {addedItem.size && (
              <p>Size {getContentValue(addedItem.size)}</p>
            )}
            <p>Quantity {addedItem.quantity}</p>
          </div>
          
          <div className="font-medium text-gray-900">
            <SmartPrice 
              sekPrice={addedItem.price} 
              size="normal"
            />
          </div>
        </div>
      </div>
    </div>
    
    {/* Nike-style single action button */}
    <div className="px-6 pb-6">
      <button
        onClick={() => {
          onClose();
          window.location.href = `/${window.location.pathname.split('/')[1]}/cart`;
        }}
        className="w-full bg-black text-white rounded-full py-4 text-base font-medium hover:bg-gray-800 transition-colors"
      >
        {t('view_cart_count', 'View Cart ({{count}})', { count: getTotalItems() })}
      </button>
    </div>
  </>
);

// Desktop Nike-style content (matches Nike's exact layout)
const DesktopNikeContent = ({ addedItem, onClose, t, getTotalItems, getContentValue }) => (
  <>
    {/* Nike-style header with green success */}
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
      <div className="flex items-center space-x-3">
        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
          <CheckIcon className="w-3 h-3 text-white" />
        </div>
        <span className="font-medium text-gray-900">
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
    
    {/* Nike-style product display */}
    <div className="p-6">
      <div className="flex space-x-4">
        <div className="flex-shrink-0">
          <img
            src={addedItem.image || '/images/B8S_logo.png'}
            alt={getContentValue(addedItem.name) || 'Product'}
            className="w-20 h-20 object-cover rounded-lg"
          />
        </div>
        
        <div className="flex-1 space-y-2">
          <h4 className="font-medium text-gray-900 leading-tight">
            {getContentValue(addedItem.name) || 'Product'}
          </h4>
          
          <div className="space-y-1 text-sm text-gray-600">
            {addedItem.color && (
              <p>{getContentValue(addedItem.color)}</p>
            )}
            {addedItem.size && (
              <p>Size {getContentValue(addedItem.size)}</p>
            )}
            <p>Quantity {addedItem.quantity}</p>
          </div>
          
          <div className="font-medium text-gray-900">
            <SmartPrice 
              sekPrice={addedItem.price} 
              size="normal"
            />
          </div>
        </div>
      </div>
    </div>
    
    {/* Nike-style dual action buttons */}
    <div className="px-6 pb-6 space-y-3">
      <button
        onClick={() => {
          onClose();
          window.location.href = `/${window.location.pathname.split('/')[1]}/cart`;
        }}
        className="w-full border-2 border-gray-200 text-gray-900 rounded-full py-3 text-sm font-medium hover:border-gray-300 transition-colors"
      >
        {t('view_cart_count', 'View Cart ({{count}})', { count: getTotalItems() })}
      </button>
      
      <button
        onClick={() => {
          onClose();
          window.location.href = `/${window.location.pathname.split('/')[1]}/checkout`;
        }}
        className="w-full bg-black text-white rounded-full py-3 text-sm font-medium hover:bg-gray-800 transition-colors"
      >
        {t('checkout', 'Checkout')}
      </button>
    </div>
  </>
);

export default AddedToCartModal; 