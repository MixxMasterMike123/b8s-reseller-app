import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSimpleAuth } from '../../contexts/SimpleAuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import toast from 'react-hot-toast';
import ShopNavigation from '../../components/shop/ShopNavigation';
import ShopFooter from '../../components/shop/ShopFooter';

const CustomerLogin = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useSimpleAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/affiliate-portal";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      toast.success(t('customer_login_success', 'Inloggad!'));
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        navigate('/affiliate-portal'); 
      }
    } catch (err) {
      console.error(err);
      setError(t('customer_login_error', 'Felaktig e-post eller lösenord. Kontrollera dina uppgifter och försök igen.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!onLoginSuccess && <ShopNavigation />}
      <div className={`flex items-center justify-center ${onLoginSuccess ? 'w-full' : 'min-h-screen bg-gray-50'}`}>
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              {t('customer_login_title', 'Logga in på ditt konto')}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {t('customer_login_or', 'Eller')}{' '}
              <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
                {t('customer_login_create_account', 'skapa ett nytt konto')}
              </Link>
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <input type="hidden" name="remember" defaultValue="true" />
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email-address" className="sr-only">
                  {t('customer_login_email_label', 'E-postadress')}
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder={t('customer_login_email_placeholder', 'E-postadress')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  {t('customer_login_password_label', 'Lösenord')}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder={t('customer_login_password_placeholder', 'Lösenord')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link to="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                  {t('customer_login_forgot_password', 'Glömt ditt lösenord?')}
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
              >
                {loading ? t('customer_login_loading', 'Loggar in...') : t('customer_login_button', 'Logga in')}
              </button>
            </div>
          </form>
           <div className="text-center">
              <Link 
                to="/" 
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                &larr; {t('customer_login_back_to_shop', 'Tillbaka till butiken')}
              </Link>
          </div>
        </div>
      </div>
      {!onLoginSuccess && <ShopFooter />}
    </>
  );
};

export default CustomerLogin; 