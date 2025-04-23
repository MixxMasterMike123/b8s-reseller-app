import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const DashboardPage = () => {
  const { currentUser, userData, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          {/* Header */}
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
            <div className="flex items-center">
              <img
                src="/images/B8Shield-Logotype 1.svg"
                alt="B8shield Logo"
                className="h-8 w-auto"
              />
            </div>
            <div className="flex space-x-4">
              <Link
                to="/profile"
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Profile
              </Link>
              <button
                onClick={logout}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Main content */}
          <div className="p-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome, {userData?.companyName || currentUser.email}
              </h2>
              <p className="text-gray-600">
                This is your dashboard. Use the menu options to navigate.
              </p>
            </div>

            {/* Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <Link
                to="/order"
                className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition duration-150 border border-gray-200"
              >
                <h3 className="text-lg font-medium text-gray-900 mb-2">Place an Order</h3>
                <p className="text-gray-600">Create a new order for your customers</p>
              </Link>
              
              <Link
                to="/order-history"
                className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition duration-150 border border-gray-200"
              >
                <h3 className="text-lg font-medium text-gray-900 mb-2">Order History</h3>
                <p className="text-gray-600">View and track your previous orders</p>
              </Link>

              {userData?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="bg-primary-600 shadow rounded-lg p-6 hover:shadow-lg transition duration-150 text-white"
                >
                  <h3 className="text-lg font-medium mb-2">Admin Dashboard</h3>
                  <p>Access admin controls and settings</p>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage; 