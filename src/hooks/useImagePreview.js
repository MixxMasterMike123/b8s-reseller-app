import { useState, useCallback } from 'react';

export const useImagePreview = () => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const openPreview = useCallback((imageUrl, imageName) => {
    setPreviewData({ imageUrl, imageName });
    setIsPreviewOpen(true);
  }, []);

  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
    setPreviewData(null);
  }, []);

  return {
    isPreviewOpen,
    previewData,
    openPreview,
    closePreview
  };
}; 