import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useShopId } from '../../contexts/ShopContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { useContentTranslation } from '../../hooks/useContentTranslation';
import AppLayout from '../../components/layout/AppLayout';
import ContentLanguageIndicator from '../../components/ContentLanguageIndicator';
import toast from 'react-hot-toast';
import {
  getGenericMaterials,
  uploadGenericMaterial,
  deleteGenericMaterial,
  populateFromProducts,
  getFileIcon,
  downloadFile
} from '../../utils/marketingMaterials';
import FileIcon from '../../components/FileIcon';
import {
  Page,
  DataTable,
  StatusPill,
  Button,
  Card,
  CardSection,
  Field,
  Input,
  Textarea,
  Select,
} from '../../components/admin/ui';
import { ArrowDownTrayIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';

function AdminMarketingMaterials() {
  const { isAdmin } = useAuth();
  const shopId = useShopId();
  const { t, currentLanguage } = useTranslation();
  const { getContentValue, setContentValue } = useContentTranslation();
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
      const materialsData = await getGenericMaterials(shopId);
      setMaterials(materialsData);
    } catch (error) {
      console.error('Error loading materials:', error);
      toast.error(t('admin.marketing.errors.load_failed'));
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
      toast.error(t('admin.marketing.errors.select_file'));
      return;
    }

    try {
      setUploading(true);

      // Upload new material
      await uploadGenericMaterial(formData.file, {
        name: formData.name,
        description: formData.description,
        category: formData.category
      }, shopId);
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
      const count = await populateFromProducts(shopId);
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
        <Page title="Marknadsföringsmaterial">
          <p className="text-[13px] text-admin-text">Du har inte behörighet att se denna sida.</p>
        </Page>
      </AppLayout>
    );
  }

  // ── Materials IndexTable columns (Shopify-style). Row click → edit page. ──
  const columns = [
    {
      key: 'material',
      header: 'Material & Kategori',
      render: (material) => (
        <div className="flex items-center gap-3">
          {/* File Preview/Icon */}
          <div className="shrink-0 grid h-10 w-10 place-items-center overflow-hidden rounded-[6px] border border-admin-border bg-admin-surface-2">
            {material.fileType === 'image' && material.downloadURL ? (
              <img
                src={material.downloadURL}
                alt={getContentValue(material.name)}
                className="h-full w-full object-cover"
                onError={(e) => {
                  // Fallback to icon if image fails to load
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="text-admin-text-faint"
              style={{ display: material.fileType === 'image' && material.downloadURL ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <FileIcon iconName={getFileIcon(material.fileType)} className="h-5 w-5" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="block truncate font-medium text-admin-text group-hover:underline">
                {getContentValue(material.name)}
              </span>
              <StatusPill tone="info">{getCategoryLabel(material.category)}</StatusPill>
            </div>
            {material.description && (
              <div className="line-clamp-1 text-[12px] text-admin-text-faint">
                {getContentValue(material.description)}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'file',
      header: 'Filinfo & Storlek',
      render: (material) => (
        <div className="min-w-0">
          <div className="truncate font-mono text-[12px] text-admin-text" title={material.fileName}>
            {material.fileName}
          </div>
          <div className="flex items-center gap-2 text-[12px] text-admin-text-faint">
            <span>{material.fileSize ? formatFileSize(material.fileSize) : 'Okänd storlek'}</span>
            <span className="uppercase">{material.fileType || 'Okänd'}</span>
          </div>
        </div>
      ),
    },
    {
      // Trailing actions: download · edit · delete. Stop row click so they don't
      // also open the edit page (row click already handles edit navigation).
      key: 'actions',
      header: '',
      align: 'right',
      className: 'w-28',
      render: (material) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDownload(material);
            }}
            title="Ladda ner"
            aria-label="Ladda ner"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-admin-el)] text-admin-text-faint hover:bg-admin-surface-2 hover:text-admin-text"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(material);
            }}
            title="Redigera"
            aria-label="Redigera"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-admin-el)] text-admin-text-faint hover:bg-admin-surface-2 hover:text-admin-text"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(material.id);
            }}
            title="Ta bort"
            aria-label="Ta bort"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-admin-el)] text-admin-text-faint hover:bg-admin-surface-2 hover:text-admin-critical-dot"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const headerActions = (
    <>
      <Button
        variant="secondary"
        onClick={handlePopulateFromProducts}
        disabled={populating}
      >
        {populating ? 'Importerar…' : 'Importera från Produkter'}
      </Button>
      <Button
        variant="primary"
        onClick={() => {
          setShowUploadForm(true);
          setFormData({ name: '', description: '', category: 'allmänt', file: null });
        }}
      >
        Ladda upp Material
      </Button>
    </>
  );

  return (
    <AppLayout>
      <Page
        title="Marknadsföringsmaterial"
        subtitle="Hantera allmänt marknadsföringsmaterial"
        back={{ to: '/admin', label: 'Tillbaka till Admin' }}
        actions={headerActions}
      >
        <div className="space-y-3">
          {/* Upload Form (only for new materials) */}
          {showUploadForm && (
            <Card>
              <CardSection title="Ladda upp Nytt Material" bare>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <ContentLanguageIndicator
                        contentField={formData.name}
                        label="Namn *"
                        currentValue={getContentValue(formData.name)}
                      />
                      <Input
                        type="text"
                        required
                        value={getContentValue(formData.name)}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: setContentValue(prev.name, e.target.value) }))}
                        placeholder={currentLanguage === 'sv-SE' ? "Materialnamn" : "Material name"}
                      />
                    </div>
                    <Field label="Kategori" htmlFor="material-category">
                      <Select
                        id="material-category"
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      >
                        {categories.map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </Select>
                    </Field>
                  </div>

                  <div>
                    <ContentLanguageIndicator
                      contentField={formData.description}
                      label="Beskrivning"
                      currentValue={getContentValue(formData.description)}
                    />
                    <Textarea
                      value={getContentValue(formData.description)}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: setContentValue(prev.description, e.target.value) }))}
                      rows={3}
                      placeholder={currentLanguage === 'sv-SE' ? "Beskrivning av materialet" : "Description of the material"}
                    />
                  </div>

                  <Field label="Fil * (Bilder, Videos, PDF, Word-dokument)" htmlFor="material-file">
                    <input
                      id="material-file"
                      type="file"
                      required
                      onChange={handleFileChange}
                      accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.mp4,.mov,.avi,.webm,.mkv,.pdf,.doc,.docx,.txt,.rtf,.zip,.rar"
                      className="w-full rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface px-3 py-1.5 text-[13px] text-admin-text file:mr-3 file:rounded-[var(--radius-admin-el)] file:border-0 file:bg-admin-surface-2 file:px-3 file:py-1 file:text-[13px] file:text-admin-text focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-admin-primary)]"
                    />
                    {formData.file && (
                      <p className="mt-1 text-[12px] text-admin-text-muted">
                        Vald fil: {formData.file.name} ({formatFileSize(formData.file.size)})
                      </p>
                    )}
                  </Field>

                  <div className="flex gap-2">
                    <Button type="submit" variant="primary" disabled={uploading}>
                      {uploading ? 'Laddar upp…' : 'Ladda upp'}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setShowUploadForm(false)}>
                      Avbryt
                    </Button>
                  </div>
                </form>
              </CardSection>
            </Card>
          )}

          {/* Materials List */}
          <DataTable
            columns={columns}
            rows={materials}
            rowKey={(m) => m.id}
            loading={loading}
            onRowClick={(m) => handleEdit(m)}
            empty={
              <div className="flex flex-col items-center gap-3 py-6">
                <p className="text-[13px] text-admin-text-muted">Inget material uppladdat ännu</p>
                <Button variant="primary" onClick={() => setShowUploadForm(true)}>
                  Ladda upp första materialet
                </Button>
              </div>
            }
            footer={
              <div className="px-3 py-2 text-[12px] text-admin-text-muted">
                {materials.length} material
              </div>
            }
          />
        </div>
      </Page>
    </AppLayout>
  );
}

export default AdminMarketingMaterials;
