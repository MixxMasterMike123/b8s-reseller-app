import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import ImagePreviewModal from '../components/ImagePreviewModal';
import { useImagePreview } from '../hooks/useImagePreview';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  getGenericMaterials,
  getCustomerMaterials,
  getFileIcon,
  downloadFile
} from '../utils/marketingMaterials';

function MarketingMaterialsPage() {
  const { currentUser, isAdmin } = useAuth();
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
    { value: 'alla', label: 'Alla kategorier' },
    { value: 'allmänt', label: 'Allmänt' },
    { value: 'produktbilder', label: 'Produktbilder' },
    { value: 'annonser', label: 'Annonser' },
    { value: 'broschyrer', label: 'Broschyrer' },
    { value: 'videos', label: 'Videos' },
    { value: 'prislista', label: 'Prislista' },
    { value: 'instruktioner', label: 'Instruktioner' },
    { value: 'dokument', label: 'Dokument' },
    { value: 'kundspecifikt', label: 'Kundspecifikt' },
    { value: 'övrigt', label: 'Övrigt' }
  ];

  const fileTypes = [
    { value: 'alla', label: 'Alla filtyper' },
    { value: 'image', label: 'Bilder' },
    { value: 'video', label: 'Videos' },
    { value: 'document', label: 'Dokument' },
    { value: 'archive', label: 'Arkiv' }
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
      toast.error('Kunde inte ladda marknadsföringsmaterial');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (material) => {
    try {
      await downloadFile(material.downloadURL, material.fileName);
      toast.success('Nedladdning startad');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Kunde inte ladda ner filen');
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
    const matchesSearch = searchTerm === '' || 
      material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (material.description && material.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
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
            <p className="text-gray-500">Du måste vara inloggad för att se marknadsföringsmaterial.</p>
            <Link to="/login" className="text-blue-600 hover:underline">
              Logga in
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Marknadsföringsmaterial</h1>
              <p className="mt-2 text-lg text-gray-600">
                Ladda ner bilder, broschyrer, videos och annat material för marknadsföring
              </p>
            </div>
            <div className="flex gap-3">
              <Link 
                to="/" 
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Tillbaka till Dashboard
              </Link>
              {isAdmin && (
                <Link 
                  to="/admin/marketing" 
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Hantera Material
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8 bg-white shadow-sm rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sök material
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Sök efter namn eller beskrivning..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kategori
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtyp
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Rensa filter
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white overflow-hidden shadow-sm rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 3v18h18v-2H5V3H3zm4 12h2v4H7v-4zm4-6h2v10h-2V9zm4-2h2v12h-2V7z"/>
                </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Totalt material</dt>
                    <dd className="text-lg font-medium text-gray-900">{allMaterials.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow-sm rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">🌐</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Allmänt material</dt>
                    <dd className="text-lg font-medium text-gray-900">{genericMaterials.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow-sm rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">👤</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Ditt material</dt>
                    <dd className="text-lg font-medium text-gray-900">{customerMaterials.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow-sm rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">🔍</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Filtrerat</dt>
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
            <span className="text-6xl mb-4 block">📂</span>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Inget material hittades</h3>
            <p className="text-gray-500 mb-4">
              {allMaterials.length === 0 
                ? 'Det finns inget marknadsföringsmaterial tillgängligt ännu.'
                : 'Prova att ändra dina filterinställningar.'}
            </p>
            {allMaterials.length > 0 && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('alla');
                  setSelectedType('alla');
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Visa allt material
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
                          {material.category || 'Övrigt'}
                        </div>

                        {/* Material Preview */}
                        <div className="mb-6">
                          <div 
                            className="relative w-20 h-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden cursor-pointer mx-auto shadow-sm border border-gray-100"
                            onClick={() => material.fileType === 'image' && material.downloadURL && openPreview(material.downloadURL, material.name)}
                          >
                            {material.fileType === 'image' && material.downloadURL ? (
                              <>
                                <img 
                                  src={material.downloadURL}
                                  alt={material.name}
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
                              {material.name}
                            </h3>
                            
                            {material.description && (
                              <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                                {material.description}
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
                            className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Ladda ner
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