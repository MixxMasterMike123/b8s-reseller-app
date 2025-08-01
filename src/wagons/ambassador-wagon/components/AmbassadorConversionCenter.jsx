import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../../components/layout/AppLayout';
import { useAmbassadorContacts } from '../hooks/useAmbassadorContacts';
import {
  ArrowRightIcon,
  UserIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  StarIcon,
  CurrencyDollarIcon,
  TagIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import {
  ArrowRightIcon as ArrowRightSolid,
  CheckCircleIcon as CheckCircleSolid,
  StarIcon as StarSolid,
  CurrencyDollarIcon as CurrencyDollarSolid
} from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

const AmbassadorConversionCenter = () => {
  const { contacts, updateContact, loading } = useAmbassadorContacts();

  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [conversionData, setConversionData] = useState({
    commissionRate: 15,
    checkoutDiscount: 10,
    affiliateCode: '',
    notes: ''
  });

  // Get conversion-ready contacts (negotiating status)
  const conversionReadyContacts = useMemo(() => {
    return contacts.filter(contact => 
      contact.status === 'negotiating' && !contact.convertedToAffiliate
    );
  }, [contacts]);

  // Get converted contacts
  const convertedContacts = useMemo(() => {
    return contacts.filter(contact => contact.convertedToAffiliate);
  }, [contacts]);

  // Filter contacts
  const filteredContacts = useMemo(() => {
    let filtered = conversionReadyContacts;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(contact => 
        contact.name?.toLowerCase().includes(term) ||
        contact.email?.toLowerCase().includes(term) ||
        contact.category?.toLowerCase().includes(term)
      );
    }
    
    if (tierFilter !== 'all') {
      filtered = filtered.filter(contact => contact.influencerTier === tierFilter);
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(contact => contact.status === statusFilter);
    }
    
    return filtered;
  }, [conversionReadyContacts, searchTerm, tierFilter, statusFilter]);

  // Get stats
  const stats = {
    ready: conversionReadyContacts.length,
    converted: convertedContacts.length,
    mega: conversionReadyContacts.filter(c => c.influencerTier === 'mega').length,
    macro: conversionReadyContacts.filter(c => c.influencerTier === 'macro').length,
    micro: conversionReadyContacts.filter(c => c.influencerTier === 'micro').length,
    nano: conversionReadyContacts.filter(c => c.influencerTier === 'nano').length
  };

  // Get recommended commission rate based on tier
  const getRecommendedCommission = (tier) => {
    const rates = {
      nano: 10,
      micro: 15,
      macro: 20,
      mega: 25
    };
    return rates[tier] || 15;
  };

  // Get recommended discount based on tier
  const getRecommendedDiscount = (tier) => {
    const discounts = {
      nano: 5,
      micro: 10,
      macro: 15,
      mega: 20
    };
    return discounts[tier] || 10;
  };

  // Get tier badge
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
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[tier]}`}>
        {labels[tier]}
      </span>
    );
  };

  // Handle convert single contact
  const handleConvertContact = async (contact) => {
    const affiliateCode = `${contact.name.replace(/\s+/g, '').slice(0, 8).toUpperCase()}${Math.floor(Math.random() * 100)}`;
    const commissionRate = getRecommendedCommission(contact.influencerTier);
    const checkoutDiscount = getRecommendedDiscount(contact.influencerTier);
    
    if (window.confirm(`Konvertera ${contact.name} till aktiv affiliate med ${commissionRate}% provision och ${checkoutDiscount}% kundrabatt?`)) {
      try {
        await updateContact(contact.id, {
          status: 'converted',
          convertedToAffiliate: true,
          affiliateId: `affiliate_${contact.id}`,
          conversionDate: new Date(),
          affiliateCode,
          commissionRate,
          checkoutDiscount
        });
        
        toast.success(`${contact.name} konverterad till affiliate framgångsrikt!`);
      } catch (error) {
        console.error('Error converting contact:', error);
        toast.error('Kunde inte konvertera ambassadör');
      }
    }
  };

  // Handle bulk conversion
  const handleBulkConversion = async () => {
    if (selectedContacts.length === 0) {
      toast.error('Välj minst en ambassadör att konvertera');
      return;
    }
    
    // TODO: Implement bulk conversion logic
    toast.success(`Bulk-konvertering av ${selectedContacts.length} ambassadörer är under utveckling`);
    setShowConversionModal(false);
    setSelectedContacts([]);
  };

  // Toggle contact selection
  const toggleContactSelection = (contactId) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-lg text-gray-600">Laddar konverteringar...</span>
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
                  <ArrowRightIcon className="h-8 w-8 text-purple-600 mr-3" />
                  Konverteringscentrum
                </h1>
                <p className="text-gray-600 mt-1">Konvertera förhandlande ambassadörer till aktiva affiliates</p>
              </div>
            </div>
            
            {selectedContacts.length > 0 && (
              <button
                onClick={() => setShowConversionModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                <ArrowRightSolid className="h-4 w-4 mr-2" />
                Konvertera Valda ({selectedContacts.length})
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Redo för Konvertering</p>
                <p className="text-2xl font-bold text-gray-900">{stats.ready}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckCircleSolid className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Konverterade</p>
                <p className="text-2xl font-bold text-gray-900">{stats.converted}</p>
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
              <CurrencyDollarSolid className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Makro Influencers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.macro}</p>
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
                  placeholder="Sök ambassadörer redo för konvertering..."
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
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Influencer Tier</label>
                  <select
                    value={tierFilter}
                    onChange={(e) => setTierFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="all">Alla Tiers</option>
                    <option value="mega">Mega (1M+)</option>
                    <option value="macro">Makro (100K-1M)</option>
                    <option value="micro">Mikro (10K-100K)</option>
                    <option value="nano">Nano (1K-10K)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="all">Alla Status</option>
                    <option value="negotiating">Förhandlar</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Results Summary */}
          <div className="px-6 py-3 bg-gray-50 text-sm text-gray-600">
            Visar {filteredContacts.length} ambassadörer redo för konvertering
          </div>
        </div>

        {/* Conversion Ready List */}
        <div className="bg-white rounded-lg shadow">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-12">
              <ArrowRightIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {conversionReadyContacts.length === 0 ? 'Inga ambassadörer redo för konvertering' : 'Inga ambassadörer hittades'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {conversionReadyContacts.length === 0 
                  ? 'Uppdatera ambassadör-status till "Förhandlar" för att se dem här.'
                  : 'Prova att ändra dina filter eller söktermer.'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedContacts.length === filteredContacts.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedContacts(filteredContacts.map(c => c.id));
                          } else {
                            setSelectedContacts([]);
                          }
                        }}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ambassadör
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tier & Följare
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rekommenderad Provision
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kundrabatt
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
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(contact.id)}
                          onChange={() => toggleContactSelection(contact.id)}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                      </td>
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
                            <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                            <div className="text-sm text-gray-500">{contact.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          {getTierBadge(contact.influencerTier)}
                          <span className="text-xs text-gray-500 mt-1">
                            {contact.totalFollowers?.toLocaleString() || '0'} följare
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <CurrencyDollarIcon className="h-4 w-4 text-green-500 mr-1" />
                          <span className="text-sm font-medium text-green-600">
                            {getRecommendedCommission(contact.influencerTier)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <TagIcon className="h-4 w-4 text-blue-500 mr-1" />
                          <span className="text-sm font-medium text-blue-600">
                            {getRecommendedDiscount(contact.influencerTier)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            to={`/admin/ambassadors/prospects/${contact.id}`}
                            className="text-purple-600 hover:text-purple-900"
                          >
                            Visa
                          </Link>
                          <button
                            onClick={() => handleConvertContact(contact)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-full text-white bg-green-600 hover:bg-green-700"
                          >
                            <ArrowRightSolid className="h-3 w-3 mr-1" />
                            Konvertera
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

        {/* Recently Converted */}
        {convertedContacts.length > 0 && (
          <div className="mt-8">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <CheckCircleSolid className="h-5 w-5 text-green-500 mr-2" />
                  Nyligen Konverterade Affiliates ({convertedContacts.length})
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {convertedContacts.slice(0, 6).map((contact) => (
                    <div key={contact.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-900">{contact.name}</h3>
                        <CheckCircleSolid className="h-5 w-5 text-green-500" />
                      </div>
                      <div className="flex items-center space-x-2 mb-2">
                        {getTierBadge(contact.influencerTier)}
                        <span className="text-xs text-gray-500">
                          {contact.affiliateCode}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Konverterad: {contact.conversionDate?.toLocaleDateString('sv-SE')}
                      </div>
                      <div className="flex items-center justify-between mt-2 text-xs">
                        <span className="text-green-600">Provision: {contact.commissionRate}%</span>
                        <span className="text-blue-600">Rabatt: {contact.checkoutDiscount}%</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                {convertedContacts.length > 6 && (
                  <div className="mt-4 text-center">
                    <Link
                      to="/admin/affiliates"
                      className="text-sm text-purple-600 hover:text-purple-800"
                    >
                      Visa alla affiliates →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Conversion Guidelines */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-6 w-6 text-blue-500 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Riktlinjer för Konvertering</h3>
              <div className="text-sm text-blue-700 mt-2 space-y-1">
                <p>• <strong>Nano (1K-10K):</strong> 10% provision, 5% kundrabatt</p>
                <p>• <strong>Mikro (10K-100K):</strong> 15% provision, 10% kundrabatt</p>
                <p>• <strong>Makro (100K-1M):</strong> 20% provision, 15% kundrabatt</p>
                <p>• <strong>Mega (1M+):</strong> 25% provision, 20% kundrabatt</p>
                <p className="mt-2">Konvertera endast ambassadörer som är i förhandlingsstatus och visat genuint intresse.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AmbassadorConversionCenter;