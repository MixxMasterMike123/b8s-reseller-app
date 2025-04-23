import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminRoute = ({ children }) => {
  const { currentUser, isAdmin, loading: authLoading } = useAuth();
  
  // Debug info
  console.log('AdminRoute render:', { currentUser, isAdmin, authLoading });

  // Show loading state
  if (authLoading) {
    console.log('AdminRoute: Auth still loading');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3">Validating access...</span>
      </div>
    );
  }

  // Handle not logged in
  if (!currentUser) {
    console.log('AdminRoute: No current user, redirecting to login');
    return <Navigate to="/login" />;
  }

  // Handle not admin
  if (!isAdmin) {
    console.log('AdminRoute: User is not admin, redirecting to dashboard');
    return <Navigate to="/" />;
  }

  // All checks passed, render admin component
  console.log('AdminRoute: Rendering admin component');
  return children;
};

export default AdminRoute; 