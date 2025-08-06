import React from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, ChartBarIcon } from '@heroicons/react/24/outline';

const ActivityCenter = () => {
  return (
    <AppLayout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center">
            <Link 
              to="/admin/dining" 
              className="mr-4 p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </Link>
            <div className="flex items-center">
              <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-xl mr-4">
                <ChartBarIcon className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">Aktivitetscenter</h1>
                <p className="text-gray-600 dark:text-gray-400">Hantera alla serviceinteraktioner</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="bg-orange-100 dark:bg-orange-900 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <ChartBarIcon className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Aktivitetscenter kommer snart</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Här kommer du kunna registrera och följa upp alla interaktioner med dina gäster - 
              samtal, möten, e-post och anteckningar.
            </p>
            <Link
              to="/admin/dining"
              className="inline-flex items-center px-4 py-2 bg-orange-600 dark:bg-orange-500 text-white rounded-lg hover:bg-orange-700 dark:hover:bg-orange-600 transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Tillbaka till dashboard
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ActivityCenter; 