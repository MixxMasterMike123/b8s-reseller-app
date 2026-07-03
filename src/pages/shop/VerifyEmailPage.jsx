import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { useTranslation } from '../../contexts/TranslationContext';
import ShopNavigation from '../../components/shop/ShopNavigation';
import ShopFooter from '../../components/shop/ShopFooter';
import { getCountryAwareUrl } from '../../utils/productUrls';

// Email verification landing page. The verification email links here with
// ?oobCode=<code>; we call the server-side verifyEmailCode callable (which
// marks Firebase Auth + the B2C customer record verified) and show a
// success/failure state in Swedish. Modeled on ResetPassword (NORD storefront).
const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [email, setEmail] = useState('');

  useEffect(() => {
    const code = (searchParams.get('oobCode') || '').trim();

    if (!code) {
      setStatus('error');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const functions = getFunctions();
        const verifyEmailCode = httpsCallable(functions, 'verifyEmailCode');
        const result = await verifyEmailCode({ verificationCode: code });
        if (cancelled) return;
        if (result.data?.email) setEmail(result.data.email);
        setStatus('success');
      } catch (error) {
        if (cancelled) return;
        console.error('Email verification error:', error);
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50">
      <ShopNavigation breadcrumb={t('breadcrumb_verify_email', 'Verifiera e-post')} />

      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          {status === 'verifying' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">
                {t('verify_email_validating', 'Verifierar din e-postadress...')}
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mb-6">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                {t('verify_email_success_title', 'E-postadress verifierad!')}
              </h1>

              <p className="text-gray-600 mb-8">
                {email
                  ? t('verify_email_success_message_email', 'Din e-postadress {{email}} är nu verifierad. Ditt konto är aktiverat.').replace('{{email}}', email)
                  : t('verify_email_success_message', 'Din e-postadress är nu verifierad. Ditt konto är aktiverat.')}
              </p>

              <Link
                to={getCountryAwareUrl('')}
                className="block w-full bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors text-center font-medium"
              >
                {t('verify_email_go_to_shop', 'Till butiken')}
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mb-6">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                {t('verify_email_error_title', 'Verifieringen misslyckades')}
              </h1>

              <p className="text-gray-600 mb-8">
                {t('verify_email_error_message', 'Verifieringslänken är ogiltig eller har gått ut. Begär en ny länk eller kontakta supporten.')}
              </p>

              <Link
                to={getCountryAwareUrl('')}
                className="block w-full bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors text-center font-medium"
              >
                {t('verify_email_back_to_shop', 'Tillbaka till butiken')}
              </Link>
            </>
          )}
        </div>
      </div>

      <ShopFooter />
    </div>
  );
};

export default VerifyEmailPage;
