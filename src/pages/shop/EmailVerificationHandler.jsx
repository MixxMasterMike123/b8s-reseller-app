import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { applyActionCode } from 'firebase/auth';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { auth } from '../../firebase/config';

// Initialize Firebase Functions
const functions = getFunctions();
import toast from 'react-hot-toast';
import { useTranslation } from '../../contexts/TranslationContext';
import { useSimpleAuth } from '../../contexts/SimpleAuthContext';
import ShopNavigation from '../../components/shop/ShopNavigation';
import ShopFooter from '../../components/shop/ShopFooter';

const EmailVerificationHandler = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { updateB2CCustomerEmailStatus } = useSimpleAuth();
  const [verificationStatus, setVerificationStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const actionCode = searchParams.get('oobCode');
      
      if (!actionCode) {
        setVerificationStatus('error');
        setError('Invalid verification link');
        return;
      }

      try {
        console.log('Verifying email with code:', actionCode);
        
        // Try custom verification first (our new system)
        if (actionCode.length >= 20 && !actionCode.includes('-')) {
          console.log('Using custom verification system...');
          
          const verifyEmailCode = httpsCallable(functions, 'verifyEmailCode');
          const result = await verifyEmailCode({ verificationCode: actionCode });
          
          if (result.data.success) {
            console.log('Custom verification successful:', result.data.email);
            
            // Force refresh the current user if logged in
            if (auth.currentUser) {
              await auth.currentUser.reload();
              await updateB2CCustomerEmailStatus(auth.currentUser);
            }
            
            setVerificationStatus('success');
            toast.success(t('email_verification_success', 'E-post verifierad! Du kan nu logga in.'));
            
            // Redirect to login page after 3 seconds
            setTimeout(() => {
              navigate('/login');
            }, 3000);
            return;
          }
        }
        
        // Fallback to Firebase default verification
        console.log('Using Firebase default verification...');
        await applyActionCode(auth, actionCode);
        
        // Force refresh the current user to get updated emailVerified status
        if (auth.currentUser) {
          await auth.currentUser.reload();
          await updateB2CCustomerEmailStatus(auth.currentUser);
        }
        
        setVerificationStatus('success');
        toast.success(t('email_verification_success', 'E-post verifierad! Du kan nu logga in.'));
        
        // Redirect to login page after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
        
      } catch (error) {
        console.error('Email verification error:', error);
        setVerificationStatus('error');
        setError(error.message);
        toast.error(t('email_verification_error', 'Fel vid verifiering av e-post.'));
      }
    };

    verifyEmail();
  }, [searchParams, navigate, t, updateB2CCustomerEmailStatus]);

  const handleLoginRedirect = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <ShopNavigation breadcrumb={t('email_verification_title', 'E-post verifiering')} />
      
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            {verificationStatus === 'verifying' && (
              <div>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {t('email_verification_verifying', 'Verifierar e-post...')}
                </h1>
                <p className="text-gray-600">
                  {t('email_verification_please_wait', 'Vänligen vänta medan vi verifierar din e-post.')}
                </p>
              </div>
            )}
            
            {verificationStatus === 'success' && (
              <div>
                <div className="rounded-full h-12 w-12 bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {t('email_verification_success_title', 'E-post verifierad!')}
                </h1>
                <p className="text-gray-600 mb-6">
                  {t('email_verification_success_message', 'Din e-post har verifierats framgångsrikt. Du kan nu logga in på ditt konto.')}
                </p>
                <button
                  onClick={handleLoginRedirect}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  {t('email_verification_login_button', 'Logga in nu')}
                </button>
                <p className="text-sm text-gray-500 mt-4">
                  {t('email_verification_auto_redirect', 'Du omdirigeras automatiskt om 3 sekunder...')}
                </p>
              </div>
            )}
            
            {verificationStatus === 'error' && (
              <div>
                <div className="rounded-full h-12 w-12 bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {t('email_verification_error_title', 'Verifieringsfel')}
                </h1>
                <p className="text-gray-600 mb-6">
                  {t('email_verification_error_message', 'Det uppstod ett fel vid verifiering av din e-post. Länken kan ha gått ut eller redan använts.')}
                </p>
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
                <button
                  onClick={handleLoginRedirect}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  {t('email_verification_back_to_login', 'Tillbaka till inloggning')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <ShopFooter />
    </div>
  );
};

export default EmailVerificationHandler; 