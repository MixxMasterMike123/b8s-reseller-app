import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeftIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import AppLayout from '../../../components/layout/AppLayout';

const CampaignAnalytics = () => {
  const { id } = useParams();

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                <h1 className="text-3xl font-bold text-gray-900">Kampanj Analys</h1>
                <p className="text-gray-600 mt-1">Campaign Wagon™ - Kampanj ID: {id}</p>
              </div>
            </div>
            <Link
              to={`/admin/campaigns/${id}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Redigera Kampanj
            </Link>
          </div>
        </div>

        {/* Placeholder Content */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center py-12">
            <ChartBarIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">Avancerad analys kommer snart!</h2>
            <p className="text-gray-600 mb-6">
              Detaljerad kampanjanalys och statistik implementeras i Phase 3 av Campaign Wagon™.
            </p>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 max-w-lg mx-auto">
              <h3 className="font-medium text-purple-800 mb-2">Planerade analysfunktioner:</h3>
              <ul className="text-sm text-purple-700 space-y-1 text-left">
                <li>• Realtids klick- och konverteringsstatistik</li>
                <li>• Affiliate-prestanda per kampanj</li>
                <li>• Geolokalisering av deltagare</li>
                <li>• ROI-beräkning och lönsamhetsanalys</li>
                <li>• Lotteri-deltagarhantering</li>
                <li>• Exporterbara rapporter</li>
                <li>• Interaktiva grafer och diagram</li>
              </ul>
            </div>
            <div className="mt-6 space-x-4">
              <Link
                to="/admin/campaigns"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <ArrowLeftIcon className="-ml-1 mr-2 h-4 w-4" />
                Tillbaka till Dashboard
              </Link>
              <Link
                to={`/admin/campaigns/${id}`}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700"
              >
                Redigera Kampanj
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default CampaignAnalytics;