import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../../components/layout/AppLayout';
import { useDiningContacts } from '../hooks/useDiningContacts';
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
  CheckCircleIcon
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

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

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

  // Status badge styling
  const getStatusBadge = (status) => {
    const styles = {
      prospect: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      closed: 'bg-red-100 text-red-800'
    };
    
    const labels = {
      prospect: 'Reservering',
      active: 'Stamgäst',
      inactive: 'Inaktiv',
      closed: 'Stängd'
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
      return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" title="Hög prioritet" />;
    }
    if (priority === 'medium') {
      return <StarIcon className="h-4 w-4 text-yellow-500" title="Medium prioritet" />;
    }
    return null;
  };



  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <span className="ml-3 text-lg text-gray-600">Hämtar gästlistan...</span>
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
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </Link>
              <div className="flex items-center">
                <div className="bg-orange-100 p-3 rounded-xl mr-4">
                  <UserGroupIcon className="h-8 w-8 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-1">Gästlista</h1>
                  <p className="text-gray-600">Hantera alla dina kontakter och prospekt</p>
                </div>
              </div>
            </div>
            
            <Link
              to="/admin/dining/contacts/new"
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Ny Gäst</span>
            </Link>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Totala Gäster</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <UserGroupIcon className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Reservationer</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.prospects}</p>
              </div>
              <StarIcon className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Stamgäster</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <StarSolid className="h-8 w-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">VIP Gäster</p>
                <p className="text-2xl font-bold text-orange-600">{stats.highPriority}</p>
              </div>
              <ExclamationTriangleIcon className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Sök gäster..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FunnelIcon className="h-5 w-5 text-gray-500" />
              <span>Filter</span>
            </button>
          </div>
          
          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="all">Alla statusar</option>
                    <option value="prospect">Reserveringar</option>
                    <option value="active">Stamgäster</option>
                    <option value="inactive">Inaktiva</option>
                    <option value="closed">Stängda</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Land</label>
                  <select
                    value={countryFilter}
                    onChange={(e) => setCountryFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="all">Alla länder</option>
                    {countries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prioritet</label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
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
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gäst & Kontakt
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status & Land
                  </th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Åtgärder
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-4 md:px-6 py-12 text-center text-gray-500">
                      <UserGroupIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                      <p className="text-lg font-medium">Inga gäster hittades</p>
                      <p className="text-sm">Prova att justera dina sökfilter eller lägg till en ny gäst</p>
                    </td>
                  </tr>
                ) : (
                  filteredContacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                      {/* Column 1: Guest & Contact */}
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 h-12 w-12 mr-4">
                            <div className="h-12 w-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-orange-800">
                                {(contact.companyName || contact.contactPerson || 'G').charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {getPriorityIcon(contact.priority)}
                              <div className="text-sm font-medium text-gray-900">
                                {contact.companyName}
                              </div>
                            </div>
                            <div className="text-sm text-gray-600 mb-1">
                              {contact.contactPerson}
                            </div>
                            <div className="space-y-1">
                              {contact.email && (
                                <div className="flex items-center text-xs text-gray-500">
                                  <EnvelopeIcon className="h-3 w-3 mr-1" />
                                  {contact.email}
                                </div>
                              )}
                              {(contact.phone || contact.phoneNumber) && (
                                <div className="flex items-center text-xs text-gray-500">
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
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 border border-green-200">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1"></span>
                                Aktiv Kund
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800 border border-orange-200">
                                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full mr-1"></span>
                                Reservering
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center text-sm text-gray-600">
                            <GlobeAltIcon className="h-4 w-4 mr-2" />
                            {contact.country || 'Ej angivet'}
                          </div>
                          <div className="text-xs text-gray-500">
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
                              className="text-green-600 hover:text-green-700 font-medium text-sm flex items-center space-x-1"
                              title="Aktivera som B2B-kund"
                            >
                              <CheckCircleIcon className="h-4 w-4" />
                              <span>Aktivera</span>
                            </button>
                          )}
                          
                          <Link
                            to={`/admin/dining/contacts/${contact.id}`}
                            className="text-orange-600 hover:text-orange-900 font-medium text-sm"
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
          <div className="mt-4 text-sm text-gray-600 text-center">
            Visar {filteredContacts.length} av {contacts.length} gäster
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default ContactList; 