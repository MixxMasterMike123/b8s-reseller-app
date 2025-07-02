import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AppLayout from '../../components/layout/AppLayout';
import toast from 'react-hot-toast';
import {
  getGenericMaterials,
  uploadGenericMaterial,
  deleteGenericMaterial,
  populateFromProducts,
  getFileType,
  getFileIcon,
  downloadFile
} from '../../utils/marketingMaterials';

function AdminMarketingMaterials() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [populating, setPopulating] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);

  // Form state (only for new uploads)
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
    
    if (!formData.file) {
      toast.error('Välj en fil att ladda upp');
      return;
    }

    try {
      setUploading(true);
      
      // Upload new material
      await uploadGenericMaterial(formData.file, {
        name: formData.name,
        description: formData.description,
        category: formData.category
      });
      toast.success('Material uppladdat');

      // Reset form and reload
      setFormData({ name: '', description: '', category: 'allmänt', file: null });
      setShowUploadForm(false);
      await loadMaterials();
    } catch (error) {
      console.error('Error uploading material:', error);
      toast.error('Kunde inte ladda upp material');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (material) => {
    // Navigate to dedicated edit page
    navigate(`/admin/marketing/${material.id}/edit`);
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
    if (!confirm('Detta kommer att lägga till alla produktbilder som marknadsföringsmaterial. Fortsätt?')) {
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
                  setFormData({ name: '', description: '', category: 'allmänt', file: null });
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Ladda upp Material
              </button>
            </div>
          </div>
        </div>

        {/* Upload Form (only for new materials) */}
        {showUploadForm && (
          <div className="mb-8 bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Ladda upp Nytt Material
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

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={uploading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? 'Laddar upp...' : 'Ladda upp'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadForm(false)}
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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Material & Kategori
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Filinfo & Storlek
                    </th>
                    <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Åtgärder
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {materials.map((material) => (
                    <tr key={material.id} className="hover:bg-gray-50">
                      {/* Column 1: Material & Category */}
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex items-start">
                          {/* File Preview/Icon */}
                          <div className="flex-shrink-0 h-16 w-16 mr-4">
                            <div className="flex items-center justify-center h-16 w-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden border border-gray-200">
                              {material.fileType === 'image' && material.downloadURL ? (
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
                              ) : null}
                              <span 
                                className="text-2xl"
                                style={{ display: material.fileType === 'image' && material.downloadURL ? 'none' : 'block' }}
                              >
                                {getFileIcon(material.fileType)}
                              </span>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900 mb-1">
                              {material.name}
                            </div>
                            <div className="mb-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {getCategoryLabel(material.category)}
                              </span>
                            </div>
                            {material.description && (
                              <div className="text-xs text-gray-500 line-clamp-2">
                                {material.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Column 2: File Info & Size */}
                      <td className="px-4 md:px-6 py-4">
                        <div className="text-sm">
                          <div className="font-mono text-xs text-gray-900 mb-1 truncate max-w-[200px]" title={material.fileName}>
                            {material.fileName}
                          </div>
                          <div className="text-xs text-gray-500 mb-1">
                            {material.fileSize ? formatFileSize(material.fileSize) : 'Okänd storlek'}
                          </div>
                          <div className="flex gap-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 uppercase">
                              {material.fileType || 'Okänd'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Column 3: Actions */}
                      <td className="px-4 md:px-6 py-4 text-right">
                        <div className="flex flex-col md:flex-row items-end md:items-center justify-end gap-2">
                          <button
                            onClick={() => handleDownload(material)}
                            className="min-h-[32px] px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors flex items-center gap-1"
                            title="Ladda ner"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Ladda ner
                          </button>
                          <button
                            onClick={() => handleEdit(material)}
                            className="min-h-[32px] px-3 py-1 text-xs font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center gap-1"
                            title="Redigera"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Redigera  
                          </button>
                          <button
                            onClick={() => handleDelete(material.id)}
                            className="min-h-[32px] px-3 py-1 text-xs font-medium text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors flex items-center gap-1"
                            title="Ta bort"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Ta bort
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default AdminMarketingMaterials; 