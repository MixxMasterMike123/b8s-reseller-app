import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/TranslationContext';
import { useContentTranslation } from '../hooks/useContentTranslation';
import AppLayout from '../components/layout/AppLayout';
import ImagePreviewModal from '../components/ImagePreviewModal';
import { useImagePreview } from '../hooks/useImagePreview';
import { 
  MagnifyingGlassIcon, 
  ChartBarIcon, 
  GlobeAltIcon, 
  UserIcon,
  FunnelIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  getGenericMaterials,
  getCustomerMaterials,
  getFileIcon,
  downloadFile
} from '../utils/marketingMaterials';

function MarketingMaterialsPage() {
  const { currentUser, isAdmin } = useAuth();
  const { t } = useTranslation();
  const { getContentValue } = useContentTranslation();
  const [genericMaterials, setGenericMaterials] = useState([]);
  const [customerMaterials, setCustomerMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('alla');
  const [selectedType, setSelectedType] = useState('alla');
  const [searchTerm, setSearchTerm] = useState('');

  // Image preview functionality
  const {
    isPreviewOpen,
    previewData,
    closePreview,
    handleMouseEnter,
    handleMouseLeave,
    handleTouchStart,
    handleClick,
    openPreview
  } = useImagePreview(300);

  const categories = [
    { value: 'alla', label: t('marketing.categories.all', 'Alla kategorier') },
    { value: 'allmänt', label: t('marketing.categories.general', 'Allmänt') },
    { value: 'produktbilder', label: t('marketing.categories.product_images', 'Produktbilder') },
    { value: 'annonser', label: t('marketing.categories.ads', 'Annonser') },
    { value: 'broschyrer', label: t('marketing.categories.brochures', 'Broschyrer') },
    { value: 'videos', label: t('marketing.categories.videos', 'Videos') },
    { value: 'prislista', label: t('marketing.categories.price_list', 'Prislista') },
    { value: 'instruktioner', label: t('marketing.categories.instructions', 'Instruktioner') },
    { value: 'dokument', label: t('marketing.categories.documents', 'Dokument') },
    { value: 'kundspecifikt', label: t('marketing.categories.customer_specific', 'Kundspecifikt') },
    { value: 'övrigt', label: t('marketing.categories.other', 'Övrigt') }
  ];

  const fileTypes = [
    { value: 'alla', label: t('marketing.file_types.all', 'Alla filtyper') },
    { value: 'image', label: t('marketing.file_types.images', 'Bilder') },
    { value: 'video', label: t('marketing.file_types.videos', 'Videos') },
    { value: 'document', label: t('marketing.file_types.documents', 'Dokument') },
    { value: 'archive', label: t('marketing.file_types.archives', 'Arkiv') }
  ];

  useEffect(() => {
    if (currentUser) {
      loadMaterials();
    }
  }, [currentUser]);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      
      // Load generic materials (available to all)
      const genericData = await getGenericMaterials();
      setGenericMaterials(genericData.filter(material => material.isActive !== false));

      // Load customer-specific materials if user is logged in
      if (currentUser?.uid) {
        try {
          const customerData = await getCustomerMaterials(currentUser.uid);
          setCustomerMaterials(customerData.filter(material => material.isActive !== false));
        } catch (error) {
          // It's okay if customer materials don't exist yet
          console.log('No customer-specific materials found');
          setCustomerMaterials([]);
        }
      }
    } catch (error) {
      console.error('Error loading materials:', error);
      toast.error(t('marketing.errors.load_failed', 'Kunde inte ladda marknadsföringsmaterial'));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (material) => {
    try {
      await downloadFile(material.downloadURL, material.fileName);
      toast.success(t('marketing.download.started', 'Nedladdning startad'));
    } catch (error) {
      console.error('Download error:', error);
      toast.error(t('marketing.errors.download_failed', 'Kunde inte ladda ner filen'));
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoryLabel = (category) => {
    const cat = categories.find(c => c.value === category);
    return cat ? cat.label : category;
  };

  // Combine and filter materials
  const allMaterials = [
    ...genericMaterials.map(m => ({ ...m, source: 'generic' })),
    ...customerMaterials.map(m => ({ ...m, source: 'customer' }))
  ];

  const filteredMaterials = allMaterials.filter(material => {
    const matchesCategory = selectedCategory === 'alla' || material.category === selectedCategory;
    const matchesType = selectedType === 'alla' || material.fileType === selectedType;
    
    // Safe content extraction
    const safeGetContentValue = (field) => {
      const value = getContentValue(field);
      if (typeof value === 'string') {
        return value;
      } else if (typeof value === 'object' && value) {
        return value['sv-SE'] || value['en-GB'] || value['en-US'] || String(value) || '';
      }
      return String(value || '');
    };
    
    const materialName = safeGetContentValue(material.name) || '';
    const materialDescription = safeGetContentValue(material.description) || '';
    const matchesSearch = searchTerm === '' || 
      materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      materialDescription.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesType && matchesSearch;
  });

  // Group materials by category for better organization
  const groupedMaterials = filteredMaterials.reduce((groups, material) => {
    const category = material.category || 'allmänt';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(material);
    return groups;
  }, {});

  if (!currentUser) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <p className="text-gray-500">{t('marketing.login_required', 'Du måste vara inloggad för att se marknadsföringsmaterial')}.</p>
            <Link to="/login" className="text-blue-600 hover:underline">
              {t('marketing.login_link', 'Logga in')}
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('marketing.title', 'Marknadsföringsmaterial')}</h1>
              <p className="mt-2 text-base md:text-lg text-gray-600">
                {t('marketing.subtitle', 'Ladda ner bilder, broschyrer, videos och annat material för marknadsföring')}
              </p>
            </div>
            <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3">
              <Link 
                to="/" 
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-3 md:py-2 border border-gray-300 text-base md:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 min-h-[48px] md:min-h-0"
              >
                {t('marketing.back_to_dashboard', 'Tillbaka till Dashboard')}
              </Link>
              {isAdmin && (
                <Link 
                  to="/admin/marketing" 
                  className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-3 md:py-2 border border-transparent text-base md:text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 min-h-[48px] md:min-h-0"
                >
                  {t('marketing.manage_materials', 'Hantera Material')}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 md:mb-8 bg-white shadow-sm rounded-lg p-4 md:p-6">
          <div className="flex items-center mb-4">
            <FunnelIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-base md:text-lg font-medium text-gray-900">{t('marketing.filters.title', 'Filter och sök')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-base md:text-sm font-medium text-gray-700 mb-2">
                {t('marketing.filters.search_label', 'Sök material')}
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('marketing.filters.search_placeholder', 'Sök efter namn eller beskrivning...')}
                className="w-full px-4 py-3 md:px-3 md:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base min-h-[48px] md:min-h-0"
              />
            </div>
            <div>
              <label className="block text-base md:text-sm font-medium text-gray-700 mb-2">
                {t('marketing.filters.category_label', 'Kategori')}
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-3 md:px-3 md:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base min-h-[48px] md:min-h-0"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-base md:text-sm font-medium text-gray-700 mb-2">
                {t('marketing.filters.file_type_label', 'Filtyp')}
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-3 md:px-3 md:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base min-h-[48px] md:min-h-0"
              >
                {fileTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('alla');
                  setSelectedType('alla');
                }}
                className="w-full px-4 py-3 md:py-2 border border-gray-300 text-base md:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 min-h-[48px] md:min-h-0"
              >
                {t('marketing.filters.clear_filters', 'Rensa filter')}
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 md:mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white overflow-hidden shadow-sm rounded-lg">
            <div className="p-4 md:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="w-8 h-8 text-blue-600" />
                </div>
                <div className="ml-4 md:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{t('marketing.stats.total_materials', 'Totalt material')}</dt>
                    <dd className="text-lg font-medium text-gray-900">{allMaterials.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow-sm rounded-lg">
            <div className="p-4 md:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <GlobeAltIcon className="w-8 h-8 text-green-600" />
                </div>
                <div className="ml-4 md:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{t('marketing.stats.general_materials', 'Allmänt material')}</dt>
                    <dd className="text-lg font-medium text-gray-900">{genericMaterials.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow-sm rounded-lg">
            <div className="p-4 md:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserIcon className="w-8 h-8 text-purple-600" />
                </div>
                <div className="ml-4 md:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{t('marketing.stats.your_materials', 'Ditt material')}</dt>
                    <dd className="text-lg font-medium text-gray-900">{customerMaterials.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow-sm rounded-lg">
            <div className="p-4 md:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <MagnifyingGlassIcon className="w-8 h-8 text-orange-600" />
                </div>
                <div className="ml-4 md:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{t('marketing.stats.filtered', 'Filtrerat')}</dt>
                    <dd className="text-lg font-medium text-gray-900">{filteredMaterials.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <div className="mx-auto mb-4 w-16 h-16 text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z M3 7l9-4 9 4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('marketing.empty.title', 'Inget material hittades')}</h3>
            <p className="text-gray-500 mb-4">
              {allMaterials.length === 0 
                ? t('marketing.empty.no_materials', 'Det finns inget marknadsföringsmaterial tillgängligt ännu.')
                : t('marketing.empty.try_filters', 'Prova att ändra dina filterinställningar.')}
            </p>
            {allMaterials.length > 0 && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('alla');
                  setSelectedType('alla');
                }}
                className="inline-flex items-center justify-center px-6 py-3 md:px-4 md:py-2 border border-transparent text-base md:text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 min-h-[48px] md:min-h-0"
              >
                {t('marketing.empty.show_all', 'Visa allt material')}
              </button>
            )}
          </div>
        ) : (
          /* Materials Grid */
          <div className="space-y-8">
            {Object.entries(groupedMaterials).map(([category, materials]) => (
              <div key={category} className="bg-white shadow-sm rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <span className="mr-2">{getFileIcon(materials[0]?.fileType)}</span>
                    {getCategoryLabel(category)} ({materials.length})
                  </h2>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {materials.map((material) => (
                      <div key={`${material.source}-${material.id}`} className="group relative bg-white border border-gray-200 rounded-xl p-6 hover:shadow-xl hover:border-blue-200 transition-all duration-300 flex flex-col h-full">
                        {/* Category Pill */}
                        <div className="absolute top-4 right-4 z-10 px-3 py-1.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          {material.category || t('marketing.categories.other', 'Övrigt')}
                        </div>

                        {/* Material Preview */}
                        <div className="mb-6">
                          <div 
                            className="relative w-20 h-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden cursor-pointer mx-auto shadow-sm border border-gray-100"
                            onClick={() => {
                              if (material.fileType === 'image' && material.downloadURL) {
                                const safeName = (() => {
                                  const nameValue = getContentValue(material.name);
                                  if (typeof nameValue === 'string') {
                                    return nameValue;
                                  } else if (typeof nameValue === 'object' && nameValue) {
                                    return nameValue['sv-SE'] || nameValue['en-GB'] || nameValue['en-US'] || String(nameValue) || '';
                                  }
                                  return String(nameValue || '');
                                })();
                                openPreview(material.downloadURL, safeName);
                              }
                            }}
                          >
                            {material.fileType === 'image' && material.downloadURL ? (
                              <>
                                <img 
                                  src={material.downloadURL}
                                  alt={(() => {
                                    const nameValue = getContentValue(material.name);
                                    if (typeof nameValue === 'string') {
                                      return nameValue;
                                    } else if (typeof nameValue === 'object' && nameValue) {
                                      return nameValue['sv-SE'] || nameValue['en-GB'] || nameValue['en-US'] || String(nameValue) || '';
                                    }
                                    return String(nameValue || '');
                                  })()}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    // Fallback to icon if image fails to load
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'block';
                                  }}
                                />
                                {/* Hover Indicator */}
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                  <MagnifyingGlassIcon className="h-6 w-6 text-white" />
                                </div>
                              </>
                            ) : null}
                            <span 
                              className="text-3xl flex items-center justify-center h-full text-gray-400"
                              style={{ display: material.fileType === 'image' && material.downloadURL ? 'none' : 'flex' }}
                            >
                              {getFileIcon(material.fileType)}
                            </span>
                          </div>
                        </div>

                        {/* Material Info - Hierarchical spacing */}
                        <div className="text-center space-y-4 flex-grow">
                          <div className="space-y-2">
                            <h3 className="font-semibold text-gray-900 text-base leading-tight line-clamp-2">
                              {(() => {
                                const nameValue = getContentValue(material.name);
                                if (typeof nameValue === 'string') {
                                  return nameValue;
                                } else if (typeof nameValue === 'object' && nameValue) {
                                  return nameValue['sv-SE'] || nameValue['en-GB'] || nameValue['en-US'] || String(nameValue) || '';
                                }
                                return String(nameValue || '');
                              })()}
                            </h3>
                            
                            {(() => {
                              const descriptionValue = getContentValue(material.description);
                              if (typeof descriptionValue === 'string') {
                                return descriptionValue;
                              } else if (typeof descriptionValue === 'object' && descriptionValue) {
                                return descriptionValue['sv-SE'] || descriptionValue['en-GB'] || descriptionValue['en-US'] || String(descriptionValue) || '';
                              }
                              return String(descriptionValue || '');
                            })() && (
                              <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                                {(() => {
                                  const descriptionValue = getContentValue(material.description);
                                  if (typeof descriptionValue === 'string') {
                                    return descriptionValue;
                                  } else if (typeof descriptionValue === 'object' && descriptionValue) {
                                    return descriptionValue['sv-SE'] || descriptionValue['en-GB'] || descriptionValue['en-US'] || String(descriptionValue) || '';
                                  }
                                  return String(descriptionValue || '');
                                })()}
                              </p>
                            )}
                          </div>

                          <div className="pt-2 border-t border-gray-100">
                            <div className="text-xs text-gray-500 space-y-1">
                              <p className="truncate font-medium">{material.fileName}</p>
                              {material.fileSize && (
                                <p className="text-gray-400">{formatFileSize(material.fileSize)}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Download Button - Always at bottom */}
                        <div className="mt-6 pt-4 border-t border-gray-100">
                          <button
                            onClick={() => handleDownload(material)}
                            className="w-full inline-flex items-center justify-center px-4 py-3 md:py-3 border border-transparent text-base md:text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm hover:shadow-md min-h-[48px] md:min-h-0"
                          >
                            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                            {t('marketing.download.button', 'Ladda ner')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Image Preview Modal */}
        <ImagePreviewModal
          isOpen={isPreviewOpen}
          onClose={closePreview}
          imageUrl={previewData?.imageUrl}
          imageName={previewData?.imageName}
        />
      </div>
    </AppLayout>
  );
}

export default MarketingMaterialsPage; 