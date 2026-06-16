import React, { useEffect, useState, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SimpleAuthContextProvider } from './contexts/SimpleAuthContext';
import { OrderProvider } from './contexts/OrderContext';
import { CartProvider } from './contexts/CartContext';
import { TranslationProvider, useTranslation } from './contexts/TranslationContext';
import { LanguageCurrencyProvider } from './contexts/LanguageCurrencyContext';
import { StoreSettingsProvider } from './contexts/StoreSettingsContext';
import { ShopProvider } from './contexts/ShopContext';
import { ShopFeaturesProvider } from './contexts/ShopFeaturesContext';
import AddonGate from './components/addons/AddonGate';
import { WAGON_FEATURE_KEY } from './config/addons';
import { functions } from './firebase/config';
import { httpsCallable } from 'firebase/functions';

// 🚂 WAGON SYSTEM: Single connection point
import wagonRegistry from './wagons/WagonRegistry.js';

// B2C Shop Components
import CookiebotCMP from './components/shop/CookiebotCMP';

// Admin console components.
// The B2B reseller portal was removed (B2B→B2C collapse, 2026-06-13;
// archived at git tag `b2b-portal-archive`). The non-shop hostname now
// serves ONLY the admin console: /login + /admin/* + admin wagon routes.
import PrivateRoute from './components/auth/PrivateRoute';
import AdminRoute from './components/auth/AdminRoute';
import PlatformRoute from './components/auth/PlatformRoute';
import ImpersonationIntake from './components/auth/ImpersonationIntake';
import PlatformShops from './pages/platform/PlatformShops';
import PlatformAddons from './pages/platform/PlatformAddons';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminUserCreate from './pages/admin/AdminUserCreate';
import AdminUserEdit from './pages/admin/AdminUserEdit';
import AdminB2CCustomers from './pages/admin/AdminB2CCustomers';
import AdminB2CCustomerEdit from './pages/admin/AdminB2CCustomerEdit';
import AdminOrders from './pages/admin/AdminOrders';
import AdminOrderDetail from './pages/admin/AdminOrderDetail';
import AdminProducts from './pages/admin/AdminProducts';
import AdminStorefront from './pages/admin/AdminStorefront';
import AdminMarketingMaterials from './pages/admin/AdminMarketingMaterials';
import AdminMarketingMaterialEdit from './pages/admin/AdminMarketingMaterialEdit';
// Google Shopping admin removed — Google Merchant feature cut (POD shops don't need it).
// import AdminGoogleShopping from './pages/admin/AdminGoogleShopping';
import AdminCustomerMarketingMaterials from './pages/admin/AdminCustomerMarketingMaterials';
import AdminCustomerMarketingMaterialEdit from './pages/admin/AdminCustomerMarketingMaterialEdit';
import AdminPages from './pages/admin/AdminPages';
import AdminPageEdit from './pages/admin/AdminPageEdit';
import AdminSettings from './pages/admin/AdminSettings';
// 🇸🇪 SE-ONLY LAUNCH: AdminTranslations hidden (single-language). Re-enable with its route below.
// import AdminTranslations from './pages/admin/AdminTranslations';

// B2C Shop Components (new)
import PublicStorefront from './pages/shop/PublicStorefront';
import PublicProductPage from './pages/shop/PublicProductPage';
import ShoppingCart from './pages/shop/ShoppingCart';
import Checkout from './pages/shop/Checkout';
import CustomerAccount from './pages/shop/CustomerAccount';
import CustomerLogin from './pages/shop/CustomerLogin';
import CustomerRegister from './pages/shop/CustomerRegister';
import ForgotPassword from './pages/shop/ForgotPassword';
import ResetPassword from './pages/shop/ResetPassword';
import EmailVerificationHandler from './pages/shop/EmailVerificationHandler';
import ShopGate from './components/shop/ShopGate';
import CollectionPage from './pages/shop/CollectionPage';
import DynamicRouteHandler from './components/shop/DynamicRouteHandler';
import { DEFAULT_SHOP_ID } from './config/tenancy';

