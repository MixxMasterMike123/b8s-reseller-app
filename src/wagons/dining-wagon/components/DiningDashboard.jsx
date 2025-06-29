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
  PlusIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  FireIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import {
  BuildingStorefrontIcon as BuildingStorefrontSolid,
  UserGroupIcon as UserGroupSolid,
  StarIcon as StarSolid,
  FireIcon as FireSolid
} from '@heroicons/react/24/solid';

const DiningDashboard = () => {
  const { contacts, getContactStats, loading: contactsLoading } = useDiningContacts();
  const { activities, getActivityStats, getRecentActivities, loading: activitiesLoading } = useDiningActivities();
  
  const [selectedTimeframe, setSelectedTimeframe] = useState('week');
  
  const contactStats = getContactStats();
  const activityStats = getActivityStats();
  const recentActivities = getRecentActivities(10);

  // Calculate CRM-specific metrics
  const getCrmMetrics = () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Pipeline metrics
    const hotProspects = contacts.filter(c => c.priority === 'high' && c.status === 'prospect').length;
    const warmLeads = contacts.filter(c => c.priority === 'medium' && c.status === 'prospect').length;
    const totalPipelineValue = hotProspects * 50000 + warmLeads * 25000; // Estimated deal values
    
    // Activity metrics
    const thisWeekActivities = activities.filter(a => {
      const activityDate = a.createdAt?.toDate?.() || new Date(a.createdAt);
      return activityDate >= weekAgo;
    }).length;

    // Response rate calculation (mock for now)
    const responseRate = thisWeekActivities > 0 ? Math.min(85, 60 + (thisWeekActivities * 5)) : 0;

    return {
      hotProspects,
      warmLeads,
      totalPipelineValue,
      thisWeekActivities,
      responseRate,
      conversionRate: contactStats.active > 0 ? Math.round((contactStats.active / contactStats.total) * 100) : 0
    };
  };

  // Get urgent tasks
  const getUrgentTasks = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Mock urgent tasks based on contacts and activities
    const urgentTasks = [
      ...contacts.filter(c => c.priority === 'high' && c.status === 'prospect').slice(0, 3).map(c => ({
        id: c.id,
        type: 'follow-up',
        title: `Följ upp ${c.companyName}`,
        contact: c.companyName,
        dueDate: 'Idag',
        priority: 'high',
        overdue: false
      })),
      // Add some mock overdue items
      {
        id: 'overdue-1',
        type: 'call',
        title: 'Ring Fiskebutiken AB',
        contact: 'Fiskebutiken AB',
        dueDate: 'Igår',
        priority: 'high',
        overdue: true
      }
    ];

    return urgentTasks.slice(0, 5); // Show max 5 urgent tasks
  };

  const crmMetrics = getCrmMetrics();
  const urgentTasks = getUrgentTasks();

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

        {/* Pipeline Health Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 border border-red-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600 mb-1">Heta Prospekt</p>
                <p className="text-3xl font-bold text-red-700">{crmMetrics.hotProspects}</p>
                <p className="text-xs text-red-500 mt-1">Redo att köpa nu</p>
              </div>
              <FireSolid className="h-12 w-12 text-red-500" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 border border-yellow-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600 mb-1">Varma Leads</p>
                <p className="text-3xl font-bold text-yellow-700">{crmMetrics.warmLeads}</p>
                <p className="text-xs text-yellow-500 mt-1">Behöver uppföljning</p>
              </div>
              <StarSolid className="h-12 w-12 text-yellow-500" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 mb-1">Pipeline Värde</p>
                <p className="text-3xl font-bold text-green-700">{(crmMetrics.totalPipelineValue / 1000).toFixed(0)}k</p>
                <p className="text-xs text-green-500 mt-1">Potentiell intäkt (SEK)</p>
              </div>
              <CurrencyDollarIcon className="h-12 w-12 text-green-500" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-1">Konvertering</p>
                <p className="text-3xl font-bold text-blue-700">{crmMetrics.conversionRate}%</p>
                <p className="text-xs text-blue-500 mt-1">Prospekt → Kund</p>
              </div>
              <ArrowTrendingUpIcon className="h-12 w-12 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Urgent Tasks & Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Urgent Tasks */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <BellIcon className="h-6 w-6 text-red-600 mr-2" />
                Brådskande Uppgifter
              </h2>
              <span className="bg-red-100 text-red-800 text-sm font-medium px-3 py-1 rounded-full">
                {urgentTasks.filter(t => t.overdue).length} försenade
              </span>
            </div>
            
            <div className="space-y-4">
              {urgentTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p>Alla uppgifter är uppdaterade!</p>
                </div>
              ) : (
                urgentTasks.map((task) => (
                  <div key={task.id} className={`p-4 rounded-lg border-l-4 ${
                    task.overdue 
                      ? 'bg-red-50 border-red-400' 
                      : task.priority === 'high' 
                        ? 'bg-orange-50 border-orange-400'
                        : 'bg-blue-50 border-blue-400'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{task.title}</p>
                        <p className="text-sm text-gray-600">{task.contact}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          task.overdue ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {task.dueDate}
                        </p>
                        {task.overdue && (
                          <span className="text-xs text-red-500">Försenad</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <Link
                to="/admin/dining/follow-ups"
                className="w-full bg-orange-100 hover:bg-orange-200 text-orange-700 py-2 px-4 rounded-lg font-medium text-center block transition-colors"
              >
                Visa Alla Uppföljningar
              </Link>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <ChartBarIcon className="h-6 w-6 text-blue-600 mr-2" />
                Prestanda Denna Vecka
              </h2>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600">Aktiviteter</span>
                  <span className="text-lg font-bold text-gray-900">{crmMetrics.thisWeekActivities}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (crmMetrics.thisWeekActivities / 20) * 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Mål: 20 aktiviteter/vecka</p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600">Svarsfrekvens</span>
                  <span className="text-lg font-bold text-green-600">{crmMetrics.responseRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${crmMetrics.responseRate}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Andel som svarar på kontakt</p>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{activityStats.byType?.call || 0}</p>
                  <p className="text-xs text-gray-500">Samtal</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{activityStats.byType?.email || 0}</p>
                  <p className="text-xs text-gray-500">E-post</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{activityStats.byType?.meeting || 0}</p>
                  <p className="text-xs text-gray-500">Möten</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Guest Overview & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Guest Statistics */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <UserGroupIcon className="h-6 w-6 text-orange-600 mr-2" />
              Gästöversikt
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-blue-700">{contactStats.total}</p>
                <p className="text-sm text-blue-600">Totala Gäster</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-yellow-700">{contactStats.prospects}</p>
                <p className="text-sm text-yellow-600">Reservationer</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-700">{contactStats.active}</p>
                <p className="text-sm text-green-600">Stamgäster</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-orange-700">{contactStats.highPriority}</p>
                <p className="text-sm text-orange-600">VIP Gäster</p>
              </div>
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <ClockIcon className="h-6 w-6 text-purple-600 mr-2" />
                Senaste Service
              </h2>
              <Link
                to="/admin/dining/activities"
                className="text-orange-600 hover:text-orange-700 text-sm font-medium"
              >
                Visa alla →
              </Link>
            </div>
            
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {recentActivities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p>Ingen service registrerad än</p>
                  <p className="text-sm">Lägg till aktiviteter för att se dem här</p>
                </div>
              ) : (
                recentActivities.map((activity, index) => (
                  <div key={activity.id || index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
                    <div className="flex-shrink-0 mt-1">
                      {activity.type === 'call' && <PhoneIcon className="h-5 w-5 text-blue-600" />}
                      {activity.type === 'email' && <EnvelopeIcon className="h-5 w-5 text-green-600" />}
                      {activity.type === 'meeting' && <CalendarDaysIcon className="h-5 w-5 text-purple-600" />}
                      {activity.type === 'note' && <DocumentTextIcon className="h-5 w-5 text-gray-600" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.subject}</p>
                      <p className="text-xs text-gray-600">{activity.contactName}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {activity.createdAt?.toDate?.()?.toLocaleDateString('sv-SE') || 'Okänt datum'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
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