import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const AdminRoute = ({ children }) => {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Verifierar behörighet...</span>
      </div>
    );
  }
  
  if (!currentUser) {
    toast.error('Du måste logga in för att komma åt admin-sektionen');
    return <Navigate to="/login" />;
  }
  
  if (userProfile?.role !== 'admin') {
    toast.error('Du har inte behörighet att komma åt admin-sektionen');
    return <Navigate to="/" />;
  }

  return children;
};

export default AdminRoute; 