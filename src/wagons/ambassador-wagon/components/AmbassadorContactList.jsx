import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../../components/layout/AppLayout';
import { useAmbassadorContacts } from '../hooks/useAmbassadorContacts';
import {
  UserGroupIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  TrashIcon,
  ShareIcon,
  UserIcon,
  StarIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import {
  StarIcon as StarSolid,
  UserGroupIcon as UserGroupSolid
} from '@heroicons/react/24/solid';

const AmbassadorContactList = () => {
  const { 
    contacts, 
    loading, 
    searchContacts, 
    getContactsByStatus,
    getContactsByTier,
    deleteContact,
    activateContact
  } = useAmbassadorContacts();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Filter contacts based on current filters
  const filteredContacts = useMemo(() => {
    let filtered = searchTerm ? searchContacts(searchTerm) : contacts;
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(contact => contact.status === statusFilter);
    }
    
    if (tierFilter !== 'all') {
      filtered = filtered.filter(contact => contact.influencerTier === tierFilter);
    }
    
    if (platformFilter !== 'all') {
      filtered = filtered.filter(contact => 
        contact.platforms && Object.keys(contact.platforms).includes(platformFilter)
      );
    }
    
    return filtered;
  }, [contacts, searchTerm, statusFilter, tierFilter, platformFilter, searchContacts]);

  // Get stats
  const stats = {
    total: contacts.length,
    prospect: getContactsByStatus('prospect').length,
    contacted: getContactsByStatus('contacted').length,
    negotiating: getContactsByStatus('negotiating').length,
    converted: getContactsByStatus('converted').length,
    nano: getContactsByTier('nano').length,
    micro: getContactsByTier('micro').length,
    macro: getContactsByTier('macro').length,
    mega: getContactsByTier('mega').length
  };

  // Get unique platforms for filter
  const availablePlatforms = useMemo(() => {
    const platforms = new Set();
    contacts.forEach(contact => {
      if (contact.platforms) {
        Object.keys(contact.platforms).forEach(platform => platforms.add(platform));
      }
    });
    return Array.from(platforms);
  }, [contacts]);

  // Status badge styling
  const getStatusBadge = (status) => {
    const styles = {
      prospect: 'bg-gray-100 text-gray-800',
      contacted: 'bg-blue-100 text-blue-800',
      negotiating: 'bg-orange-100 text-orange-800',
      converted: 'bg-green-100 text-green-800',
      declined: 'bg-red-100 text-red-800'
    };
    
    const labels = {
      prospect: 'Prospekt',
      contacted: 'Kontaktad',
      negotiating: 'Förhandlar',
      converted: 'Konverterad',
      declined: 'Avböjd'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.prospect}`}>
        {labels[status] || status}
      </span>
    );
  };

  // Tier badge styling
  const getTierBadge = (tier) => {
    const styles = {
      nano: 'bg-green-100 text-green-800',
      micro: 'bg-blue-100 text-blue-800',
      macro: 'bg-purple-100 text-purple-800',
      mega: 'bg-yellow-100 text-yellow-800'
    };
    
    const labels = {
      nano: 'Nano',
      micro: 'Mikro',
      macro: 'Makro',
      mega: 'Mega'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[tier] || styles.nano}`}>
        {labels[tier] || tier}
      </span>
    );
  };

  // Priority indicator based on tier and status
  const getPriorityIcon = (contact) => {
    if (contact.influencerTier === 'mega') {
      return <ExclamationTriangleIcon className="h-4 w-4 text-red-500 ml-2" title="Mega Influencer - Hög prioritet" />;
    }
    if (contact.influencerTier === 'macro' && contact.status === 'negotiating') {
      return <StarSolid className="h-4 w-4 text-orange-500 ml-2" title="Makro Influencer förhandlar" />;
    }
    return null;
  };

  // Get platform icons
  const getPlatformIcons = (platforms) => {
    if (!platforms) return <span className="text-sm text-gray-400">Inga plattformar</span>;
    
    const platformList = Object.keys(platforms).slice(0, 3); // Show max 3 platforms
    
    return (
      <div className="flex items-center space-x-1">
        {platformList.map(platform => (
          <span key={platform} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-purple-100 text-purple-700">
            {platform.charAt(0).toUpperCase() + platform.slice(1)}
          </span>
        ))}
        {Object.keys(platforms).length > 3 && (
          <span className="text-xs text-gray-500">+{Object.keys(platforms).length - 3}</span>
        )}
      </div>
    );
  };

  // Get contact type badge (Ambassador vs Regular Affiliate)
  const getContactTypeBadge = (contact) => {
    if (contact.contactType === 'ambassador') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
          <StarIcon className="h-3 w-3 mr-1" />
          Ambassadör
        </span>
      );
    } else {
      // Regular affiliate (no contactType field or contactType !== 'ambassador')
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
          <ShareIcon className="h-3 w-3 mr-1" />
          Affiliate
        </span>
      );
    }
  };

  // Handle activate contact
  const handleActivateContact = async (contactId, name) => {
    if (!window.confirm(`Är du säker på att du vill aktivera "${name}" som affiliate? De kommer då att visas i affiliate-hanteringen.`)) {
      return;
    }

    try {
      await activateContact(contactId);
    } catch (error) {
      console.error('Error activating contact:', error);
    }
  };

  const handleDeleteContact = async (contactId, name) => {
    if (window.confirm(`Är du säker på att du vill ta bort ambassadören "${name}"?`)) {
      try {
        await deleteContact(contactId);
      } catch (error) {
        console.error('Error deleting ambassador contact:', error);
      }
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-lg text-gray-600">Laddar ambassadörer...</span>
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
            <div className="flex items-center">
              <Link
                to="/admin/ambassadors"
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <UserGroupIcon className="h-8 w-8 text-purple-600 mr-3" />
                  Ambassadörer & Affiliates
                </h1>
                <p className="text-gray-600 mt-1">Hantera alla marketing partners - både ambassadörer och affiliates</p>
              </div>
            </div>
            <Link
              to="/admin/ambassadors/prospects/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Ny Ambassadör
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <UserGroupSolid className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Totalt</p>
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
              <ShareIcon className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Förhandlar</p>
                <p className="text-2xl font-bold text-gray-900">{stats.negotiating}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <UserIcon className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Konverterade</p>
                <p className="text-2xl font-bold text-gray-900">{stats.converted}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="relative flex-1 max-w-lg">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Sök ambassadörer efter namn, email, kategori..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <FunnelIcon className="h-4 w-4 mr-2" />
                Filter
              </button>
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="all">Alla Status</option>
                    <option value="prospect">Prospekt</option>
                    <option value="contacted">Kontaktad</option>
                    <option value="negotiating">Förhandlar</option>
                    <option value="converted">Konverterad</option>
                    <option value="declined">Avböjd</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Influencer Tier</label>
                  <select
                    value={tierFilter}
                    onChange={(e) => setTierFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="all">Alla Tiers</option>
                    <option value="nano">Nano (1K-10K)</option>
                    <option value="micro">Mikro (10K-100K)</option>
                    <option value="macro">Makro (100K-1M)</option>
                    <option value="mega">Mega (1M+)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plattform</label>
                  <select
                    value={platformFilter}
                    onChange={(e) => setPlatformFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="all">Alla Plattformar</option>
                    {availablePlatforms.map(platform => (
                      <option key={platform} value={platform}>
                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Results Summary */}
          <div className="px-6 py-3 bg-gray-50 text-sm text-gray-600">
            Visar {filteredContacts.length} av {contacts.length} ambassadörer
          </div>
        </div>

        {/* Contact List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-12">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Inga ambassadörer hittades</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' || tierFilter !== 'all' || platformFilter !== 'all'
                  ? 'Prova att ändra dina filter eller söktermer.'
                  : 'Kom igång genom att lägga till din första ambassadör.'
                }
              </p>
              <div className="mt-6">
                <Link
                  to="/admin/ambassadors/prospects/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
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
                      Plattformar
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
                  {filteredContacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-purple-600">
                                {contact.name?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center">
                              <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                              {getPriorityIcon(contact)}
                            </div>
                            <div className="text-sm text-gray-500">{contact.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          {getTierBadge(contact.influencerTier)}
                          <span className="text-xs text-gray-500 mt-1">
                            {(() => {
                              // Calculate total followers dynamically including otherPlatforms
                              const platformFollowers = contact.platforms ? 
                                Object.values(contact.platforms).reduce((sum, platform) => 
                                  sum + (platform.followers || platform.subscribers || 0), 0) : 0;
                              
                              const otherFollowers = contact.otherPlatforms ? 
                                contact.otherPlatforms.reduce((sum, platform) => 
                                  sum + (platform.followers || 0), 0) : 0;
                              
                              const totalFollowers = platformFollowers + otherFollowers;
                              
                              return totalFollowers.toLocaleString();
                            })()} följare
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPlatformIcons(contact.platforms)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          {getContactTypeBadge(contact)}
                          {(contact.active === true || contact.status === 'active') ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 border border-green-200 font-medium">
                              <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1"></span>
                              Aktiv
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800 border border-orange-200 font-medium">
                              <span className="w-1.5 h-1.5 bg-orange-400 rounded-full mr-1"></span>
                              Inaktiv
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {contact.lastContactedAt ? 
                          contact.lastContactedAt.toLocaleDateString('sv-SE') : 
                          'Aldrig'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Make Active Button (Only for inactive contacts) */}
                          {(contact.active !== true && contact.status !== 'active') && (
                            <button
                              onClick={() => handleActivateContact(contact.id, contact.name)}
                              className="text-green-600 hover:text-green-700 font-medium text-sm flex items-center space-x-1"
                              title="Aktivera som affiliate"
                            >
                              <CheckCircleIcon className="h-4 w-4" />
                              <span>Aktivera</span>
                            </button>
                          )}
                          
                          <Link
                            to={`/admin/ambassadors/prospects/${contact.id}`}
                            className="text-purple-600 hover:text-purple-900"
                          >
                            Visa
                          </Link>
                          <button
                            onClick={() => handleDeleteContact(contact.id, contact.name)}
                            className="text-red-600 hover:text-red-900"
                            title="Ta bort kontakt"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default AmbassadorContactList;