import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const RegisterPage = () => {
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [sameAsCompanyAddress, setSameAsCompanyAddress] = useState(true);
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors },
    watch
  } = useForm();
  
  const password = watch('password', '');
  
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
        country: data.country || 'Sverige',
        orgNumber: data.orgNumber,
        vatNumber: data.vatNumber,
        // Delivery address fields
        deliveryAddress: sameAsCompanyAddress ? data.address : data.deliveryAddress,
        deliveryPostalCode: sameAsCompanyAddress ? data.postalCode : data.deliveryPostalCode,
        deliveryCity: sameAsCompanyAddress ? data.city : data.deliveryCity,
        deliveryCountry: sameAsCompanyAddress ? (data.country || 'Sverige') : data.deliveryCountry,
        sameAsCompanyAddress: sameAsCompanyAddress,
        role: 'reseller',
        active: false, // Account will need to be activated by admin
      };
      
      // Register with Firebase
      await registerUser(data.email, data.password, userData);
      
      toast.success('Registrering slutförd. En administratör kommer att aktivera ditt konto.');
      navigate('/login');
    } catch (error) {
      console.error('Registration error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setAuthError('E-postadressen används redan av ett annat konto.');
      } else if (error.code === 'auth/weak-password') {
        setAuthError('Lösenordet är för svagt. Välj ett starkare lösenord.');
      } else {
        setAuthError('Ett fel uppstod vid registreringen. Försök igen.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <img
            src="/images/B8Shield-Logotype 1.svg" 
            alt="B8shield Logo"
            className="h-12 w-auto mx-auto mb-6"
          />
          <h1 className="text-3xl font-bold text-gray-900">Registrera nytt konto</h1>
          <p className="mt-2 text-gray-600">
            Eller{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              logga in på ditt befintliga konto
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
                Företagsinformation
              </h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                    Företagsnamn *
                  </label>
                  <input
                    id="companyName"
                    type="text"
                    {...register('companyName', { required: 'Företagsnamn krävs' })}
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
                    Organisationsnummer *
                  </label>
                  <input
                    id="orgNumber"
                    type="text"
                    placeholder="XXXXXX-XXXX"
                    {...register('orgNumber', { required: 'Organisationsnummer krävs' })}
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
                    Momsregistreringsnummer *
                  </label>
                  <input
                    id="vatNumber"
                    type="text"
                    placeholder="SE123456789001"
                    {...register('vatNumber', { required: 'Momsregistreringsnummer krävs' })}
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
                Kontaktinformation
              </h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700 mb-1">
                    Kontaktperson *
                  </label>
                  <input
                    id="contactPerson"
                    type="text"
                    {...register('contactPerson', { required: 'Kontaktperson krävs' })}
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
                    Telefonnummer *
                  </label>
                  <input
                    id="phone"
                    type="text"
                    placeholder="08-123 456 78"
                    {...register('phone', { required: 'Telefonnummer krävs' })}
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
                    E-postadress *
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...register('email', { 
                      required: 'E-postadress krävs',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Ogiltig e-postadress'
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
                Företagsadress
              </h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                    Gatuadress *
                  </label>
                  <input
                    id="address"
                    type="text"
                    {...register('address', { required: 'Adress krävs' })}
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
                    Postnummer *
                  </label>
                  <input
                    id="postalCode"
                    type="text"
                    placeholder="123 45"
                    {...register('postalCode', { required: 'Postnummer krävs' })}
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
                    Stad *
                  </label>
                  <input
                    id="city"
                    type="text"
                    {...register('city', { required: 'Stad krävs' })}
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
                    Land
                  </label>
                  <input
                    id="country"
                    type="text"
                    defaultValue="Sverige"
                    {...register('country')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Address Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Leveransadress
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
                    Samma som företagsadress
                  </span>
                </label>
              </div>
              
              {!sameAsCompanyAddress && (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="deliveryAddress" className="block text-sm font-medium text-gray-700 mb-1">
                      Leveransadress *
                    </label>
                    <input
                      id="deliveryAddress"
                      type="text"
                      {...register('deliveryAddress', { 
                        required: !sameAsCompanyAddress ? 'Leveransadress krävs' : false 
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
                      Postnummer *
                    </label>
                    <input
                      id="deliveryPostalCode"
                      type="text"
                      placeholder="123 45"
                      {...register('deliveryPostalCode', { 
                        required: !sameAsCompanyAddress ? 'Postnummer krävs' : false 
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
                      Stad *
                    </label>
                    <input
                      id="deliveryCity"
                      type="text"
                      {...register('deliveryCity', { 
                        required: !sameAsCompanyAddress ? 'Stad krävs' : false 
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
                      Land
                    </label>
                    <input
                      id="deliveryCountry"
                      type="text"
                      defaultValue="Sverige"
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
                Kontosäkerhet
              </h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Lösenord *
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    {...register('password', { 
                      required: 'Lösenord krävs',
                      minLength: { value: 6, message: 'Lösenordet måste vara minst 6 tecken' }
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
                    Bekräfta lösenord *
                  </label>
                  <input
                    id="passwordConfirm"
                    type="password"
                    autoComplete="new-password"
                    {...register('passwordConfirm', { 
                      required: 'Bekräfta lösenord krävs',
                      validate: value => value === password || 'Lösenorden matchar inte'
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
                  <strong>Obs:</strong> När du registrerar dig måste ditt konto godkännas av en administratör innan du kan logga in. 
                  Vi kontaktar dig via e-post när ditt konto är aktiverat.
                </p>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Registrerar...' : 'Registrera konto'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage; 