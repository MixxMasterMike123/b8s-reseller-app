import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useShopId } from '../../contexts/ShopContext';
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
import { Page, Card, CardSection, RightRail, Button } from '../../components/admin/ui';

function AdminMarketingMaterialEdit() {
  const { materialId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const shopId = useShopId();
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
        }, shopId);
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
        <Page title="Redigera material">
          <Card className="px-6 py-12 text-center">
            <p className="text-[13px] text-admin-critical-text">Du har inte behörighet att se denna sida.</p>
          </Card>
        </Page>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <Page title="Redigera material" back={{ to: '/admin/marketing', label: 'Marknadsföringsmaterial' }}>
          <Card className="px-6 py-12 text-center">
            <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-solid border-admin-text-muted border-r-transparent" />
            <p className="mt-3 text-[13px] text-admin-text-muted">Laddar material…</p>
          </Card>
        </Page>
      </AppLayout>
    );
  }

  if (!material) {
    return (
      <AppLayout>
        <Page title="Redigera material" back={{ to: '/admin/marketing', label: 'Marknadsföringsmaterial' }}>
          <Card className="px-6 py-12 text-center">
            <h2 className="text-base font-semibold text-admin-text">Material hittades inte</h2>
            <div className="mt-4">
              <Button as={Link} to="/admin/marketing" variant="secondary">
                Tillbaka till Marknadsföringsmaterial
              </Button>
            </div>
          </Card>
        </Page>
      </AppLayout>
    );
  }

  const labelCls = 'block text-[13px] font-medium text-admin-text mb-1';
  const inputCls =
    'w-full rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface px-3 py-1.5 text-[13px] text-admin-text placeholder:text-admin-text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-admin-primary)]';
  const checkboxCls = 'h-4 w-4 rounded-[4px] border-admin-border text-[var(--color-admin-primary)] focus:ring-[var(--color-admin-primary)]';

  return (
    <AppLayout>
      <Page
        title="Redigera material"
        subtitle="Uppdatera information och ersätt fil om nödvändigt"
        back={{ to: '/admin/marketing', label: 'Marknadsföringsmaterial' }}
      >
        <form onSubmit={handleSubmit}>
          <RightRail
            main={
              <CardSection title="Information" bodyClassName="space-y-4">
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
                    className={inputCls}
                    placeholder={currentLanguage === 'sv-SE' ? "Materialnamn" : "Material name"}
                  />
                </div>

                <div>
                  <label className={labelCls}>Kategori</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className={inputCls}
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
                    className={inputCls}
                    placeholder={currentLanguage === 'sv-SE' ? "Beskrivning av materialet" : "Description of the material"}
                  />
                </div>

                {/* Replace File Section */}
                <div className="pt-4 border-t border-admin-border-soft">
                  <label htmlFor="replaceFile" className="flex items-center gap-2 text-[13px] font-medium text-admin-text mb-3">
                    <input
                      type="checkbox"
                      id="replaceFile"
                      checked={replaceFile}
                      onChange={(e) => setReplaceFile(e.target.checked)}
                      className={checkboxCls}
                    />
                    Ersätt fil
                  </label>

                  {replaceFile && (
                    <div>
                      <label className={labelCls}>Ny fil *</label>
                      <input
                        type="file"
                        required={replaceFile}
                        onChange={handleFileChange}
                        accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.mp4,.mov,.avi,.webm,.mkv,.pdf,.doc,.docx,.txt,.rtf,.zip,.rar"
                        className="block w-full text-[13px] text-admin-text-muted file:mr-4 file:rounded-[var(--radius-admin-el)] file:border-0 file:bg-admin-surface-2 file:px-4 file:py-2 file:text-[13px] file:font-medium file:text-admin-text"
                      />
                      {formData.file && (
                        <p className="mt-1 text-[12px] text-admin-text-muted">
                          Vald fil: {formData.file.name} ({formatFileSize(formData.file.size)})
                        </p>
                      )}
                      <p className="mt-1 text-[12px] text-admin-warning-text">
                        ⚠️ Varning: Detta kommer att ta bort den gamla filen permanent
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Button type="submit" variant="primary" disabled={saving}>
                    {saving ? 'Sparar…' : (replaceFile ? 'Ersätt material' : 'Uppdatera')}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => navigate('/admin/marketing')}>
                    Avbryt
                  </Button>
                  <Button type="button" variant="destructive" onClick={handleDelete} disabled={saving} className="ml-auto">
                    Ta bort
                  </Button>
                </div>
              </CardSection>
            }
            rail={
              <CardSection title="Nuvarande material" bodyClassName="space-y-4">
                {/* File Preview */}
                <div className="flex items-center justify-center h-48 overflow-hidden rounded-[var(--radius-admin-el)] border border-dashed border-admin-border bg-admin-surface-2">
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
                    className="flex flex-col items-center justify-center text-admin-text-muted"
                    style={{ display: material.fileType === 'image' && material.downloadURL ? 'none' : 'flex' }}
                  >
                    <FileIcon iconName={getFileIcon(material.fileType)} className="w-16 h-16 mb-2" />
                    <span className="text-[13px] font-medium">{material.fileName}</span>
                  </div>
                </div>

                {/* Current Info */}
                <div className="space-y-3 text-[13px]">
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-wide text-admin-text-faint">Namn</div>
                    <p className="text-admin-text">{getContentValue(material.name)}</p>
                  </div>
                  {material.description && (
                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-wide text-admin-text-faint">Beskrivning</div>
                      <p className="text-admin-text">{getContentValue(material.description)}</p>
                    </div>
                  )}
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-wide text-admin-text-faint">Kategori</div>
                    <p className="text-admin-text">{getCategoryLabel(material.category)}</p>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-wide text-admin-text-faint">Filnamn</div>
                    <p className="text-admin-text">{material.fileName}</p>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-wide text-admin-text-faint">Storlek</div>
                    <p className="text-admin-text">{material.fileSize ? formatFileSize(material.fileSize) : 'Okänd'}</p>
                  </div>
                </div>
              </CardSection>
            }
          />
        </form>
      </Page>
    </AppLayout>
  );
}

export default AdminMarketingMaterialEdit; 