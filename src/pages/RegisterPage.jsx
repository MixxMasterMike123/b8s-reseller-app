import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const RegisterPage = () => {
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
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
        orgNumber: data.orgNumber,
        vatNumber: data.vatNumber,
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8 bg-white p-10 rounded-xl shadow-md">
        <div>
          <h1 className="text-center text-3xl font-bold text-gray-800">B8shield</h1>
          <h2 className="mt-6 text-center text-2xl font-bold text-gray-800">
            Registrera nytt konto
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Eller{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              logga in på ditt befintliga konto
            </Link>
          </p>
        </div>
        
        {authError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-md">
            {authError}
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                Företagsnamn
              </label>
              <div className="mt-1">
                <input
                  id="companyName"
                  type="text"
                  {...register('companyName', { required: 'Företagsnamn krävs' })}
                  className={`appearance-none block w-full px-3 py-2 border ${errors.companyName ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors.companyName && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.companyName.message}
                  </p>
                )}
              </div>
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                E-postadress
              </label>
              <div className="mt-1">
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
                  className={`appearance-none block w-full px-3 py-2 border ${errors.email ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>
            
            <div>
              <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700">
                Kontaktperson
              </label>
              <div className="mt-1">
                <input
                  id="contactPerson"
                  type="text"
                  {...register('contactPerson', { required: 'Kontaktperson krävs' })}
                  className={`appearance-none block w-full px-3 py-2 border ${errors.contactPerson ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors.contactPerson && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.contactPerson.message}
                  </p>
                )}
              </div>
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Telefonnummer
              </label>
              <div className="mt-1">
                <input
                  id="phone"
                  type="text"
                  {...register('phone', { required: 'Telefonnummer krävs' })}
                  className={`appearance-none block w-full px-3 py-2 border ${errors.phone ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.phone.message}
                  </p>
                )}
              </div>
            </div>
            
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Adress
              </label>
              <div className="mt-1">
                <input
                  id="address"
                  type="text"
                  {...register('address', { required: 'Adress krävs' })}
                  className={`appearance-none block w-full px-3 py-2 border ${errors.address ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors.address && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.address.message}
                  </p>
                )}
              </div>
            </div>
            
            <div>
              <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">
                Postnummer
              </label>
              <div className="mt-1">
                <input
                  id="postalCode"
                  type="text"
                  {...register('postalCode', { required: 'Postnummer krävs' })}
                  className={`appearance-none block w-full px-3 py-2 border ${errors.postalCode ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors.postalCode && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.postalCode.message}
                  </p>
                )}
              </div>
            </div>
            
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                Stad
              </label>
              <div className="mt-1">
                <input
                  id="city"
                  type="text"
                  {...register('city', { required: 'Stad krävs' })}
                  className={`appearance-none block w-full px-3 py-2 border ${errors.city ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors.city && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.city.message}
                  </p>
                )}
              </div>
            </div>
            
            <div>
              <label htmlFor="orgNumber" className="block text-sm font-medium text-gray-700">
                Organisationsnummer
              </label>
              <div className="mt-1">
                <input
                  id="orgNumber"
                  type="text"
                  {...register('orgNumber', { required: 'Organisationsnummer krävs' })}
                  className={`appearance-none block w-full px-3 py-2 border ${errors.orgNumber ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors.orgNumber && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.orgNumber.message}
                  </p>
                )}
              </div>
            </div>
            
            <div>
              <label htmlFor="vatNumber" className="block text-sm font-medium text-gray-700">
                Momsregistreringsnummer
              </label>
              <div className="mt-1">
                <input
                  id="vatNumber"
                  type="text"
                  {...register('vatNumber', { required: 'Momsregistreringsnummer krävs' })}
                  className={`appearance-none block w-full px-3 py-2 border ${errors.vatNumber ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors.vatNumber && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.vatNumber.message}
                  </p>
                )}
              </div>
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Lösenord
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  {...register('password', { 
                    required: 'Lösenord krävs',
                    minLength: { value: 6, message: 'Lösenordet måste vara minst 6 tecken' }
                  })}
                  className={`appearance-none block w-full px-3 py-2 border ${errors.password ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.password.message}
                  </p>
                )}
              </div>
            </div>
            
            <div>
              <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700">
                Bekräfta lösenord
              </label>
              <div className="mt-1">
                <input
                  id="passwordConfirm"
                  type="password"
                  autoComplete="new-password"
                  {...register('passwordConfirm', { 
                    required: 'Bekräfta lösenord krävs',
                    validate: value => value === password || 'Lösenorden matchar inte'
                  })}
                  className={`appearance-none block w-full px-3 py-2 border ${errors.passwordConfirm ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors.passwordConfirm && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.passwordConfirm.message}
                  </p>
                )}
              </div>
            </div>
          </div>
            
          <div>
            <p className="text-sm text-gray-500 mb-4">
              När du registrerar dig måste ditt konto godkännas av en administratör innan du kan logga in. Vi kontaktar dig via e-post när ditt konto är aktiverat.
            </p>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Registrerar...' : 'Registrera konto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage; 