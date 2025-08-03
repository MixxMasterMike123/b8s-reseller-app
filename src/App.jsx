import React, { useEffect, useState, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SimpleAuthContextProvider } from './contexts/SimpleAuthContext';
import { OrderProvider } from './contexts/OrderContext';
import { CartProvider } from './contexts/CartContext';
import { TranslationProvider, useTranslation } from './contexts/TranslationContext';
import { LanguageCurrencyProvider } from './contexts/LanguageCurrencyContext';
import { functions } from './firebase/config';
import { httpsCallable } from 'firebase/functions';

// 🚂 WAGON SYSTEM: Single connection point
import wagonRegistry from './wagons/WagonRegistry.js';

// Development Testing - Admin UID Manager (console testing)
import './utils/adminUIDManagerTest.js';

// B2C Shop Components
import CookiebotCMP from './components/shop/CookiebotCMP';

// B2B Reseller Portal Components (existing)
import PrivateRoute from './components/auth/PrivateRoute';
import AdminRoute from './components/auth/AdminRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ProductViewPage from './pages/ProductViewPage';
import MarketingMaterialsPage from './pages/MarketingMaterialsPage';
import OrderPage from './pages/OrderPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import OrderDetailPage from './pages/OrderDetailPage';
import ProfilePage from './pages/ProfilePage';
import ContactPage from './pages/ContactPage';
import TrainingStepPage from './pages/TrainingStepPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminUserCreate from './pages/admin/AdminUserCreate';
import AdminUserEdit from './pages/admin/AdminUserEdit';
import AdminB2CCustomers from './pages/admin/AdminB2CCustomers';
import AdminB2CCustomerEdit from './pages/admin/AdminB2CCustomerEdit';
import AdminOrders from './pages/admin/AdminOrders';
import AdminOrderDetail from './pages/admin/AdminOrderDetail';
import AdminProducts from './pages/admin/AdminProducts';
import AdminMarketingMaterials from './pages/admin/AdminMarketingMaterials';
import AdminMarketingMaterialEdit from './pages/admin/AdminMarketingMaterialEdit';
import AdminCustomerMarketingMaterials from './pages/admin/AdminCustomerMarketingMaterials';
import AdminCustomerMarketingMaterialEdit from './pages/admin/AdminCustomerMarketingMaterialEdit';
import AdminPages from './pages/admin/AdminPages';
import AdminPageEdit from './pages/admin/AdminPageEdit';
import AdminSettings from './pages/admin/AdminSettings';
import AdminTranslations from './pages/admin/AdminTranslations';

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
import GeoRedirect from './components/shop/GeoRedirect';
import CountryRouteValidator from './components/shop/CountryRouteValidator';
import DynamicRouteHandler from './components/shop/DynamicRouteHandler';

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
  
  // B2B Reseller Portal - Credential pages should NOT use TranslationProvider (they use credentialTranslations)
  const credentialRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
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
  const hostname = window.location.hostname;
  const subdomain = hostname.split('.')[0];
  
  // Determine app mode based on subdomain
  const isShopSubdomain = subdomain === 'shop';
  const isResellerSubdomain = subdomain === 'partner' || subdomain === 'reseller' || hostname.includes('b8shield-reseller-app');
  
  // Default to reseller for now (existing behavior)
  const appMode = isShopSubdomain ? 'shop' : 'reseller';

  // 🚂 WAGON SYSTEM: Auto-discover all wagons (ONLY CONNECTION POINT NEEDED!)
  useEffect(() => {
    const initializeWagons = async () => {
      console.log('🚂 B8Shield Train: Connecting wagons...');
      
      // Discover and connect all wagons
      await wagonRegistry.discoverWagons();
      
      // Get wagon routes for the current app mode (FIX: await the async function)
      const routes = await wagonRegistry.getRoutes();
      const filteredRoutes = routes.filter(route => {
        // Add all routes for B2B app (admin and user routes)
        return appMode === 'reseller';
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
    <Router>
      <ScrollToTop />
      {appMode === 'shop' && <CookiebotCMP />}
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
          {appMode === 'shop' ? (
            // B2C Shop Routes - Universal Country Support for International E-commerce
            <>
              {/* Root redirect - geo-detection will handle initial redirect */}
              <Route path="/" element={<GeoRedirect />} />
              
              {/* Credential pages - country-neutral for simplicity */}
              <Route path="/login" element={<CustomerLogin />} />
              <Route path="/register" element={<CustomerRegister />} />
                              <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/affiliate-login" element={<AffiliateLogin />} />
              
              {/* Firebase Auth Action Handler - Email Verification */}
              <Route path="/__/auth/action" element={<EmailVerificationHandler />} />
              
              {/* Universal Country Routes - Supports any country code */}
              <Route path="/:countryCode" element={<CountryRouteValidator><PublicStorefront /></CountryRouteValidator>} />
              <Route path="/:countryCode/product/:slug" element={<CountryRouteValidator><PublicProductPage /></CountryRouteValidator>} />
              <Route path="/:countryCode/cart" element={<CountryRouteValidator><ShoppingCart /></CountryRouteValidator>} />
              <Route path="/:countryCode/checkout" element={<CountryRouteValidator><Checkout /></CountryRouteValidator>} />
              <Route path="/:countryCode/order-confirmation/:orderId" element={<CountryRouteValidator><OrderConfirmation /></CountryRouteValidator>} />
              <Route path="/:countryCode/account" element={<CountryRouteValidator><CustomerAccount /></CountryRouteValidator>} />
              <Route path="/account" element={<CustomerAccount />} />
              {/* Legal pages now handled by CMS via DynamicRouteHandler */}
              <Route path="/:countryCode/affiliate-registration" element={<CountryRouteValidator><AffiliateRegistration /></CountryRouteValidator>} />
              <Route path="/:countryCode/affiliate-login" element={<CountryRouteValidator><AffiliateLogin /></CountryRouteValidator>} />
              <Route path="/:countryCode/affiliate-portal" element={<CountryRouteValidator><AffiliatePortal /></CountryRouteValidator>} />
              
              {/* Dynamic CMS Pages - Must be before catch-all */}
              <Route path="/:countryCode/*" element={
                <CountryRouteValidator>
                  <DynamicRouteHandler>
                    <Navigate to="/" replace />
                  </DynamicRouteHandler>
                </CountryRouteValidator>
              } />
              
              {/* Catch-all redirect to geo-detection */}
              <Route path="*" element={<GeoRedirect />} />
            </>
          ) : (
            // B2B Reseller Portal Routes (existing)
            <>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              
              {/* Firebase Auth Action Handler - Email Verification */}
              <Route path="/__/auth/action" element={<EmailVerificationHandler />} />
              
              <Route path="/" element={
                <PrivateRoute>
                  <DashboardPage />
                </PrivateRoute>
              } />
              
              <Route path="/products" element={
                <PrivateRoute>
                  <ProductViewPage />
                </PrivateRoute>
              } />
              
              <Route path="/marketing" element={
                <PrivateRoute>
                  <MarketingMaterialsPage />
                </PrivateRoute>
              } />
              
              <Route path="/order" element={
                <PrivateRoute>
                  <OrderPage />
                </PrivateRoute>
              } />
              
              <Route path="/orders" element={
                <PrivateRoute>
                  <OrderHistoryPage />
                </PrivateRoute>
              } />
              
              <Route path="/orders/:orderId" element={
                <PrivateRoute>
                  <OrderDetailPage />
                </PrivateRoute>
              } />
              
              <Route path="/profile" element={
                <PrivateRoute>
                  <ProfilePage />
                </PrivateRoute>
              } />
              
              <Route path="/contact" element={
                <PrivateRoute>
                  <ContactPage />
                </PrivateRoute>
              } />
              
              {/* Training Routes */}
              <Route path="/training/step/:step" element={
                <PrivateRoute>
                  <TrainingStepPage />
                </PrivateRoute>
              } />
              
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

                      <Route path="/admin/affiliates" element={
          <AdminRoute>
            <AdminAffiliates />
          </AdminRoute>
        } />
        <Route path="/admin/affiliates/create" element={
          <AdminRoute>
            <AdminAffiliateCreate />
          </AdminRoute>
        } />

              <Route path="/admin/affiliates/analytics" element={
                <AdminRoute>
                  <AdminAffiliateAnalytics />
                </AdminRoute>
              } />

              <Route path="/admin/affiliates/application/:id" element={
                <AdminRoute>
                  <AdminAffiliateEdit />
                </AdminRoute>
              } />

              <Route path="/admin/affiliates/manage/:id" element={
                <AdminRoute>
                  <AdminAffiliateEdit />
                </AdminRoute>
              } />

              <Route path="/admin/affiliates/payout/:affiliateId" element={
                <AdminRoute>
                  <AdminAffiliatePayout />
                </AdminRoute>
              } />

              <Route path="/admin/settings" element={
                <AdminRoute>
                  <AdminSettings />
                </AdminRoute>
              } />

              <Route path="/admin/translations" element={
                <AdminRoute>
                  <AdminTranslations />
                </AdminRoute>
              } />

              {/* �� WAGON SYSTEM: Auto-generated wagon routes */}
              {wagonRoutes.map(({ path, component: Component, adminOnly, private: isPrivate, wagonId }) => (
                <Route 
                  key={`${wagonId}-${path}`} 
                  path={path}
                  element={
                    <Suspense fallback={
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                        <span className="ml-3 text-lg text-gray-600">Laddar wagon...</span>
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
                  }
                />
              ))}
              
              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
        </div>
      </ConditionalTranslationProvider>
    </Router>
  );

  return (
    <AuthProvider>
      <SimpleAuthContextProvider>
        <OrderProvider>
          <CartProvider>
            {content}
          </CartProvider>
        </OrderProvider>
      </SimpleAuthContextProvider>
    </AuthProvider>
  );
}

export default App; 