// B2BPortalLayout — shared chrome + gate for the per-shop B2B portal.
// Wraps every /:shopId/b2b/* portal page (NOT the public /b2b/register, which
// is open). Resolves the b2bCustomers profile via B2BCustomerContext and gates:
//   - auth still loading      → spinner
//   - not logged in           → bounce to /login (return here after)
//   - logged in, no profile   → "you have no wholesale account" + apply link
//   - profile but active!=true → "awaiting activation" (the admin gate)
//   - active                  → render the portal page (children) + sub-nav
// Storefront-branded chrome (ShopNavigation/ShopFooter), shop name from config.
import React from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useShopId } from '../../contexts/ShopContext';
import { useSimpleAuth } from '../../contexts/SimpleAuthContext';
import { useB2BCustomer } from '../../contexts/B2BCustomerContext';
import { useTranslation } from '../../contexts/TranslationContext';
import ShopNavigation from './ShopNavigation';
import ShopFooter from './ShopFooter';

const Shell = ({ children }) => (
  <div className="flex min-h-screen flex-col bg-gray-50">
    <ShopNavigation />
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
    <ShopFooter />
  </div>
);

const Spinner = () => (
  <div className="flex items-center justify-center py-24">
    <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
  </div>
);

// Sub-nav across the portal pages. Active link is bold.
const PortalNav = ({ shopId }) => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const base = `/${shopId}/b2b`;
  const items = [
    { to: base, label: t('b2b_nav_dashboard', 'Översikt'), exact: true },
    { to: `${base}/products`, label: t('b2b_nav_catalog', 'Grossistkatalog') },
    { to: `${base}/orders`, label: t('b2b_nav_orders', 'Mina ordrar') },
    { to: `${base}/profile`, label: t('b2b_nav_profile', 'Profil') },
  ];
  return (
    <nav className="mb-6 flex flex-wrap gap-1 border-b border-gray-200">
      {items.map((it) => {
        const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
        return (
          <Link
            key={it.to}
            to={it.to}
            className={`rounded-t-md px-4 py-2 text-sm font-medium ${
              active ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
};

export default function B2BPortalLayout({ children }) {
  const shopId = useShopId();
  const location = useLocation();
  const { t } = useTranslation();
  const { currentUser, loading: authLoading } = useSimpleAuth();
  const { loading, profile, isActive } = useB2BCustomer();

  if (authLoading || loading) {
    return <Shell><Spinner /></Shell>;
  }

  // Not logged in → bounce to the shared login, remember where to return.
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in but no wholesale profile for THIS shop → invite to apply.
  if (!profile) {
    return (
      <Shell>
        <div className="mx-auto max-w-lg rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">
            {t('b2b_no_account_title', 'Du har inget grossistkonto')}
          </h1>
          <p className="mt-3 text-sm text-gray-600">
            {t('b2b_no_account_body', 'Detta är grossistportalen. Ansök om ett konto för att se grossistpriser och beställa.')}
          </p>
          <Link
            to={`/${shopId}/b2b/register`}
            className="mt-6 inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {t('b2b_no_account_apply', 'Ansök om grossistkonto')}
          </Link>
        </div>
      </Shell>
    );
  }

  // Profile exists but not activated by an admin yet → awaiting activation.
  if (!isActive) {
    return (
      <Shell>
        <div className="mx-auto max-w-lg rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">
            {t('b2b_pending_title', 'Din ansökan granskas')}
          </h1>
          <p className="mt-3 text-sm text-gray-600">
            {t('b2b_pending_body', 'Ditt grossistkonto väntar på godkännande. Du får tillgång till portalen när butiken har aktiverat ditt konto.')}
          </p>
          <Link to={`/${shopId}`} className="mt-6 inline-block text-sm text-blue-600 hover:underline">
            {t('b2b_pending_back', 'Till butiken')}
          </Link>
        </div>
      </Shell>
    );
  }

  // Active wholesale customer → the portal.
  return (
    <Shell>
      <PortalNav shopId={shopId} />
      {children}
    </Shell>
  );
}
