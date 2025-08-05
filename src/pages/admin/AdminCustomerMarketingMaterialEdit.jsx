import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { useContentTranslation } from '../../hooks/useContentTranslation';
import AppLayout from '../../components/layout/AppLayout';
import ContentLanguageIndicator from '../../components/ContentLanguageIndicator';
import toast from 'react-hot-toast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import {
  getCustomerMaterialById,
  updateCustomerMaterial,
  uploadCustomerMaterial,
  deleteCustomerMaterial,
  getFileType,
  getFileIcon
} from '../../utils/marketingMaterials';
import FileIcon from '../../components/FileIcon';

function AdminCustomerMarketingMaterialEdit() {
  const { customerId, materialId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { currentLanguage } = useTranslation();
  const { getContentValue, setContentValue } = useContentTranslation();
  const [customer, setCustomer] = useState(null);
  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [replaceFile, setReplaceFile] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'kundspecifikt',
    file: null
  });

  const categories = [
    { value: 'kundspecifikt', label: 'Kundspecifikt' },
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
    if (isAdmin === false) {
      setLoading(false);
      return;
    }
    
    if (isAdmin === true && customerId && materialId) {
      loadCustomerAndMaterial();
    } else if (isAdmin === true && (!customerId || !materialId)) {
      toast.error('Kund-ID eller material-ID saknas');
      navigate('/admin/users');
    }
  }, [isAdmin, customerId, materialId]);

  const loadCustomerAndMaterial = async () => {
    try {
      setLoading(true);
      
      // Load customer info
      const customerRef = doc(db, 'users', customerId);
      const customerSnap = await getDoc(customerRef);
      
      if (!customerSnap.exists()) {
        toast.error('Kunden hittades inte');
        navigate('/admin/users');
        return;
      }
      
      setCustomer({ id: customerSnap.id, ...customerSnap.data() });
      
      // Load material data
      const materialData = await getCustomerMaterialById(customerId, materialId);
      
      if (!materialData) {
        toast.error('Kundspecifikt material hittades inte');
        navigate(`/admin/customers/${customerId}/marketing`);
        return;
      }
      
      setMaterial(materialData);
      setFormData({
        name: materialData.name || '',
        description: materialData.description || '',
        category: materialData.category || 'kundspecifikt',
        file: null
      });
      
    } catch (error) {
      console.error('Error loading customer and material:', error);
      toast.error('Kunde inte ladda data: ' + error.message);
      navigate('/admin/users');
    } finally {
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
        await deleteCustomerMaterial(customerId, materialId);
        await uploadCustomerMaterial(customerId, formData.file, {
          name: formData.name,
          description: formData.description,
          category: formData.category
        });
        toast.success('Kundspecifikt material ersatt framgångsrikt');
      } else {
        // Update metadata only
        await updateCustomerMaterial(customerId, materialId, {
          name: formData.name,
          description: formData.description,
          category: formData.category
        });
        toast.success('Kundspecifikt material uppdaterat');
      }

      navigate(`/admin/customers/${customerId}/marketing`);
    } catch (error) {
      console.error('Error updating customer material:', error);
      toast.error('Kunde inte uppdatera kundspecifikt material');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Är du säker på att du vill ta bort detta kundspecifika material? Detta kan inte ångras.')) {
      return;
    }

    try {
      setSaving(true);
      await deleteCustomerMaterial(customerId, materialId);
      toast.success('Kundspecifikt material borttaget');
      navigate(`/admin/customers/${customerId}/marketing`);
    } catch (error) {
      console.error('Error deleting customer material:', error);
      toast.error('Kunde inte ta bort kundspecifikt material');
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
            <p className="text-red-600 dark:text-red-400">Du har inte behörighet att se denna sida.</p>
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!material || !customer) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">Kundspecifikt material eller kund hittades inte</p>
            <Link
              to="/admin/users"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600"
            >
              Tillbaka till Kunder
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
                to={`/admin/customers/${customerId}/marketing`}
                className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mb-2"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Tillbaka till Kundmaterial
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Redigera Kundspecifikt Material</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Material för {customer.companyName || customer.email}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Current Material Preview */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Nuvarande Material</h2>
            
            {/* File Preview */}
            <div className="mb-6">
              <div className="flex items-center justify-center h-48 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600">
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
                  className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400"
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
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Namn:</span>
                <p className="text-sm text-gray-900 dark:text-gray-100">{getContentValue(material.name)}</p>
              </div>
              {material.description && (
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Beskrivning:</span>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{getContentValue(material.description)}</p>
                </div>
              )}
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Kategori:</span>
                <p className="text-sm text-gray-900 dark:text-gray-100">{getCategoryLabel(material.category)}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filnamn:</span>
                <p className="text-sm text-gray-900 dark:text-gray-100">{material.fileName}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Storlek:</span>
                <p className="text-sm text-gray-900 dark:text-gray-100">{material.fileSize ? formatFileSize(material.fileSize) : 'Okänd'}</p>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Redigera Information</h2>
            
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder={currentLanguage === 'sv-SE' ? "Materialnamn" : "Material name"}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Kategori
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder={currentLanguage === 'sv-SE' ? "Beskrivning av materialet" : "Description of the material"}
                />
              </div>

              {/* Replace File Section */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    id="replaceFile"
                    checked={replaceFile}
                    onChange={(e) => setReplaceFile(e.target.checked)}
                    className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-500 rounded bg-white dark:bg-gray-600"
                  />
                  <label htmlFor="replaceFile" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Ersätt fil
                  </label>
                </div>
                
                {replaceFile && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Ny fil *
                    </label>
                    <input
                      type="file"
                      required={replaceFile}
                      onChange={handleFileChange}
                      accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.mp4,.mov,.avi,.webm,.mkv,.pdf,.doc,.docx,.txt,.rtf,.zip,.rar"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                    />
                    {formData.file && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Vald fil: {formData.file.name} ({formatFileSize(formData.file.size)})
                      </p>
                    )}
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                      ⚠️ Varning: Detta kommer att ta bort den gamla filen permanent
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
                >
                  {saving ? 'Sparar...' : (replaceFile ? 'Ersätt Material' : 'Uppdatera')}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/admin/customers/${customerId}/marketing`)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50"
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

export default AdminCustomerMarketingMaterialEdit;