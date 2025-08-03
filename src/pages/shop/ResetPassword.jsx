import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { confirmPasswordReset } from 'firebase/auth';
import { auth, db } from '../../firebase/config';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useTranslation } from '../../contexts/TranslationContext';
import toast from 'react-hot-toast';
import ShopNavigation from '../../components/shop/ShopNavigation';
import ShopFooter from '../../components/shop/ShopFooter';
import ShopCredentialLanguageSwitcher from '../../components/shop/ShopCredentialLanguageSwitcher';
import { getCountryAwareUrl } from '../../utils/productUrls';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, currentLanguage } = useTranslation();
  
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [isValidCode, setIsValidCode] = useState(false);
  const [email, setEmail] = useState('');
  const [resetCompleted, setResetCompleted] = useState(false);

  // Read from unified key first, then credential-specific key, then default to Swedish
  const getInitialLanguage = () => {
    const unifiedLang = localStorage.getItem('b8shield-language');
    if (unifiedLang) return unifiedLang;
    
    const credentialLang = localStorage.getItem('b8shield-credential-language');
    if (credentialLang) return credentialLang;
    
    return 'sv-SE';
  };
  
  const [currentLang, setCurrentLang] = useState(getInitialLanguage());

  useEffect(() => {
    const validateResetCode = async () => {
      const code = searchParams.get('code');
      
      if (!code) {
        toast.error(t('reset_password_error_no_code', 'Ogiltig återställningslänk'));
        navigate('/forgot-password');
        return;
      }

      setResetCode(code);
      
      try {
        // Check if reset code exists and is valid in Firestore
        const resetQuery = query(
          collection(db, 'passwordResets'),
          where('resetCode', '==', code),
          where('used', '==', false)
        );
        
        const resetSnapshot = await getDocs(resetQuery);
        
        if (resetSnapshot.empty) {
          toast.error(t('reset_password_error_invalid_code', 'Ogiltig eller använd återställningslänk'));
          navigate('/forgot-password');
          return;
        }

        const resetDoc = resetSnapshot.docs[0];
        const resetData = resetDoc.data();
        
        // Check if code has expired (1 hour)
        const now = new Date();
        const expiresAt = resetData.expiresAt.toDate();
        
        if (now > expiresAt) {
          toast.error(t('reset_password_error_expired', 'Återställningslänken har gått ut. Begär en ny.'));
          navigate('/forgot-password');
          return;
        }

        setEmail(resetData.email);
        setIsValidCode(true);
        console.log(`Valid reset code for email: ${resetData.email}`);
        
      } catch (error) {
        console.error('Error validating reset code:', error);
        toast.error(t('reset_password_error_validation', 'Fel vid validering av återställningslänk'));
        navigate('/forgot-password');
      } finally {
        setValidating(false);
      }
    };

    validateResetCode();
  }, [searchParams, navigate, t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newPassword || newPassword.length < 6) {
      toast.error(t('reset_password_error_password_short', 'Lösenordet måste vara minst 6 tecken'));
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error(t('reset_password_error_passwords_mismatch', 'Lösenorden matchar inte'));
      return;
    }
    
    setLoading(true);
    const toastId = toast.loading(t('reset_password_loading', 'Återställer lösenord...'));
    
    try {
      // Use Firebase Auth to reset password with the code from our custom email
      // Note: This uses the same reset mechanism but with our custom email
      await confirmPasswordReset(auth, resetCode, newPassword);
      
      // Mark the reset code as used in Firestore
      const resetQuery = query(
        collection(db, 'passwordResets'),
        where('resetCode', '==', resetCode),
        where('used', '==', false)
      );
      
      const resetSnapshot = await getDocs(resetQuery);
      if (!resetSnapshot.empty) {
        const resetDoc = resetSnapshot.docs[0];
        await updateDoc(resetDoc.ref, {
          used: true,
          usedAt: new Date()
        });
      }
      
      toast.dismiss(toastId);
      toast.success(t('reset_password_success', 'Lösenord återställt! Du kan nu logga in.'), {
        duration: 5000
      });
      
      setResetCompleted(true);
      
    } catch (error) {
      toast.dismiss(toastId);
      console.error('Password reset error:', error);
      
      if (error.code === 'auth/expired-action-code') {
        toast.error(t('reset_password_error_expired_code', 'Återställningskoden har gått ut. Begär en ny.'));
      } else if (error.code === 'auth/invalid-action-code') {
        toast.error(t('reset_password_error_invalid_action_code', 'Ogiltig återställningskod'));
      } else if (error.code === 'auth/weak-password') {
        toast.error(t('reset_password_error_weak_password', 'Lösenordet är för svagt'));
      } else {
        toast.error(t('reset_password_error_generic', 'Ett fel uppstod. Försök igen.'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <ShopNavigation breadcrumb={t('breadcrumb_reset_password', 'Återställ lösenord')} />
        
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('reset_password_validating', 'Validerar återställningslänk...')}</p>
          </div>
        </div>
        
        <ShopFooter />
      </div>
    );
  }

  if (resetCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <ShopNavigation breadcrumb={t('breadcrumb_reset_password', 'Återställ lösenord')} />
        
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {t('reset_password_success_title', 'Lösenord återställt!')}
            </h1>
            
            <p className="text-gray-600 mb-8">
              {t('reset_password_success_message', 'Ditt lösenord har återställts framgångsrikt. Du kan nu logga in med ditt nya lösenord.')}
            </p>
            
            <div className="space-y-4">
              <Link 
                to={getCountryAwareUrl('affiliate-login')}
                className="block w-full bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors text-center font-medium"
              >
                {t('reset_password_login_now', 'Logga in nu')}
              </Link>
              
              <Link 
                to={getCountryAwareUrl('')}
                className="block w-full bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors text-center font-medium"
              >
                {t('reset_password_back_to_shop', 'Tillbaka till butiken')}
              </Link>
            </div>
          </div>
        </div>
        
        <ShopFooter />
      </div>
    );
  }

  if (!isValidCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <ShopNavigation breadcrumb={t('breadcrumb_reset_password', 'Återställ lösenord')} />
        
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {t('reset_password_invalid_title', 'Ogiltig länk')}
            </h1>
            
            <p className="text-gray-600 mb-8">
              {t('reset_password_invalid_message', 'Återställningslänken är ogiltig eller har gått ut. Begär en ny återställningslänk.')}
            </p>
            
            <Link 
              to="/forgot-password"
              className="block w-full bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors text-center font-medium"
            >
              {t('reset_password_request_new', 'Begär ny återställningslänk')}
            </Link>
          </div>
        </div>
        
        <ShopFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <ShopNavigation breadcrumb={t('breadcrumb_reset_password', 'Återställ lösenord')} />
      
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex justify-end mb-4">
          <ShopCredentialLanguageSwitcher
            currentLanguage={currentLang}
            onLanguageChange={setCurrentLang}
          />
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
              {t('reset_password_title', 'Välj nytt lösenord')}
            </h1>
            <p className="text-gray-600">
              {t('reset_password_subtitle', 'Ange ditt nya lösenord för {{email}}', { email })}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                {t('reset_password_new_password_label', 'Nytt lösenord')}
              </label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('reset_password_new_password_placeholder', 'Minst 6 tecken')}
                disabled={loading}
                required
                minLength={6}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                {t('reset_password_confirm_password_label', 'Bekräfta nytt lösenord')}
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('reset_password_confirm_password_placeholder', 'Upprepa lösenordet')}
                disabled={loading}
                required
                minLength={6}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
              >
                {loading ? t('reset_password_loading', 'Återställer lösenord...') : t('reset_password_button', 'Återställ lösenord')}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center space-y-2">
            <Link 
              to={getCountryAwareUrl('affiliate-login')}
              className="block text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              {t('reset_password_back_to_login', 'Tillbaka till inloggning')}
            </Link>
            <Link 
              to={getCountryAwareUrl('')}
              className="block text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              &larr; {t('reset_password_back_to_shop', 'Tillbaka till butiken')}
            </Link>
          </div>
        </div>
      </div>

      <ShopFooter />
    </div>
  );
};

export default ResetPassword;