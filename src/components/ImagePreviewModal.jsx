import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const ImagePreviewModal = ({ 
  isOpen, 
  onClose, 
  imageUrl, 
  imageName 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const modalRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className="relative bg-white rounded-xl shadow-2xl overflow-hidden"
        style={{
          maxWidth: 'min(800px, 90vw)',
          maxHeight: '80vh',
          width: 'auto',
          height: 'auto'
        }}
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
        <div className="relative flex items-center justify-center p-4">
          <img
            ref={imageRef}
            src={imageUrl}
            alt={imageName || 'Förhandsvisning av bild'}
            className="object-contain"
            style={{
              maxWidth: 'min(750px, 85vw)',
              maxHeight: 'calc(80vh - 8rem)',
              width: 'auto',
              height: 'auto'
            }}
            onLoad={() => setIsLoading(false)}
          />

          {/* Loading Spinner */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>

        {/* Image Info Footer */}
        {!isLoading && (
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