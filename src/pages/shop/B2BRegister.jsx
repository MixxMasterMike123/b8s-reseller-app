// B2BRegister — per-shop wholesale self-registration (B2B Wholesale add-on).
// Mirrors the B2C CustomerRegister pattern: one Firebase Auth account + a
// per-shop b2bCustomers profile doc stamped with shopId. Differs from B2C in
// two ways:
//   1. Collects business fields (company / org-nr / VAT / address) — revived
//      from the old reseller RegisterPage field set.
//   2. Creates the profile with active:false — a same-shop admin must ACTIVATE
//      it before the customer can use the portal (the firestore-rules gate).
//      The rules REQUIRE an explicit active field on create, so we always send
//      active:false (omitting it would be denied).
// Rendered at /:shopId/b2b/register inside ShopGate + AddonGate(feature="b2b"),
// so useShopId() resolves the current shop and a non-B2B shop has no such page.
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSimpleAuth } from '../../contexts/SimpleAuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { useShopId } from '../../contexts/ShopContext';
import { withShopId } from '../../config/withShopId';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import toast from 'react-hot-toast';
import ShopNavigation from '../../components/shop/ShopNavigation';
import ShopFooter from '../../components/shop/ShopFooter';

const B2BRegister = () => {
  const { t, currentLanguage } = useTranslation();
  const shopId = useShopId();
  const { register } = useSimpleAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    orgNumber: '',
    vatNumber: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    postalCode: '',
    city: '',
    country: 'Sverige',
    password: '',
    confirmPassword: '',
    termsConsent: false,
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const e = {};
    if (!formData.companyName.trim()) e.companyName = t('b2b_register_error_company', 'Företagsnamn krävs');
    if (!formData.orgNumber.trim()) e.orgNumber = t('b2b_register_error_orgnr', 'Organisationsnummer krävs');
    if (!formData.contactPerson.trim()) e.contactPerson = t('b2b_register_error_contact', 'Kontaktperson krävs');
    if (!formData.email.trim()) e.email = t('b2b_register_error_email_required', 'E-postadress krävs');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = t('b2b_register_error_email_invalid', 'Ogiltig e-postadress');
    if (!formData.password) e.password = t('b2b_register_error_password_required', 'Lösenord krävs');
    else if (formData.password.length < 6) e.password = t('b2b_register_error_password_length', 'Lösenordet måste vara minst 6 tecken');
    if (formData.password !== formData.confirmPassword) e.confirmPassword = t('b2b_register_error_password_mismatch', 'Lösenorden matchar inte');
    if (!formData.termsConsent) e.termsConsent = t('b2b_register_error_terms', 'Du måste godkänna villkoren');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    const toastId = toast.loading(t('b2b_register_loading', 'Skickar ansökan...'));

    try {
      // 1. Create the Firebase Auth account (shared Auth pool with B2C).
      const firebaseUser = await register(formData.email, formData.password);

      // 2. Create the per-shop B2B customer profile — INACTIVE (admin gate).
      //    active:false is MANDATORY on create per the firestore rules.
      const profile = {
        firebaseAuthUid: firebaseUser.uid,
        email: formData.email,
        companyName: formData.companyName.trim(),
        orgNumber: formData.orgNumber.trim(),
        vatNumber: formData.vatNumber.trim(),
        contactPerson: formData.contactPerson.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        postalCode: formData.postalCode.trim(),
        city: formData.city.trim(),
        country: formData.country || 'Sverige',
        active: false, // ← admin must activate (the gate)
        marginal: 0, // dormant; reserved for an optional per-customer discount
        preferredLang: currentLanguage,
        source: 'b2b_registration',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'b2bCustomers'), withShopId(profile, shopId));

      toast.dismiss(toastId);
      setSubmitted(true);
    } catch (error) {
      toast.dismiss(toastId);
      console.error('B2B registration error:', error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error(t('b2b_register_error_email_exists', 'E-postadressen används redan. Försök logga in istället.'));
      } else {
        toast.error(t('b2b_register_error_generic', 'Ett fel uppstod. Försök igen.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
  const labelCls = 'block text-sm font-medium text-gray-700';
  const errCls = 'mt-1 text-xs text-red-600';

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <ShopNavigation />
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-12">
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-semibold text-gray-900">
              {t('b2b_register_done_title', 'Tack för din ansökan!')}
            </h1>
            <p className="mt-3 text-sm text-gray-600">
              {t('b2b_register_done_body', 'Din ansökan granskas av butiken. Du får ett meddelande när ditt grossistkonto har aktiverats och du kan logga in.')}
            </p>
            <Link
              to={`/${shopId}`}
              className="mt-6 inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {t('b2b_register_done_back', 'Till butiken')}
            </Link>
          </div>
        </main>
        <ShopFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <ShopNavigation />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold text-gray-900">
            {t('b2b_register_title', 'Ansök om grossistkonto')}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {t('b2b_register_subtitle', 'Fyll i företagsuppgifterna nedan. Vi granskar din ansökan och aktiverar kontot.')}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Company */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelCls}>{t('b2b_register_company', 'Företagsnamn')} *</label>
                <input name="companyName" value={formData.companyName} onChange={handleChange} className={inputCls} />
                {errors.companyName && <p className={errCls}>{errors.companyName}</p>}
              </div>
              <div>
                <label className={labelCls}>{t('b2b_register_orgnr', 'Organisationsnummer')} *</label>
                <input name="orgNumber" value={formData.orgNumber} onChange={handleChange} className={inputCls} />
                {errors.orgNumber && <p className={errCls}>{errors.orgNumber}</p>}
              </div>
              <div>
                <label className={labelCls}>{t('b2b_register_vatnr', 'Momsregistreringsnummer')}</label>
                <input name="vatNumber" value={formData.vatNumber} onChange={handleChange} className={inputCls} />
              </div>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>{t('b2b_register_contact', 'Kontaktperson')} *</label>
                <input name="contactPerson" value={formData.contactPerson} onChange={handleChange} className={inputCls} />
                {errors.contactPerson && <p className={errCls}>{errors.contactPerson}</p>}
              </div>
              <div>
                <label className={labelCls}>{t('b2b_register_phone', 'Telefon')}</label>
                <input name="phone" value={formData.phone} onChange={handleChange} className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>{t('b2b_register_email', 'E-post')} *</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className={inputCls} />
                {errors.email && <p className={errCls}>{errors.email}</p>}
              </div>
            </div>

            {/* Address */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelCls}>{t('b2b_register_address', 'Adress')}</label>
                <input name="address" value={formData.address} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t('b2b_register_postal', 'Postnummer')}</label>
                <input name="postalCode" value={formData.postalCode} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t('b2b_register_city', 'Ort')}</label>
                <input name="city" value={formData.city} onChange={handleChange} className={inputCls} />
              </div>
            </div>

            {/* Account */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>{t('b2b_register_password', 'Lösenord')} *</label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} className={inputCls} />
                {errors.password && <p className={errCls}>{errors.password}</p>}
              </div>
              <div>
                <label className={labelCls}>{t('b2b_register_confirm', 'Bekräfta lösenord')} *</label>
                <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className={inputCls} />
                {errors.confirmPassword && <p className={errCls}>{errors.confirmPassword}</p>}
              </div>
            </div>

            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input type="checkbox" name="termsConsent" checked={formData.termsConsent} onChange={handleChange} className="mt-0.5" />
              <span>{t('b2b_register_terms', 'Jag godkänner användarvillkoren och behandlingen av mina företagsuppgifter.')}</span>
            </label>
            {errors.termsConsent && <p className={errCls}>{errors.termsConsent}</p>}

            <div className="flex items-center justify-between pt-2">
              <Link to="/login" className="text-sm text-blue-600 hover:underline">
                {t('b2b_register_have_account', 'Har du redan ett konto? Logga in')}
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? t('b2b_register_submitting', 'Skickar...') : t('b2b_register_submit', 'Skicka ansökan')}
              </button>
            </div>
          </form>
        </div>
      </main>
      <ShopFooter />
    </div>
  );
};

export default B2BRegister;
