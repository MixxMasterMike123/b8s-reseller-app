import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';

const DashboardPage = () => {
  const { userData, currentUser } = useAuth();

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Välkommen, {userData?.companyName || currentUser?.email || 'Användare'}
          </h2>
          <p className="text-gray-600">
            Detta är din instrumentpanel. Använd menyalternativen för att navigera.
          </p>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Link
            to="/order"
            className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition duration-150 border border-gray-200"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-2">Lägg en beställning</h3>
            <p className="text-gray-600">Skapa en ny beställning för dina kunder</p>
          </Link>
          
          <Link
            to="/order-history"
            className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition duration-150 border border-gray-200"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-2">Orderhistorik</h3>
            <p className="text-gray-600">Visa och spåra dina tidigare beställningar</p>
          </Link>

          {userData?.role === 'admin' && (
            <Link
              to="/admin"
              className="bg-blue-600 shadow rounded-lg p-6 hover:shadow-lg transition duration-150 text-white"
            >
              <h3 className="text-lg font-medium mb-2">Admin Dashboard</h3>
              <p>Få åtkomst till adminkontroller och inställningar</p>
            </Link>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default DashboardPage; 