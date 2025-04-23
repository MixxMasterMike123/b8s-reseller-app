import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Link } from 'react-router-dom';

const TestAuthPage = () => {
  const [email, setEmail] = useState('micke.ohlen@gmail.com');
  const [password, setPassword] = useState('temporaryPassword123');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const auth = getAuth();
  
  // Check current user
  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
        setMessage(`Logged in as: ${user.email} (UID: ${user.uid})`);
      } else {
        setUser(null);
        setMessage('Not logged in');
      }
    });
    
    return () => unsubscribe();
  }, [auth]);
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      setMessage(`Successfully logged in as: ${result.user.email}`);
    } catch (error) {
      setError(`Login error: ${error.message}`);
    }
  };
  
  const handleLogout = async () => {
    try {
      await auth.signOut();
      setMessage('Logged out successfully');
    } catch (error) {
      setError(`Logout error: ${error.message}`);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-6">Auth Test Page</h1>
        
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <h2 className="font-bold">Current Status:</h2>
          <p>{message}</p>
          {user && (
            <div className="mt-2">
              <p><strong>User ID:</strong> {user.uid}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Email Verified:</strong> {user.emailVerified ? 'Yes' : 'No'}</p>
              <button 
                onClick={handleLogout}
                className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-300 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {!user && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <button 
              type="submit"
              className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
            >
              Login
            </button>
          </form>
        )}
        
        <div className="mt-4 text-center">
          <Link to="/login" className="text-blue-600 hover:underline">Back to Login Page</Link>
        </div>
      </div>
    </div>
  );
};

export default TestAuthPage; 