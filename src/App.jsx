import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import OrderPage from './pages/OrderPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import OrderDetailPage from './pages/OrderDetailPage';
import ProfilePage from './pages/ProfilePage';
import ContactPage from './pages/ContactPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import TestAuthPage from './pages/TestAuthPage';

// Admin Pages
import AdminPage from './pages/AdminPage';
import AdminUsers from './pages/admin/AdminUsers';
import AdminOrders from './pages/admin/AdminOrders';
import AdminProducts from './pages/admin/AdminProducts';
import AdminOrderDetail from './pages/admin/AdminOrderDetail';

// Components
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';

function App() {
  const { currentUser } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={
        !currentUser ? <LoginPage /> : <Navigate to="/" replace />
      } />
      <Route path="/register" element={
        !currentUser ? <RegisterPage /> : <Navigate to="/" replace />
      } />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/test-auth" element={<TestAuthPage />} />

      {/* Protected routes */}
      <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
      <Route path="/contact" element={<PrivateRoute><ContactPage /></PrivateRoute>} />
      <Route path="/order" element={<PrivateRoute><OrderPage /></PrivateRoute>} />
      <Route path="/order-history" element={<PrivateRoute><OrderHistoryPage /></PrivateRoute>} />
      <Route path="/orders" element={<PrivateRoute><OrderHistoryPage /></PrivateRoute>} />
      <Route path="/order/:id" element={<PrivateRoute><OrderDetailPage /></PrivateRoute>} />
      <Route path="/orders/:orderId" element={<PrivateRoute><OrderDetailPage /></PrivateRoute>} />

      {/* Admin routes */}
      <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
      <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
      <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
      <Route path="/admin/orders/:orderId" element={<AdminRoute><AdminOrderDetail /></AdminRoute>} />
      <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />

      {/* Redirect any unknown routes to dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App; 