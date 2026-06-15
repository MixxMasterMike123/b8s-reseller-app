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
import { Page, Card, CardSection, RightRail, Button } from '../../components/admin/ui';

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

  const labelCls = 'block text-[13px] font-medium text-admin-text mb-1';
  const inputCls =
    'w-full rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface px-3 py-1.5 text-[13px] text-admin-text placeholder:text-admin-text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-admin-primary)]';
  const checkboxCls = 'h-4 w-4 rounded-[4px] border-admin-border text-[var(--color-admin-primary)] focus:ring-[var(--color-admin-primary)]';
  const helpCls = 'mt-1 text-[12px] text-admin-text-muted';

  if (!isAdmin) {
    return (
      <AppLayout>
        <Page title="Redigera Kundspecifikt Material">
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
        <Page title="Redigera Kundspecifikt Material">
          <Card className="px-6 py-12 text-center">
            <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-solid border-admin-text-muted border-r-transparent" />
            <p className="mt-3 text-[13px] text-admin-text-muted">Laddar material…</p>
          </Card>
        </Page>
      </AppLayout>
    );
  }

  if (!material || !customer) {
    return (
      <AppLayout>
        <Page title="Redigera Kundspecifikt Material">
          <Card className="px-6 py-12 text-center">
            <p className="text-[13px] text-admin-text-muted">Kundspecifikt material eller kund hittades inte</p>
            <div className="mt-4">
              <Button as={Link} to="/admin/users" variant="secondary">Tillbaka till Kunder</Button>
            </div>
          </Card>
        </Page>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Page
        title="Redigera Kundspecifikt Material"
        subtitle={`Material för ${customer.companyName || customer.email}`}
        back={{ to: `/admin/customers/${customerId}/marketing`, label: 'Tillbaka till Kundmaterial' }}
      >
        <form onSubmit={handleSubmit}>
          <RightRail
            main={
              <>
                {/* Edit Form */}
                <CardSection title="Redigera Information" bodyClassName="space-y-4">
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
                </CardSection>

                {/* Replace File Section */}
                <CardSection title="Fil" bodyClassName="space-y-3">
                  <label className="flex items-center gap-2 text-[13px] text-admin-text">
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
                        <p className={helpCls}>
                          Vald fil: {formData.file.name} ({formatFileSize(formData.file.size)})
                        </p>
                      )}
                      <p className="mt-1 text-[12px] text-admin-caution-text">
                        ⚠️ Varning: Detta kommer att ta bort den gamla filen permanent
                      </p>
                    </div>
                  )}
                </CardSection>

                {/* Save bar */}
                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="destructive" onClick={handleDelete} disabled={saving}>
                    Ta bort
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => navigate(`/admin/customers/${customerId}/marketing`)}
                  >
                    Avbryt
                  </Button>
                  <Button type="submit" variant="primary" disabled={saving}>
                    {saving ? 'Sparar…' : (replaceFile ? 'Ersätt Material' : 'Uppdatera')}
                  </Button>
                </div>
              </>
            }
            rail={
              <>
                {/* Current Material Preview */}
                <CardSection title="Nuvarande Material" bodyClassName="space-y-4">
                  {/* File Preview */}
                  <div className="flex items-center justify-center h-48 rounded-[var(--radius-admin-el)] overflow-hidden border border-dashed border-admin-border bg-admin-surface-2">
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
                      <div className="text-admin-text">{getContentValue(material.name)}</div>
                    </div>
                    {material.description && (
                      <div>
                        <div className="text-[11px] font-medium uppercase tracking-wide text-admin-text-faint">Beskrivning</div>
                        <div className="text-admin-text">{getContentValue(material.description)}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-wide text-admin-text-faint">Kategori</div>
                      <div className="text-admin-text">{getCategoryLabel(material.category)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-wide text-admin-text-faint">Filnamn</div>
                      <div className="break-words text-admin-text">{material.fileName}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-wide text-admin-text-faint">Storlek</div>
                      <div className="text-admin-text">{material.fileSize ? formatFileSize(material.fileSize) : 'Okänd'}</div>
                    </div>
                  </div>
                </CardSection>
              </>
            }
          />
        </form>
      </Page>
    </AppLayout>
  );
}

export default AdminCustomerMarketingMaterialEdit;
