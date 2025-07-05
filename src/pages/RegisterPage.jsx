import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import CredentialLanguageSwitcher from '../components/CredentialLanguageSwitcher';
import credentialTranslations from '../utils/credentialTranslations';
import toast from 'react-hot-toast';

const RegisterPage = () => {
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [sameAsCompanyAddress, setSameAsCompanyAddress] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState(credentialTranslations.getStoredLanguage());
  const [translationsLoaded, setTranslationsLoaded] = useState(false);
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors },
    watch
  } = useForm();
  
  const password = watch('password', '');

  // Load translations on component mount and language change
  useEffect(() => {
    const loadTranslations = async () => {
      await credentialTranslations.setLanguage(currentLanguage);
      setTranslationsLoaded(true);
    };
    
    loadTranslations();
  }, [currentLanguage]);

  const handleLanguageChange = async (languageCode) => {
    setTranslationsLoaded(false);  // Show loading state during switch
    setCurrentLanguage(languageCode);
    // Let useEffect handle the translation loading
  };

  const t = (key, fallback = null) => {
    return credentialTranslations.t(key, fallback);
  };
  
  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setAuthError('');
      
      // Format user data
      const userData = {
        companyName: data.companyName,
        contactPerson: data.contactPerson,
        phone: data.phone,
        address: data.address,
        postalCode: data.postalCode,
        city: data.city,
        country: data.country || t('register.default_country', 'Sverige'),
        orgNumber: data.orgNumber,
        vatNumber: data.vatNumber,
        // Delivery address fields
        deliveryAddress: sameAsCompanyAddress ? data.address : data.deliveryAddress,
        deliveryPostalCode: sameAsCompanyAddress ? data.postalCode : data.deliveryPostalCode,
        deliveryCity: sameAsCompanyAddress ? data.city : data.deliveryCity,
        deliveryCountry: sameAsCompanyAddress ? (data.country || t('register.default_country', 'Sverige')) : data.deliveryCountry,
        sameAsCompanyAddress: sameAsCompanyAddress,
        role: 'reseller',
        active: false, // Account will need to be activated by admin
      };
      
      // Register with Firebase
      await registerUser(data.email, data.password, userData);
      
      toast.success(t('register.success.registration_complete', 'Registrering slutförd. En administratör kommer att aktivera ditt konto.'));
      navigate('/login');
    } catch (error) {
      console.error('Registration error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setAuthError(t('register.errors.email_exists', 'E-postadressen används redan av ett annat konto.'));
      } else if (error.code === 'auth/weak-password') {
        setAuthError(t('register.errors.weak_password', 'Lösenordet är för svagt. Välj ett starkare lösenord.'));
      } else {
        setAuthError(t('register.errors.registration_failed', 'Ett fel uppstod vid registreringen. Försök igen.'));
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading state until translations are loaded
  if (!translationsLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Language Switcher */}
        <div className="flex justify-end mb-4">
          <CredentialLanguageSwitcher
            currentLanguage={currentLanguage}
            onLanguageChange={handleLanguageChange}
          />
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <img
            src="/images/B8Shield-Logotype 1.svg" 
            alt="B8shield Logo"
            className="h-12 w-auto mx-auto mb-6"
          />
          <h1 className="text-3xl font-bold text-gray-900">
            {t('register.title', 'Registrera nytt konto')}
          </h1>
          <p className="mt-2 text-gray-600">
            {t('register.subtitle.or', 'Eller')}{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              {t('register.subtitle.login', 'logga in på ditt befintliga konto')}
            </Link>
          </p>
        </div>

        {/* Main Form */}
        <div className="bg-white shadow-sm rounded-lg">
          {authError && (
            <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
              {authError}
            </div>
          )}
          
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-8">
            {/* Company Information Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200">
                {t('register.sections.company_info', 'Företagsinformation')}
              </h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('register.fields.company_name', 'Företagsnamn')} *
                  </label>
                  <input
                    id="companyName"
                    type="text"
                    {...register('companyName', { required: t('register.errors.company_name_required', 'Företagsnamn krävs') })}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.companyName ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.companyName && (
                    <p className="mt-1 text-sm text-red-600">{errors.companyName.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="orgNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('register.fields.org_number', 'Organisationsnummer')} *
                  </label>
                  <input
                    id="orgNumber"
                    type="text"
                    placeholder="XXXXXX-XXXX"
                    {...register('orgNumber', { required: t('register.errors.org_number_required', 'Organisationsnummer krävs') })}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.orgNumber ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.orgNumber && (
                    <p className="mt-1 text-sm text-red-600">{errors.orgNumber.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="vatNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('register.fields.vat_number', 'Momsregistreringsnummer')} *
                  </label>
                  <input
                    id="vatNumber"
                    type="text"
                    placeholder="SE123456789001"
                    {...register('vatNumber', { required: t('register.errors.vat_number_required', 'Momsregistreringsnummer krävs') })}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.vatNumber ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.vatNumber && (
                    <p className="mt-1 text-sm text-red-600">{errors.vatNumber.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200">
                {t('register.sections.contact_info', 'Kontaktinformation')}
              </h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('register.fields.contact_person', 'Kontaktperson')} *
                  </label>
                  <input
                    id="contactPerson"
                    type="text"
                    {...register('contactPerson', { required: t('register.errors.contact_person_required', 'Kontaktperson krävs') })}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.contactPerson ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.contactPerson && (
                    <p className="mt-1 text-sm text-red-600">{errors.contactPerson.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('register.fields.phone', 'Telefonnummer')} *
                  </label>
                  <input
                    id="phone"
                    type="text"
                    placeholder="08-123 456 78"
                    {...register('phone', { required: t('register.errors.phone_required', 'Telefonnummer krävs') })}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.phone ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                  )}
                </div>
                
                <div className="sm:col-span-2">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('register.fields.email', 'E-postadress')} *
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...register('email', { 
                      required: t('register.errors.email_required', 'E-postadress krävs'),
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: t('register.errors.invalid_email', 'Ogiltig e-postadress')
                      }
                    })}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Company Address Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200">
                {t('register.sections.company_address', 'Företagsadress')}
              </h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('register.fields.street_address', 'Gatuadress')} *
                  </label>
                  <input
                    id="address"
                    type="text"
                    {...register('address', { required: t('register.errors.address_required', 'Adress krävs') })}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.address ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.address && (
                    <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('register.fields.postal_code', 'Postnummer')} *
                  </label>
                  <input
                    id="postalCode"
                    type="text"
                    placeholder="123 45"
                    {...register('postalCode', { required: t('register.errors.postal_code_required', 'Postnummer krävs') })}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.postalCode ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.postalCode && (
                    <p className="mt-1 text-sm text-red-600">{errors.postalCode.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('register.fields.city', 'Stad')} *
                  </label>
                  <input
                    id="city"
                    type="text"
                    {...register('city', { required: t('register.errors.city_required', 'Stad krävs') })}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.city ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.city && (
                    <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
                  )}
                </div>
                
                <div className="sm:col-span-2">
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('register.fields.country', 'Land')}
                  </label>
                  <input
                    id="country"
                    type="text"
                    defaultValue={t('register.default_country', 'Sverige')}
                    {...register('country')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Address Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200">
                {t('register.sections.delivery_address', 'Leveransadress')}
              </h3>
              
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={sameAsCompanyAddress}
                    onChange={(e) => setSameAsCompanyAddress(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {t('register.fields.same_as_company', 'Samma som företagsadress')}
                  </span>
                </label>
              </div>
              
              {!sameAsCompanyAddress && (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="deliveryAddress" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('register.fields.delivery_address', 'Leveransadress')} *
                    </label>
                    <input
                      id="deliveryAddress"
                      type="text"
                      {...register('deliveryAddress', { 
                        required: !sameAsCompanyAddress ? t('register.errors.delivery_address_required', 'Leveransadress krävs') : false 
                      })}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.deliveryAddress ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.deliveryAddress && (
                      <p className="mt-1 text-sm text-red-600">{errors.deliveryAddress.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="deliveryPostalCode" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('register.fields.postal_code', 'Postnummer')} *
                    </label>
                    <input
                      id="deliveryPostalCode"
                      type="text"
                      placeholder="123 45"
                      {...register('deliveryPostalCode', { 
                        required: !sameAsCompanyAddress ? t('register.errors.postal_code_required', 'Postnummer krävs') : false 
                      })}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.deliveryPostalCode ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.deliveryPostalCode && (
                      <p className="mt-1 text-sm text-red-600">{errors.deliveryPostalCode.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="deliveryCity" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('register.fields.city', 'Stad')} *
                    </label>
                    <input
                      id="deliveryCity"
                      type="text"
                      {...register('deliveryCity', { 
                        required: !sameAsCompanyAddress ? t('register.errors.city_required', 'Stad krävs') : false 
                      })}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.deliveryCity ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.deliveryCity && (
                      <p className="mt-1 text-sm text-red-600">{errors.deliveryCity.message}</p>
                    )}
                  </div>
                  
                  <div className="sm:col-span-2">
                    <label htmlFor="deliveryCountry" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('register.fields.country', 'Land')}
                    </label>
                    <input
                      id="deliveryCountry"
                      type="text"
                      defaultValue={t('register.default_country', 'Sverige')}
                      {...register('deliveryCountry')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Account Security Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200">
                {t('register.sections.account_security', 'Kontosäkerhet')}
              </h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('register.fields.password', 'Lösenord')} *
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    {...register('password', { 
                      required: t('register.errors.password_required', 'Lösenord krävs'),
                      minLength: { value: 6, message: t('register.errors.password_too_short', 'Lösenordet måste vara minst 6 tecken') }
                    })}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.password ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('register.fields.confirm_password', 'Bekräfta lösenord')} *
                  </label>
                  <input
                    id="passwordConfirm"
                    type="password"
                    autoComplete="new-password"
                    {...register('passwordConfirm', { 
                      required: t('register.errors.confirm_password_required', 'Bekräfta lösenord krävs'),
                      validate: value => value === password || t('register.errors.passwords_no_match', 'Lösenorden matchar inte')
                    })}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.passwordConfirm ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.passwordConfirm && (
                    <p className="mt-1 text-sm text-red-600">{errors.passwordConfirm.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Section */}
            <div className="pt-6 border-t border-gray-200">
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>{t('register.notice.note', 'Obs:')}</strong> {t('register.notice.approval_required', 'När du registrerar dig måste ditt konto godkännas av en administratör innan du kan logga in. Vi kontaktar dig via e-post när ditt konto är aktiverat.')}
                </p>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? t('register.button.creating', 'Skapar konto...') : t('register.button.create', 'Skapa konto')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage; 