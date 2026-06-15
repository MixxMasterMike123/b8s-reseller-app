import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import toast from 'react-hot-toast';
import AppLayout from '../../components/layout/AppLayout';
import { useTranslation } from '../../contexts/TranslationContext';
import { useShopId } from '../../contexts/ShopContext';
import { withShopId } from '../../config/withShopId';
import { Page, CardSection, RightRail, Button } from '../../components/admin/ui';

const AdminAffiliateCreate = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const shopId = useShopId();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    postalCode: '',
    city: '',
    country: 'SE',
    website: '',
    instagram: '',
    youtube: '',
    facebook: '',
    tiktok: '',
    promotionMethod: '',
    message: '',
    commissionRate: 15,
    checkoutDiscount: 10,
    preferredLang: 'sv-SE'
  });

  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const generateAffiliateCode = (name) => {
    const namePart = name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').substring(0, 8);
    const randomPart = Math.floor(100 + Math.random() * 900);
    return `${namePart}-${randomPart}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      toast.error('Namn och e-post är obligatoriska fält.');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Skapar affiliate...');

    try {
      // Generate affiliate code
      const affiliateCode = generateAffiliateCode(formData.name);

      // Create socials object
      const socials = {
        website: formData.website || '',
        instagram: formData.instagram || '',
        youtube: formData.youtube || '',
        facebook: formData.facebook || '',
        tiktok: formData.tiktok || ''
      };

      // Save to Firestore and get the real document ID
      const docRef = await addDoc(collection(db, 'affiliates'), withShopId({
        affiliateCode,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || '',
        address: formData.address || '',
        postalCode: formData.postalCode || '',
        city: formData.city || '',
        country: formData.country,
        socials,
        promotionMethod: formData.promotionMethod || '',
        message: formData.message || '',
        status: 'inactive', // Default to inactive
        commissionRate: parseInt(formData.commissionRate) || 15,
        checkoutDiscount: parseInt(formData.checkoutDiscount) || 10,
        preferredLang: formData.preferredLang,
        stats: {
          clicks: 0,
          conversions: 0,
          totalEarnings: 0,
          balance: 0,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, shopId));

      const realId = docRef.id;

      // Update the document with its own ID field
      await setDoc(doc(db, 'affiliates', realId), {
        id: realId // Store the document ID in the data itself
      }, { merge: true });

      toast.success(`Affiliate "${formData.name}" har skapats med kod: ${affiliateCode}`, { id: toastId, duration: 5000 });
      navigate('/admin/affiliates');

    } catch (error) {
      console.error('Error creating affiliate:', error);
      toast.error(`Kunde inte skapa affiliate: ${error.message}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const labelCls = 'block text-[13px] font-medium text-admin-text mb-1';
  const inputCls =
    'w-full rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface px-3 py-1.5 text-[13px] text-admin-text placeholder:text-admin-text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-admin-primary)]';
  const helpCls = 'mt-1 text-[12px] text-admin-text-muted';

  return (
    <AppLayout>
      <Page
        title="Skapa ny affiliate"
        subtitle="Lägg till en ny affiliate manuellt. Affiliaten skapas som inaktiv och kan aktiveras senare."
        back={{ to: '/admin/affiliates', label: 'Affiliates' }}
      >
        <form onSubmit={handleSubmit}>
          <RightRail
            main={
              <>
                {/* Basic Information */}
                <CardSection title="Grundläggande information" bodyClassName="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelCls}>Namn *</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className={inputCls}
                        placeholder="Förnamn Efternamn"
                      />
                    </div>

                    <div>
                      <label className={labelCls}>E-post *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className={inputCls}
                        placeholder="email@example.com"
                      />
                    </div>

                    <div>
                      <label className={labelCls}>Telefon</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={inputCls}
                        placeholder="+46 70 123 45 67"
                      />
                    </div>

                    <div>
                      <label className={labelCls}>Land</label>
                      <select
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        className={inputCls}
                      >
                        <option value="SE">Sverige</option>
                        <option value="NO">Norge</option>
                        <option value="DK">Danmark</option>
                        <option value="FI">Finland</option>
                        <option value="DE">Tyskland</option>
                        <option value="US">USA</option>
                        <option value="GB">Storbritannien</option>
                      </select>
                    </div>
                  </div>
                </CardSection>

                {/* Address Information */}
                <CardSection title="Adressinformation" bodyClassName="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="md:col-span-2">
                      <label className={labelCls}>Adress</label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className={inputCls}
                        placeholder="Gatunamn 123"
                      />
                    </div>

                    <div>
                      <label className={labelCls}>Postnummer</label>
                      <input
                        type="text"
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handleInputChange}
                        className={inputCls}
                        placeholder="123 45"
                      />
                    </div>

                    <div>
                      <label className={labelCls}>Stad</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className={inputCls}
                        placeholder="Stockholm"
                      />
                    </div>
                  </div>
                </CardSection>

                {/* Social Media */}
                <CardSection title="Sociala medier & hemsida" bodyClassName="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelCls}>Hemsida</label>
                      <input
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleInputChange}
                        className={inputCls}
                        placeholder="https://example.com"
                      />
                    </div>

                    <div>
                      <label className={labelCls}>Instagram</label>
                      <input
                        type="text"
                        name="instagram"
                        value={formData.instagram}
                        onChange={handleInputChange}
                        className={inputCls}
                        placeholder="@username"
                      />
                    </div>

                    <div>
                      <label className={labelCls}>YouTube</label>
                      <input
                        type="text"
                        name="youtube"
                        value={formData.youtube}
                        onChange={handleInputChange}
                        className={inputCls}
                        placeholder="Kanalnamn"
                      />
                    </div>

                    <div>
                      <label className={labelCls}>Facebook</label>
                      <input
                        type="text"
                        name="facebook"
                        value={formData.facebook}
                        onChange={handleInputChange}
                        className={inputCls}
                        placeholder="Sidnamn"
                      />
                    </div>

                    <div>
                      <label className={labelCls}>TikTok</label>
                      <input
                        type="text"
                        name="tiktok"
                        value={formData.tiktok}
                        onChange={handleInputChange}
                        className={inputCls}
                        placeholder="@username"
                      />
                    </div>
                  </div>
                </CardSection>

                {/* Additional Information */}
                <CardSection title="Ytterligare information" bodyClassName="space-y-4">
                  <div>
                    <label className={labelCls}>Marknadsföringsmetod</label>
                    <textarea
                      name="promotionMethod"
                      value={formData.promotionMethod}
                      onChange={handleInputChange}
                      rows="3"
                      className={inputCls}
                      placeholder="Beskriv hur affiliate planerar att marknadsföra produkterna..."
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Meddelande</label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      rows="3"
                      className={inputCls}
                      placeholder="Ytterligare information eller meddelande..."
                    />
                  </div>
                </CardSection>

                {/* Save bar */}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => navigate('/admin/affiliates')} disabled={loading}>
                    Avbryt
                  </Button>
                  <Button type="submit" variant="primary" disabled={loading}>
                    {loading ? 'Skapar…' : 'Skapa affiliate'}
                  </Button>
                </div>
              </>
            }
            rail={
              <>
                {/* Status */}
                <CardSection title="Status" bodyClassName="space-y-2">
                  <p className="text-[13px] text-admin-text-muted">
                    Affiliaten skapas som <span className="font-medium text-admin-text">inaktiv</span> och kan aktiveras senare.
                  </p>
                </CardSection>

                {/* Commission Settings */}
                <CardSection title="Provision & rabatt" bodyClassName="space-y-4">
                  <div>
                    <label className={labelCls}>Provisionsgrad (%)</label>
                    <input
                      type="number"
                      name="commissionRate"
                      value={formData.commissionRate}
                      onChange={handleInputChange}
                      min="1"
                      max="50"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Kundrabatt (%)</label>
                    <input
                      type="number"
                      name="checkoutDiscount"
                      value={formData.checkoutDiscount}
                      onChange={handleInputChange}
                      min="0"
                      max="50"
                      className={inputCls}
                    />
                  </div>
                  <p className={helpCls}>Provision betalas ut till affiliaten; kundrabatt dras i kassan.</p>
                </CardSection>
              </>
            }
          />
        </form>
      </Page>
    </AppLayout>
  );
};

export default AdminAffiliateCreate;
