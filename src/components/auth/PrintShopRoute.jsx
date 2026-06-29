import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

/**
 * PrintShopRoute — UI gate for the print-shop surface (role === 'print_shop').
 * This is ROUTING only: the real authorization is server-side in the print
 * callables (printGuard.getPrintShopContext reads the live user doc). The role
 * has NO direct Firestore/Storage access, so even if this gate were bypassed the
 * callables would still deny — defense in depth. Mirrors PlatformRoute.
 */
const PrintShopRoute = ({ children }) => {
  const { currentUser, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400"></div>
        <span className="ml-3 text-gray-400">Verifierar behörighet…</span>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (userData?.role !== 'print_shop') {
    toast.error('Endast tryckerikonton har åtkomst');
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PrintShopRoute;
