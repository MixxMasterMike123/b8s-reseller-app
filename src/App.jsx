import React, { useEffect, useState, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SimpleAuthContextProvider } from './contexts/SimpleAuthContext';
import { OrderProvider } from './contexts/OrderContext';
import { CartProvider } from './contexts/CartContext';
import { functions } from './firebase/config';
import { httpsCallable } from 'firebase/functions';

// 🚂 WAGON SYSTEM: Single connection point
import wagonRegistry from './wagons/WagonRegistry.js';

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
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminUserCreate from './pages/admin/AdminUserCreate';
import AdminUserEdit from './pages/admin/AdminUserEdit';
import AdminOrders from './pages/admin/AdminOrders';
import AdminOrderDetail from './pages/admin/AdminOrderDetail';
import AdminProducts from './pages/admin/AdminProducts';
import AdminMarketingMaterials from './pages/admin/AdminMarketingMaterials';
import AdminMarketingMaterialEdit from './pages/admin/AdminMarketingMaterialEdit';
import AdminSettings from './pages/admin/AdminSettings';

// B2C Shop Components (new)
import PublicStorefront from './pages/shop/PublicStorefront';
import PublicProductPage from './pages/shop/PublicProductPage';
import ShoppingCart from './pages/shop/ShoppingCart';
import Checkout from './pages/shop/Checkout';
import CustomerAccount from './pages/shop/CustomerAccount';
import CustomerLogin from './pages/shop/CustomerLogin';
import CustomerRegister from './pages/shop/CustomerRegister';

// Legal & Compliance Pages
import PrivacyPolicy from './pages/shop/PrivacyPolicy';
import TermsOfService from './pages/shop/TermsOfService';
import ReturnPolicy from './pages/shop/ReturnPolicy';
import CookiePolicy from './pages/shop/CookiePolicy';
import ShippingInfo from './pages/shop/ShippingInfo';

// Affiliate Program Pages
import AffiliateRegistration from './pages/shop/AffiliateRegistration';
import AffiliatePortal from './pages/shop/AffiliatePortal';
import AdminAffiliates from './pages/admin/AdminAffiliates';
import AdminAffiliateEdit from './pages/admin/AdminAffiliateEdit';
import AdminAffiliateAnalytics from './pages/admin/AdminAffiliateAnalytics';
import AdminAffiliatePayout from './pages/admin/AdminAffiliatePayout';
import AffiliateTracker from './components/AffiliateTracker';

// Order Confirmation
import OrderConfirmation from './pages/shop/OrderConfirmation';

import { Toaster } from 'react-hot-toast';

function App() {
  // 🚂 WAGON SYSTEM: State for wagon routes
  const [wagonRoutes, setWagonRoutes] = useState([]);

  // Detect subdomain to determine which app to show
  const hostname = window.location.hostname;
  const subdomain = hostname.split('.')[0];
  
  // Determine app mode based on subdomain
  const isShopSubdomain = subdomain === 'shop';
  const isResellerSubdomain = subdomain === 'reseller' || hostname.includes('b8shield-reseller-app');
  
  // Default to reseller for now (existing behavior)
  const appMode = isShopSubdomain ? 'shop' : 'reseller';

  // 🚂 WAGON SYSTEM: Auto-discover all wagons (ONLY CONNECTION POINT NEEDED!)
  useEffect(() => {
    const initializeWagons = async () => {
      console.log('🚂 B8Shield Train: Connecting wagons...');
      
      // Discover and connect all wagons
      await wagonRegistry.discoverWagons();
      
      // Get wagon routes for the current app mode
      const routes = wagonRegistry.getRoutes();
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
      <AffiliateTracker /> 
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
            // B2C Shop Routes
            <>
              <Route path="/" element={<PublicStorefront />} />
              <Route path="/product/:id" element={<PublicProductPage />} />
              <Route path="/cart" element={<ShoppingCart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
              <Route path="/login" element={<CustomerLogin />} />
              <Route path="/register" element={<CustomerRegister />} />
              <Route path="/account" element={<CustomerAccount />} />
              
              {/* Legal & Compliance Pages */}
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/returns" element={<ReturnPolicy />} />
              <Route path="/cookies" element={<CookiePolicy />} />
              <Route path="/shipping" element={<ShippingInfo />} />
              
              {/* Affiliate Program */}
              <Route path="/affiliate-registration" element={<AffiliateRegistration />} />
              <Route path="/affiliate-portal" element={<AffiliatePortal />} />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            // B2B Reseller Portal Routes (existing)
            <>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              
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

              <Route path="/admin/affiliates" element={
                <AdminRoute>
                  <AdminAffiliates />
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

              {/* 🚂 WAGON SYSTEM: Auto-generated wagon routes */}
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