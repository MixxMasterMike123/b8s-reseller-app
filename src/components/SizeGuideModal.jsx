import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../contexts/TranslationContext';

const SizeGuideModal = ({ isOpen, onClose, groupContent, productName }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              {t('size_guide_modal_title', 'Storleksguide')}
              {productName && (
                <span className="text-base font-normal text-gray-600 ml-2">
                  - {productName}
                </span>
              )}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {groupContent?.sizeAndFit ? (
              <div 
                className="prose prose-sm max-w-none text-gray-600"
                dangerouslySetInnerHTML={{ __html: groupContent.sizeAndFit }}
              />
            ) : (
              <p className="text-gray-500 text-center py-8">
                {t('no_group_content', 'Ingen information tillgänglig')}
              </p>
            )}
          </div>
          
          {/* Footer */}
          <div className="flex justify-end p-6 border-t bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              {t('size_guide_modal_close', 'Stäng')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SizeGuideModal; 