import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import AppLayout from '../../components/layout/AppLayout';
import {
  getCustomerMaterials,
  uploadCustomerMaterial,
  deleteCustomerMaterial,
  getFileIcon,
  downloadFile
} from '../../utils/marketingMaterials';
import {
  getAdminDocuments,
  uploadAdminDocument,
  deleteAdminDocument,
  downloadFile as downloadAdminFile,
  formatFileSize as formatAdminFileSize
} from '../../utils/adminDocuments';
import {
  PaperAirplaneIcon,
  CheckCircleIcon,
  ClockIcon,
  KeyIcon
} from '@heroicons/react/24/outline';

const AdminUserEdit = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { getAllUsers, updateAnyUserProfile, updateUserMarginal, updateUserRole, toggleUserActive, isAdmin, currentUser, sendCustomerWelcomeEmail } = useAuth();
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Customer activation state
  const [sendingActivation, setSendingActivation] = useState(false);
  const [activationResult, setActivationResult] = useState(null);
  
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
    marginal: 40,
    role: 'user',
    active: true,
    notes: ''
  });
  const [errors, setErrors] = useState({});

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
          notes: foundUser.notes || ''
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
      });
      
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
      }, currentUser?.uid);
      
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Vänligen korrigera felen i formuläret');
      return;
    }

    try {
      setSaving(true);
      
      // Prepare data for update (exclude fields that shouldn't be updated via profile)
      const profileData = {
        companyName: formData.companyName,
        contactPerson: formData.contactPerson,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        postalCode: formData.postalCode,
        country: formData.country,
        orgNumber: formData.orgNumber,
        // Delivery address fields
        deliveryAddress: formData.sameAsCompanyAddress ? formData.address : formData.deliveryAddress,
        deliveryCity: formData.sameAsCompanyAddress ? formData.city : formData.deliveryCity,
        deliveryPostalCode: formData.sameAsCompanyAddress ? formData.postalCode : formData.deliveryPostalCode,
        deliveryCountry: formData.sameAsCompanyAddress ? formData.country : formData.deliveryCountry,
        sameAsCompanyAddress: formData.sameAsCompanyAddress,
        notes: formData.notes
      };

      // Update profile data
      await updateAnyUserProfile(userId, profileData);
      
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
      }
      
      toast.success('Kundprofil uppdaterad framgångsrikt');
      navigate('/admin/users');
      
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Kunde inte uppdatera kundprofil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-blue-600">Laddar kunddata...</span>
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900">Kund hittades inte</h2>
          <Link to="/admin/users" className="text-blue-600 hover:text-blue-700 mt-4 inline-block">
            Tillbaka till kundlista
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Redigera Kund
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {user.companyName || user.email}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {/* Customer Activation Button/Status */}
              {user.credentialsSent ? (
                <div className="flex items-center px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                  <div>
                    <div className="text-sm font-medium text-green-800">
                      Inloggningsuppgifter skickade
                    </div>
                    <div className="text-xs text-green-600">
                      {user.credentialsSentAt && new Date(user.credentialsSentAt.seconds * 1000).toLocaleDateString('sv-SE')}
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleSendActivation}
                  disabled={sendingActivation}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sendingActivation ? (
                    <>
                      <ClockIcon className="h-4 w-4 mr-2 animate-spin" />
                      Skickar...
                    </>
                  ) : (
                    <>
                      <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                      Skicka inloggningsuppgifter
                    </>
                  )}
                </button>
              )}
              
              <Link
                to="/admin/users"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Tillbaka till Kundlista
              </Link>
            </div>
          </div>
          
          {/* Activation Result Display */}
          {activationResult && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <KeyIcon className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800 mb-2">
                    Inloggningsuppgifter skickade framgångsrikt!
                  </h4>
                  <div className="text-sm text-blue-700">
                    <p><strong>E-post:</strong> {user.email}</p>
                    <p><strong>Tillfälligt lösenord:</strong> <code className="bg-blue-100 px-2 py-1 rounded font-mono">{activationResult.temporaryPassword}</code></p>
                    <p className="text-xs mt-2 text-blue-600">
                      Kunden kommer att få instruktioner om att ändra lösenordet vid första inloggningen.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Company Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Företagsinformation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                  Företagsnamn *
                </label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    errors.companyName ? 'border-red-300' : ''
                  }`}
                  placeholder="Företagets namn"
                />
                {errors.companyName && <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>}
              </div>
              
              <div>
                <label htmlFor="orgNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Organisationsnummer
                </label>
                <input
                  type="text"
                  id="orgNumber"
                  name="orgNumber"
                  value={formData.orgNumber}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="556123-4567"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Kontaktinformation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700 mb-1">
                  Kontaktperson *
                </label>
                <input
                  type="text"
                  id="contactPerson"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleInputChange}
                  className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    errors.contactPerson ? 'border-red-300' : ''
                  }`}
                  placeholder="Förnamn Efternamn"
                />
                {errors.contactPerson && <p className="mt-1 text-sm text-red-600">{errors.contactPerson}</p>}
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  E-post *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    errors.email ? 'border-red-300' : ''
                  }`}
                  placeholder="exempel@företag.se"
                  disabled // Email should not be editable
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="08-123 456 78"
                />
              </div>
            </div>
          </div>

          {/* Company Address Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Företagsadress</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Gatuadress
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Gatuadress 123"
                />
              </div>
              
              <div>
                <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Postnummer
                </label>
                <input
                  type="text"
                  id="postalCode"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="123 45"
                />
              </div>
              
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                  Stad
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Stockholm"
                />
              </div>
              
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                  Land
                </label>
                <select
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="Sverige">Sverige</option>
                  <option value="Norge">Norge</option>
                  <option value="Danmark">Danmark</option>
                  <option value="Finland">Finland</option>
                </select>
              </div>
            </div>
          </div>

          {/* Delivery Address Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Leveransadress</h3>
            
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="sameAsCompanyAddress"
                  checked={formData.sameAsCompanyAddress}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Samma som företagsadress
                </span>
              </label>
            </div>
            
            {!formData.sameAsCompanyAddress && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="deliveryAddress" className="block text-sm font-medium text-gray-700 mb-1">
                    Leveransadress
                  </label>
                  <input
                    type="text"
                    id="deliveryAddress"
                    name="deliveryAddress"
                    value={formData.deliveryAddress}
                    onChange={handleInputChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Leveransadress 123"
                  />
                </div>
                
                <div>
                  <label htmlFor="deliveryPostalCode" className="block text-sm font-medium text-gray-700 mb-1">
                    Postnummer
                  </label>
                  <input
                    type="text"
                    id="deliveryPostalCode"
                    name="deliveryPostalCode"
                    value={formData.deliveryPostalCode}
                    onChange={handleInputChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="123 45"
                  />
                </div>
                
                <div>
                  <label htmlFor="deliveryCity" className="block text-sm font-medium text-gray-700 mb-1">
                    Stad
                  </label>
                  <input
                    type="text"
                    id="deliveryCity"
                    name="deliveryCity"
                    value={formData.deliveryCity}
                    onChange={handleInputChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Stockholm"
                  />
                </div>
                
                <div>
                  <label htmlFor="deliveryCountry" className="block text-sm font-medium text-gray-700 mb-1">
                    Land
                  </label>
                  <select
                    id="deliveryCountry"
                    name="deliveryCountry"
                    value={formData.deliveryCountry}
                    onChange={handleInputChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="Sverige">Sverige</option>
                    <option value="Norge">Norge</option>
                    <option value="Danmark">Danmark</option>
                    <option value="Finland">Finland</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Admin Only Section */}
          {isAdmin && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded mr-2">
                  ADMIN
                </span>
                Administratörsinställningar
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="marginal" className="block text-sm font-medium text-gray-700 mb-1">
                    Marginal %
                  </label>
                  <input
                    type="number"
                    id="marginal"
                    name="marginal"
                    min="0"
                    max="100"
                    step="0.5"
                    value={formData.marginal}
                    onChange={handleInputChange}
                    className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                      errors.marginal ? 'border-red-300' : ''
                    }`}
                  />
                  {errors.marginal && <p className="mt-1 text-sm text-red-600">{errors.marginal}</p>}
                </div>
                
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                    Roll
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="user">Kund</option>
                    <option value="admin">Administratör</option>
                  </select>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="active"
                    name="active"
                    checked={formData.active}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="active" className="ml-2 block text-sm text-gray-700">
                    Aktiv kund
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Anteckningar
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              value={formData.notes}
              onChange={handleInputChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Interna anteckningar om kunden..."
            />
          </div>



          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Link
              to="/admin/users"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Avbryt
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sparar...
                </>
              ) : (
                'Spara Ändringar'
              )}
            </button>
          </div>
        </form>

        {/* Customer Marketing Materials - Outside form to prevent interference */}
        {isAdmin && (
          <div className="max-w-4xl mx-auto mt-6 bg-white rounded-lg shadow-md">
            <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded mr-2">
                    MARKNADSFÖRING
                  </span>
                  Kundspecifikt Material ({customerMaterials.length})
                </h3>
                <button
                  onClick={() => {
                    setShowUploadForm(true);
                    setMaterialFormData({ name: '', description: '', category: 'kundspecifikt', file: null });
                  }}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                >
                  Ladda upp Material
                </button>
              </div>

              {/* Upload Form */}
              {showUploadForm && (
                <div className="mb-6 bg-white rounded-lg p-4 border border-purple-200">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Ladda upp Nytt Material</h4>
                  <form onSubmit={handleMaterialSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Namn *
                        </label>
                        <input
                          type="text"
                          required
                          value={materialFormData.name}
                          onChange={(e) => setMaterialFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Materialnamn"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Kategori
                        </label>
                        <select
                          value={materialFormData.category}
                          onChange={(e) => setMaterialFormData(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                        value={materialFormData.description}
                        onChange={(e) => setMaterialFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                        onChange={handleMaterialFileChange}
                        accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.mp4,.mov,.avi,.webm,.mkv,.pdf,.doc,.docx,.txt,.rtf,.zip,.rar"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      {materialFormData.file && (
                        <p className="mt-1 text-sm text-gray-600">
                          Vald fil: {materialFormData.file.name} ({formatFileSize(materialFormData.file.size)})
                        </p>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={uploading}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
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
              {materialsLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : customerMaterials.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <span className="text-4xl block mb-2">📂</span>
                  <p>Inget kundspecifikt material uppladdat ännu</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customerMaterials.map((material) => (
                    <div key={material.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <span className="text-xl mr-2">{getFileIcon(material.fileType)}</span>
                          <span className="text-xs px-2 py-1 bg-purple-100 text-purple-600 rounded-full">
                            {getCategoryLabel(material.category)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleMaterialDelete(material.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Ta bort"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      <h4 className="font-medium text-gray-900 mb-2 text-sm line-clamp-2">{material.name}</h4>
                      
                      {material.description && (
                        <p className="text-xs text-gray-600 mb-3 line-clamp-2">{material.description}</p>
                      )}

                      <div className="text-xs text-gray-500 mb-3">
                        <p className="truncate">{material.fileName}</p>
                        {material.fileSize && <p>{formatFileSize(material.fileSize)}</p>}
                      </div>

                      <button
                        onClick={() => handleMaterialDownload(material)}
                        className="w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        )}

        {/* Admin Documents - Admin Only, NOT visible to customers */}
        {isAdmin && (
          <div className="max-w-4xl mx-auto mt-6 bg-white rounded-lg shadow-md">
            <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded mr-2">
                    ADMIN ENDAST
                  </span>
                  Admin-dokument ({adminDocuments.length})
                </h3>
                <button
                  onClick={() => {
                    setShowAdminUploadForm(true);
                    setAdminDocFormData({ title: '', description: '', notes: '', category: 'dokument', file: null });
                  }}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
                >
                  Ladda upp Admin-dokument
                </button>
              </div>

              <div className="mb-4 p-3 bg-orange-100 border border-orange-200 rounded-md">
                <p className="text-sm text-orange-800">
                  <strong>⚠️ Viktigt:</strong> Dessa dokument är ENDAST synliga för administratörer och kommer aldrig visas för kunden.
                </p>
              </div>

              {/* Admin Upload Form */}
              {showAdminUploadForm && (
                <div className="mb-6 bg-white rounded-lg p-4 border border-orange-200">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Ladda upp Nytt Admin-dokument</h4>
                  <form onSubmit={handleAdminDocSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Titel *
                        </label>
                        <input
                          type="text"
                          required
                          value={adminDocFormData.title}
                          onChange={(e) => setAdminDocFormData(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="Dokumenttitel"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Kategori
                        </label>
                        <select
                          value={adminDocFormData.category}
                          onChange={(e) => setAdminDocFormData(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Beskrivning
                      </label>
                      <textarea
                        value={adminDocFormData.description}
                        onChange={(e) => setAdminDocFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Beskrivning av dokumentet"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Interna anteckningar
                      </label>
                      <textarea
                        value={adminDocFormData.notes}
                        onChange={(e) => setAdminDocFormData(prev => ({ ...prev, notes: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Interna anteckningar (endast synliga för admins)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fil * (PDF, Word, bilder, etc.)
                      </label>
                      <input
                        type="file"
                        required
                        onChange={handleAdminDocFileChange}
                        accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.mp4,.mov,.avi,.webm,.mkv,.pdf,.doc,.docx,.txt,.rtf,.zip,.rar"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      {adminDocFormData.file && (
                        <p className="mt-1 text-sm text-gray-600">
                          Vald fil: {adminDocFormData.file.name} ({formatAdminFileSize(adminDocFormData.file.size)})
                        </p>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={adminUploading}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
                      >
                        {adminUploading ? 'Laddar upp...' : 'Ladda upp'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAdminUploadForm(false)}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Avbryt
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Admin Documents List */}
              {adminDocsLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
              ) : adminDocuments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <span className="text-4xl block mb-2">🔒</span>
                  <p>Inga admin-dokument uppladdade ännu</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {adminDocuments.map((document) => (
                    <div key={document.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <span className="text-xl mr-2">🔒</span>
                          <span className="text-xs px-2 py-1 bg-orange-100 text-orange-600 rounded-full">
                            {document.category}
                          </span>
                        </div>
                        <button
                          onClick={() => handleAdminDocDelete(document.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Ta bort"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      <h4 className="font-medium text-gray-900 mb-2 text-sm line-clamp-2">{document.title}</h4>
                      
                      {document.description && (
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{document.description}</p>
                      )}

                      {document.notes && (
                        <p className="text-xs text-orange-600 mb-3 line-clamp-1 font-medium">
                          Anteckning: {document.notes}
                        </p>
                      )}

                      <div className="text-xs text-gray-500 mb-3">
                        <p className="truncate">{document.fileName}</p>
                        {document.fileSize && <p>{formatAdminFileSize(document.fileSize)}</p>}
                        {document.uploadedAt && (
                          <p>Uppladdat: {new Date(document.uploadedAt.seconds * 1000).toLocaleDateString('sv-SE')}</p>
                        )}
                      </div>

                      <button
                        onClick={() => handleAdminDocDownload(document)}
                        className="w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        )}
      </div>
    </AppLayout>
  );
};

export default AdminUserEdit; 