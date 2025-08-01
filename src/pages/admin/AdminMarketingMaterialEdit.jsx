import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { useContentTranslation } from '../../hooks/useContentTranslation';
import AppLayout from '../../components/layout/AppLayout';
import ContentLanguageIndicator from '../../components/ContentLanguageIndicator';
import toast from 'react-hot-toast';
import {
  getGenericMaterialById,
  updateGenericMaterial,
  uploadGenericMaterial,
  deleteGenericMaterial,
  getFileType,
  getFileIcon
} from '../../utils/marketingMaterials';
import FileIcon from '../../components/FileIcon';

function AdminMarketingMaterialEdit() {
  const { materialId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { currentLanguage } = useTranslation();
  const { getContentValue, setContentValue } = useContentTranslation();
  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [replaceFile, setReplaceFile] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'allmänt',
    file: null
  });

  const categories = [
    { value: 'allmänt', label: 'Allmänt' },
    { value: 'produktbilder', label: 'Produktbilder' },
    { value: 'annonser', label: 'Annonser' },
    { value: 'broschyrer', label: 'Broschyrer' },
    { value: 'videos', label: 'Videos' },
    { value: 'prislista', label: 'Prislista' },
    { value: 'instruktioner', label: 'Instruktioner' },
    { value: 'dokument', label: 'Dokument' },
    { value: 'övrigt', label: 'Övrigt' }
  ];

  useEffect(() => {
    console.log('AdminMarketingMaterialEdit: useEffect triggered - isAdmin:', isAdmin, 'materialId:', materialId);
    
    if (isAdmin === false) {
      console.log('AdminMarketingMaterialEdit: User is not admin, stopping loading');
      setLoading(false);
      return;
    }
    
    if (isAdmin === true && materialId) {
      console.log('AdminMarketingMaterialEdit: Loading material with ID:', materialId);
      loadMaterial();
    } else if (isAdmin === true && !materialId) {
      console.log('AdminMarketingMaterialEdit: No material ID provided');
      toast.error('Inget material-ID angivet');
      navigate('/admin/marketing');
    } else {
      console.log('AdminMarketingMaterialEdit: Waiting for admin status...');
      // Keep loading while waiting for isAdmin to be determined
    }
  }, [isAdmin, materialId]);

  const loadMaterial = async () => {
    try {
      console.log('AdminMarketingMaterialEdit: Starting to load material...');
      setLoading(true);
      const materialData = await getGenericMaterialById(materialId);
      console.log('AdminMarketingMaterialEdit: Material data received:', materialData);
      
      if (!materialData) {
        console.log('AdminMarketingMaterialEdit: No material data found');
        toast.error('Material hittades inte');
        navigate('/admin/marketing');
        return;
      }
      
      setMaterial(materialData);
      setFormData({
        name: materialData.name || '',
        description: materialData.description || '',
        category: materialData.category || 'allmänt',
        file: null
      });
      console.log('AdminMarketingMaterialEdit: Material loaded successfully');
    } catch (error) {
      console.error('AdminMarketingMaterialEdit: Error loading material:', error);
      toast.error('Kunde inte ladda material: ' + error.message);
      navigate('/admin/marketing');
    } finally {
      console.log('AdminMarketingMaterialEdit: Setting loading to false');
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        file: file
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      if (replaceFile && formData.file) {
        // Delete old material and upload new one with same metadata
        await deleteGenericMaterial(materialId);
        await uploadGenericMaterial(formData.file, {
          name: formData.name,
          description: formData.description,
          category: formData.category
        });
        toast.success('Material ersatt framgångsrikt');
      } else {
        // Update metadata only
        await updateGenericMaterial(materialId, {
          name: formData.name,
          description: formData.description,
          category: formData.category
        });
        toast.success('Material uppdaterat');
      }

      navigate('/admin/marketing');
    } catch (error) {
      console.error('Error updating material:', error);
      toast.error('Kunde inte uppdatera material');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Är du säker på att du vill ta bort detta material? Detta kan inte ångras.')) {
      return;
    }

    try {
      setSaving(true);
      await deleteGenericMaterial(materialId);
      toast.success('Material borttaget');
      navigate('/admin/marketing');
    } catch (error) {
      console.error('Error deleting material:', error);
      toast.error('Kunde inte ta bort material');
      setSaving(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoryLabel = (category) => {
    const cat = categories.find(c => c.value === category);
    return cat ? cat.label : category;
  };

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <p className="text-red-600">Du har inte behörighet att se denna sida.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!material) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <p className="text-gray-600">Material hittades inte</p>
            <Link
              to="/admin/marketing"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Tillbaka till Marknadsföringsmaterial
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Link
                to="/admin/marketing"
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-900 mb-2"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Tillbaka till Marknadsföringsmaterial
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Redigera Material</h1>
              <p className="mt-1 text-sm text-gray-600">Uppdatera information och ersätt fil om nödvändigt</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Current Material Preview */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Nuvarande Material</h2>
            
            {/* File Preview */}
            <div className="mb-6">
              <div className="flex items-center justify-center h-48 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300">
                {material.fileType === 'image' && material.downloadURL ? (
                  <img 
                    src={material.downloadURL}
                    alt={getContentValue(material.name)}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className="flex flex-col items-center justify-center text-gray-500"
                  style={{ display: material.fileType === 'image' && material.downloadURL ? 'none' : 'flex' }}
                >
                  <FileIcon iconName={getFileIcon(material.fileType)} className="w-16 h-16 mb-2" />
                  <span className="text-sm font-medium">{material.fileName}</span>
                </div>
              </div>
            </div>

            {/* Current Info */}
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-700">Namn:</span>
                <p className="text-sm text-gray-900">{getContentValue(material.name)}</p>
              </div>
              {material.description && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Beskrivning:</span>
                  <p className="text-sm text-gray-900">{getContentValue(material.description)}</p>
                </div>
              )}
              <div>
                <span className="text-sm font-medium text-gray-700">Kategori:</span>
                <p className="text-sm text-gray-900">{getCategoryLabel(material.category)}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Filnamn:</span>
                <p className="text-sm text-gray-900">{material.fileName}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Storlek:</span>
                <p className="text-sm text-gray-900">{material.fileSize ? formatFileSize(material.fileSize) : 'Okänd'}</p>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Redigera Information</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <ContentLanguageIndicator 
                  contentField={formData.name}
                  label="Namn *"
                  currentValue={getContentValue(formData.name)}
                />
                <input
                  type="text"
                  required
                  value={getContentValue(formData.name)}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: setContentValue(prev.name, e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={currentLanguage === 'sv-SE' ? "Materialnamn" : "Material name"}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategori
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <ContentLanguageIndicator 
                  contentField={formData.description}
                  label="Beskrivning"
                  currentValue={getContentValue(formData.description)}
                />
                <textarea
                  value={getContentValue(formData.description)}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: setContentValue(prev.description, e.target.value) }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={currentLanguage === 'sv-SE' ? "Beskrivning av materialet" : "Description of the material"}
                />
              </div>

              {/* Replace File Section */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    id="replaceFile"
                    checked={replaceFile}
                    onChange={(e) => setReplaceFile(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="replaceFile" className="ml-2 block text-sm font-medium text-gray-700">
                    Ersätt fil
                  </label>
                </div>
                
                {replaceFile && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ny fil *
                    </label>
                    <input
                      type="file"
                      required={replaceFile}
                      onChange={handleFileChange}
                      accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.mp4,.mov,.avi,.webm,.mkv,.pdf,.doc,.docx,.txt,.rtf,.zip,.rar"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {formData.file && (
                      <p className="mt-1 text-sm text-gray-600">
                        Vald fil: {formData.file.name} ({formatFileSize(formData.file.size)})
                      </p>
                    )}
                    <p className="mt-1 text-xs text-amber-600">
                      ⚠️ Varning: Detta kommer att ta bort den gamla filen permanent
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Sparar...' : (replaceFile ? 'Ersätt Material' : 'Uppdatera')}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/admin/marketing')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  Ta bort
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default AdminMarketingMaterialEdit; 