import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const ImagePreviewModal = ({ 
  isOpen, 
  onClose, 
  imageUrl, 
  imageName, 
  triggerElement 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const modalRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
    if (isOpen && imageUrl) {
      setIsLoading(true);
      setHasError(false);
      
      const img = new Image();
      img.onload = () => setIsLoading(false);
      img.onerror = () => {
        setIsLoading(false);
        setHasError(true);
      };
      img.src = imageUrl;
    }
  }, [isOpen, imageUrl]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target) && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        ref={modalRef}
        className="relative max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
          aria-label="Stäng förhandsvisning"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        {/* Image Container */}
        <div className="relative w-full h-full flex items-center justify-center">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}
          
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center text-gray-500">
                <MagnifyingGlassIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">Kunde inte ladda bilden</p>
                <p className="text-sm">Försök ladda ner filen istället</p>
              </div>
            </div>
          )}
          
          {!isLoading && !hasError && (
            <img
              ref={imageRef}
              src={imageUrl}
              alt={imageName || 'Förhandsvisning av bild'}
              className="max-w-full max-h-full object-contain"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
            />
          )}
        </div>

        {/* Image Info Footer */}
        {!isLoading && !hasError && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <p className="text-white text-sm font-medium truncate">
              {imageName || 'Bild'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImagePreviewModal; 