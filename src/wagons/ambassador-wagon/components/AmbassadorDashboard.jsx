import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../../components/layout/AppLayout';
import { useAmbassadorContacts } from '../hooks/useAmbassadorContacts';
import { useAmbassadorActivities } from '../hooks/useAmbassadorActivities';
import {
  MagnifyingGlassIcon,
  UserPlusIcon,
  PhoneIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  FireIcon,
  BellIcon,
  UserGroupIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import {
  PhoneIcon as PhoneSolid,
  ChatBubbleLeftRightIcon as ChatSolid,
  ExclamationTriangleIcon as ExclamationSolid,
  FireIcon as FireSolid,
  BellIcon as BellSolid,
  StarIcon as StarSolid
} from '@heroicons/react/24/solid';

const AmbassadorDashboard = () => {
  const { contacts, loading: contactsLoading, getContactsByStatus, getContactsByTier, getTopInfluencers } = useAmbassadorContacts();
  const { activities, getRecentActivities, loading: activitiesLoading } = useAmbassadorActivities();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredContacts, setFilteredContacts] = useState([]);

  // Filter contacts based on search
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = contacts.filter(contact => 
        contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredContacts(filtered);
    } else {
      setFilteredContacts(contacts);
    }
  }, [searchQuery, contacts]);

  // Get stats for dashboard
  const stats = {
    total: contacts.length,
    prospects: getContactsByStatus('prospect').length,
    contacted: getContactsByStatus('contacted').length,
    negotiating: getContactsByStatus('negotiating').length,
    converted: getContactsByStatus('converted').length,
    nano: getContactsByTier('nano').length,
    micro: getContactsByTier('micro').length,
    macro: getContactsByTier('macro').length,
    mega: getContactsByTier('mega').length
  };

  // Get tier color
  const getTierColor = (tier) => {
    const colors = {
      nano: 'text-green-600 bg-green-100',
      micro: 'text-blue-600 bg-blue-100', 
      macro: 'text-purple-600 bg-purple-100',
      mega: 'text-yellow-600 bg-yellow-100'
    };
    return colors[tier] || 'text-gray-600 bg-gray-100';
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      prospect: 'text-gray-600 bg-gray-100',
      contacted: 'text-blue-600 bg-blue-100',
      negotiating: 'text-orange-600 bg-orange-100',
      converted: 'text-green-600 bg-green-100',
      declined: 'text-red-600 bg-red-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  // Calculate priority triggers (simplified version)
  const getPriorityContacts = () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    return contacts
      .filter(contact => {
        // High priority: Mega influencers not contacted in 3+ days
        if (contact.influencerTier === 'mega' && (!contact.lastContactedAt || contact.lastContactedAt < threeDaysAgo)) {
          return true;
        }
        // Medium priority: Macro influencers not contacted in 1+ day
        if (contact.influencerTier === 'macro' && (!contact.lastContactedAt || contact.lastContactedAt < oneDayAgo)) {
          return true;
        }
        // High priority: Tags indicating hot prospects
        if (contact.tags?.includes('#hett') || contact.tags?.includes('#kontrakt')) {
          return true;
        }
        return false;
      })
      .sort((a, b) => {
        // Sort by tier importance and last contact
        const tierOrder = { mega: 4, macro: 3, micro: 2, nano: 1 };
        const aTier = tierOrder[a.influencerTier] || 0;
        const bTier = tierOrder[b.influencerTier] || 0;
        
        if (aTier !== bTier) return bTier - aTier;
        
        const aTime = a.lastContactedAt ? a.lastContactedAt.getTime() : 0;
        const bTime = b.lastContactedAt ? b.lastContactedAt.getTime() : 0;
        return aTime - bTime; // Oldest first
      })
      .slice(0, 3); // Top 3 priority contacts
  };

  const priorityContacts = getPriorityContacts();

  if (contactsLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <UserGroupIcon className="h-8 w-8 text-purple-600 mr-3" />
                The Ambassador Wagon™
              </h1>
              <p className="text-gray-600 mt-1">Influence Partnership System - Hantera märkesambassadörer</p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/admin/ambassadors/prospects/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
              >
                <UserPlusIcon className="h-4 w-4 mr-2" />
                Ny Ambassadör
              </Link>
              <Link
                to="/admin"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Tillbaka till Admin
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Totalt Ambassadörer</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <StarSolid className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Mega Influencers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.mega}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <FireSolid className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Förhandlar</p>
                <p className="text-2xl font-bold text-gray-900">{stats.negotiating}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ChatSolid className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Konverterade</p>
                <p className="text-2xl font-bold text-gray-900">{stats.converted}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Priority Contacts - "Vem ska jag kontakta?" */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <ExclamationSolid className="h-5 w-5 text-red-500 mr-2" />
                Vem ska jag kontakta? ({priorityContacts.length})
              </h2>
              <p className="text-sm text-gray-600 mt-1">Högprioriterade ambassadörer som behöver uppföljning</p>
            </div>
            <div className="p-6">
              {priorityContacts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Inga akuta kontakter just nu - Vila gott! 😴</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {priorityContacts.map((contact) => (
                    <div key={contact.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-purple-600">
                              {contact.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTierColor(contact.influencerTier)}`}>
                              {contact.influencerTier?.toUpperCase()}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(contact.status)}`}>
                              {contact.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Link
                        to={`/admin/ambassadors/prospects/${contact.id}`}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                      >
                        Kontakta
                        <ArrowRightIcon className="ml-2 h-3 w-3" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search and Navigation */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative flex-1 max-w-lg">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Sök ambassadörer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div className="flex gap-3">
              <Link
                to="/admin/ambassadors/prospects"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Alla Ambassadörer
              </Link>
              <Link
                to="/admin/ambassadors/activities"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Aktiviteter
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Contacts */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Senaste Ambassadörer ({filteredContacts.length})
            </h2>
          </div>
          <div className="overflow-hidden">
            {filteredContacts.length === 0 ? (
              <div className="text-center py-12">
                <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Inga ambassadörer</h3>
                <p className="mt-1 text-sm text-gray-500">Kom igång genom att lägga till din första ambassadör.</p>
                <div className="mt-6">
                  <Link
                    to="/admin/ambassadors/prospects/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                  >
                    <UserPlusIcon className="h-4 w-4 mr-2" />
                    Lägg till ambassadör
                  </Link>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ambassadör
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tier & Följare
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Senast kontaktad
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Åtgärder
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredContacts.slice(0, 10).map((contact) => (
                      <tr key={contact.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-purple-600">
                                  {contact.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                              <div className="text-sm text-gray-500">{contact.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTierColor(contact.influencerTier)} mb-1`}>
                              {contact.influencerTier?.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500">
                              {contact.totalFollowers?.toLocaleString()} följare
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(contact.status)}`}>
                            {contact.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {contact.lastContactedAt ? 
                            contact.lastContactedAt.toLocaleDateString('sv-SE') : 
                            'Aldrig'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            to={`/admin/ambassadors/prospects/${contact.id}`}
                            className="text-purple-600 hover:text-purple-900"
                          >
                            Visa
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AmbassadorDashboard;