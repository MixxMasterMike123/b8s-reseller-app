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
import { auth } from '../firebase/config';
import toast from 'react-hot-toast';

const SimpleAuthContext = createContext();

export function useSimpleAuth() {
  return useContext(SimpleAuthContext);
}

export function SimpleAuthContextProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Handle auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
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

  // Reset password
  async function resetPassword(email) {
    try {
      setError('');
      await sendPasswordResetEmail(auth, email);
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
    resetPassword
  };

  return (
    <SimpleAuthContext.Provider value={value}>
      {children}
    </SimpleAuthContext.Provider>
  );
}

export default SimpleAuthContext; 