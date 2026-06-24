// B2BDashboard — the portal home for an active wholesale customer. Welcome +
// quick links to the catalog / orders / profile. Shop-branded via the profile's
// companyName + the shop config (no hardcoded brand). Ordering is Phase 4, so a
// clear "coming soon" note stands where the order CTA will go.
import React from 'react';
import { Link } from 'react-router-dom';
import { useShopId } from '../../contexts/ShopContext';
import { useB2BCustomer } from '../../contexts/B2BCustomerContext';
import { useTranslation } from '../../contexts/TranslationContext';

const Card = ({ to, title, desc }) => (
  <Link
    to={to}
    className="block rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow"
  >
    <div className="font-semibold text-gray-900">{title}</div>
    <div className="mt-1 text-sm text-gray-600">{desc}</div>
  </Link>
);

export default function B2BDashboard() {
  const shopId = useShopId();
  const { profile } = useB2BCustomer();
  const { t } = useTranslation();
  const base = `/${shopId}/b2b`;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">
        {t('b2b_dash_welcome', 'Välkommen')}{profile?.companyName ? `, ${profile.companyName}` : ''}
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        {t('b2b_dash_intro', 'Här ser du grossistpriser, dina ordrar och dina företagsuppgifter.')}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card
          to={`${base}/products`}
          title={t('b2b_nav_catalog', 'Grossistkatalog')}
          desc={t('b2b_dash_catalog_desc', 'Se sortiment och grossistpriser.')}
        />
        <Card
          to={`${base}/orders`}
          title={t('b2b_nav_orders', 'Mina ordrar')}
          desc={t('b2b_dash_orders_desc', 'Följ dina beställningar.')}
        />
        <Card
          to={`${base}/profile`}
          title={t('b2b_nav_profile', 'Profil')}
          desc={t('b2b_dash_profile_desc', 'Uppdatera företagsuppgifter.')}
        />
      </div>

      {/* Ordering lands in Phase 4 (Faktura money flow). Make the gap explicit
          instead of shipping a dead button. */}
      <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-500">
        {t('b2b_dash_ordering_soon', 'Beställning via portalen kommer snart. Tills dess kan du se sortiment och priser i katalogen.')}
      </div>
    </div>
  );
}
