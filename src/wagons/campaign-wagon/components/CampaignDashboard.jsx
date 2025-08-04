import React from 'react';
import { Link } from 'react-router-dom';
import { 
  PlusIcon,
  MegaphoneIcon,
  ChartBarIcon,
  TrophyIcon,
  TagIcon,
  CalendarIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline';
import AppLayout from '../../../components/layout/AppLayout';
import { useCampaigns } from '../hooks/useCampaigns';
import { CAMPAIGN_STATUS } from '../utils/campaignUtils';

const CampaignDashboard = () => {
  const { 
    campaigns, 
    loading, 
    error,
    getCampaignStats,
    getActiveCampaigns,
    getDraftCampaigns
  } = useCampaigns();

  const stats = getCampaignStats();
  const activeCampaigns = getActiveCampaigns();
  const draftCampaigns = getDraftCampaigns();

  // Get status badge component
  const getStatusBadge = (status) => {
    const statusConfig = CAMPAIGN_STATUS[status] || CAMPAIGN_STATUS.draft;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor} border`}>
        {statusConfig.name}
      </span>
    );
  };

  // Get campaign type icon
  const getCampaignTypeIcon = (type) => {
    const icons = {
      competition: TrophyIcon,
      offer: TagIcon,
      product_launch: RocketLaunchIcon,
      seasonal: CalendarIcon
    };
    
    const IconComponent = icons[type] || TagIcon;
    return <IconComponent className="h-5 w-5 text-gray-400" />;
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <MegaphoneIcon className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">The Campaign Wagon™</h1>
                <p className="text-gray-600 mt-1">Avancerad kampanjhantering för affiliate-marknadsföring</p>
              </div>
            </div>
            <Link
              to="/admin/campaigns/create"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Skapa Kampanj
            </Link>
          </div>
        </div>

        {/* Campaign Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Totala Kampanjer</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.total}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Aktiva Kampanjer</dt>
                    <dd className="text-lg font-medium text-green-600">{stats.active}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrophyIcon className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Totala Klick</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalClicks.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-blue-600">%</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Konvertering</dt>
                    <dd className="text-lg font-medium text-blue-600">{stats.conversionRate}%</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Ett fel uppstod</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Campaign Lists */}
        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Active Campaigns */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Aktiva Kampanjer ({activeCampaigns.length})</h2>
              </div>
              
              <div className="divide-y divide-gray-200">
                {activeCampaigns.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <MegaphoneIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p>Inga aktiva kampanjer ännu</p>
                    <p className="text-sm mt-1">Skapa din första kampanj för att komma igång</p>
                  </div>
                ) : (
                  activeCampaigns.slice(0, 5).map((campaign) => (
                    <div key={campaign.id} className="p-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {getCampaignTypeIcon(campaign.type)}
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                              {campaign.name?.['sv-SE'] || 'Namnlös kampanj'}
                            </p>
                            <p className="text-sm text-gray-500">
                              Kod: {campaign.code}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(campaign.status)}
                          <Link
                            to={`/admin/campaigns/${campaign.id}`}
                            className="text-purple-600 hover:text-purple-500 text-sm font-medium"
                          >
                            Visa →
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Draft Campaigns */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Utkast ({draftCampaigns.length})</h2>
              </div>
              
              <div className="divide-y divide-gray-200">
                {draftCampaigns.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-gray-400 text-xl">📝</span>
                    </div>
                    <p>Inga utkast sparade</p>
                    <p className="text-sm mt-1">Spara kampanjer som utkast innan aktivering</p>
                  </div>
                ) : (
                  draftCampaigns.slice(0, 5).map((campaign) => (
                    <div key={campaign.id} className="p-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {getCampaignTypeIcon(campaign.type)}
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                              {campaign.name?.['sv-SE'] || 'Namnlös kampanj'}
                            </p>
                            <p className="text-sm text-gray-500">
                              Kod: {campaign.code}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(campaign.status)}
                          <Link
                            to={`/admin/campaigns/${campaign.id}`}
                            className="text-purple-600 hover:text-purple-500 text-sm font-medium"
                          >
                            Redigera →
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Getting Started */}
        {!loading && campaigns.length === 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mt-8">
            <div className="flex items-center">
              <MegaphoneIcon className="h-6 w-6 text-purple-600 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-purple-800">Välkommen till Campaign Wagon™!</h3>
                <p className="text-purple-700 mt-1">
                  Skapa din första kampanj för att komma igång med avancerad affiliate-marknadsföring.
                </p>
                <div className="mt-4">
                  <Link
                    to="/admin/campaigns/create"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200"
                  >
                    <PlusIcon className="-ml-1 mr-2 h-4 w-4" />
                    Skapa Din Första Kampanj
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default CampaignDashboard;