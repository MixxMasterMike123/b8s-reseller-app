import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSimpleAuth } from '../../contexts/SimpleAuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import toast from 'react-hot-toast';
import ShopNavigation from '../../components/shop/ShopNavigation';
import ShopFooter from '../../components/shop/ShopFooter';
import ShopCredentialLanguageSwitcher from '../../components/shop/ShopCredentialLanguageSwitcher';

const CustomerRegister = () => {
  const { t, currentLanguage } = useTranslation();
  const { register } = useSimpleAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Read from unified key first, then credential-specific key, then default to Swedish
  const getInitialLanguage = () => {
    const unifiedLang = localStorage.getItem('b8shield-language');
    if (unifiedLang) return unifiedLang;
    
    const credentialLang = localStorage.getItem('b8shield-credential-language');
    if (credentialLang) return credentialLang;
    
    return 'sv-SE';
  };
  
  const [languageState, setLanguageState] = useState(getInitialLanguage());
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    marketingConsent: false,
    termsConsent: false
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
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

  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.firstName.trim()) {
      newErrors.firstName = t('customer_register_error_first_name_required', 'Förnamn krävs');
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = t('customer_register_error_last_name_required', 'Efternamn krävs');
    }
    if (!formData.email.trim()) {
      newErrors.email = t('customer_register_error_email_required', 'E-postadress krävs');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('customer_register_error_email_invalid', 'Ogiltig e-postadress');
    }
    if (!formData.password) {
      newErrors.password = t('customer_register_error_password_required', 'Lösenord krävs');
    } else if (formData.password.length < 6) {
      newErrors.password = t('customer_register_error_password_length', 'Lösenordet måste vara minst 6 tecken');
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('customer_register_error_confirm_password_required', 'Bekräfta lösenord krävs');
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('customer_register_error_password_mismatch', 'Lösenorden matchar inte');
    }
    if (!formData.termsConsent) {
      newErrors.termsConsent = t('customer_register_error_terms', 'Du måste godkänna användarvillkoren');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    const toastId = toast.loading(t('customer_register_loading', 'Skapar konto...'));

    try {
      // 1. Create Firebase Auth account
      const userCredential = await register(formData.email, formData.password);
      const firebaseUser = userCredential;

      // 2. Create B2C customer document
      const customerData = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || '',
        
        // Address info (empty for now - can be filled later)
        address: '',
        apartment: '',
        city: '',
        postalCode: '',
        country: 'SE',
        
        // Account info
        firebaseAuthUid: firebaseUser.uid,
        emailVerified: firebaseUser.emailVerified,
        marketingConsent: formData.marketingConsent,
        
        // Analytics
        stats: {
          totalOrders: 0,
          totalSpent: 0,
          averageOrderValue: 0,
          lastOrderDate: null,
          firstOrderDate: null
        },
        
        // Metadata
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        
        // Integration
        preferredLang: currentLanguage,
        customerSegment: 'new',
        source: 'registration'
      };
      
      await addDoc(collection(db, 'b2cCustomers'), customerData);

      toast.dismiss(toastId);
      toast.success(t('customer_register_success', 'Konto skapat! Välkommen till B8Shield!'), {
        duration: 5000
      });

      // Redirect to account page after successful registration
      navigate('/account');
      
    } catch (error) {
      toast.dismiss(toastId);
      console.error('Registration error:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        toast.error(t('customer_register_error_email_exists', 'E-postadressen används redan. Försök logga in istället.'));
      } else if (error.code === 'auth/weak-password') {
        toast.error(t('customer_register_error_weak_password', 'Lösenordet är för svagt.'));
      } else {
        toast.error(t('customer_register_error_generic', 'Ett fel uppstod vid registrering. Försök igen.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <ShopNavigation breadcrumb={t('breadcrumb_register', 'Skapa konto')} />
      
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-end mb-4">
          <ShopCredentialLanguageSwitcher
            currentLanguage={languageState}
            onLanguageChange={setLanguageState}
          />
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
              {t('customer_register_title', 'Skapa konto')}
            </h1>
            <p className="text-gray-600">
              {t('customer_register_subtitle', 'Skapa ditt konto för att spåra beställningar och få exklusiva erbjudanden')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('customer_register_first_name', 'Förnamn')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.firstName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={loading}
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('customer_register_last_name', 'Efternamn')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.lastName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={loading}
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                )}
              </div>
            </div>

            {/* Email field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                {t('customer_register_email', 'E-postadress')} <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Password fields */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                {t('customer_register_password', 'Lösenord')} <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                {t('customer_register_confirm_password', 'Bekräfta lösenord')} <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Phone field */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                {t('customer_register_phone', 'Telefon (valfritt)')}
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            {/* Consent checkboxes */}
            <div className="space-y-4">
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="marketingConsent"
                  name="marketingConsent"
                  checked={formData.marketingConsent}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={loading}
                />
                <label htmlFor="marketingConsent" className="ml-2 block text-sm text-gray-700">
                  {t('customer_register_marketing_consent', 'Jag vill få marknadsföringsmeddelanden')}
                </label>
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="termsConsent"
                  name="termsConsent"
                  checked={formData.termsConsent}
                  onChange={handleChange}
                  className={`mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                    errors.termsConsent ? 'border-red-500' : ''
                  }`}
                  disabled={loading}
                />
                <label htmlFor="termsConsent" className="ml-2 block text-sm text-gray-700">
                  {t('customer_register_terms_consent', 'Jag godkänner')}{' '}
                  <Link to="/terms" className="text-blue-600 hover:text-blue-800">
                    {t('customer_register_terms_link', 'användarvillkor')}
                  </Link>
                  {' '}och{' '}
                  <Link to="/privacy" className="text-blue-600 hover:text-blue-800">
                    {t('customer_register_privacy_link', 'integritetspolicy')}
                  </Link>
                  <span className="text-red-500">*</span>
                </label>
              </div>
              {errors.termsConsent && (
                <p className="text-sm text-red-600">{errors.termsConsent}</p>
              )}
            </div>

            {/* Submit button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
              >
                {loading ? t('customer_register_loading', 'Skapar konto...') : t('customer_register_button', 'Skapa konto')}
              </button>
            </div>
          </form>

          {/* Links */}
          <div className="mt-8 text-center space-y-2">
            <p className="text-sm text-gray-600">
              {t('customer_register_already_have_account', 'Har redan konto? Logga in')}{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                här
              </Link>
            </p>
            <Link 
              to="/" 
              className="block text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              &larr; {t('customer_register_back_to_shop', 'Tillbaka till butiken')}
            </Link>
          </div>
        </div>
      </div>

      <ShopFooter />
    </div>
  );
};

export default CustomerRegister; 