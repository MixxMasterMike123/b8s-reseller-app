// B2BPortalLayout — shared chrome + gate for the per-shop B2B portal.
// Wraps every /:shopId/b2b/* portal page (NOT the public /b2b/register).
//
// ⚠️ WALLED GARDEN: a logged-in B2B customer must NEVER leave /:shopId/b2b/*.
// So this layout uses its OWN dedicated chrome — NOT the consumer ShopNavigation
// / ShopFooter, which link out to the storefront home, cart, account, affiliate,
// categories, etc. Everything here (logo, nav, logout) stays inside the portal:
//   - the header logo/title links to the B2B dashboard (/:shopId/b2b), not the
//     consumer shop home;
//   - the only nav is the B2B sub-nav (dashboard/catalog/orders/profile);
//   - logout returns to /login (the shared credential page), not the storefront;
//   - there is NO cart / consumer-account / affiliate / category link.
//
// Gate states: auth loading → spinner; not logged in → /login (return here
// after); logged in but no profile → "apply"; profile active!=true → "awaiting
// activation"; active → portal page.
import React from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useShopId } from '../../contexts/ShopContext';
import { useSimpleAuth } from '../../contexts/SimpleAuthContext';
import { useStoreSettings } from '../../contexts/StoreSettingsContext';
import { useB2BCustomer } from '../../contexts/B2BCustomerContext';
import { useTranslation } from '../../contexts/TranslationContext';

// Portal-internal header. The brand links to the B2B dashboard (NOT the consumer
// shop home), so the logo/"home" affordance keeps the user inside the portal.
const PortalHeader = ({ shopId, showNav }) => {
  const { t } = useTranslation();
  const store = useStoreSettings();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { logout } = useSimpleAuth();
  const base = `/${shopId}/b2b`;

  const onLogout = async () => {
    try { await logout(); } finally { navigate('/login', { replace: true }); }
  };

  const navItems = [
    { to: base, label: t('b2b_nav_dashboard', 'Översikt'), exact: true },
    { to: `${base}/products`, label: t('b2b_nav_catalog', 'Grossistkatalog') },
    { to: `${base}/orders`, label: t('b2b_nav_orders', 'Mina ordrar') },
    { to: `${base}/profile`, label: t('b2b_nav_profile', 'Profil') },
  ];

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        {/* Brand → B2B dashboard (stays in the portal). */}
        <Link to={base} className="flex items-center gap-2">
          {store?.logoUrl && store.logoUrl !== '/images/logo.svg' ? (
            <img src={store.logoUrl} alt={store.shopName || ''} className="h-7 w-auto" />
          ) : (
            <span className="text-[15px] font-semibold text-gray-900">{store?.shopName || 'Grossist'}</span>
          )}
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">
            {t('b2b_badge', 'Grossist')}
          </span>
        </Link>
        <button type="button" onClick={onLogout} className="text-sm text-gray-600 hover:text-gray-900">
          {t('b2b_logout', 'Logga ut')}
        </button>
      </div>
      {showNav && (
        <nav className="mx-auto flex max-w-4xl flex-wrap gap-1 px-4">
          {navItems.map((it) => {
            const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`-mb-px rounded-t-md px-4 py-2 text-sm font-medium ${
                  active ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
};

// Self-contained shell — portal header + a minimal footer with NO outbound links.
const Shell = ({ shopId, showNav, children }) => {
  const { t } = useTranslation();
  const store = useStoreSettings();
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <PortalHeader shopId={shopId} showNav={showNav} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t border-gray-200 bg-white py-4">
        <div className="mx-auto max-w-4xl px-4 text-xs text-gray-400">
          {store?.shopName || ''} — {t('b2b_footer', 'Grossistportal')}
        </div>
      </footer>
    </div>
  );
};

const Spinner = () => (
  <div className="flex items-center justify-center py-24">
    <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
  </div>
);

export default function B2BPortalLayout({ children }) {
  const shopId = useShopId();
  const location = useLocation();
  const { t } = useTranslation();
  const { currentUser, loading: authLoading } = useSimpleAuth();
  const { loading, profile, isActive } = useB2BCustomer();

  // While resolving, show the portal shell WITHOUT nav (no escape links anyway).
  if (authLoading || loading) {
    return <Shell shopId={shopId} showNav={false}><Spinner /></Shell>;
  }

  // Not logged in → bounce to the shared login, remember where to return.
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in but no wholesale profile for THIS shop → invite to apply. The only
  // link is the (in-domain) register page; no consumer-shop escape.
  if (!profile) {
    return (
      <Shell shopId={shopId} showNav={false}>
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
  // No consumer-shop link — logout (in the header) is the only way out.
  if (!isActive) {
    return (
      <Shell shopId={shopId} showNav={false}>
        <div className="mx-auto max-w-lg rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">
            {t('b2b_pending_title', 'Din ansökan granskas')}
          </h1>
          <p className="mt-3 text-sm text-gray-600">
            {t('b2b_pending_body', 'Ditt grossistkonto väntar på godkännande. Du får tillgång till portalen när butiken har aktiverat ditt konto.')}
          </p>
        </div>
      </Shell>
    );
  }

  // Active wholesale customer → the portal (with the in-domain sub-nav).
  return (
    <Shell shopId={shopId} showNav>
      {children}
    </Shell>
  );
}
