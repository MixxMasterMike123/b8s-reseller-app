import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { ArrowDownTrayIcon, MagnifyingGlassIcon, PhotoIcon, DocumentIcon, FilmIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';
import { useImagePreview } from '../hooks/useImagePreview';
import ImagePreviewModal from './ImagePreviewModal';
import { useTranslation } from '../contexts/TranslationContext';

const AffiliateMarketingMaterials = ({ affiliateCode }) => {
  const { t } = useTranslation();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  
  const {
    isPreviewOpen,
    previewData,
    openPreview,
    closePreview
  } = useImagePreview();

  useEffect(() => {
    fetchMarketingMaterials();
  }, []);

  const fetchMarketingMaterials = async () => {
    try {
      setLoading(true);
      
      // Fetch general marketing materials (available to all affiliates)
      const generalQuery = collection(db, 'marketingMaterials');
      const generalSnapshot = await getDocs(generalQuery);
      const generalMaterials = generalSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isGeneral: true
      }));

      // Fetch affiliate-specific materials if any exist
      // Note: This would be implemented if we add affiliate-specific materials later
      
      const allMaterials = [...generalMaterials];
      setMaterials(allMaterials);
    } catch (error) {
      console.error('Error fetching marketing materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'image':
        return <PhotoIcon className="h-5 w-5" />;
      case 'video':
        return <FilmIcon className="h-5 w-5" />;
      case 'pdf':
      case 'document':
        return <DocumentIcon className="h-5 w-5" />;
      default:
        return <ArchiveBoxIcon className="h-5 w-5" />;
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      'allmänt': t('marketing_materials_allmänt', 'Allmänt'),
      'produktbilder': t('marketing_materials_produktbilder', 'Produktbilder'),
      'annonser': t('marketing_materials_annonser', 'Annonser'),
      'broschyrer': t('marketing_materials_broschyrer', 'Broschyrer'),
      'videos': t('marketing_materials_videos', 'Videos'),
      'prislista': t('marketing_materials_prislista', 'Prislista'),
      'instruktioner': t('marketing_materials_instruktioner', 'Instruktioner'),
      'dokument': t('marketing_materials_dokument', 'Dokument'),
      'övrigt': t('marketing_materials_övrigt', 'Övrigt')
    };
    return labels[category] || category;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper function to safely get content value (prevents React Error #31)
  const safeGetContentValue = (content) => {
    if (!content) return '';
    
    // If it's a string, return it directly
    if (typeof content === 'string') {
      return content;
    }
    
    // If it's an object (multilingual), get the appropriate language
    if (typeof content === 'object' && content !== null) {
      // Try to get Swedish first, then English UK, then English US
      const swedishValue = content['sv-SE'];
      const englishGBValue = content['en-GB'];
      const englishUSValue = content['en-US'];
      
      // Ensure we return a string, never an object
      if (typeof swedishValue === 'string') return swedishValue;
      if (typeof englishGBValue === 'string') return englishGBValue;
      if (typeof englishUSValue === 'string') return englishUSValue;
      
      // Find any available string value
      const stringValue = Object.values(content).find(val => typeof val === 'string' && val && val.length > 0);
      
      // Final safety: convert to string and fallback to empty string
      return String(stringValue || '');
    }
    
    // Final safety: convert anything else to string
    return String(content || '');
  };

  const handleDownload = async (material) => {
    try {
      const response = await fetch(material.downloadURL);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = material.fileName || material.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const filteredMaterials = materials.filter(material => {
    if (filter === 'all') return true;
    return material.category === filter;
  });

  const groupedMaterials = filteredMaterials.reduce((groups, material) => {
    const category = material.category || 'övrigt';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(material);
    return groups;
  }, {});

  const categories = [
    { value: 'all', label: t('marketing_materials_all_categories', 'Alla kategorier') },
    { value: 'annonser', label: t('marketing_materials_annonser', 'Annonser') },
    { value: 'produktbilder', label: t('marketing_materials_produktbilder', 'Produktbilder') },
    { value: 'broschyrer', label: t('marketing_materials_broschyrer', 'Broschyrer') },
    { value: 'videos', label: t('marketing_materials_videos', 'Videos') },
    { value: 'allmänt', label: t('marketing_materials_allmänt', 'Allmänt') }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">{t('marketing_materials_loading', 'Laddar material...')}</span>
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <div className="text-center py-8">
        <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">{t('marketing_materials_no_materials', 'Inga marknadsföringsmaterial tillgängliga än.')}</p>
        <p className="text-sm text-gray-400 mt-2">{t('marketing_materials_coming_soon', 'Material kommer att läggas till snart.')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <button
            key={category.value}
            onClick={() => setFilter(category.value)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filter === category.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Materials by Category */}
      <div className="space-y-6">
        {Object.entries(groupedMaterials).map(([category, categoryMaterials]) => (
          <div key={category}>
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              {getFileIcon(categoryMaterials[0]?.fileType)}
              <span className="ml-2">{getCategoryLabel(category)} ({categoryMaterials.length})</span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryMaterials.map((material) => (
                <div key={material.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                  {/* Preview */}
                  <div className="mb-3">
                    {material.fileType === 'image' && material.downloadURL ? (
                      <div 
                        className="relative h-32 bg-white rounded-md overflow-hidden cursor-pointer group"
                        onClick={() => openPreview(material.downloadURL, safeGetContentValue(material.name))}
                      >
                        <img 
                          src={material.downloadURL}
                          alt={safeGetContentValue(material.name)}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <MagnifyingGlassIcon className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="h-32 bg-white rounded-md flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-3xl text-gray-400 mb-2">
                            {getFileIcon(material.fileType)}
                          </div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">
                            {material.fileType}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
                      {safeGetContentValue(material.name)}
                    </h4>
                    
                    {safeGetContentValue(material.description) && (
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {safeGetContentValue(material.description)}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {material.fileSize && formatFileSize(material.fileSize)}
                      </span>
                      
                      <button
                        onClick={() => handleDownload(material)}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                      >
                        <ArrowDownTrayIcon className="h-3 w-3 mr-1" />
                        {t('marketing_materials_download', 'Ladda ner')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <ImagePreviewModal
        isOpen={isPreviewOpen}
        onClose={closePreview}
        imageUrl={previewData?.imageUrl}
        imageName={previewData?.imageName}
      />
    </div>
  );
};

export default AffiliateMarketingMaterials; 