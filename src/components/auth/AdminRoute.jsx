import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const AdminRoute = ({ children }) => {
  const { currentUser, userProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Verifierar behörighet...</span>
      </div>
    );
  }
  
  if (!currentUser) {
    // If an impersonation handshake is in flight (?impersonate=… and/or a
    // #handoff= token), the silent sign-in in ImpersonationIntake may not have
    // resolved yet — don't strip it. Preserve the FULL location (path+query+hash)
    // to /login so the top-level intake can still consume the handoff there. For
    // any normal admin visit (no handshake) behavior is unchanged.
    const hasHandshake =
      location.search.includes('impersonate') || (location.hash || '').includes('handoff');
    if (hasHandshake) {
      return <Navigate to={`/login${location.search}${location.hash}`} replace />;
    }
    toast.error('Du måste logga in för att komma åt admin-sektionen');
    return <Navigate to="/login" />;
  }
  
  if (userProfile?.role !== 'admin') {
    // Redirect to /login (NOT "/") — the root now forwards to /admin, so
    // sending a non-admin there would loop forever.
    toast.error('Du har inte behörighet att komma åt admin-sektionen');
    return <Navigate to="/login" />;
  }

  return children;
};

export default AdminRoute; 