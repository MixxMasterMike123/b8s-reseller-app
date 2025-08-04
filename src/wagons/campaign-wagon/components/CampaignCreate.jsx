import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/outline';
import AppLayout from '../../../components/layout/AppLayout';

const CampaignCreate = () => {
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link
                to="/admin/campaigns"
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Skapa Kampanj</h1>
                <p className="text-gray-600 mt-1">Campaign Wagon™ - Ny kampanj</p>
              </div>
            </div>
          </div>
        </div>

        {/* Placeholder Content */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center py-12">
            <PlusIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">Kampanjskapande kommer snart!</h2>
            <p className="text-gray-600 mb-6">
              Campaign Wagon™ är under utveckling. Funktionalitet för att skapa kampanjer implementeras i nästa fas.
            </p>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 max-w-md mx-auto">
              <h3 className="font-medium text-purple-800 mb-2">Planerade funktioner:</h3>
              <ul className="text-sm text-purple-700 space-y-1 text-left">
                <li>• Flerspråkigt kampanjinnehåll</li>
                <li>• Social media banner-hantering</li>
                <li>• Affiliate-målgruppsval</li>
                <li>• Lotteri-/tävlingssystem</li>
                <li>• Anpassade provisioner och rabatter</li>
              </ul>
            </div>
            <div className="mt-6">
              <Link
                to="/admin/campaigns"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <ArrowLeftIcon className="-ml-1 mr-2 h-4 w-4" />
                Tillbaka till Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default CampaignCreate;