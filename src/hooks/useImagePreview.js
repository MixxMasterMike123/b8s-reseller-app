import { useState, useRef, useCallback } from 'react';

export const useImagePreview = (delay = 300) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const timeoutRef = useRef(null);
  const isTouchDevice = useRef(false);

  // Detect touch device on mount
  if (typeof window !== 'undefined') {
    isTouchDevice.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  const openPreview = useCallback((imageUrl, imageName) => {
    setPreviewData({ imageUrl, imageName });
    setIsPreviewOpen(true);
  }, []);

  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
    setPreviewData(null);
  }, []);

  const handleMouseEnter = useCallback((imageUrl, imageName) => {
    if (isTouchDevice.current) return; // Skip hover on touch devices
    
    timeoutRef.current = setTimeout(() => {
      openPreview(imageUrl, imageName);
    }, delay);
  }, [delay, openPreview]);

  const handleMouseLeave = useCallback(() => {
    if (isTouchDevice.current) return; // Skip hover on touch devices
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    closePreview();
  }, [closePreview]);

  const handleTouchStart = useCallback((imageUrl, imageName) => {
    if (!isTouchDevice.current) return; // Skip touch on non-touch devices
    
    // For touch devices, open immediately on tap
    openPreview(imageUrl, imageName);
  }, [openPreview]);

  const handleClick = useCallback((imageUrl, imageName) => {
    // Fallback for any device - click to open
    openPreview(imageUrl, imageName);
  }, [openPreview]);

  // Cleanup timeout on unmount
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return {
    isPreviewOpen,
    previewData,
    openPreview,
    closePreview,
    handleMouseEnter,
    handleMouseLeave,
    handleTouchStart,
    handleClick,
    cleanup,
    isTouchDevice: isTouchDevice.current
  };
}; 