import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../../components/layout/AppLayout';
import { useDiningContacts } from '../hooks/useDiningContacts';
import { useDiningActivities } from '../hooks/useDiningActivities';
import {
  BuildingStorefrontIcon,
  UserGroupIcon,
  ChartBarIcon,
  ClockIcon,
  PhoneIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  StarIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import {
  BuildingStorefrontIcon as BuildingStorefrontSolid,
  UserGroupIcon as UserGroupSolid,
  StarIcon as StarSolid
} from '@heroicons/react/24/solid';

const DiningDashboard = () => {
  const { contacts, getContactStats, loading: contactsLoading } = useDiningContacts();
  const { getActivityStats, getRecentActivities, loading: activitiesLoading } = useDiningActivities();
  
  const [selectedTimeframe, setSelectedTimeframe] = useState('week');
  
  const contactStats = getContactStats();
  const activityStats = getActivityStats();
  const recentActivities = getRecentActivities(7);

  // Mock follow-ups for demonstration
  const upcomingFollowUps = [
    { id: 1, companyName: 'Fiskebutiken AB', type: 'call', dueDate: '2024-01-15', priority: 'high' },
    { id: 2, companyName: 'Nordic Outdoors', type: 'email', dueDate: '2024-01-16', priority: 'medium' },
    { id: 3, companyName: 'Sportfiske Sverige', type: 'meeting', dueDate: '2024-01-18', priority: 'high' }
  ];

  const loading = contactsLoading || activitiesLoading;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <span className="ml-3 text-lg text-gray-600">Förbereder restaurangen...</span>
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
              <div className="bg-orange-100 p-3 rounded-xl mr-4">
                <BuildingStorefrontSolid className="h-8 w-8 text-orange-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">The Dining Wagon™</h1>
                <p className="text-gray-600">Där kundrelationer serveras med excellens</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="week">Denna vecka</option>
                <option value="month">Denna månad</option>
                <option value="quarter">Detta kvartal</option>
              </select>
              
              <Link
                to="/admin/dining/contacts/new"
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Ny Gäst</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Key Metrics - Restaurant Themed */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Guests */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Totala Gäster</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{contactStats.total}</p>
                <p className="text-sm text-blue-600 font-medium">Alla registrerade</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <UserGroupSolid className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          {/* New Reservations */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Reservationer</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{contactStats.prospects}</p>
                <p className="text-sm text-green-600 font-medium">Nya prospekt</p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <CalendarDaysIcon className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          {/* Regular Guests */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Stamgäster</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{contactStats.active}</p>
                <p className="text-sm text-purple-600 font-medium">Aktiva kunder</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-xl">
                <StarSolid className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* VIP Guests */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">VIP Gäster</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{contactStats.highPriority}</p>
                <p className="text-sm text-orange-600 font-medium">Hög prioritet</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-xl">
                <ArrowTrendingUpIcon className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Service Activity */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <ChartBarIcon className="h-6 w-6 text-gray-600 mr-2" />
                Senaste Service
              </h2>
              <Link
                to="/admin/dining/activities"
                className="text-orange-600 hover:text-orange-700 font-medium text-sm"
              >
                Visa alla →
              </Link>
            </div>
            
            <div className="space-y-4">
              {recentActivities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <DocumentTextIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Ingen service registrerad ännu</p>
                  <p className="text-sm">Börja dokumentera dina gästinteraktioner</p>
                </div>
              ) : (
                recentActivities.slice(0, 5).map((activity, index) => (
                  <div key={activity.id || index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-shrink-0">
                      {activity.type === 'call' && <PhoneIcon className="h-6 w-6 text-blue-600" />}
                      {activity.type === 'email' && <EnvelopeIcon className="h-6 w-6 text-green-600" />}
                      {activity.type === 'meeting' && <BuildingStorefrontIcon className="h-6 w-6 text-purple-600" />}
                      {!['call', 'email', 'meeting'].includes(activity.type) && <DocumentTextIcon className="h-6 w-6 text-gray-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{activity.subject}</p>
                      <p className="text-sm text-gray-600 truncate">{activity.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {activity.createdAt?.toDate?.()?.toLocaleDateString('sv-SE') || 'Idag'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Reservations (Follow-ups) */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <ClockIcon className="h-6 w-6 text-gray-600 mr-2" />
                Kommande Bokningar
              </h2>
              <Link
                to="/admin/dining/follow-ups"
                className="text-orange-600 hover:text-orange-700 font-medium text-sm"
              >
                Visa alla →
              </Link>
            </div>
            
            <div className="space-y-3">
              {upcomingFollowUps.map((followUp) => (
                <div key={followUp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {followUp.priority === 'high' && (
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{followUp.companyName}</p>
                      <p className="text-xs text-gray-600">
                        {followUp.type === 'call' && '📞 Ring'}
                        {followUp.type === 'email' && '📧 E-post'}
                        {followUp.type === 'meeting' && '🍽️ Middag'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(followUp.dueDate).toLocaleDateString('sv-SE', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Link
                to="/admin/dining/follow-ups/new"
                className="w-full bg-orange-100 hover:bg-orange-200 text-orange-700 py-2 px-4 rounded-lg font-medium text-center block transition-colors"
              >
                + Ny Bokning
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Snabbåtgärder</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/admin/dining/contacts/new"
              className="flex items-center space-x-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
            >
              <UserGroupIcon className="h-8 w-8 text-blue-600 group-hover:scale-110 transition-transform" />
              <div>
                <p className="font-semibold text-gray-900">Lägg till Gäst</p>
                <p className="text-sm text-gray-600">Ny kontakt i systemet</p>
              </div>
            </Link>
            
            <Link
              to="/admin/dining/activities/new"
              className="flex items-center space-x-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
            >
              <DocumentTextIcon className="h-8 w-8 text-green-600 group-hover:scale-110 transition-transform" />
              <div>
                <p className="font-semibold text-gray-900">Registrera Service</p>
                <p className="text-sm text-gray-600">Dokumentera interaktion</p>
              </div>
            </Link>
            
            <Link
              to="/admin/dining/follow-ups/new"
              className="flex items-center space-x-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group"
            >
              <CalendarDaysIcon className="h-8 w-8 text-purple-600 group-hover:scale-110 transition-transform" />
              <div>
                <p className="font-semibold text-gray-900">Planera Uppföljning</p>
                <p className="text-sm text-gray-600">Schemalägg kontakt</p>
              </div>
            </Link>
            
            <Link
              to="/admin/dining/contacts"
              className="flex items-center space-x-3 p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors group"
            >
              <BuildingStorefrontIcon className="h-8 w-8 text-orange-600 group-hover:scale-110 transition-transform" />
              <div>
                <p className="font-semibold text-gray-900">Gästlista</p>
                <p className="text-sm text-gray-600">Visa alla kontakter</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default DiningDashboard; 