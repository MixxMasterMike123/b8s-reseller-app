import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '../../firebase/config';
import toast from 'react-hot-toast';
import AppLayout from '../../components/layout/AppLayout';
import { 
  UserPlusIcon, 
  DocumentArrowUpIcon, 
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const AdminUserCreate = () => {
  const navigate = useNavigate();
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
    marginal: 40, // Default 40% margin
    role: 'user',
    active: true,
    notes: ''
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
        // Upload file to Firebase Storage (admin-only location)
        const storageRef = ref(storage, `admin-documents/customers/${userId}/${Date.now()}_${doc.file.name}`);
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

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Åtkomst nekad</h2>
          <p className="text-gray-600">Du har inte behörighet att komma åt denna sida.</p>
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
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <UserPlusIcon className="h-8 w-8 text-blue-600 mr-3" />
                Skapa Ny Kund
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Lägg till en ny kund direkt i systemet med admin-behörighet
              </p>
            </div>
            <Link
              to="/admin/users"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Tillbaka till Kunder
            </Link>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Company Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Företagsinformation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Företagsnamn *
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.companyName ? 'border-red-300' : 'border-gray-300'}`}
                  placeholder="ABC Företag AB"
                />
                {errors.companyName && <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kontaktperson *
                </label>
                <input
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.contactPerson ? 'border-red-300' : 'border-gray-300'}`}
                  placeholder="Anna Andersson"
                />
                {errors.contactPerson && <p className="mt-1 text-sm text-red-600">{errors.contactPerson}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-post *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-300' : 'border-gray-300'}`}
                  placeholder="anna@foretag.se"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.phone ? 'border-red-300' : 'border-gray-300'}`}
                  placeholder="08-123 456 78"
                />
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organisationsnummer *
                </label>
                <input
                  type="text"
                  name="orgNumber"
                  value={formData.orgNumber}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.orgNumber ? 'border-red-300' : 'border-gray-300'}`}
                  placeholder="556123-4567"
                />
                {errors.orgNumber && <p className="mt-1 text-sm text-red-600">{errors.orgNumber}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marginal % *
                </label>
                <input
                  type="number"
                  name="marginal"
                  value={formData.marginal}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.marginal ? 'border-red-300' : 'border-gray-300'}`}
                />
                {errors.marginal && <p className="mt-1 text-sm text-red-600">{errors.marginal}</p>}
              </div>
            </div>
          </div>

          {/* Company Address */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Företagsadress</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adress *
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.address ? 'border-red-300' : 'border-gray-300'}`}
                  placeholder="Storgatan 123"
                />
                {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Postnummer *
                </label>
                <input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.postalCode ? 'border-red-300' : 'border-gray-300'}`}
                  placeholder="12345"
                />
                {errors.postalCode && <p className="mt-1 text-sm text-red-600">{errors.postalCode}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stad *
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.city ? 'border-red-300' : 'border-gray-300'}`}
                  placeholder="Stockholm"
                />
                {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Land
                </label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Sverige">Sverige</option>
                  <option value="Norge">Norge</option>
                  <option value="Danmark">Danmark</option>
                  <option value="Finland">Finland</option>
                </select>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Leveransadress</h3>
            
            <div className="mb-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="sameAsCompanyAddress"
                  checked={formData.sameAsCompanyAddress}
                  onChange={handleInputChange}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Samma som företagsadress
                </span>
              </label>
            </div>

            {!formData.sameAsCompanyAddress && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Leveransadress *
                  </label>
                  <input
                    type="text"
                    name="deliveryAddress"
                    value={formData.deliveryAddress}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.deliveryAddress ? 'border-red-300' : 'border-gray-300'}`}
                    placeholder="Leveransgatan 456"
                  />
                  {errors.deliveryAddress && <p className="mt-1 text-sm text-red-600">{errors.deliveryAddress}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Postnummer *
                  </label>
                  <input
                    type="text"
                    name="deliveryPostalCode"
                    value={formData.deliveryPostalCode}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.deliveryPostalCode ? 'border-red-300' : 'border-gray-300'}`}
                    placeholder="54321"
                  />
                  {errors.deliveryPostalCode && <p className="mt-1 text-sm text-red-600">{errors.deliveryPostalCode}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stad *
                  </label>
                  <input
                    type="text"
                    name="deliveryCity"
                    value={formData.deliveryCity}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.deliveryCity ? 'border-red-300' : 'border-gray-300'}`}
                    placeholder="Göteborg"
                  />
                  {errors.deliveryCity && <p className="mt-1 text-sm text-red-600">{errors.deliveryCity}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Land
                  </label>
                  <select
                    name="deliveryCountry"
                    value={formData.deliveryCountry}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          {/* Admin Documents */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
              <DocumentArrowUpIcon className="h-6 w-6 text-orange-600 mr-2" />
              Admin-dokument
              <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                ENDAST ADMIN
              </span>
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Dessa dokument är endast synliga för administratörer och kommer inte visas för kunden.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ladda upp admin-dokument (PDF, Word, bilder, etc.)
                </label>
                <input
                  type="file"
                  multiple
                  onChange={handleDocumentUpload}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp,.svg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Pending Documents List */}
              {pendingDocuments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    Dokument att ladda upp ({pendingDocuments.length}):
                  </h4>
                  {pendingDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <DocumentArrowUpIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(doc.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDocument(doc.id)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Account Settings */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Kontoinställningar</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Roll
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="user">Användare</option>
                  <option value="admin">Administratör</option>
                </select>
              </div>

              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="active"
                    checked={formData.active}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Aktivera konto direkt
                  </span>
                </label>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Anteckningar
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Interna anteckningar om kunden..."
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3">
            <Link
              to="/admin/users"
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Avbryt
            </Link>
            <button
              type="submit"
              disabled={saving || uploadingDocs}
              className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {uploadingDocs ? 'Laddar upp dokument...' : 'Skapar kund...'}
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Skapa Kund
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default AdminUserCreate; 