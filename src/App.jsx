import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { OrderProvider } from './contexts/OrderContext';
import { CartProvider } from './contexts/CartContext';

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
import AdminUserEdit from './pages/admin/AdminUserEdit';
import AdminOrders from './pages/admin/AdminOrders';
import AdminOrderDetail from './pages/admin/AdminOrderDetail';
import AdminProducts from './pages/admin/AdminProducts';
import AdminMarketingMaterials from './pages/admin/AdminMarketingMaterials';
import AdminMarketingMaterialEdit from './pages/admin/AdminMarketingMaterialEdit';

// B2C Shop Components (new)
import PublicStorefront from './pages/shop/PublicStorefront';
import PublicProductPage from './pages/shop/PublicProductPage';
import ShoppingCart from './pages/shop/ShoppingCart';
import Checkout from './pages/shop/Checkout';
import CustomerAccount from './pages/shop/CustomerAccount';
import CustomerLogin from './pages/shop/CustomerLogin';
import CustomerRegister from './pages/shop/CustomerRegister';

import { Toaster } from 'react-hot-toast';

function App() {
  // Detect subdomain to determine which app to show
  const hostname = window.location.hostname;
  const subdomain = hostname.split('.')[0];
  
  // Determine app mode based on subdomain
  const isShopSubdomain = subdomain === 'shop';
  const isResellerSubdomain = subdomain === 'reseller' || hostname.includes('b8shield-reseller-app');
  
  // Default to reseller for now (existing behavior)
  const appMode = isShopSubdomain ? 'shop' : 'reseller';

  console.log('App Mode:', appMode, 'Hostname:', hostname, 'Subdomain:', subdomain);

  const content = (
    <Router>
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
              <Route path="/login" element={<CustomerLogin />} />
              <Route path="/register" element={<CustomerRegister />} />
              <Route path="/account" element={<CustomerAccount />} />
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
      <OrderProvider>
        {appMode === 'shop' ? (
          <CartProvider>
            {content}
          </CartProvider>
        ) : (
          content
        )}
      </OrderProvider>
    </AuthProvider>
  );
}

export default App; 