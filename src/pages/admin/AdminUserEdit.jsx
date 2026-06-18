import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useContentTranslation } from '../../hooks/useContentTranslation';
import { useShopId } from '../../contexts/ShopContext';
import { toast } from 'react-hot-toast';
import AppLayout from '../../components/layout/AppLayout';
import {
  getCustomerMaterials,
  uploadCustomerMaterial,
  deleteCustomerMaterial,
  getFileIcon,
  downloadFile
} from '../../utils/marketingMaterials';
import FileIcon from '../../components/FileIcon';
import {
  getAdminDocuments,
  uploadAdminDocument,
  deleteAdminDocument,
  downloadFile as downloadAdminFile,
  formatFileSize as formatAdminFileSize
} from '../../utils/adminDocuments';
import {
  PaperAirplaneIcon,
  ClockIcon,
  KeyIcon,
  ExclamationTriangleIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase/config';
import { Page, Card, CardSection, RightRail, Button, StatusPill } from '../../components/admin/ui';

const AdminUserEdit = () => {
  const { userId } = useParams();
  const shopId = useShopId();
  const navigate = useNavigate();
  const { getAllUsers, updateAnyUserProfile, updateUserMarginal, updateUserRole, toggleUserActive, isAdmin, currentUser, sendCustomerWelcomeEmail, deleteCustomerAccount } = useAuth();
  const { getContentValue } = useContentTranslation();
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Customer activation state
  const [sendingActivation, setSendingActivation] = useState(false);
  const [activationResult, setActivationResult] = useState(null);
  
  // Customer deletion state
  const [deletingCustomer, setDeletingCustomer] = useState(false);
  
  // Marketing materials state
  const [customerMaterials, setCustomerMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [materialFormData, setMaterialFormData] = useState({
    name: '',
    description: '',
    category: 'kundspecifikt',
    file: null
  });

  // Admin documents state
  const [adminDocuments, setAdminDocuments] = useState([]);
  const [adminDocsLoading, setAdminDocsLoading] = useState(false);
  const [showAdminUploadForm, setShowAdminUploadForm] = useState(false);
  const [adminUploading, setAdminUploading] = useState(false);
  const [adminDocFormData, setAdminDocFormData] = useState({
    title: '',
    description: '',
    notes: '',
    category: 'dokument',
    file: null
  });
  
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
    marginal: 35,
    role: 'user',
    active: true,
    notes: '',
    preferredLang: 'sv-SE'
  });
  const [errors, setErrors] = useState({});

  const [submitting, setSubmitting] = useState(false);
  const [emailEditEnabled, setEmailEditEnabled] = useState(false);

  const categories = [
    { value: 'kundspecifikt', label: 'Kundspecifikt' },
    { value: 'broschyrer', label: 'Broschyrer' },
    { value: 'videos', label: 'Videos' },
    { value: 'prislista', label: 'Prislista' },
    { value: 'instruktioner', label: 'Instruktioner' },
    { value: 'allmänt', label: 'Allmänt' }
  ];

  const loadCustomerMaterials = async () => {
    if (!userId) return;
    
    try {
      setMaterialsLoading(true);
      const materials = await getCustomerMaterials(userId);
      setCustomerMaterials(materials);
    } catch (error) {
      console.log('No customer materials found or error loading:', error);
      setCustomerMaterials([]);
    } finally {
      setMaterialsLoading(false);
    }
  };

  const loadAdminDocuments = async () => {
    if (!userId) return;
    
    try {
      setAdminDocsLoading(true);
      const documents = await getAdminDocuments(userId);
      setAdminDocuments(documents);
    } catch (error) {
      console.log('No admin documents found or error loading:', error);
      setAdminDocuments([]);
    } finally {
      setAdminDocsLoading(false);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const users = await getAllUsers();
        const foundUser = users.find(u => u.id === userId);
        
        if (!foundUser) {
          toast.error('Kund hittades inte');
          navigate('/admin/users');
          return;
        }
        
        setUser(foundUser);
        setFormData({
          companyName: foundUser.companyName || '',
          contactPerson: foundUser.contactPerson || '',
          email: foundUser.email || '',
          phone: foundUser.phone || '',
          address: foundUser.address || '',
          city: foundUser.city || '',
          postalCode: foundUser.postalCode || '',
          country: foundUser.country || 'Sverige',
          orgNumber: foundUser.orgNumber || '',
          // Delivery address fields
          deliveryAddress: foundUser.deliveryAddress || '',
          deliveryCity: foundUser.deliveryCity || '',
          deliveryPostalCode: foundUser.deliveryPostalCode || '',
          deliveryCountry: foundUser.deliveryCountry || 'Sverige',
          sameAsCompanyAddress: foundUser.sameAsCompanyAddress !== false,
          marginal: foundUser.marginal || 35,
          role: foundUser.role || 'user',
          active: foundUser.active !== undefined ? foundUser.active : true,
          notes: foundUser.notes || '',
          preferredLang: foundUser.preferredLang || 'sv-SE'
        });
        
        // Load customer materials and admin documents
        await loadCustomerMaterials();
        await loadAdminDocuments();
      } catch (error) {
        console.error('Error fetching user:', error);
        toast.error('Kunde inte hämta kunddata');
        navigate('/admin/users');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUser();
    }
  }, [userId, getAllUsers, navigate]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Marketing materials functions
  const handleMaterialFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMaterialFormData(prev => ({
        ...prev,
        file: file,
        name: prev.name || file.name.split('.')[0]
      }));
    }
  };

  const handleMaterialSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent bubbling to parent form
    
    if (!materialFormData.file) {
      toast.error('Välj en fil att ladda upp');
      return;
    }

    try {
      setUploading(true);
      await uploadCustomerMaterial(userId, materialFormData.file, {
        name: materialFormData.name,
        description: materialFormData.description,
        category: materialFormData.category
      }, shopId);
      
      toast.success('Material uppladdat');
      setMaterialFormData({ name: '', description: '', category: 'kundspecifikt', file: null });
      setShowUploadForm(false);
      await loadCustomerMaterials();
    } catch (error) {
      console.error('Error uploading material:', error);
      toast.error('Kunde inte ladda upp material');
    } finally {
      setUploading(false);
    }
  };

  const handleMaterialDelete = async (materialId) => {
    if (!confirm('Är du säker på att du vill ta bort detta material?')) {
      return;
    }

    try {
      await deleteCustomerMaterial(userId, materialId);
      toast.success('Material borttaget');
      await loadCustomerMaterials();
    } catch (error) {
      console.error('Error deleting material:', error);
      toast.error('Kunde inte ta bort material');
    }
  };

  const handleMaterialDownload = async (material) => {
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

  // Admin documents functions
  const handleAdminDocFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAdminDocFormData(prev => ({
        ...prev,
        file: file,
        title: prev.title || file.name.split('.')[0]
      }));
    }
  };

  const handleAdminDocSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!adminDocFormData.file) {
      toast.error('Välj en fil att ladda upp');
      return;
    }

    try {
      setAdminUploading(true);
      await uploadAdminDocument(userId, adminDocFormData.file, {
        title: adminDocFormData.title,
        description: adminDocFormData.description,
        notes: adminDocFormData.notes,
        category: adminDocFormData.category
      }, currentUser?.uid, shopId);
      
      toast.success('Admin-dokument uppladdat');
      setAdminDocFormData({ title: '', description: '', notes: '', category: 'dokument', file: null });
      setShowAdminUploadForm(false);
      await loadAdminDocuments();
    } catch (error) {
      console.error('Error uploading admin document:', error);
      toast.error('Kunde inte ladda upp admin-dokument');
    } finally {
      setAdminUploading(false);
    }
  };

  const handleAdminDocDelete = async (documentId) => {
    if (!confirm('Är du säker på att du vill ta bort detta admin-dokument?')) {
      return;
    }

    try {
      await deleteAdminDocument(documentId);
      toast.success('Admin-dokument borttaget');
      await loadAdminDocuments();
    } catch (error) {
      console.error('Error deleting admin document:', error);
      toast.error('Kunde inte ta bort admin-dokument');
    }
  };

  const handleAdminDocDownload = async (document) => {
    try {
      await downloadAdminFile(document.downloadUrl, document.fileName);
      toast.success('Nedladdning startad');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Kunde inte ladda ner filen');
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Företagsnamn är obligatoriskt';
    }
    
    if (!formData.contactPerson.trim()) {
      newErrors.contactPerson = 'Kontaktperson är obligatorisk';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'E-post är obligatorisk';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Ogiltig e-postadress';
    }
    
    if (isAdmin && (formData.marginal < 0 || formData.marginal > 100)) {
      newErrors.marginal = 'Marginal måste vara mellan 0 och 100%';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle customer activation
  const handleSendActivation = async () => {
    if (!userId || !user) return;
    
    try {
      setSendingActivation(true);
      const result = await sendCustomerWelcomeEmail(userId);
      
      setActivationResult(result);
      
      // Refresh user data to show updated activation status
      const users = await getAllUsers();
      const updatedUser = users.find(u => u.id === userId);
      if (updatedUser) {
        setUser(updatedUser);
      }
      
    } catch (error) {
      console.error('Error sending activation:', error);
    } finally {
      setSendingActivation(false);
    }
  };

  // Handle customer deletion
  const handleDeleteCustomer = async () => {
    if (!userId || !user) return;
    
    const confirmMessage = `Är du säker på att du vill ta bort kunden "${user.companyName || user.email}"?\n\nDetta kommer att:\n• Ta bort kundkontot från systemet\n• Ta bort Firebase Auth-kontot\n• Ta bort alla beställningar\n• Ta bort alla marknadsföringsmaterial\n• Ta bort alla admin-dokument\n\nDenna åtgärd kan INTE ångras!`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      setDeletingCustomer(true);
      const result = await deleteCustomerAccount(userId);
      
      console.log('Customer deletion result:', result);
      
      // Navigate back to customer list after successful deletion
      navigate('/admin/users');
      
    } catch (error) {
      console.error('Error deleting customer:', error);
    } finally {
      setDeletingCustomer(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Vänligen korrigera felen i formuläret');
      return;
    }

    setSaving(true);

    try {
      // Check if email has changed and editing is enabled
      const emailChanged = emailEditEnabled && formData.email !== user.email;

      // First update the user profile
      await updateAnyUserProfile(userId, {
        companyName: formData.companyName,
        contactPerson: formData.contactPerson,
        phone: formData.phone,
        orgNumber: formData.orgNumber,
        address: formData.address,
        city: formData.city,
        postalCode: formData.postalCode,
        country: formData.country,
        deliveryAddress: formData.sameAsCompanyAddress ? formData.address : formData.deliveryAddress,
        deliveryCity: formData.sameAsCompanyAddress ? formData.city : formData.deliveryCity,
        deliveryPostalCode: formData.sameAsCompanyAddress ? formData.postalCode : formData.deliveryPostalCode,
        deliveryCountry: formData.sameAsCompanyAddress ? formData.country : formData.deliveryCountry,
        sameAsCompanyAddress: formData.sameAsCompanyAddress,
        notes: formData.notes,
        preferredLang: formData.preferredLang
      });

      // Admin-only updates
      if (isAdmin) {
        // Update margin if changed
        if (formData.marginal !== user.marginal) {
          await updateUserMarginal(userId, formData.marginal);
        }
        
        // Update role if changed
        if (formData.role !== user.role) {
          await updateUserRole(userId, formData.role);
        }
        
        // Update active status if changed
        if (formData.active !== user.active) {
          await toggleUserActive(userId, formData.active);
        }

        // If email has changed, update it in Firebase Auth
        if (emailChanged) {
          try {
            // Call the cloud function to update email
            const updateEmail = httpsCallable(functions, 'updateCustomerEmailV2');
            await updateEmail({ userId, newEmail: formData.email });
            toast.success('E-post uppdaterad framgångsrikt');
          } catch (error) {
            console.error('Error updating email:', error);
            toast.error(`Kunde inte uppdatera e-post: ${error.message}`);
            throw error;
          }
        }
      }

      toast.success('Kundprofil uppdaterad framgångsrikt');
      navigate('/admin/users');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(`Kunde inte uppdatera profil: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <Page title="Redigera kund" back={{ to: '/admin/users', label: 'Kundlista' }}>
          <Card className="px-6 py-12 text-center">
            <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-solid border-admin-text-muted border-r-transparent" />
            <p className="mt-3 text-[13px] text-admin-text-muted">Laddar kunddata…</p>
          </Card>
        </Page>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout>
        <Page title="Redigera kund" back={{ to: '/admin/users', label: 'Kundlista' }}>
          <Card className="px-6 py-12 text-center">
            <h2 className="text-base font-semibold text-admin-text">Kund hittades inte</h2>
            <div className="mt-4">
              <Button as={Link} to="/admin/users" variant="secondary">Tillbaka till kundlista</Button>
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
  const errorCls = 'mt-1 text-[12px] text-admin-critical-text';
  const helpCls = 'mt-1 text-[12px] text-admin-text-muted';

  const headerActions = (
    <>
      {/* Customer Marketing Materials Link - only for customers */}
      {user.role !== 'admin' && (
        <Button
          as={Link}
          to={`/admin/customers/${user.id}/marketing`}
          variant="secondary"
          title="Hantera kundspecifikt marknadsföringsmaterial"
        >
          Marknadsföringsmaterial
        </Button>
      )}

      {/* Customer Activation Button/Status */}
      {user.credentialsSent ? (
        <StatusPill tone="success">
          Inloggningsuppgifter skickade
          {user.credentialsSentAt ? ` · ${new Date(user.credentialsSentAt.seconds * 1000).toLocaleDateString('sv-SE')}` : ''}
        </StatusPill>
      ) : (
        <Button onClick={handleSendActivation} disabled={sendingActivation} variant="primary">
          {sendingActivation ? (
            <>
              <ClockIcon className="h-4 w-4 animate-spin" />
              Skickar…
            </>
          ) : (
            <>
              <PaperAirplaneIcon className="h-4 w-4" />
              Skicka inloggningsuppgifter
            </>
          )}
        </Button>
      )}

      {/* Delete Customer Button */}
      <Button onClick={handleDeleteCustomer} disabled={deletingCustomer} variant="destructive">
        {deletingCustomer ? (
          <>
            <ClockIcon className="h-4 w-4 animate-spin" />
            Tar bort…
          </>
        ) : (
          <>
            <TrashIcon className="h-4 w-4" />
            Ta bort kund
          </>
        )}
      </Button>
    </>
  );

  return (
    <AppLayout>
      <Page
        title="Redigera kund"
        subtitle={user.companyName || user.email}
        back={{ to: '/admin/users', label: 'Kundlista' }}
        actions={headerActions}
      >
        {/* Activation Result Display */}
        {activationResult && (
          <Card className="mb-5 border-admin-info-dot/40 bg-admin-info-bg/40 px-4 py-4">
            <div className="flex items-start gap-2">
              <KeyIcon className="mt-0.5 h-5 w-5 shrink-0 text-admin-info-text" />
              <div>
                <h4 className="mb-2 text-[13px] font-semibold text-admin-text">
                  {activationResult.isExistingUser
                    ? 'Befintligt konto uppdaterat och inloggningsuppgifter skickade!'
                    : 'Nytt konto skapat och inloggningsuppgifter skickade!'}
                </h4>
                <div className="space-y-1 text-[13px] text-admin-text-muted">
                  <p><strong className="text-admin-text">E-post:</strong> {user.email}</p>
                  <p>
                    <strong className="text-admin-text">Tillfälligt lösenord:</strong>{' '}
                    <code className="rounded-sm bg-admin-surface-2 px-2 py-1 font-mono text-admin-text">{activationResult.temporaryPassword}</code>
                  </p>
                  {activationResult.isExistingUser && (
                    <p className="text-[12px]">
                      <strong className="text-admin-text">Obs:</strong> Ett befintligt Firebase Auth-konto uppdaterades med nytt lösenord.
                    </p>
                  )}
                  <p className="text-[12px]">
                    Kunden kommer att få instruktioner om att ändra lösenordet vid första inloggningen.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}

        <form onSubmit={handleSubmit}>
          <RightRail
            main={
              <>
                {/* Company Information */}
                <CardSection title="Företagsinformation" bodyClassName="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="companyName" className={labelCls}>Företagsnamn *</label>
                    <input
                      type="text"
                      id="companyName"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      className={`${inputCls}${errors.companyName ? ' border-admin-critical-dot' : ''}`}
                      placeholder="Företagets namn"
                    />
                    {errors.companyName && <p className={errorCls}>{errors.companyName}</p>}
                  </div>

                  <div>
                    <label htmlFor="orgNumber" className={labelCls}>Organisationsnummer</label>
                    <input
                      type="text"
                      id="orgNumber"
                      name="orgNumber"
                      value={formData.orgNumber}
                      onChange={handleInputChange}
                      className={inputCls}
                      placeholder="556123-4567"
                    />
                  </div>
                </CardSection>

                {/* Contact Information */}
                <CardSection title="Kontaktinformation" bodyClassName="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="contactPerson" className={labelCls}>Kontaktperson *</label>
                    <input
                      type="text"
                      id="contactPerson"
                      name="contactPerson"
                      value={formData.contactPerson}
                      onChange={handleInputChange}
                      className={`${inputCls}${errors.contactPerson ? ' border-admin-critical-dot' : ''}`}
                      placeholder="Förnamn Efternamn"
                    />
                    {errors.contactPerson && <p className={errorCls}>{errors.contactPerson}</p>}
                  </div>

                  <div>
                    <label htmlFor="email" className={labelCls}>E-post *</label>
                    <div className="relative">
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        disabled={!emailEditEnabled}
                        className={`${inputCls} pr-10${errors.email ? ' border-admin-critical-dot' : ''}${!emailEditEnabled ? ' cursor-not-allowed bg-admin-surface-2 text-admin-text-muted' : ' cursor-text'}`}
                        placeholder="exempel@företag.se"
                        required
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                        <button
                          type="button"
                          onClick={() => setEmailEditEnabled(!emailEditEnabled)}
                          className={`rounded-[var(--radius-admin-el)] border p-1.5 transition-colors ${
                            emailEditEnabled
                              ? 'border-admin-info-dot/40 bg-admin-info-bg text-admin-info-text'
                              : 'border-admin-border bg-admin-surface-2 text-admin-text-muted hover:text-admin-text'
                          }`}
                          title={emailEditEnabled ? 'Lås e-postfältet' : 'Lås upp e-postfältet för redigering'}
                        >
                          <KeyIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {emailEditEnabled && (
                      <div className="mt-2 rounded-[var(--radius-admin-el)] border border-admin-caution-dot/40 bg-admin-caution-bg px-2 py-2">
                        <p className="flex items-center gap-1 text-[12px] text-admin-caution-text">
                          <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
                          Ändring av e-post påverkar kundens inloggningsuppgifter
                        </p>
                      </div>
                    )}
                    {errors.email && <p className={errorCls}>{errors.email}</p>}
                  </div>

                  <div>
                    <label htmlFor="phone" className={labelCls}>Telefon</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={inputCls}
                      placeholder="08-123 456 78"
                    />
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
                </CardSection>

                {/* Company Address Information */}
                <CardSection title="Företagsadress" bodyClassName="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label htmlFor="address" className={labelCls}>Gatuadress</label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className={inputCls}
                      placeholder="Gatuadress 123"
                    />
                  </div>

                  <div>
                    <label htmlFor="postalCode" className={labelCls}>Postnummer</label>
                    <input
                      type="text"
                      id="postalCode"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      className={inputCls}
                      placeholder="123 45"
                    />
                  </div>

                  <div>
                    <label htmlFor="city" className={labelCls}>Stad</label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className={inputCls}
                      placeholder="Stockholm"
                    />
                  </div>

                  <div>
                    <label htmlFor="country" className={labelCls}>Land</label>
                    <select
                      id="country"
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
                </CardSection>

                {/* Delivery Address Information */}
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
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label htmlFor="deliveryAddress" className={labelCls}>Leveransadress</label>
                        <input
                          type="text"
                          id="deliveryAddress"
                          name="deliveryAddress"
                          value={formData.deliveryAddress}
                          onChange={handleInputChange}
                          className={inputCls}
                          placeholder="Leveransadress 123"
                        />
                      </div>

                      <div>
                        <label htmlFor="deliveryPostalCode" className={labelCls}>Postnummer</label>
                        <input
                          type="text"
                          id="deliveryPostalCode"
                          name="deliveryPostalCode"
                          value={formData.deliveryPostalCode}
                          onChange={handleInputChange}
                          className={inputCls}
                          placeholder="123 45"
                        />
                      </div>

                      <div>
                        <label htmlFor="deliveryCity" className={labelCls}>Stad</label>
                        <input
                          type="text"
                          id="deliveryCity"
                          name="deliveryCity"
                          value={formData.deliveryCity}
                          onChange={handleInputChange}
                          className={inputCls}
                          placeholder="Stockholm"
                        />
                      </div>

                      <div>
                        <label htmlFor="deliveryCountry" className={labelCls}>Land</label>
                        <select
                          id="deliveryCountry"
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

                {/* Notes */}
                <CardSection title="Anteckningar">
                  <textarea
                    id="notes"
                    name="notes"
                    rows={4}
                    value={formData.notes}
                    onChange={handleInputChange}
                    className={inputCls}
                    placeholder="Interna anteckningar om kunden..."
                  />
                </CardSection>

                {/* Save bar */}
                <div className="flex justify-end gap-2">
                  <Button as={Link} to="/admin/users" variant="secondary">Avbryt</Button>
                  <Button type="submit" variant="primary" disabled={saving}>
                    {saving ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
                        Sparar…
                      </>
                    ) : (
                      'Spara ändringar'
                    )}
                  </Button>
                </div>
              </>
            }
            rail={
              isAdmin && (
                <CardSection title="Administratörsinställningar" bodyClassName="space-y-4">
                  <div>
                    <label htmlFor="marginal" className={labelCls}>Marginal %</label>
                    <input
                      type="number"
                      id="marginal"
                      name="marginal"
                      min="0"
                      max="100"
                      step="0.5"
                      value={formData.marginal}
                      onChange={handleInputChange}
                      className={`${inputCls}${errors.marginal ? ' border-admin-critical-dot' : ''}`}
                    />
                    {errors.marginal && <p className={errorCls}>{errors.marginal}</p>}
                  </div>

                  <div>
                    <label htmlFor="role" className={labelCls}>Roll</label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className={inputCls}
                    >
                      <option value="user">Kund</option>
                      <option value="admin">Administratör</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-[13px] text-admin-text">
                    <input
                      type="checkbox"
                      id="active"
                      name="active"
                      checked={formData.active}
                      onChange={handleInputChange}
                      className={checkboxCls}
                    />
                    Aktiv kund
                  </label>
                </CardSection>
              )
            }
          />
        </form>

        {/* Customer Marketing Materials - Outside form to prevent interference */}
        {isAdmin && (
          <CardSection
            className="mt-6"
            title={`Kundspecifikt material (${customerMaterials.length})`}
            actions={
              <Button
                onClick={() => {
                  setShowUploadForm(true);
                  setMaterialFormData({ name: '', description: '', category: 'kundspecifikt', file: null });
                }}
                variant="primary"
                size="sm"
              >
                Ladda upp material
              </Button>
            }
            bodyClassName="space-y-6"
          >
            {/* Upload Form */}
            {showUploadForm && (
              <div className="rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface-2 p-4">
                <h4 className="mb-3 text-[13px] font-semibold text-admin-text">Ladda upp nytt material</h4>
                <form onSubmit={handleMaterialSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelCls}>Namn *</label>
                      <input
                        type="text"
                        required
                        value={materialFormData.name}
                        onChange={(e) => setMaterialFormData(prev => ({ ...prev, name: e.target.value }))}
                        className={inputCls}
                        placeholder="Materialnamn"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Kategori</label>
                      <select
                        value={materialFormData.category}
                        onChange={(e) => setMaterialFormData(prev => ({ ...prev, category: e.target.value }))}
                        className={inputCls}
                      >
                        {categories.map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Beskrivning</label>
                    <textarea
                      value={materialFormData.description}
                      onChange={(e) => setMaterialFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className={inputCls}
                      placeholder="Beskrivning av materialet"
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Fil * (Bilder, Videos, PDF, Word-dokument)</label>
                    <input
                      type="file"
                      required
                      onChange={handleMaterialFileChange}
                      accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.mp4,.mov,.avi,.webm,.mkv,.pdf,.doc,.docx,.txt,.rtf,.zip,.rar"
                      className="block w-full text-[13px] text-admin-text-muted file:mr-4 file:rounded-[var(--radius-admin-el)] file:border-0 file:bg-admin-surface-2 file:px-4 file:py-2 file:text-[13px] file:font-medium file:text-admin-text"
                    />
                    {materialFormData.file && (
                      <p className={helpCls}>
                        Vald fil: {materialFormData.file.name} ({formatFileSize(materialFormData.file.size)})
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={uploading} variant="primary">
                      {uploading ? 'Laddar upp…' : 'Ladda upp'}
                    </Button>
                    <Button type="button" onClick={() => setShowUploadForm(false)} variant="secondary">
                      Avbryt
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Materials List */}
            {materialsLoading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-admin-text-muted border-r-transparent" />
              </div>
            ) : customerMaterials.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-admin-text-muted">
                <span className="mb-2 block text-4xl">📂</span>
                <p>Inget kundspecifikt material uppladdat ännu</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {customerMaterials.map((material) => (
                  <div key={material.id} className="rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileIcon iconName={getFileIcon(material.fileType)} className="h-5 w-5 text-admin-text-muted" />
                        <StatusPill tone="info" marker="none">{getCategoryLabel(material.category)}</StatusPill>
                      </div>
                      <button
                        onClick={() => handleMaterialDelete(material.id)}
                        className="p-1 text-admin-text-muted hover:text-admin-critical-text"
                        title="Ta bort"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>

                    <h4 className="mb-2 line-clamp-2 text-[13px] font-medium text-admin-text">{getContentValue(material.name)}</h4>

                    {material.description && (
                      <p className="mb-3 line-clamp-2 text-[12px] text-admin-text-muted">{getContentValue(material.description)}</p>
                    )}

                    <div className="mb-3 text-[12px] text-admin-text-faint">
                      <p className="truncate">{material.fileName}</p>
                      {material.fileSize && <p>{formatFileSize(material.fileSize)}</p>}
                    </div>

                    <Button onClick={() => handleMaterialDownload(material)} variant="secondary" size="sm" className="w-full">
                      Ladda ner
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardSection>
        )}

        {/* Admin Documents - Admin Only, NOT visible to customers */}
        {isAdmin && (
          <CardSection
            className="mt-6"
            title={`Admin-dokument (${adminDocuments.length})`}
            actions={
              <Button
                onClick={() => {
                  setShowAdminUploadForm(true);
                  setAdminDocFormData({ title: '', description: '', notes: '', category: 'dokument', file: null });
                }}
                variant="primary"
                size="sm"
              >
                Ladda upp admin-dokument
              </Button>
            }
            bodyClassName="space-y-6"
          >
            <div className="rounded-[var(--radius-admin-el)] border border-admin-caution-dot/40 bg-admin-caution-bg px-3 py-3">
              <p className="text-[13px] text-admin-caution-text">
                <strong>⚠️ Viktigt:</strong> Dessa dokument är ENDAST synliga för administratörer och kommer aldrig visas för kunden.
              </p>
            </div>

            {/* Admin Upload Form */}
            {showAdminUploadForm && (
              <div className="rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface-2 p-4">
                <h4 className="mb-3 text-[13px] font-semibold text-admin-text">Ladda upp nytt admin-dokument</h4>
                <form onSubmit={handleAdminDocSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelCls}>Titel *</label>
                      <input
                        type="text"
                        required
                        value={adminDocFormData.title}
                        onChange={(e) => setAdminDocFormData(prev => ({ ...prev, title: e.target.value }))}
                        className={inputCls}
                        placeholder="Dokumenttitel"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Kategori</label>
                      <select
                        value={adminDocFormData.category}
                        onChange={(e) => setAdminDocFormData(prev => ({ ...prev, category: e.target.value }))}
                        className={inputCls}
                      >
                        <option value="dokument">Dokument</option>
                        <option value="kontrakt">Kontrakt</option>
                        <option value="korrespondens">Korrespondens</option>
                        <option value="finansiellt">Finansiellt</option>
                        <option value="juridiskt">Juridiskt</option>
                        <option value="övrigt">Övrigt</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Beskrivning</label>
                    <textarea
                      value={adminDocFormData.description}
                      onChange={(e) => setAdminDocFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className={inputCls}
                      placeholder="Beskrivning av dokumentet"
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Interna anteckningar</label>
                    <textarea
                      value={adminDocFormData.notes}
                      onChange={(e) => setAdminDocFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={2}
                      className={inputCls}
                      placeholder="Interna anteckningar (endast synliga för admins)"
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Fil * (PDF, Word, bilder, etc.)</label>
                    <input
                      type="file"
                      required
                      onChange={handleAdminDocFileChange}
                      accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.mp4,.mov,.avi,.webm,.mkv,.pdf,.doc,.docx,.txt,.rtf,.zip,.rar"
                      className="block w-full text-[13px] text-admin-text-muted file:mr-4 file:rounded-[var(--radius-admin-el)] file:border-0 file:bg-admin-surface-2 file:px-4 file:py-2 file:text-[13px] file:font-medium file:text-admin-text"
                    />
                    {adminDocFormData.file && (
                      <p className={helpCls}>
                        Vald fil: {adminDocFormData.file.name} ({formatAdminFileSize(adminDocFormData.file.size)})
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={adminUploading} variant="primary">
                      {adminUploading ? 'Laddar upp…' : 'Ladda upp'}
                    </Button>
                    <Button type="button" onClick={() => setShowAdminUploadForm(false)} variant="secondary">
                      Avbryt
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Admin Documents List */}
            {adminDocsLoading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-admin-text-muted border-r-transparent" />
              </div>
            ) : adminDocuments.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-admin-text-muted">
                <span className="mb-2 block text-4xl">🔒</span>
                <p>Inga admin-dokument uppladdade ännu</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {adminDocuments.map((document) => (
                  <div key={document.id} className="rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🔒</span>
                        <StatusPill tone="warning" marker="none">{document.category}</StatusPill>
                      </div>
                      <button
                        onClick={() => handleAdminDocDelete(document.id)}
                        className="p-1 text-admin-text-muted hover:text-admin-critical-text"
                        title="Ta bort"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>

                    <h4 className="mb-2 line-clamp-2 text-[13px] font-medium text-admin-text">{document.title}</h4>

                    {document.description && (
                      <p className="mb-2 line-clamp-2 text-[12px] text-admin-text-muted">{document.description}</p>
                    )}

                    {document.notes && (
                      <p className="mb-3 line-clamp-1 text-[12px] font-medium text-admin-caution-text">
                        Anteckning: {document.notes}
                      </p>
                    )}

                    <div className="mb-3 text-[12px] text-admin-text-faint">
                      <p className="truncate">{document.fileName}</p>
                      {document.fileSize && <p>{formatAdminFileSize(document.fileSize)}</p>}
                      {document.uploadedAt && (
                        <p>Uppladdat: {new Date(document.uploadedAt.seconds * 1000).toLocaleDateString('sv-SE')}</p>
                      )}
                    </div>

                    <Button onClick={() => handleAdminDocDownload(document)} variant="secondary" size="sm" className="w-full">
                      Ladda ner
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardSection>
        )}
      </Page>
    </AppLayout>
  );
};

export default AdminUserEdit; 