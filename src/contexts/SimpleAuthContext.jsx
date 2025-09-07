import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  updatePassword as firebaseUpdatePassword,
  updateEmail
} from 'firebase/auth';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { auth, db } from '../firebase/config';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const SimpleAuthContext = createContext();

export function useSimpleAuth() {
  return useContext(SimpleAuthContext);
}

export function SimpleAuthContextProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Update B2C customer email verification status
  const updateB2CCustomerEmailStatus = async (user) => {
    if (!user) return;
    
    try {
      console.log('Updating B2C customer email verification status:', user.emailVerified);
      
      // Find the B2C customer document
      const customersQuery = query(
        collection(db, 'b2cCustomers'),
        where('firebaseAuthUid', '==', user.uid)
      );
      
      const snapshot = await getDocs(customersQuery);
      
      if (!snapshot.empty) {
        const customerDoc = snapshot.docs[0];
        await updateDoc(customerDoc.ref, {
          emailVerified: user.emailVerified,
          updatedAt: new Date()
        });
        
        console.log('B2C customer email verification status updated successfully');
      }
    } catch (error) {
      console.error('Error updating B2C customer email verification status:', error);
    }
  };

  // Handle auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoading(false);
      
      // Update B2C customer verification status when user state changes
      if (user) {
        await updateB2CCustomerEmailStatus(user);
      }
    });

    return unsubscribe;
  }, []);

  // Login a user
  async function login(email, password) {
    try {
      setError('');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      toast.success('Login successful');
      return userCredential.user;
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message);
      toast.error('Login failed: ' + error.message);
      throw error;
    }
  }

  // Logout
  async function logout() {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      setError(error.message);
      toast.error('Logout failed: ' + error.message);
      throw error;
    }
  }

  // Register a new user
  async function register(email, password) {
    try {
      setError('');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      toast.success('Account created successfully');
      return userCredential.user;
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message);
      toast.error('Registration failed: ' + error.message);
      throw error;
    }
  }

  // Reset password using unified orchestrator email system
  async function resetPassword(email) {
    try {
      setError('');
      
      // Call unified orchestrator Firebase Function to send branded password reset email
      const functions = getFunctions();
      const sendPasswordResetEmail = httpsCallable(functions, 'sendPasswordResetEmail');
      
      // Generate secure reset code (matching V3 pattern)
      const resetCode = Math.random().toString(36).substring(2, 15) + 
                       Math.random().toString(36).substring(2, 15);
      
      const result = await sendPasswordResetEmail({ 
        email,
        resetCode,
        userType: 'B2C',
        language: 'sv-SE'
      });
      
      console.log('Orchestrator password reset email sent:', result.data);
      toast.success('Password reset email sent');
      return true;
    } catch (error) {
      console.error('Password reset error:', error);
      setError(error.message);
      toast.error('Password reset failed: ' + error.message);
      throw error;
    }
  }

  // Context value
  const value = {
    currentUser,
    loading,
    error,
    login,
    register,
    logout,
    resetPassword,
    updateB2CCustomerEmailStatus
  };

  return (
    <SimpleAuthContext.Provider value={value}>
      {children}
    </SimpleAuthContext.Provider>
  );
}

export default SimpleAuthContext; 