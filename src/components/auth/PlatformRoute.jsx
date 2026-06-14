import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

/**
 * PlatformRoute — gates the Platform operator console to the platform
 * super-admin (users/{uid}.platform === true). Mirrors auth/AdminRoute. The
 * hard security boundary is the Firestore/Storage rules (Phase 3) + the
 * platform-subdomain surface; this is the UI-level gate.
 */
const PlatformRoute = ({ children }) => {
  const { currentUser, isPlatform, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        <span className="ml-3 text-gray-600">Verifierar behörighet…</span>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!isPlatform) {
    toast.error('Endast plattformsadministratörer har åtkomst');
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PlatformRoute;