// Legal & Compliance Pages (now handled by CMS)
import ShippingInfo from './pages/shop/ShippingInfo';

// Dynamic CMS Pages
import DynamicPage from './pages/shop/DynamicPage';

// Affiliate Program Pages
import AffiliateRegistration from './pages/shop/AffiliateRegistration';
import AffiliateLogin from './pages/shop/AffiliateLogin';
import AffiliatePortal from './pages/shop/AffiliatePortal';
import AdminAffiliates from './pages/admin/AdminAffiliates';
import AdminAffiliateEdit from './pages/admin/AdminAffiliateEdit';
import AdminAffiliateCreate from './pages/admin/AdminAffiliateCreate';
import AdminAffiliateAnalytics from './pages/admin/AdminAffiliateAnalytics';
import AdminAffiliatePayout from './pages/admin/AdminAffiliatePayout';
import AffiliateTracker from './components/AffiliateTracker';
import ScrollToTop from './components/ScrollToTop';

// Order Confirmation
import OrderConfirmation from './pages/shop/OrderConfirmation';
import OrderReturn from './pages/shop/OrderReturn';

import { Toaster } from 'react-hot-toast';

// Component to conditionally wrap with TranslationProvider + LanguageCurrencyProvider based on route
const ConditionalTranslationProvider = ({ children, appMode }) => {
  const location = useLocation();
  
  // B2C Shop uses both TranslationProvider and LanguageCurrencyProvider for geo + language + currency
  if (appMode === 'shop') {
    console.log(`🌍 CONDITIONAL: B2C Shop mode - using TranslationProvider + LanguageCurrencyProvider for geo/i18n`);
    return (
      <TranslationProvider>
        <LanguageCurrencyProvider>
          {children}
        </LanguageCurrencyProvider>
      </TranslationProvider>
    );
  }
  
  // Admin credential pages should NOT use TranslationProvider (they use credentialTranslations)
  const credentialRoutes = ['/login', '/forgot-password'];
  const isCredentialPage = credentialRoutes.includes(location.pathname);
  
  if (isCredentialPage) {
    console.log(`🌍 CONDITIONAL: Credential page detected (${location.pathname}) - using credentialTranslations`);
    return children; // No TranslationProvider wrapper
  } else {
    console.log(`🌍 CONDITIONAL: Authenticated page detected (${location.pathname}) - using TranslationProvider`);
    return <TranslationProvider>{children}</TranslationProvider>;
  }
};

