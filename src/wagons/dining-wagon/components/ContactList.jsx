import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../../components/layout/AppLayout';
import { useDiningContacts } from '../hooks/useDiningContacts';
import { exportContactsToCSV, exportEmailListCSV, getExportStats } from '../utils/contactExport';
import {
  UserGroupIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EllipsisVerticalIcon,
  PhoneIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  GlobeAltIcon,
  StarIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import {
  StarIcon as StarSolid
} from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

const ContactList = () => {
  const { 
    contacts, 
    loading, 
    filterContacts, 
    getContactStats, 
    getCountries,
    activateContact
  } = useDiningContacts();

  // Session storage keys for filter persistence
  const STORAGE_KEYS = {
    searchTerm: 'diningWagon_searchTerm',
    statusFilter: 'diningWagon_statusFilter',
    countryFilter: 'diningWagon_countryFilter',
    priorityFilter: 'diningWagon_priorityFilter',
    showFilters: 'diningWagon_showFilters'
  };

  // Initialize state from session storage or defaults
  const [searchTerm, setSearchTerm] = useState(() => 
    sessionStorage.getItem(STORAGE_KEYS.searchTerm) || ''
  );
  const [statusFilter, setStatusFilter] = useState(() => 
    sessionStorage.getItem(STORAGE_KEYS.statusFilter) || 'all'
  );
  const [countryFilter, setCountryFilter] = useState(() => 
    sessionStorage.getItem(STORAGE_KEYS.countryFilter) || 'all'
  );
  const [priorityFilter, setPriorityFilter] = useState(() => 
    sessionStorage.getItem(STORAGE_KEYS.priorityFilter) || 'all'
  );
  const [showFilters, setShowFilters] = useState(() => 
    sessionStorage.getItem(STORAGE_KEYS.showFilters) === 'true'
  );

  // Export dropdown state
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportDropdown && !event.target.closest('.export-dropdown')) {
        setShowExportDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportDropdown]);

  // Persist filter changes to session storage
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.searchTerm, searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.statusFilter, statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.countryFilter, countryFilter);
  }, [countryFilter]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.priorityFilter, priorityFilter);
  }, [priorityFilter]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.showFilters, showFilters.toString());
  }, [showFilters]);

  // Clear all filters function
  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setCountryFilter('all');
    setPriorityFilter('all');
    // Keep showFilters state as is - user might want to keep it open
    toast.success('🧹 Alla filter rensade!');
  };

  // Filter contacts based on current filters
  const filteredContacts = useMemo(() => {
    const filters = {};
    
    if (searchTerm) filters.search = searchTerm;
    if (statusFilter !== 'all') filters.status = statusFilter;
    if (countryFilter !== 'all') filters.country = countryFilter;
    if (priorityFilter !== 'all') filters.priority = priorityFilter;
    
    return filterContacts(filters);
  }, [contacts, searchTerm, statusFilter, countryFilter, priorityFilter, filterContacts]);

  const stats = getContactStats();
  const countries = getCountries();

  // 🎯 NEW: Activate contact handler
  const handleActivateContact = async (contactId, companyName) => {
    if (!window.confirm(`Aktivera "${companyName}" som B2B-kund? De kommer då att visas i kundhanteringen.`)) {
      return;
    }

    try {
      await activateContact(contactId);
      // Success message handled by the hook
    } catch (error) {
      console.error('Error activating contact:', error);
      // Error message handled by the hook
    }
  };

  // Export handlers
  const handleFullExport = () => {
    exportContactsToCSV(filteredContacts, {
      filename: `dining-wagon-contacts-full-${new Date().toISOString().split('T')[0]}.csv`
    });
    setShowExportDropdown(false);
  };

  const handleEmailListExport = () => {
    exportEmailListCSV(filteredContacts, {
      filename: `dining-wagon-emails-${new Date().toISOString().split('T')[0]}.csv`
    });
    setShowExportDropdown(false);
  };

  const handleAllContactsExport = () => {
    exportContactsToCSV(contacts, {
      filename: `dining-wagon-all-contacts-${new Date().toISOString().split('T')[0]}.csv`
    });
    setShowExportDropdown(false);
  };

  // Status badge styling
  const getStatusBadge = (status) => {
    const styles = {
      // New status options
      ej_kontaktad: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300',
      kontaktad: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300',
      dialog: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300',
      af: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300',
      closed: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300',
      
      // Legacy status options - for backward compatibility
      prospect: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300',
      active: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300',
      inactive: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
    };
    
    const labels = {
      // New status options
      ej_kontaktad: 'Ej kontaktad',
      kontaktad: 'Kontaktad',
      dialog: 'Dialog',
      af: 'ÅF',
      closed: 'Stängd',
      
      // Legacy/CRM options
      prospect: 'Prospect',
      active: 'Stamgäst',
      inactive: 'Inaktiv'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.inactive}`}>
        {labels[status] || status}
      </span>
    );
  };

  // Priority indicator
  const getPriorityIcon = (priority) => {
    if (priority === 'high') {
      return <ExclamationTriangleIcon className="h-4 w-4 text-red-500 dark:text-red-400" title="Hög prioritet" />;
    }
    if (priority === 'medium') {
      return <StarIcon className="h-4 w-4 text-yellow-500 dark:text-yellow-400" title="Medium prioritet" />;
    }
    return null;
  };



  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 dark:border-orange-400"></div>
          <span className="ml-3 text-lg text-gray-600 dark:text-gray-400">Hämtar gästlistan...</span>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
                      <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link 
                to="/admin/dining" 
                className="mr-4 p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </Link>
              <div className="flex items-center">
                <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-xl mr-4">
                  <UserGroupIcon className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">Gästlista</h1>
                  <p className="text-gray-600 dark:text-gray-400">Hantera alla dina kontakter och prospekt</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Export Dropdown */}
              <div className="relative export-dropdown">
                <button
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                  <span>Exportera</span>
                  <ChevronDownIcon className="h-4 w-4" />
                </button>
                
                {showExportDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                    <div className="py-2">
                      <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                        Exportera till CSV för Sender.net
                      </div>
                      
                      <button
                        onClick={handleFullExport}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <ArrowDownTrayIcon className="h-4 w-4" />
                          <div>
                            <div className="font-medium">Filtrerade kontakter ({filteredContacts.length})</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Komplett data för marknadsföring</div>
                          </div>
                        </div>
                      </button>
                      
                      <button
                        onClick={handleEmailListExport}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <EnvelopeIcon className="h-4 w-4" />
                          <div>
                            <div className="font-medium">Endast e-postlista</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Enkel lista med e-post, namn, företag</div>
                          </div>
                        </div>
                      </button>
                      
                      <button
                        onClick={handleAllContactsExport}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <UserGroupIcon className="h-4 w-4" />
                          <div>
                            <div className="font-medium">Alla kontakter ({contacts.length})</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Komplett databas (ignorerar filter)</div>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <Link
                to="/admin/dining/contacts/new"
                className="bg-orange-600 dark:bg-orange-500 hover:bg-orange-700 dark:hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Ny Gäst</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Totala Gäster</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
              </div>
              <UserGroupIcon className="h-8 w-8 text-blue-500 dark:text-blue-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Reservationer</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.prospects}</p>
              </div>
              <StarIcon className="h-8 w-8 text-yellow-500 dark:text-yellow-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Stamgäster</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
              </div>
              <StarSolid className="h-8 w-8 text-green-500 dark:text-green-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">VIP Gäster</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.highPriority}</p>
              </div>
              <ExclamationTriangleIcon className="h-8 w-8 text-orange-500 dark:text-orange-400" />
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Sök gäster..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent"
              />
            </div>
            
            <div className="flex space-x-2">
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <FunnelIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <span>Filter</span>
              </button>

              {/* Clear Filters Button - only show if any filters are active */}
              {(searchTerm || statusFilter !== 'all' || countryFilter !== 'all' || priorityFilter !== 'all') && (
                <button
                  onClick={clearAllFilters}
                  className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Rensa alla filter"
                >
                  <span>Rensa</span>
                </button>
              )}
            </div>
          </div>
          
          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                  >
                    <option value="all">Alla statusar</option>
                    <option value="prospect">Reserveringar</option>
                    <option value="active">Stamgäster</option>
                    <option value="inactive">Inaktiva</option>
                    <option value="closed">Stängda</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Land</label>
                  <select
                    value={countryFilter}
                    onChange={(e) => setCountryFilter(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                  >
                    <option value="all">Alla länder</option>
                    {countries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prioritet</label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                  >
                    <option value="all">Alla prioriteter</option>
                    <option value="high">Hög prioritet</option>
                    <option value="medium">Medium prioritet</option>
                    <option value="low">Låg prioritet</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Contacts Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Gäst & Kontakt
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status & Land
                  </th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Åtgärder
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-4 md:px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <UserGroupIcon className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                      <p className="text-lg font-medium">Inga gäster hittades</p>
                      <p className="text-sm">Prova att justera dina sökfilter eller lägg till en ny gäst</p>
                    </td>
                  </tr>
                ) : (
                  filteredContacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      {/* Column 1: Guest & Contact */}
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 h-12 w-12 mr-4">
                            <div className="h-12 w-12 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-800 dark:to-orange-700 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                                {(contact.companyName || contact.contactPerson || 'G').charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {getPriorityIcon(contact.priority)}
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {contact.companyName}
                              </div>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                              {contact.contactPerson}
                            </div>
                            <div className="space-y-1">
                              {contact.email && (
                                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                  <EnvelopeIcon className="h-3 w-3 mr-1" />
                                  {contact.email}
                                </div>
                              )}
                              {(contact.phone || contact.phoneNumber) && (
                                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                  <PhoneIcon className="h-3 w-3 mr-1" />
                                  {contact.phone || contact.phoneNumber}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Status & Country */}
                      <td className="px-4 md:px-6 py-4">
                        <div className="space-y-2">
                          {getStatusBadge(contact.status)}
                          
                          {/* 🎯 NEW: Active/Prospect Indicator */}
                          <div className="flex items-center space-x-2">
                            {contact.active === true ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700">
                                <span className="w-1.5 h-1.5 bg-green-400 dark:bg-green-500 rounded-full mr-1"></span>
                                Aktiv Kund
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-700">
                                <span className="w-1.5 h-1.5 bg-orange-400 dark:bg-orange-500 rounded-full mr-1"></span>
                                Reservering
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <GlobeAltIcon className="h-4 w-4 mr-2" />
                            {contact.country || 'Ej angivet'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Uppdaterad: {contact.updatedAt?.toDate?.()?.toLocaleDateString('sv-SE') || 'Okänt'}
                          </div>
                        </div>
                      </td>

                      {/* Column 3: Actions */}
                      <td className="px-4 md:px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Make Active Button (Only for prospects) */}
                          {contact.active !== true && (
                            <button
                              onClick={() => handleActivateContact(contact.id, contact.companyName)}
                              className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium text-sm flex items-center space-x-1"
                              title="Aktivera som B2B-kund"
                            >
                              <CheckCircleIcon className="h-4 w-4" />
                              <span>Aktivera</span>
                            </button>
                          )}
                          
                          <Link
                            to={`/admin/dining/contacts/${contact.id}`}
                            className="text-orange-600 dark:text-orange-400 hover:text-orange-900 dark:hover:text-orange-300 font-medium text-sm"
                          >
                            Visa
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Results Summary */}
        {filteredContacts.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
            Visar {filteredContacts.length} av {contacts.length} gäster
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default ContactList; 