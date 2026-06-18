import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useShopId } from '../../contexts/ShopContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '../../firebase/config';
import toast from 'react-hot-toast';
import AppLayout from '../../components/layout/AppLayout';
import { Page, CardSection, RightRail, Button } from '../../components/admin/ui';
import {
  DocumentArrowUpIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const AdminUserCreate = () => {
  const navigate = useNavigate();
  const shopId = useShopId();
  const { createUserProfile, isAdmin, currentUser } = useAuth();
  
  const [saving, setSaving] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  
  // Customer form data
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'Sverige',
    orgNumber: '',
    // Delivery address fields
    deliveryAddress: '',
    deliveryCity: '',
    deliveryPostalCode: '',
    deliveryCountry: 'Sverige',
    sameAsCompanyAddress: true,
    marginal: 35, // Default 35% margin
    role: 'user',
    active: true,
    notes: '',
    preferredLang: 'sv-SE'
  });

  // Admin documents state
  const [adminDocuments, setAdminDocuments] = useState([]);
  const [pendingDocuments, setPendingDocuments] = useState([]); // Files to upload after user creation

  const [errors, setErrors] = useState({});

  // Validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.companyName.trim()) newErrors.companyName = 'Företagsnamn krävs';
    if (!formData.contactPerson.trim()) newErrors.contactPerson = 'Kontaktperson krävs';
    if (!formData.email.trim()) {
      newErrors.email = 'E-post krävs';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Ogiltig e-postadress';
    }
    if (!formData.phone.trim()) newErrors.phone = 'Telefon krävs';
    if (!formData.address.trim()) newErrors.address = 'Adress krävs';
    if (!formData.city.trim()) newErrors.city = 'Stad krävs';
    if (!formData.postalCode.trim()) newErrors.postalCode = 'Postnummer krävs';
    if (!formData.orgNumber.trim()) newErrors.orgNumber = 'Organisationsnummer krävs';

    // Delivery address validation if different from company address
    if (!formData.sameAsCompanyAddress) {
      if (!formData.deliveryAddress.trim()) newErrors.deliveryAddress = 'Leveransadress krävs';
      if (!formData.deliveryCity.trim()) newErrors.deliveryCity = 'Leveransstad krävs';
      if (!formData.deliveryPostalCode.trim()) newErrors.deliveryPostalCode = 'Leveranspostnummer krävs';
    }

    if (formData.marginal < 0 || formData.marginal > 100) {
      newErrors.marginal = 'Marginal måste vara mellan 0-100%';
    }

    return newErrors;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle admin document upload
  const handleDocumentUpload = (e) => {
    const files = Array.from(e.target.files);
    const newDocs = files.map(file => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      category: 'dokument'
    }));
    setPendingDocuments(prev => [...prev, ...newDocs]);
  };

  const removeDocument = (docId) => {
    setPendingDocuments(prev => prev.filter(doc => doc.id !== docId));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Upload admin documents for the created user
  const uploadAdminDocuments = async (userId) => {
    if (pendingDocuments.length === 0) return;

    setUploadingDocs(true);
    try {
      const uploadPromises = pendingDocuments.map(async (doc) => {
        // Upload file to Firebase Storage (admin-only, shopId-partitioned —
        // Phase B tenant isolation; scoped by isAdminOfShop(shopId)).
        const storageRef = ref(storage, `admin-documents/${shopId}/customers/${userId}/${Date.now()}_${doc.file.name}`);
        const snapshot = await uploadBytes(storageRef, doc.file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        // Save metadata to admin-only collection
        const docData = {
          customerId: userId,
          fileName: doc.file.name,
          fileType: doc.file.type || 'application/octet-stream',
          fileSize: doc.file.size,
          category: doc.category,
          downloadUrl: downloadURL,
          storagePath: snapshot.ref.fullPath,
          uploadedBy: currentUser?.uid,
          uploadedAt: serverTimestamp(),
          isAdminOnly: true, // Flag to distinguish from customer materials
          notes: ''
        };

        await addDoc(collection(db, 'adminCustomerDocuments'), docData);
        return docData;
      });

      await Promise.all(uploadPromises);
      toast.success(`${pendingDocuments.length} dokument uppladdade`);
    } catch (error) {
      console.error('Error uploading admin documents:', error);
      toast.error('Kunde inte ladda upp alla dokument');
    } finally {
      setUploadingDocs(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      toast.error('Korrigera felen i formuläret');
      return;
    }

    try {
      setSaving(true);

      // Prepare user data
      const userData = {
        ...formData,
        // Auto-fill delivery address if same as company
        deliveryAddress: formData.sameAsCompanyAddress ? formData.address : formData.deliveryAddress,
        deliveryCity: formData.sameAsCompanyAddress ? formData.city : formData.deliveryCity,
        deliveryPostalCode: formData.sameAsCompanyAddress ? formData.postalCode : formData.deliveryPostalCode,
        deliveryCountry: formData.sameAsCompanyAddress ? formData.country : formData.deliveryCountry,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        preferredLang: formData.preferredLang,
        createdByAdmin: true,
        createdBy: currentUser?.uid
      };

      // Create user profile
      const newUser = await createUserProfile(userData, formData.email);
      
      if (newUser?.uid) {
        // Upload admin documents
        await uploadAdminDocuments(newUser.uid);
        
        toast.success(`Kund ${formData.companyName} skapad framgångsrikt`);
        navigate('/admin/users');
      } else {
        throw new Error('Kunde inte skapa användare');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Kunde inte skapa kund: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const labelCls = 'block text-[13px] font-medium text-admin-text mb-1';
  const inputCls =
    'w-full rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface px-3 py-1.5 text-[13px] text-admin-text placeholder:text-admin-text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-admin-primary)]';
  const inputErrCls =
    'w-full rounded-[var(--radius-admin-el)] border border-admin-critical-dot bg-admin-surface px-3 py-1.5 text-[13px] text-admin-text placeholder:text-admin-text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-admin-primary)]';
  const errorCls = 'mt-1 text-[12px] text-admin-critical-dot';
  const helpCls = 'mt-1 text-[12px] text-admin-text-muted';
  const checkboxCls = 'h-4 w-4 rounded-[4px] border-admin-border text-[var(--color-admin-primary)] focus:ring-[var(--color-admin-primary)]';

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="h-12 w-12 text-admin-critical-dot mx-auto mb-4" />
          <h2 className="text-base font-semibold text-admin-text">Åtkomst nekad</h2>
          <p className="text-[13px] text-admin-text-muted">Du har inte behörighet att komma åt denna sida.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Page
        title="Skapa ny kund"
        subtitle="Lägg till en ny kund direkt i systemet med admin-behörighet"
        back={{ to: '/admin/users', label: 'Kunder' }}
      >
        <form onSubmit={handleSubmit}>
          <RightRail
            main={
              <>
                {/* Company Information */}
                <CardSection title="Företagsinformation" bodyClassName="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelCls}>Företagsnamn *</label>
                      <input
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleInputChange}
                        className={errors.companyName ? inputErrCls : inputCls}
                        placeholder="ABC Företag AB"
                      />
                      {errors.companyName && <p className={errorCls}>{errors.companyName}</p>}
                    </div>

                    <div>
                      <label className={labelCls}>Kontaktperson *</label>
                      <input
                        type="text"
                        name="contactPerson"
                        value={formData.contactPerson}
                        onChange={handleInputChange}
                        className={errors.contactPerson ? inputErrCls : inputCls}
                        placeholder="Anna Andersson"
                      />
                      {errors.contactPerson && <p className={errorCls}>{errors.contactPerson}</p>}
                    </div>

                    <div>
                      <label className={labelCls}>E-post *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={errors.email ? inputErrCls : inputCls}
                        placeholder="anna@foretag.se"
                      />
                      {errors.email && <p className={errorCls}>{errors.email}</p>}
                    </div>

                    <div>
                      <label className={labelCls}>Telefon *</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={errors.phone ? inputErrCls : inputCls}
                        placeholder="08-123 456 78"
                      />
                      {errors.phone && <p className={errorCls}>{errors.phone}</p>}
                    </div>

                    <div>
                      <label htmlFor="preferredLang" className={labelCls}>Föredraget språk</label>
                      <select
                        id="preferredLang"
                        name="preferredLang"
                        value={formData.preferredLang}
                        onChange={handleInputChange}
                        className={inputCls}
                      >
                        <option value="sv-SE">Svenska</option>
                        <option value="en-GB">English (UK)</option>
                        <option value="en-US">English (US)</option>
                      </select>
                    </div>

                    <div>
                      <label className={labelCls}>Organisationsnummer *</label>
                      <input
                        type="text"
                        name="orgNumber"
                        value={formData.orgNumber}
                        onChange={handleInputChange}
                        className={errors.orgNumber ? inputErrCls : inputCls}
                        placeholder="556123-4567"
                      />
                      {errors.orgNumber && <p className={errorCls}>{errors.orgNumber}</p>}
                    </div>
                  </div>
                </CardSection>

                {/* Company Address */}
                <CardSection title="Företagsadress" bodyClassName="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="md:col-span-2">
                      <label className={labelCls}>Adress *</label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className={errors.address ? inputErrCls : inputCls}
                        placeholder="Storgatan 123"
                      />
                      {errors.address && <p className={errorCls}>{errors.address}</p>}
                    </div>

                    <div>
                      <label className={labelCls}>Postnummer *</label>
                      <input
                        type="text"
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handleInputChange}
                        className={errors.postalCode ? inputErrCls : inputCls}
                        placeholder="12345"
                      />
                      {errors.postalCode && <p className={errorCls}>{errors.postalCode}</p>}
                    </div>

                    <div>
                      <label className={labelCls}>Stad *</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className={errors.city ? inputErrCls : inputCls}
                        placeholder="Stockholm"
                      />
                      {errors.city && <p className={errorCls}>{errors.city}</p>}
                    </div>

                    <div>
                      <label className={labelCls}>Land</label>
                      <select
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        className={inputCls}
                      >
                        <option value="Sverige">Sverige</option>
                        <option value="Norge">Norge</option>
                        <option value="Danmark">Danmark</option>
                        <option value="Finland">Finland</option>
                      </select>
                    </div>
                  </div>
                </CardSection>

                {/* Delivery Address */}
                <CardSection title="Leveransadress" bodyClassName="space-y-4">
                  <label className="flex items-center gap-2 text-[13px] text-admin-text">
                    <input
                      type="checkbox"
                      name="sameAsCompanyAddress"
                      checked={formData.sameAsCompanyAddress}
                      onChange={handleInputChange}
                      className={checkboxCls}
                    />
                    Samma som företagsadress
                  </label>

                  {!formData.sameAsCompanyAddress && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="md:col-span-2">
                        <label className={labelCls}>Leveransadress *</label>
                        <input
                          type="text"
                          name="deliveryAddress"
                          value={formData.deliveryAddress}
                          onChange={handleInputChange}
                          className={errors.deliveryAddress ? inputErrCls : inputCls}
                          placeholder="Leveransgatan 456"
                        />
                        {errors.deliveryAddress && <p className={errorCls}>{errors.deliveryAddress}</p>}
                      </div>

                      <div>
                        <label className={labelCls}>Postnummer *</label>
                        <input
                          type="text"
                          name="deliveryPostalCode"
                          value={formData.deliveryPostalCode}
                          onChange={handleInputChange}
                          className={errors.deliveryPostalCode ? inputErrCls : inputCls}
                          placeholder="54321"
                        />
                        {errors.deliveryPostalCode && <p className={errorCls}>{errors.deliveryPostalCode}</p>}
                      </div>

                      <div>
                        <label className={labelCls}>Stad *</label>
                        <input
                          type="text"
                          name="deliveryCity"
                          value={formData.deliveryCity}
                          onChange={handleInputChange}
                          className={errors.deliveryCity ? inputErrCls : inputCls}
                          placeholder="Göteborg"
                        />
                        {errors.deliveryCity && <p className={errorCls}>{errors.deliveryCity}</p>}
                      </div>

                      <div>
                        <label className={labelCls}>Land</label>
                        <select
                          name="deliveryCountry"
                          value={formData.deliveryCountry}
                          onChange={handleInputChange}
                          className={inputCls}
                        >
                          <option value="Sverige">Sverige</option>
                          <option value="Norge">Norge</option>
                          <option value="Danmark">Danmark</option>
                          <option value="Finland">Finland</option>
                        </select>
                      </div>
                    </div>
                  )}
                </CardSection>

                {/* Admin Documents */}
                <CardSection
                  title="Admin-dokument"
                  actions={
                    <span className="inline-flex items-center rounded-[var(--radius-admin-el)] bg-admin-caution-bg px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-admin-caution-text">
                      Endast admin
                    </span>
                  }
                  bodyClassName="space-y-4"
                >
                  <p className="text-[12px] text-admin-text-muted">
                    Dessa dokument är endast synliga för administratörer och kommer inte visas för kunden.
                  </p>

                  <div>
                    <label className={labelCls}>Ladda upp admin-dokument (PDF, Word, bilder, etc.)</label>
                    <input
                      type="file"
                      multiple
                      onChange={handleDocumentUpload}
                      accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp,.svg"
                      className="block w-full text-[13px] text-admin-text-muted file:mr-4 file:rounded-[var(--radius-admin-el)] file:border-0 file:bg-admin-surface-2 file:px-4 file:py-2 file:text-[13px] file:font-medium file:text-admin-text"
                    />
                  </div>

                  {/* Pending Documents List */}
                  {pendingDocuments.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[13px] font-medium text-admin-text">
                        Dokument att ladda upp ({pendingDocuments.length}):
                      </h4>
                      {pendingDocuments.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface-2 p-3">
                          <div className="flex items-center gap-3">
                            <DocumentArrowUpIcon className="h-5 w-5 shrink-0 text-admin-text-faint" />
                            <div>
                              <p className="text-[13px] font-medium text-admin-text">{doc.name}</p>
                              <p className="text-[12px] text-admin-text-faint">{formatFileSize(doc.size)}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDocument(doc.id)}
                            className="text-admin-text-faint hover:text-admin-critical-dot"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardSection>

                {/* Save bar */}
                <div className="flex justify-end gap-2">
                  <Button as={Link} to="/admin/users" variant="secondary">Avbryt</Button>
                  <Button type="submit" variant="primary" disabled={saving || uploadingDocs}>
                    {saving
                      ? (uploadingDocs ? 'Laddar upp dokument…' : 'Skapar kund…')
                      : 'Skapa kund'}
                  </Button>
                </div>
              </>
            }
            rail={
              <>
                {/* Pricing / margin */}
                <CardSection title="Prissättning" bodyClassName="space-y-3">
                  <div>
                    <label className={labelCls}>Marginal % *</label>
                    <input
                      type="number"
                      name="marginal"
                      value={formData.marginal}
                      onChange={handleInputChange}
                      min="0"
                      max="100"
                      className={errors.marginal ? inputErrCls : inputCls}
                    />
                    {errors.marginal && <p className={errorCls}>{errors.marginal}</p>}
                  </div>
                </CardSection>

                {/* Account Settings */}
                <CardSection title="Kontoinställningar" bodyClassName="space-y-4">
                  <div>
                    <label className={labelCls}>Roll</label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className={inputCls}
                    >
                      <option value="user">Användare</option>
                      <option value="admin">Administratör</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-[13px] text-admin-text">
                    <input
                      type="checkbox"
                      name="active"
                      checked={formData.active}
                      onChange={handleInputChange}
                      className={checkboxCls}
                    />
                    Aktivera konto direkt
                  </label>

                  <div>
                    <label className={labelCls}>Anteckningar</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      className={inputCls}
                      placeholder="Interna anteckningar om kunden..."
                    />
                  </div>
                </CardSection>
              </>
            }
          />
        </form>
      </Page>
    </AppLayout>
  );
};

export default AdminUserCreate; 