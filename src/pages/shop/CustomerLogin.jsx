import React from 'react';
import { Link } from 'react-router-dom';

const CustomerLogin = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Logga in
            </h1>
            <p className="text-gray-600 mb-8">
              Inloggning kommer snart...
            </p>
            <div className="space-y-4">
              <Link 
                to="/" 
                className="block w-full bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors text-center"
              >
                Tillbaka till butiken
              </Link>
              <Link 
                to="/register" 
                className="block w-full bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors text-center"
              >
                Skapa konto
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerLogin; 