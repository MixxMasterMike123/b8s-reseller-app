import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../../components/layout/AppLayout';
import { useAmbassadorContacts } from '../hooks/useAmbassadorContacts';
import { useAmbassadorActivities } from '../hooks/useAmbassadorActivities';
import {
  ClockIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  UserIcon,
  BellIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import {
  ClockIcon as ClockSolid,
  CalendarDaysIcon as CalendarDaysSolid,
  ExclamationTriangleIcon as ExclamationSolid,
  BellIcon as BellSolid
} from '@heroicons/react/24/solid';

const AmbassadorFollowUpCenter = () => {
  const { contacts } = useAmbassadorContacts();
  const { activities, getFollowUpActivities, loading } = useAmbassadorActivities();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Create a map of contact IDs to contact data
  const contactsMap = useMemo(() => {
    const map = {};
    contacts.forEach(contact => {
      map[contact.id] = contact;
    });
    return map;
  }, [contacts]);

  // Get all follow-up activities and categorize them
  const followUpActivities = useMemo(() => {
    const followUps = getFollowUpActivities();
    const now = new Date();
    
    return followUps.map(activity => {
      const followUpDate = new Date(activity.followUpDate);
      const daysDiff = Math.floor((followUpDate - now) / (1000 * 60 * 60 * 24));
      
      let urgency = 'future';
      if (daysDiff < 0) urgency = 'overdue';
      else if (daysDiff === 0) urgency = 'today';
      else if (daysDiff <= 2) urgency = 'soon';
      
      return {
        ...activity,
        contact: contactsMap[activity.contactId],
        followUpDate,
        daysDiff,
        urgency
      };
    }).sort((a, b) => a.followUpDate - b.followUpDate);
  }, [getFollowUpActivities, contactsMap]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    let filtered = followUpActivities;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(activity => 
        activity.title?.toLowerCase().includes(term) ||
        activity.content?.toLowerCase().includes(term) ||
        activity.contact?.name?.toLowerCase().includes(term)
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(activity => activity.status === statusFilter);
    }
    
    if (urgencyFilter !== 'all') {
      filtered = filtered.filter(activity => activity.urgency === urgencyFilter);
    }
    
    return filtered;
  }, [followUpActivities, searchTerm, statusFilter, urgencyFilter]);

  // Get stats
  const stats = {
    total: followUpActivities.length,
    overdue: followUpActivities.filter(a => a.urgency === 'overdue').length,
    today: followUpActivities.filter(a => a.urgency === 'today').length,
    soon: followUpActivities.filter(a => a.urgency === 'soon').length,
    future: followUpActivities.filter(a => a.urgency === 'future').length
  };

  // Get urgency badge
  const getUrgencyBadge = (urgency, daysDiff) => {
    const styles = {
      overdue: 'bg-red-100 text-red-800',
      today: 'bg-orange-100 text-orange-800',
      soon: 'bg-yellow-100 text-yellow-800',
      future: 'bg-green-100 text-green-800'
    };
    
    const labels = {
      overdue: `Försenad (${Math.abs(daysDiff)} dagar)`,
      today: 'Idag',
      soon: `${daysDiff} dagar kvar`,
      future: `${daysDiff} dagar kvar`
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[urgency]}`}>
        {labels[urgency]}
      </span>
    );
  };

  // Get urgency icon
  const getUrgencyIcon = (urgency) => {
    const icons = {
      overdue: ExclamationSolid,
      today: BellSolid,
      soon: ClockSolid,
      future: CalendarDaysSolid
    };
    
    const colors = {
      overdue: 'text-red-500',
      today: 'text-orange-500',
      soon: 'text-yellow-500',
      future: 'text-green-500'
    };
    
    const IconComponent = icons[urgency] || ClockSolid;
    return <IconComponent className={`h-5 w-5 ${colors[urgency]}`} />;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-lg text-gray-600">Laddar uppföljningar...</span>
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
                  <ClockIcon className="h-8 w-8 text-purple-600 mr-3" />
                  Uppföljningscentrum
                </h1>
                <p className="text-gray-600 mt-1">Hantera alla planerade uppföljningar med ambassadörer</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ExclamationSolid className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Försenade</p>
                <p className="text-2xl font-bold text-gray-900">{stats.overdue}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <BellSolid className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Idag</p>
                <p className="text-2xl font-bold text-gray-900">{stats.today}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ClockSolid className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Snart</p>
                <p className="text-2xl font-bold text-gray-900">{stats.soon}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CalendarDaysSolid className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Totalt</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
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
                  placeholder="Sök uppföljningar efter titel, innehåll, ambassadör..."
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="all">Alla Status</option>
                    <option value="pending">Väntande</option>
                    <option value="completed">Slutförd</option>
                    <option value="cancelled">Avbruten</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brådska</label>
                  <select
                    value={urgencyFilter}
                    onChange={(e) => setUrgencyFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="all">Alla</option>
                    <option value="overdue">Försenade</option>
                    <option value="today">Idag</option>
                    <option value="soon">Snart (2 dagar)</option>
                    <option value="future">Framtida</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Results Summary */}
          <div className="px-6 py-3 bg-gray-50 text-sm text-gray-600">
            Visar {filteredActivities.length} av {followUpActivities.length} uppföljningar
          </div>
        </div>

        {/* Follow-ups List */}
        <div className="bg-white rounded-lg shadow">
          {filteredActivities.length === 0 ? (
            <div className="text-center py-12">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {followUpActivities.length === 0 ? 'Inga uppföljningar planerade' : 'Inga uppföljningar hittades'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {followUpActivities.length === 0 
                  ? 'Lägg till uppföljningar från ambassadör-aktiviteter för att hålla koll på viktiga datum.'
                  : 'Prova att ändra dina filter eller söktermer.'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredActivities.map((activity) => (
                <div key={activity.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {getUrgencyIcon(activity.urgency)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                          {getUrgencyBadge(activity.urgency, activity.daysDiff)}
                        </div>
                        
                        <Link
                          to={`/admin/ambassadors/prospects/${activity.contactId}`}
                          className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                        >
                          {activity.contact?.name || 'Okänd ambassadör'}
                        </Link>
                        
                        <p className="text-sm text-gray-700 mt-1">{activity.content}</p>
                        
                        {activity.nextAction && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                            <p className="text-sm text-blue-800">
                              <strong>Nästa steg:</strong> {activity.nextAction}
                            </p>
                          </div>
                        )}
                        
                        <div className="flex items-center mt-3 text-sm text-gray-500">
                          <CalendarDaysIcon className="h-4 w-4 mr-1" />
                          <span>Planerad: {activity.followUpDate.toLocaleDateString('sv-SE')}</span>
                          {activity.platform && (
                            <>
                              <span className="mx-2">•</span>
                              <span className="capitalize">{activity.platform}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {activity.status === 'pending' && (
                        <button
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-full text-green-700 bg-green-100 hover:bg-green-200"
                          title="Markera som slutförd"
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Slutför
                        </button>
                      )}
                      
                      <Link
                        to={`/admin/ambassadors/prospects/${activity.contactId}`}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-full text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <UserIcon className="h-4 w-4 mr-1" />
                        Visa Ambassadör
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions for Overdue Items */}
        {stats.overdue > 0 && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <ExclamationSolid className="h-6 w-6 text-red-500" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Du har {stats.overdue} försenade uppföljningar
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  Granska och uppdatera dessa uppföljningar för att hålla din ambassadör-pipeline aktuell.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AmbassadorFollowUpCenter;