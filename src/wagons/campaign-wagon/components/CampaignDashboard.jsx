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
import { useContentTranslation } from '../../../hooks/useContentTranslation';
import { useCampaigns } from '../hooks/useCampaigns';
import { CAMPAIGN_STATUS } from '../utils/campaignUtils';

const CampaignDashboard = () => {
  const { getContentValue } = useContentTranslation();
  const { 
    campaigns, 
    loading, 
    error,
    getCampaignStats,
    getActiveCampaigns,
    getDraftCampaigns,
    getPausedCampaigns,
    getCompletedCampaigns,
    getCancelledCampaigns,
    getAllCampaigns
  } = useCampaigns();

  const stats = getCampaignStats();
  const activeCampaigns = getActiveCampaigns();
  const draftCampaigns = getDraftCampaigns();
  const pausedCampaigns = getPausedCampaigns();
  const completedCampaigns = getCompletedCampaigns();
  const cancelledCampaigns = getCancelledCampaigns();
  const allCampaigns = getAllCampaigns();

  // Safe rendering function for campaign names (prevents React string/json errors)
  const safeGetCampaignName = (campaign) => {
    if (!campaign) return 'Namnlös kampanj';
    
    // Use getContentValue for safe multilingual content extraction
    const name = getContentValue(campaign.name);
    
    // Ensure we always return a string, never an object
    if (typeof name === 'string' && name.trim()) {
      return name;
    }
    
    // Fallback to campaign code or default name
    return campaign.code ? `Kampanj ${campaign.code}` : 'Namnlös kampanj';
  };

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

        {/* All Campaigns - Comprehensive View */}
        {!loading && !error && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Alla Kampanjer ({allCampaigns.length})</h2>
                {allCampaigns.length > 0 && (
                  <div className="text-sm text-gray-500">
                    Aktiva: {activeCampaigns.length} | Pausade: {pausedCampaigns.length} | Utkast: {draftCampaigns.length} | Avslutade: {completedCampaigns.length}
                  </div>
                )}
              </div>
            </div>
            
            <div className="divide-y divide-gray-200">
              {allCampaigns.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <MegaphoneIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Inga kampanjer än</h3>
                  <p>Skapa din första kampanj för att komma igång med affiliate-marknadsföring</p>
                  <div className="mt-6">
                    <Link
                      to="/admin/campaigns/create"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200"
                    >
                      <PlusIcon className="-ml-1 mr-2 h-4 w-4" />
                      Skapa Din Första Kampanj
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  {/* Status Summary Cards */}
                  <div className="p-6 bg-gray-50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {activeCampaigns.length > 0 && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{activeCampaigns.length}</div>
                          <div className="text-xs text-gray-500">Aktiva</div>
                        </div>
                      )}
                      {pausedCampaigns.length > 0 && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-600">{pausedCampaigns.length}</div>
                          <div className="text-xs text-gray-500">Pausade</div>
                        </div>
                      )}
                      {draftCampaigns.length > 0 && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-600">{draftCampaigns.length}</div>
                          <div className="text-xs text-gray-500">Utkast</div>
                        </div>
                      )}
                      {completedCampaigns.length > 0 && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{completedCampaigns.length}</div>
                          <div className="text-xs text-gray-500">Avslutade</div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Campaign List */}
                  {allCampaigns.map((campaign) => (
                    <div key={campaign.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center min-w-0 flex-1">
                          {getCampaignTypeIcon(campaign.type)}
                          <div className="ml-3 min-w-0 flex-1">
                            <div className="flex items-center">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {safeGetCampaignName(campaign)}
                              </p>
                              <div className="ml-2 flex-shrink-0">
                                {getStatusBadge(campaign.status)}
                              </div>
                            </div>
                            <div className="mt-1 flex items-center text-sm text-gray-500">
                              <span>Kod: {campaign.code}</span>
                              {campaign.startDate && (
                                <>
                                  <span className="mx-2">•</span>
                                  <span>Start: {new Date(campaign.startDate).toLocaleDateString('sv-SE')}</span>
                                </>
                              )}
                              {campaign.endDate && (
                                <>
                                  <span className="mx-2">•</span>
                                  <span>Slut: {new Date(campaign.endDate).toLocaleDateString('sv-SE')}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <Link
                            to={`/admin/campaigns/${campaign.id}`}
                            className="text-purple-600 hover:text-purple-500 text-sm font-medium"
                          >
                            {campaign.status === 'draft' ? 'Redigera' : 'Visa'} →
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
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