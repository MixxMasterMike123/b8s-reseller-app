import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

const PrivateRoute = ({ children }) => {
  const { currentUser, loading: authLoading } = useAuth();
  const [userVerified, setUserVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        // Check if the user document exists in Firestore
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          setUserVerified(true);
        } else {
          console.error('User document not found in Firestore');
        }
      } catch (error) {
        console.error('Error verifying user:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      verifyUser();
    }
  }, [currentUser, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Only redirect if the user is not logged in
  // Proceed to the route even if Firestore verification failed
  return currentUser ? children : <Navigate to="/login" />;
};

export default PrivateRoute; 