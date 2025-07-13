import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSimpleAuth } from '../../contexts/SimpleAuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import toast from 'react-hot-toast';
import ShopNavigation from '../../components/shop/ShopNavigation';
import ShopFooter from '../../components/shop/ShopFooter';
import ShopCredentialLanguageSwitcher from '../../components/shop/ShopCredentialLanguageSwitcher';

const ForgotPassword = () => {
  const { resetPassword } = useSimpleAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Read from unified key first, then credential-specific key, then default to Swedish
  const getInitialLanguage = () => {
    const unifiedLang = localStorage.getItem('b8shield-language');
    if (unifiedLang) return unifiedLang;
    
    const credentialLang = localStorage.getItem('b8shield-credential-language');
    if (credentialLang) return credentialLang;
    
    return 'sv-SE';
  };
  
  const [currentLanguage, setCurrentLanguage] = useState(getInitialLanguage());

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error(t('forgot_password_error_email_required', 'E-postadress krävs'));
      return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error(t('forgot_password_error_email_invalid', 'Ogiltig e-postadress'));
      return;
    }
    
    setLoading(true);
    const toastId = toast.loading(t('forgot_password_loading', 'Skickar återställningslänk...'));
    
    try {
      await resetPassword(email);
      toast.dismiss(toastId);
      toast.success(t('forgot_password_success', 'Återställningslänk skickad! Kolla din e-post.'), {
        duration: 8000
      });
      setSubmitted(true);
    } catch (error) {
      toast.dismiss(toastId);
      console.error('Password reset error:', error);
      
      if (error.code === 'auth/user-not-found') {
        toast.error(t('forgot_password_error_user_not_found', 'Ingen användare hittades med denna e-postadress'));
      } else if (error.code === 'auth/too-many-requests') {
        toast.error(t('forgot_password_error_too_many_requests', 'För många förfrågningar. Försök igen senare.'));
      } else {
        toast.error(t('forgot_password_error_generic', 'Ett fel uppstod. Försök igen.'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <ShopNavigation breadcrumb={t('breadcrumb_forgot_password', 'Glömt lösenord')} />
        
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
              {t('forgot_password_success_title', 'E-post skickad!')}
            </h1>
            
            <p className="text-gray-600 mb-8">
              {t('forgot_password_success_message', 'Vi har skickat en återställningslänk till {{email}}. Kolla din e-post och följ instruktionerna för att återställa ditt lösenord.', { email })}
            </p>
            
            <div className="space-y-4">
              <Link 
                to="/login" 
                className="block w-full bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors text-center font-medium"
              >
                {t('forgot_password_back_to_login', 'Tillbaka till inloggning')}
              </Link>
              
              <button
                onClick={() => setSubmitted(false)}
                className="block w-full bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors text-center font-medium"
              >
                {t('forgot_password_send_again', 'Skicka igen')}
              </button>
            </div>
          </div>
        </div>
        
        <ShopFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <ShopNavigation breadcrumb={t('breadcrumb_forgot_password', 'Glömt lösenord')} />
      
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex justify-end mb-4">
          <ShopCredentialLanguageSwitcher
            currentLanguage={currentLanguage}
            onLanguageChange={setCurrentLanguage}
          />
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
              {t('forgot_password_title', 'Glömt lösenord?')}
            </h1>
            <p className="text-gray-600">
              {t('forgot_password_subtitle', 'Ange din e-postadress så skickar vi en länk för att återställa ditt lösenord')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                {t('forgot_password_email_label', 'E-postadress')}
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('forgot_password_email_placeholder', 'din@email.com')}
                disabled={loading}
                required
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
              >
                {loading ? t('forgot_password_loading', 'Skickar återställningslänk...') : t('forgot_password_button', 'Skicka återställningslänk')}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center space-y-2">
            <Link 
              to="/login" 
              className="block text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              {t('forgot_password_back_to_login', 'Tillbaka till inloggning')}
            </Link>
            <p className="text-sm text-gray-600">
              {t('forgot_password_no_account', 'Har inget konto?')}{' '}
              <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
                {t('forgot_password_create_account', 'Skapa ett här')}
              </Link>
            </p>
            <Link 
              to="/" 
              className="block text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              &larr; {t('forgot_password_back_to_shop', 'Tillbaka till butiken')}
            </Link>
          </div>
        </div>
      </div>

      <ShopFooter />
    </div>
  );
};

export default ForgotPassword; 