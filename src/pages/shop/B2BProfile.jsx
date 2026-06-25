// B2BProfile — an active B2B customer views/edits their own company profile.
// Reads the resolved profile from B2BCustomerContext and writes via updateDoc to
// b2bCustomers/{id}. Per firestore.rules the owner may change profile fields but
// NOT active / shopId / firebaseAuthUid — so this form never touches those.
import React, { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useB2BCustomer } from '../../contexts/B2BCustomerContext';
import { useTranslation } from '../../contexts/TranslationContext';
import toast from 'react-hot-toast';

// Company (billing) fields.
const FIELDS = [
  ['companyName', 'Företagsnamn'],
  ['orgNumber', 'Organisationsnummer'],
  ['vatNumber', 'Momsregistreringsnummer'],
  ['contactPerson', 'Kontaktperson'],
  ['phone', 'Telefon'],
  ['address', 'Adress'],
  ['postalCode', 'Postnummer'],
  ['city', 'Ort'],
];
// Separate delivery (shipping) fields — wholesale buyers often bill HQ but ship
// to a store. Editable only when "same as company" is OFF.
const DELIVERY_FIELDS = [
  ['deliveryAddress', 'Leveransadress'],
  ['deliveryPostalCode', 'Postnummer'],
  ['deliveryCity', 'Ort'],
];

export default function B2BProfile() {
  const { profile, reload } = useB2BCustomer();
  const { t } = useTranslation();
  const [form, setForm] = useState(() => ({
    ...FIELDS.reduce((acc, [k]) => ({ ...acc, [k]: profile?.[k] || '' }), {}),
    ...DELIVERY_FIELDS.reduce((acc, [k]) => ({ ...acc, [k]: profile?.[k] || '' }), {}),
    // Default-ON: a profile without the flag (incl. all existing ones) ships to
    // the company address, exactly as before this feature.
    sameAsCompany: profile?.sameAsCompany !== false,
  }));
  const [saving, setSaving] = useState(false);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const onSave = async (e) => {
    e.preventDefault();
    if (!profile?.id) return;
    setSaving(true);
    try {
      // Only profile fields — never active/shopId/firebaseAuthUid.
      const patch = FIELDS.reduce((acc, [k]) => ({ ...acc, [k]: (form[k] || '').trim() }), {});
      patch.sameAsCompany = !!form.sameAsCompany;
      // Persist delivery fields only when a distinct delivery address is used;
      // when "same as company" is on, clear them so stale values can't ship.
      for (const [k] of DELIVERY_FIELDS) {
        patch[k] = form.sameAsCompany ? '' : (form[k] || '').trim();
      }
      patch.updatedAt = serverTimestamp();
      await updateDoc(doc(db, 'b2bCustomers', profile.id), patch);
      toast.success(t('b2b_profile_saved', 'Uppgifter sparade'));
      reload();
    } catch (err) {
      console.error('B2BProfile save failed:', err);
      toast.error(t('b2b_profile_save_failed', 'Kunde inte spara'));
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">{t('b2b_nav_profile', 'Profil')}</h1>
      <p className="mt-2 text-sm text-gray-600">{t('b2b_profile_intro', 'Dina företagsuppgifter.')}</p>

      <form onSubmit={onSave} className="mt-6 max-w-2xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {/* Email is the account identity — shown read-only. */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">{t('b2b_profile_email', 'E-post')}</label>
          <input value={profile?.email || ''} disabled className={inputCls + ' bg-gray-50 text-gray-500'} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FIELDS.map(([key, label]) => (
            <div key={key} className={key === 'companyName' || key === 'address' ? 'sm:col-span-2' : ''}>
              <label className="block text-sm font-medium text-gray-700">{t(`b2b_profile_${key}`, label)}</label>
              <input name={key} value={form[key]} onChange={onChange} className={inputCls} />
            </div>
          ))}
        </div>

        {/* Delivery address — bill HQ, ship elsewhere. Default = same as company. */}
        <div className="mt-6 border-t border-gray-100 pt-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="sameAsCompany" checked={form.sameAsCompany} onChange={onChange} />
            {t('b2b_profile_same_delivery', 'Leveransadress är samma som företagsadress')}
          </label>
          {!form.sameAsCompany && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {DELIVERY_FIELDS.map(([key, label]) => (
                <div key={key} className={key === 'deliveryAddress' ? 'sm:col-span-2' : ''}>
                  <label className="block text-sm font-medium text-gray-700">{t(`b2b_profile_${key}`, label)}</label>
                  <input name={key} value={form[key]} onChange={onChange} className={inputCls} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? t('b2b_profile_saving', 'Sparar...') : t('b2b_profile_save', 'Spara')}
          </button>
        </div>
      </form>
    </div>
  );
}