function App() {
  // 🚂 WAGON SYSTEM: State for wagon routes
  const [wagonRoutes, setWagonRoutes] = useState([]);

  // Detect subdomain to determine which app to show
  const hostname = window.location.hostname || '';
  const subdomain = (hostname && typeof hostname === 'string') ? hostname.split('.')[0] : '';
  
  // Determine app mode based on subdomain.
  // Accept a `shop-` prefix too, so Firebase hosting sites like
  // `shop-b8shield.web.app` trigger shop mode (the .web.app first segment is the
  // whole site ID, which can't be exactly "shop"). `shop.b8shield.com` still matches.
  const isShopSubdomain = subdomain === 'shop' || subdomain.startsWith('shop-');

  // Platform operator console — its own subdomain (platform.* / platform-*),
  // a separate, siloed surface from shop admin. (See docs/PLATFORM_ARCHITECTURE.md)
  const isPlatformSubdomain = subdomain === 'platform' || subdomain.startsWith('platform-');

  // Three siloed surfaces: 'platform' (operator), 'shop' (storefront), 'admin'
  // (shop admin — the default for any non-shop, non-platform host).
  const appMode = isPlatformSubdomain ? 'platform' : (isShopSubdomain ? 'shop' : 'admin');

  // 🚂 WAGON SYSTEM: Auto-discover all wagons (ONLY CONNECTION POINT NEEDED!)
  useEffect(() => {
    const initializeWagons = async () => {
      console.log('Add-ons: discovering…');
      
      // Discover and connect all wagons
      await wagonRegistry.discoverWagons();
      
      // Get wagon routes for the current app mode (FIX: await the async function)
      const routes = await wagonRegistry.getRoutes();
      const filteredRoutes = routes.filter(route => {
        // Wagon routes are admin tooling — only mounted in admin mode
        return appMode === 'admin';
      });
      
      setWagonRoutes(filteredRoutes);
      
      console.log(`✅ B8Shield Train: ${filteredRoutes.length} wagon routes connected for ${appMode} mode`);
    };

    initializeWagons();
  }, [appMode]);

  // The affiliate link handling logic has been moved to the AffiliateTracker component.
  // This ensures it runs on every route change.
  
  console.log('App Mode:', appMode, 'Hostname:', hostname, 'Subdomain:', subdomain);

  const content = (
    <>
      <ScrollToTop />
      {appMode === 'shop' && <CookiebotCMP />}
      {/* P4.3: consume ?impersonate=&audit= on the admin host (platform-gated). */}
      {appMode === 'admin' && <ImpersonationIntake />}
      <AffiliateTracker />
      <ConditionalTranslationProvider appMode={appMode}>
        <div className="min-h-screen bg-gray-50">
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
          
          <Routes>
          {appMode === 'platform' ? (
            // Platform operator console — its own siloed surface. Distinct
            // PlatformLayout (NOT the shop-admin shell). Gated to platform users.
            <>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/__/auth/action" element={<EmailVerificationHandler />} />
              <Route path="/" element={
                <PlatformRoute><PlatformShops /></PlatformRoute>
              } />
              <Route path="/shops" element={
                <PlatformRoute><PlatformShops /></PlatformRoute>
              } />
              <Route path="/addons" element={
                <PlatformRoute><PlatformAddons /></PlatformRoute>
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : appMode === 'shop' ? (
            // B2C Shop Routes — PATH-PREFIX multi-tenant grammar:
            // /{shopId}, /{shopId}/product/:slug, /{shopId}/cart, etc.
            // Bare / redirects to the default shop. Swedish-only (i18n deferred);
            // legacy /se/... links are redirected by LegacyCountryRedirect.
            <>
              {/* Bare root → default shop's storefront */}
              <Route path="/" element={<Navigate to={`/${DEFAULT_SHOP_ID}`} replace />} />

              {/* Credential pages — shop-global, no shop prefix */}
              <Route path="/login" element={<CustomerLogin />} />
              <Route path="/register" element={<CustomerRegister />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/affiliate-login" element={<AffiliateLogin />} />
              <Route path="/__/auth/action" element={<EmailVerificationHandler />} />

              {/* Per-shop storefront (shopId = first path segment). ShopGate
                  validates the shop (redirects legacy /se & unknown shops,
                  shows "unavailable" for disabled shops) before rendering. */}
              <Route path="/:shopId" element={<ShopGate><PublicStorefront /></ShopGate>} />
              <Route path="/:shopId/product/:slug" element={<ShopGate><PublicProductPage /></ShopGate>} />
              <Route path="/:shopId/cart" element={<ShopGate><ShoppingCart /></ShopGate>} />
              <Route path="/:shopId/checkout" element={<ShopGate><Checkout /></ShopGate>} />
              <Route path="/:shopId/order-return" element={<ShopGate><OrderReturn /></ShopGate>} />
              <Route path="/:shopId/order-confirmation/:orderId" element={<ShopGate><OrderConfirmation /></ShopGate>} />
              <Route path="/:shopId/account" element={<ShopGate><CustomerAccount /></ShopGate>} />
              <Route path="/:shopId/affiliate-registration" element={<ShopGate><AddonGate feature="affiliate" redirectTo="shop-home"><AffiliateRegistration /></AddonGate></ShopGate>} />
              <Route path="/:shopId/affiliate-portal" element={<ShopGate><AddonGate feature="affiliate" redirectTo="shop-home"><AffiliatePortal /></AddonGate></ShopGate>} />

              {/* Category browse pages (the primary taxonomy). Specific path so
                  it matches before the CMS catch-all below. */}
              <Route path="/:shopId/kategori/:category" element={<ShopGate><CollectionPage /></ShopGate>} />

              {/* Per-shop CMS pages: /{shopId}/{slug} — DynamicRouteHandler reads
                  the slug after the shopId. Falls back to the shop home. */}
              <Route path="/:shopId/*" element={
                <ShopGate>
                  <DynamicRouteHandler>
                    <Navigate to="/" replace />
                  </DynamicRouteHandler>
                </ShopGate>
              } />

              {/* Catch-all → default shop */}
              <Route path="*" element={<Navigate to={`/${DEFAULT_SHOP_ID}`} replace />} />
            </>
          ) : (
            // Admin console routes (B2B portal removed — see b2b-portal-archive tag)
            <>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* Firebase Auth Action Handler - Email Verification */}
              <Route path="/__/auth/action" element={<EmailVerificationHandler />} />

              {/* Root goes straight to the admin console (login-gated) */}
              <Route path="/" element={<Navigate to="/admin" replace />} />

              {/* Admin Routes - Grouped under /admin prefix */}
              <Route path="/admin" element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } />
              
              <Route path="/admin/users" element={
                <AdminRoute>
                  <AdminUsers />
                </AdminRoute>
              } />
              
              <Route path="/admin/users/create" element={
                <AdminRoute>
                  <AdminUserCreate />
                </AdminRoute>
              } />
              
              <Route path="/admin/users/:userId/edit" element={
                <AdminRoute>
                  <AdminUserEdit />
                </AdminRoute>
              } />
              
              <Route path="/admin/b2c-customers" element={
                <AdminRoute>
                  <AdminB2CCustomers />
                </AdminRoute>
              } />
              
              <Route path="/admin/b2c-customers/:customerId" element={
                <AdminRoute>
                  <AdminB2CCustomerEdit />
                </AdminRoute>
              } />
              
              <Route path="/admin/orders" element={
                <AdminRoute>
                  <AdminOrders />
                </AdminRoute>
              } />
              
              <Route path="/admin/orders/:orderId" element={
                <AdminRoute>
                  <AdminOrderDetail />
                </AdminRoute>
              } />
              
              <Route path="/admin/products" element={
                <AdminRoute>
                  <AdminProducts />
                </AdminRoute>
              } />

              <Route path="/admin/storefront" element={
                <AdminRoute>
                  <AdminStorefront />
                </AdminRoute>
              } />

              <Route path="/admin/marketing" element={
                <AdminRoute>
                  <AdminMarketingMaterials />
                </AdminRoute>
              } />
              
              <Route path="/admin/marketing/:materialId/edit" element={
                <AdminRoute>
                  <AdminMarketingMaterialEdit />
                </AdminRoute>
              } />

              <Route path="/admin/customers/:customerId/marketing" element={
                <AdminRoute>
                  <AdminCustomerMarketingMaterials />
                </AdminRoute>
              } />

              <Route path="/admin/customers/:customerId/marketing/:materialId/edit" element={
                <AdminRoute>
                  <AdminCustomerMarketingMaterialEdit />
                </AdminRoute>
              } />

              <Route path="/admin/pages" element={
                <AdminRoute>
                  <AdminPages />
                </AdminRoute>
              } />

              <Route path="/admin/pages/:id" element={
                <AdminRoute>
                  <AdminPageEdit />
                </AdminRoute>
              } />

              {/* Affiliate is an add-on: its ADMIN routes are gated on the
                  `affiliate` feature flag (menu + route now). Storefront/checkout/
                  function enforcement is the P4.5b follow-up. Default-ON keeps
                  existing shops working. */}
              <Route path="/admin/affiliates" element={
                <AddonGate feature="affiliate"><AdminRoute>
                  <AdminAffiliates />
                </AdminRoute></AddonGate>
              } />
              <Route path="/admin/affiliates/create" element={
                <AddonGate feature="affiliate"><AdminRoute>
                  <AdminAffiliateCreate />
                </AdminRoute></AddonGate>
              } />

              <Route path="/admin/affiliates/analytics" element={
                <AddonGate feature="affiliate"><AdminRoute>
                  <AdminAffiliateAnalytics />
                </AdminRoute></AddonGate>
              } />

              <Route path="/admin/affiliates/application/:id" element={
                <AddonGate feature="affiliate"><AdminRoute>
                  <AdminAffiliateEdit />
                </AdminRoute></AddonGate>
              } />

              <Route path="/admin/affiliates/manage/:id" element={
                <AddonGate feature="affiliate"><AdminRoute>
                  <AdminAffiliateEdit />
                </AdminRoute></AddonGate>
              } />

              <Route path="/admin/affiliates/payout/:affiliateId" element={
                <AddonGate feature="affiliate"><AdminRoute>
                  <AdminAffiliatePayout />
                </AdminRoute></AddonGate>
              } />

              <Route path="/admin/settings" element={
                <AdminRoute>
                  <AdminSettings />
                </AdminRoute>
              } />

              {/* 🇸🇪 SE-ONLY LAUNCH: Translations admin route hidden (single-language).
                  Runtime i18n engine stays active. Re-enable for internationalization. */}
              {/* <Route path="/admin/translations" element={
                <AdminRoute>
                  <AdminTranslations />
                </AdminRoute>
              } /> */}

              {/* 🚂 WAGON SYSTEM: Auto-generated wagon (add-on) routes.
                  Each is wrapped in <AddonGate> so a disabled add-on's route
                  redirects to /admin even via deep link (defense in depth on
                  top of the hidden menu item). Gated only when the wagon id maps
                  to a feature key; default-ON keeps existing shops working. */}
              {wagonRoutes.map(({ path, component: Component, adminOnly, private: isPrivate, wagonId }) => {
                const featureKey = WAGON_FEATURE_KEY[wagonId];
                const inner = (
                  <Suspense fallback={
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                      <span className="ml-3 text-lg text-gray-600">Laddar tillägg...</span>
                    </div>
                  }>
                    {isPrivate ? (
                      adminOnly ? (
                        <AdminRoute><Component /></AdminRoute>
                      ) : (
                        <PrivateRoute><Component /></PrivateRoute>
                      )
                    ) : (
                      <Component />
                    )}
                  </Suspense>
                );
                return (
                  <Route
                    key={`${wagonId}-${path}`}
                    path={path}
                    element={featureKey ? <AddonGate feature={featureKey}>{inner}</AddonGate> : inner}
                  />
                );
              })}
              
              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
        </div>
      </ConditionalTranslationProvider>
    </>
  );

  return (
    <Router>
      {/* P4.3: only the admin surface honors an operator impersonation session
          (it overrides the path-resolved shopId so shop admin renders the
          target tenant). Storefront/platform never impersonate. */}
      <ShopProvider impersonationEnabled={appMode === 'admin'}>
        <StoreSettingsProvider>
          <ShopFeaturesProvider>
            <AuthProvider>
              <SimpleAuthContextProvider>
                <OrderProvider>
                  <CartProvider>
                    {content}
                  </CartProvider>
                </OrderProvider>
              </SimpleAuthContextProvider>
            </AuthProvider>
          </ShopFeaturesProvider>
        </StoreSettingsProvider>
      </ShopProvider>
    </Router>
  );
}

export default App; 