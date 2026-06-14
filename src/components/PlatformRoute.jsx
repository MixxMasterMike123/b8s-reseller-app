import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * PlatformRoute — gates the Super Admin surface to the platform super-admin
 * (users/{uid}.platform == true). A regular shop admin is sent to the normal
 * admin console. The hard security boundary is the Firestore/Storage rules
 * (Phase 3); this guard is the UI-level gate so shop admins never see the
 * platform pages.
 */
const PlatformRoute = ({ children }) => {
  const { currentUser, isPlatform, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3">Validating access...</span>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!isPlatform) {
    // Not a platform super-admin — back to the normal admin console.
    return <Navigate to="/admin" replace />;
  }

  return children;
};

export default PlatformRoute;
