import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { useContentTranslation } from '../../hooks/useContentTranslation';
import AppLayout from '../../components/layout/AppLayout';
import ContentLanguageIndicator from '../../components/ContentLanguageIndicator';
import toast from 'react-hot-toast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import {
  getCustomerMaterials,
  uploadCustomerMaterial,
  deleteCustomerMaterial,
  getFileType,
  getFileIcon,
  downloadFile
} from '../../utils/marketingMaterials';
import FileIcon from '../../components/FileIcon';
import {
  Page,
  Card,
  CardSection,
  DataTable,
  StatusPill,
  Button,
  Field,
  Input,
  Textarea,
  Select,
} from '../../components/admin/ui';
import { ArrowDownTrayIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';

function AdminCustomerMarketingMaterials() {
  const { customerId } = useParams();
  const { isAdmin } = useAuth();
  const { t, currentLanguage } = useTranslation();
  const { getContentValue, setContentValue } = useContentTranslation();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);

  // Form state for new uploads
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
    if (isAdmin && customerId) {
      loadCustomerAndMaterials();
    }
  }, [isAdmin, customerId]);

  const loadCustomerAndMaterials = async () => {
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

      // Load customer materials
      const materialsData = await getCustomerMaterials(customerId);
      setMaterials(materialsData);

    } catch (error) {
      console.error('Error loading customer and materials:', error);
      toast.error('Kunde inte ladda kunddata');
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

      await uploadCustomerMaterial(customerId, formData.file, {
        name: formData.name,
        description: formData.description,
        category: formData.category
      });

      toast.success('Material uppladdat för kund');

      // Reset form and reload
      setFormData({ name: '', description: '', category: 'kundspecifikt', file: null });
      setShowUploadForm(false);
      await loadCustomerAndMaterials();
    } catch (error) {
      console.error('Error uploading customer material:', error);
      toast.error('Kunde inte ladda upp material');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (material) => {
    // Navigate to dedicated edit page for customer materials
    navigate(`/admin/customers/${customerId}/marketing/${material.id}/edit`);
  };

  const handleDelete = async (materialId) => {
    if (!confirm('Är du säker på att du vill ta bort detta kundspecifika material?')) {
      return;
    }

    try {
      await deleteCustomerMaterial(customerId, materialId);
      toast.success('Kundspecifikt material borttaget');
      await loadCustomerAndMaterials();
    } catch (error) {
      console.error('Error deleting customer material:', error);
      toast.error('Kunde inte ta bort material');
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
        <Page title="Kundspecifikt material">
          <p className="text-[13px] text-admin-text">Du har inte behörighet att se denna sida.</p>
        </Page>
      </AppLayout>
    );
  }

  // ── Shopify IndexTable columns. Mirrors AdminMarketingMaterials' list shape:
  //    Material (preview + name + category + description) · Filinfo · Åtgärder. ──
  const columns = [
    {
      key: 'material',
      header: 'Material',
      render: (material) => (
        <div className="flex items-start gap-3">
          {/* File preview / icon */}
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface-2">
            {material.fileType === 'image' && material.downloadURL ? (
              <img
                src={material.downloadURL}
                alt={getContentValue(material.name)}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="text-admin-text-faint"
              style={{
                display: material.fileType === 'image' && material.downloadURL ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileIcon iconName={getFileIcon(material.fileType)} className="h-6 w-6" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="truncate font-medium text-admin-text group-hover:underline">
                {getContentValue(material.name)}
              </span>
              <StatusPill tone="info">{getCategoryLabel(material.category)}</StatusPill>
            </div>
            {material.description && (
              <div className="line-clamp-2 text-[12px] text-admin-text-muted">
                {getContentValue(material.description)}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'file',
      header: 'Filinfo',
      render: (material) => (
        <div className="min-w-0">
          <div
            className="mb-0.5 truncate font-mono text-[12px] text-admin-text"
            style={{ maxWidth: 200 }}
            title={material.fileName}
          >
            {material.fileName}
          </div>
          <div className="mb-1 text-[12px] text-admin-text-muted">
            {material.fileSize ? formatFileSize(material.fileSize) : 'Okänd storlek'}
          </div>
          <StatusPill tone="neutral">{(material.fileType || 'Okänd').toUpperCase()}</StatusPill>
        </div>
      ),
    },
    {
      // Trailing actions: download · edit · delete. Stop row click so the inline
      // buttons don't trigger the row's edit navigation.
      key: 'actions',
      header: '',
      align: 'right',
      className: 'w-32',
      render: (material) => (
        <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => handleDownload(material)}
            title="Ladda ner"
            aria-label="Ladda ner"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-admin-el)] text-admin-text-faint hover:bg-admin-surface-2 hover:text-admin-text"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleEdit(material)}
            title="Redigera"
            aria-label="Redigera"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-admin-el)] text-admin-text-faint hover:bg-admin-surface-2 hover:text-admin-text"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(material.id)}
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

  return (
    <AppLayout>
      <Page
        title="Kundspecifikt marknadsföringsmaterial"
        subtitle={customer ? `Material för ${customer.companyName || customer.email}` : undefined}
        back={{ to: '/admin/users', label: 'Tillbaka till Kunder' }}
        actions={
          <Button
            variant="primary"
            onClick={() => {
              setShowUploadForm(true);
              setFormData({ name: '', description: '', category: 'kundspecifikt', file: null });
            }}
          >
            Ladda upp kundspecifikt material
          </Button>
        }
      >
        <div className="space-y-3">
          {/* Upload form */}
          {showUploadForm && (
            <Card>
              <CardSection title="Ladda upp nytt kundspecifikt material" bare>
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
                        placeholder={currentLanguage === 'sv-SE' ? 'Materialnamn' : 'Material name'}
                      />
                    </div>
                    <Field label="Kategori">
                      <Select
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
                      placeholder={currentLanguage === 'sv-SE' ? 'Beskrivning av materialet' : 'Description of the material'}
                    />
                  </div>

                  <Field label="Fil * (Bilder, Videos, PDF, Word-dokument)">
                    <Input
                      type="file"
                      required
                      onChange={handleFileChange}
                      accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.mp4,.mov,.avi,.webm,.mkv,.pdf,.doc,.docx,.txt,.rtf,.zip,.rar"
                    />
                    {formData.file && (
                      <p className="mt-1 text-[12px] text-admin-text-muted">
                        Vald fil: {formData.file.name} ({formatFileSize(formData.file.size)})
                      </p>
                    )}
                  </Field>

                  <div className="flex gap-2">
                    <Button type="submit" variant="primary" disabled={uploading}>
                      {uploading ? 'Laddar upp...' : 'Ladda upp'}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setShowUploadForm(false)}>
                      Avbryt
                    </Button>
                  </div>
                </form>
              </CardSection>
            </Card>
          )}

          {/* Materials list */}
          <DataTable
            columns={columns}
            rows={materials}
            rowKey={(m) => m.id}
            loading={loading}
            onRowClick={(m) => handleEdit(m)}
            empty="Inget kundspecifikt material uppladdat ännu."
          />
        </div>
      </Page>
    </AppLayout>
  );
}

export default AdminCustomerMarketingMaterials;
