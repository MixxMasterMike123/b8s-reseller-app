import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AppLayout from '../../components/layout/AppLayout';
import toast from 'react-hot-toast';
import {
  getGenericMaterials,
  uploadGenericMaterial,
  updateGenericMaterial,
  deleteGenericMaterial,
  populateFromProducts,
  getFileType,
  getFileIcon,
  downloadFile
} from '../../utils/marketingMaterials';

function AdminMarketingMaterials() {
  const { isAdmin } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [populating, setPopulating] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);

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
    { value: 'ean-koder', label: 'EAN-koder' },
    { value: 'broschyrer', label: 'Broschyrer' },
    { value: 'videos', label: 'Videos' },
    { value: 'prislista', label: 'Prislista' },
    { value: 'instruktioner', label: 'Instruktioner' }
  ];

  useEffect(() => {
    if (isAdmin) {
      loadMaterials();
    }
  }, [isAdmin]);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      const materialsData = await getGenericMaterials();
      setMaterials(materialsData);
    } catch (error) {
      console.error('Error loading materials:', error);
      toast.error('Kunde inte ladda marknadsföringsmaterial');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        file: file,
        name: prev.name || file.name.split('.')[0]
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.file && !editingMaterial) {
      toast.error('Välj en fil att ladda upp');
      return;
    }

    try {
      setUploading(true);
      
      if (editingMaterial) {
        // Update existing material (metadata only)
        await updateGenericMaterial(editingMaterial.id, {
          name: formData.name,
          description: formData.description,
          category: formData.category
        });
        toast.success('Material uppdaterat');
      } else {
        // Upload new material
        await uploadGenericMaterial(formData.file, {
          name: formData.name,
          description: formData.description,
          category: formData.category
        });
        toast.success('Material uppladdat');
      }

      // Reset form and reload
      setFormData({ name: '', description: '', category: 'allmänt', file: null });
      setShowUploadForm(false);
      setEditingMaterial(null);
      await loadMaterials();
    } catch (error) {
      console.error('Error uploading material:', error);
      toast.error('Kunde inte ladda upp material');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (material) => {
    setEditingMaterial(material);
    setFormData({
      name: material.name,
      description: material.description || '',
      category: material.category || 'allmänt',
      file: null
    });
    setShowUploadForm(true);
  };

  const handleDelete = async (materialId) => {
    if (!confirm('Är du säker på att du vill ta bort detta material?')) {
      return;
    }

    try {
      await deleteGenericMaterial(materialId);
      toast.success('Material borttaget');
      await loadMaterials();
    } catch (error) {
      console.error('Error deleting material:', error);
      toast.error('Kunde inte ta bort material');
    }
  };

  const handlePopulateFromProducts = async () => {
    if (!confirm('Detta kommer att lägga till alla produktbilder och EAN-koder som marknadsföringsmaterial. Fortsätt?')) {
      return;
    }

    try {
      setPopulating(true);
      const count = await populateFromProducts();
      toast.success(`${count} material tillagda från produkter`);
      await loadMaterials();
    } catch (error) {
      console.error('Error populating from products:', error);
      toast.error('Kunde inte importera från produkter');
    } finally {
      setPopulating(false);
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

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Marknadsföringsmaterial</h1>
              <p className="mt-1 text-sm text-gray-600">Hantera allmänt marknadsföringsmaterial</p>
            </div>
            <div className="flex gap-3">
              <Link 
                to="/admin" 
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Tillbaka till Admin
              </Link>
              <button
                onClick={handlePopulateFromProducts}
                disabled={populating}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                {populating ? 'Importerar...' : 'Importera från Produkter'}
              </button>
              <button
                onClick={() => {
                  setShowUploadForm(true);
                  setEditingMaterial(null);
                  setFormData({ name: '', description: '', category: 'allmänt', file: null });
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Ladda upp Material
              </button>
            </div>
          </div>
        </div>

        {/* Upload Form */}
        {showUploadForm && (
          <div className="mb-8 bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              {editingMaterial ? 'Redigera Material' : 'Ladda upp Nytt Material'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Namn *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Materialnamn"
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
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Beskrivning
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Beskrivning av materialet"
                />
              </div>

              {!editingMaterial && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fil * (Bilder, Videos, PDF, Word-dokument)
                  </label>
                  <input
                    type="file"
                    required
                    onChange={handleFileChange}
                    accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.mp4,.mov,.avi,.webm,.mkv,.pdf,.doc,.docx,.txt,.rtf,.zip,.rar"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formData.file && (
                    <p className="mt-1 text-sm text-gray-600">
                      Vald fil: {formData.file.name} ({formatFileSize(formData.file.size)})
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={uploading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? 'Sparar...' : (editingMaterial ? 'Uppdatera' : 'Ladda upp')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadForm(false);
                    setEditingMaterial(null);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Avbryt
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Materials List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Tillgängligt Material ({materials.length})
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : materials.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Inget material uppladdat ännu</p>
              <button
                onClick={() => setShowUploadForm(true)}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Ladda upp första materialet
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {materials.map((material) => (
                <div key={material.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">{getFileIcon(material.fileType)}</span>
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                        {getCategoryLabel(material.category)}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(material)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Redigera"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(material.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Ta bort"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">{material.name}</h3>
                  
                  {material.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-3">{material.description}</p>
                  )}

                  <div className="text-xs text-gray-500 mb-3">
                    <p>Fil: {material.fileName}</p>
                    {material.fileSize && <p>Storlek: {formatFileSize(material.fileSize)}</p>}
                  </div>

                  <button
                    onClick={() => handleDownload(material)}
                    className="w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Ladda ner
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default AdminMarketingMaterials; 