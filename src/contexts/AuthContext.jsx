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
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, isDemoMode, functions } from '../firebase/config';
import toast from 'react-hot-toast';
import { onNewB2BCustomer } from '../wagons/dining-wagon/utils/customerStatusAutomation';
import { addAdminUID, removeAdminUID } from '../utils/adminUIDManager';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

// Demo mode mock data
const DEMO_ADMIN_USER = {
  uid: 'admin-user-1',
  email: 'admin@example.com',
  displayName: 'Admin User',
};

const DEMO_USER_DATA = {
  companyName: 'B8shield Admin',
  contactPerson: 'Admin User',
  phoneNumber: '+1234567890',
  address: '123 Admin Street, Demo City',
  role: 'admin',
  active: true,
  createdAt: new Date().toISOString(),
};

const DEMO_USERS = [
  {
    id: 'admin-user-1',
    email: 'admin@example.com',
    companyName: 'B8shield Admin',
    contactPerson: 'Admin User',
    phoneNumber: '+1234567890',
    role: 'admin',
    active: true,
    createdAt: '2023-01-01T00:00:00.000Z',
  },
  {
    id: 'user-1',
    email: 'user1@example.com',
    companyName: 'Company A',
    contactPerson: 'John Doe',
    phoneNumber: '+1987654321',
    role: 'user',
    active: true,
    createdAt: '2023-01-15T00:00:00.000Z',
  },
  {
    id: 'user-2',
    email: 'user2@example.com',
    companyName: 'Company B',
    contactPerson: 'Jane Smith',
    phoneNumber: '+1122334455',
    role: 'user',
    active: false,
    createdAt: '2023-02-01T00:00:00.000Z',
  },
];

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');
  const [demoUsers, setDemoUsers] = useState(DEMO_USERS);

  // Handle auth state changes
  useEffect(() => {
    let unsubscribe = () => {};

    if (isDemoMode) {
      // Demo mode: automatically authenticate as admin
      console.log('Running in demo mode with mock authentication');
      setCurrentUser(DEMO_ADMIN_USER);
      setUserData(DEMO_USER_DATA);
      setIsAdmin(true);
      setLoading(false);
    } else {
      // Real Firebase authentication
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        setCurrentUser(user);
        
        if (user) {
          // Get user data from Firestore
          try {
            // First try the named database
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            
            if (userDoc.exists()) {
              const data = userDoc.data();
              setUserData(data);
              setIsAdmin(data.role === 'admin');

              // Store preferred language for TranslationContext
              if (data.preferredLang) {
                localStorage.setItem('b8shield-language', data.preferredLang);
              }
            } else {
              console.error('User document not found in Firestore');
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
          }
        } else {
          setUserData(null);
          setIsAdmin(false);
        }
        
        setLoading(false);
      });
    }

    return unsubscribe;
  }, []);

  // Register a new user
  async function register(email, password, userData) {
    try {
      setError('');

      if (isDemoMode) {
        // Demo mode: mock registration
        const newUserId = `user-${Date.now()}`;
        const newUser = {
          id: newUserId,
          email,
          ...userData,
          role: 'user',
          active: false,
          isActive: false,
          createdAt: new Date().toISOString(),
        };
        
        setDemoUsers([...demoUsers, newUser]);
        toast.success('Registration successful (Demo Mode)');
        return { uid: newUserId, email };
      } else {
        // Real Firebase registration
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Create user profile in both Firestore databases
        const userProfile = {
          ...userData,
          email,
          role: 'user',
          active: false, // Require admin activation
          isActive: false,
          marginal: 35, // Default margin percentage
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'users', user.uid), userProfile);

        // CRM auto-import no longer needed - using unified users collection

        return user;
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message);
      throw error;
    }
  }

  // Login a user
  async function login(email, password) {
    try {
      setError('');
      
      if (isDemoMode) {
        // Demo mode: mock login
        const user = demoUsers.find(u => u.email === email);
        
        if (!user) {
          throw new Error('User not found');
        }
        
        if (!user.active) {
          throw new Error('Your account is not active. Please contact admin.');
        }
        
        // Set current user
        const mockUser = { uid: user.id, email: user.email };
        setCurrentUser(mockUser);
        setUserData(user);
        setIsAdmin(user.role === 'admin');
        
        toast.success('Login successful (Demo Mode)');
        return mockUser;
      } else {
        // Real Firebase login
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Check if user is active
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (userDoc.exists() && !userDoc.data().active) {
          await signOut(auth);
          throw new Error('Your account is not active. Please contact admin.');
        }
        
        return userCredential.user;
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message);
      throw error;
    }
  }

  // Logout the current user
  async function logout() {
    try {
      setError('');
      
      if (isDemoMode) {
        // Demo mode: mock logout
        setCurrentUser(null);
        setUserData(null);
        setIsAdmin(false);
        toast.success('Logout successful (Demo Mode)');
        return true;
      } else {
        // Real Firebase logout
        return await signOut(auth);
      }
    } catch (error) {
      console.error('Logout error:', error);
      setError(error.message);
      throw error;
    }
  }

  // Reset password
  async function resetPassword(email) {
    try {
      setError('');
      
      if (isDemoMode) {
        // Demo mode: mock password reset
        toast.success('Password reset email sent (Demo Mode)');
        return true;
      } else {
        // Real Firebase password reset
        await sendPasswordResetEmail(auth, email);
        return true;
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setError(error.message);
      throw error;
    }
  }

  // Update user email
  async function updateUserEmail(email) {
    try {
      setError('');
      
      if (isDemoMode) {
        // Demo mode: mock email update
        setUserData(prev => ({ ...prev, email }));
        toast.success('Email updated successfully (Demo Mode)');
        return true;
      } else {
        // Real Firebase email update
        await updateEmail(currentUser, email);
        await updateDoc(doc(db, 'users', currentUser.uid), {
          email,
          updatedAt: new Date().toISOString()
        });
        return true;
      }
    } catch (error) {
      console.error('Email update error:', error);
      setError(error.message);
      throw error;
    }
  }

  // Update user password
  async function updateUserPassword(newPassword) {
    try {
      setError('');
      
      if (isDemoMode) {
        // Demo mode: mock password update
        toast.success('Password updated successfully (Demo Mode)');
        return true;
      } else {
        // Real Firebase password update
        if (!currentUser) throw new Error('No authenticated user');
        await firebaseUpdatePassword(currentUser, newPassword);
        return true;
      }
    } catch (error) {
      console.error('Password update error:', error);
      setError(error.message);
      throw error;
    }
  }

  // Update user profile
  async function updateUserProfile(data) {
    try {
      if (isDemoMode) {
        // Demo mode: mock profile update
        setUserData(prev => ({
          ...prev,
          ...data,
          updatedAt: new Date().toISOString()
        }));
        
        toast.success('Profile updated successfully (Demo Mode)');
        return true;
      } else {
        // Real Firebase profile update
        if (!currentUser) throw new Error('No authenticated user');
        
        const profileData = {
          ...data,
          updatedAt: new Date().toISOString()
        };
        
        // Update in named database
        const userRef = doc(db, 'users', currentUser.uid);
        
        try {
          await updateDoc(userRef, profileData);
        } catch (error) {
          console.error('Error updating profile in named database:', error);
        }
        
        // Update local userData state
        setUserData(prev => ({
          ...prev,
          ...data
        }));
        
        toast.success('Profile updated successfully');
        return true;
      }
    } catch (error) {
      toast.error('Failed to update profile');
      throw error;
    }
  }

  // Get all users (admin only)
  async function getAllUsers() {
    try {
      if (isDemoMode) {
        // Demo mode: return mock users
        return demoUsers;
      } else {
        // Real Firebase users
        if (!isAdmin) throw new Error('Unauthorized');
        
        const usersCollection = collection(db, 'users');
        const querySnapshot = await getDocs(usersCollection);
        
        const users = [];
        querySnapshot.forEach((doc) => {
          users.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        return users;
      }
    } catch (error) {
      throw error;
    }
  }



  // Update user role - Admin only
  async function updateUserRole(userId, newRole) {
    try {
      if (isDemoMode) {
        // Demo mode: mock user role update
        let currentUser = null;
        setDemoUsers(users => 
          users.map(user => {
            if (user.id === userId) {
              currentUser = user;
              return { ...user, role: newRole, updatedAt: new Date().toISOString() };
            }
            return user;
          })
        );
        
        // Demo mode adminUIDs sync
        if (currentUser) {
          const oldRole = currentUser.role;
          const userEmail = currentUser.email;
          
          if (oldRole !== 'admin' && newRole === 'admin') {
            console.log(`📝 Demo: Adding ${userEmail} to adminUIDs collection`);
            await addAdminUID(userId, userEmail, 'admin');
          } else if (oldRole === 'admin' && newRole !== 'admin') {
            console.log(`📝 Demo: Removing ${userEmail} from adminUIDs collection`);
            await removeAdminUID(userId);
          }
        }
        
        toast.success(`User role updated to ${newRole} successfully (Demo Mode)`);
        return true;
      } else {
        // Real Firebase user role update
        if (!isAdmin) throw new Error('Unauthorized');
        
        // Get current user data to check for role change
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          throw new Error('User not found');
        }
        
        const currentUserData = userDoc.data();
        const oldRole = currentUserData.role;
        const userEmail = currentUserData.email;
        
        // Update user role in Firestore
        await updateDoc(userRef, {
          role: newRole,
          updatedAt: new Date().toISOString()
        });
        
        // Sync adminUIDs collection based on role change
        if (oldRole !== 'admin' && newRole === 'admin') {
          console.log(`🔧 Adding ${userEmail} to adminUIDs collection`);
          await addAdminUID(userId, userEmail, 'admin');
        } else if (oldRole === 'admin' && newRole !== 'admin') {
          console.log(`🔧 Removing ${userEmail} from adminUIDs collection`);
          await removeAdminUID(userId);
        }
        
        toast.success(`User role updated to ${newRole} successfully`);
        return true;
      }
    } catch (error) {
      console.error('❌ Failed to update user role:', error);
      toast.error('Failed to update user role');
      throw error;
    }
  }

  // Update any user's profile - Admin only
  async function updateAnyUserProfile(userId, data) {
    try {
      if (isDemoMode) {
        // Demo mode: mock user profile update
        setDemoUsers(users => 
          users.map(user => 
            user.id === userId 
              ? { ...user, ...data, updatedAt: new Date().toISOString() } 
              : user
          )
        );
        
        toast.success('Customer profile updated successfully (Demo Mode)');
        return true;
      } else {
        // Real Firebase user profile update
        if (!isAdmin) throw new Error('Unauthorized');
        
        const profileData = {
          ...data,
          updatedAt: new Date().toISOString()
        };
        
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, profileData);
        

        
        toast.success('Customer profile updated successfully');
        return true;
      }
    } catch (error) {
      toast.error('Failed to update customer profile');
      throw error;
    }
  }

  // Update user margin - Admin only
  async function updateUserMarginal(userId, newMarginal) {
    try {
      if (isDemoMode) {
        // Demo mode: mock user margin update
        setDemoUsers(users => 
          users.map(user => 
            user.id === userId 
              ? { ...user, marginal: newMarginal, updatedAt: new Date().toISOString() } 
              : user
          )
        );
        
        toast.success(`Customer margin updated to ${newMarginal}% successfully (Demo Mode)`);
        return true;
      } else {
        // Real Firebase user margin update
        if (!isAdmin) throw new Error('Unauthorized');
        
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          marginal: newMarginal,
          updatedAt: new Date().toISOString()
        });
        
        // CRM sync no longer needed - using unified users collection
        
        toast.success(`Customer margin updated to ${newMarginal}% successfully`);
        return true;
      }
    } catch (error) {
      toast.error('Failed to update customer margin');
      throw error;
    }
  }

  // Create user profile (Admin only) - For direct customer creation without Firebase Auth
  async function createUserProfile(userData, email) {
    try {
      if (!isAdmin) throw new Error('Unauthorized - Admin access required');

      if (isDemoMode) {
        // Demo mode: mock user creation
        const newUserId = `user-${Date.now()}`;
        const newUser = {
          id: newUserId,
          uid: newUserId,
          email,
          ...userData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        setDemoUsers(prev => [...prev, newUser]);
        toast.success('Customer created successfully (Demo Mode)');
        return { uid: newUserId, email };
      } else {
        // Real Firebase: Create user document directly without authentication
        // Generate a unique ID for the customer
        const newUserId = doc(collection(db, 'users')).id;
        
        const userProfile = {
          ...userData,
          email,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Create user document in Firestore
        await setDoc(doc(db, 'users', newUserId), userProfile);

        // ZEN Automation: Trigger automatic status detection
        try {
          await onNewB2BCustomer(newUserId);
        } catch (automationError) {
          console.error('Automation error (non-critical):', automationError);
        }

        return { uid: newUserId, email };
      }
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  // Send Customer Welcome Email with Credentials - Admin only
  async function sendCustomerWelcomeEmail(customerId) {
    try {
      if (isDemoMode) {
        // Demo mode: mock activation
        setDemoUsers(users => 
          users.map(user => 
            user.id === customerId 
              ? { 
                  ...user, 
                  credentialsSent: true,
                  credentialsSentAt: new Date().toISOString(),
                  credentialsSentBy: currentUser.uid,
                  temporaryPassword: 'SnabbFisk2024',
                  firebaseAuthUid: `auth-${customerId}`,
                  requiresPasswordChange: true,
                  active: true,
                  updatedAt: new Date().toISOString()
                } 
              : user
          )
        );
        
        toast.success('Welcome email sent successfully (Demo Mode)');
        return {
          success: true,
          message: 'Welcome email sent and customer account activated successfully (Demo Mode)',
          temporaryPassword: 'SnabbFisk2024'
        };
      } else {
        // Real Firebase: Call the cloud function
        if (!isAdmin) throw new Error('Unauthorized - Admin access required');
        
        const sendWelcomeEmail = httpsCallable(functions, 'sendCustomerWelcomeEmailV2');
        const result = await sendWelcomeEmail({ customerId });
        
        const data = result.data;
        const message = data.isExistingUser 
          ? 'Welcome email sent and existing customer account updated successfully'
          : 'Welcome email sent and new customer account created successfully';
        toast.success(message);
        return data;
      }
    } catch (error) {
      console.error('Error sending welcome email:', error);
      
      if (error.code === 'functions/already-exists') {
        toast.error('Credentials have already been sent to this customer');
      } else if (error.code === 'functions/not-found') {
        toast.error('Customer not found');
      } else if (error.code === 'functions/permission-denied') {
        toast.error('Unauthorized - Admin access required');
      } else {
        toast.error(`Failed to send welcome email: ${error.message}`);
      }
      
      throw error;
    }
  }

  // Delete Customer Account - Admin only
  async function deleteCustomerAccount(customerId) {
    try {
      if (isDemoMode) {
        // Demo mode: mock deletion
        const userToDelete = demoUsers.find(user => user.id === customerId);
        if (!userToDelete) {
          throw new Error('Customer not found');
        }
        
        setDemoUsers(users => users.filter(user => user.id !== customerId));
        
        toast.success('Customer account deleted successfully (Demo Mode)');
        return {
          success: true,
          message: 'Customer and all related data deleted successfully (Demo Mode)',
          customerId: customerId,
          email: userToDelete.email,
          companyName: userToDelete.companyName
        };
      } else {
        // Real Firebase: Call the cloud function
        if (!isAdmin) throw new Error('Unauthorized - Admin access required');
        
        const deleteCustomer = httpsCallable(functions, 'deleteCustomerAccountV2');
        const result = await deleteCustomer({ customerId });
        
        const data = result.data;
        toast.success(data.message);
        return data;
      }
    } catch (error) {
      console.error('Error deleting customer account:', error);
      
      if (error.code === 'functions/not-found') {
        toast.error('Customer not found');
      } else if (error.code === 'functions/permission-denied') {
        toast.error('Unauthorized - Admin access required');
      } else {
        toast.error(`Failed to delete customer account: ${error.message}`);
      }
      
      throw error;
    }
  }

  // Enhanced Toggle User Active Status with Firebase Auth sync
  async function toggleUserActive(userId, activeStatus) {
    try {
      if (isDemoMode) {
        // Demo mode: mock user status update
        setDemoUsers(users => 
          users.map(user => 
            user.id === userId 
              ? { 
                  ...user, 
                  active: activeStatus, 
                  isActive: activeStatus, // Update both properties
                  updatedAt: new Date().toISOString() 
                } 
              : user
          )
        );
        
        toast.success(`User ${activeStatus ? 'activated' : 'deactivated'} successfully (Demo Mode)`);
        return true;
      } else {
        // Real Firebase: Use the enhanced cloud function that handles both Firestore and Auth
        if (!isAdmin) throw new Error('Unauthorized');
        
        const toggleStatus = httpsCallable(functions, 'toggleCustomerActiveStatusV2');
        const result = await toggleStatus({ customerId: userId, activeStatus });
        
        const data = result.data;
        toast.success(data.message);
        
        // CRM sync no longer needed - using unified users collection
        
        return true;
      }
    } catch (error) {
      console.error('Error toggling user active status:', error);
      
      if (error.code === 'functions/not-found') {
        toast.error('Customer not found');
      } else if (error.code === 'functions/permission-denied') {
        toast.error('Unauthorized - Admin access required');
      } else {
        toast.error(`Failed to update user status: ${error.message}`);
      }
      
      throw error;
    }
  }

  // Context value
  const value = {
    currentUser,
    userData,
    userProfile: userData, // Alias for backward compatibility
    loading,
    isAdmin,
    error,
    isDemoMode,
    register,
    login,
    logout,
    resetPassword,
    updateUserEmail,
    updateUserPassword,
    updateUserProfile,
    updateAnyUserProfile,
    getAllUsers,
    toggleUserActive,
    updateUserRole,
    updateUserMarginal,
    createUserProfile,
    sendCustomerWelcomeEmail,
    deleteCustomerAccount
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 