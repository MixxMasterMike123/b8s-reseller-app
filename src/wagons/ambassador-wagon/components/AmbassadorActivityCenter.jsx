import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../../components/layout/AppLayout';
import { useAmbassadorContacts } from '../hooks/useAmbassadorContacts';
import { useAmbassadorActivities } from '../hooks/useAmbassadorActivities';
import {
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowLeftIcon,
  CalendarDaysIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  ShareIcon,
  ClockIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import {
  PhoneIcon as PhoneSolid,
  ChatBubbleLeftRightIcon as ChatSolid,
  EnvelopeIcon as EnvelopeSolid,
  UserIcon as UserSolid,
  DocumentTextIcon as DocumentTextSolid,
  ShareIcon as ShareSolid,
  CameraIcon
} from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

const AmbassadorActivityCenter = () => {
  const { contacts } = useAmbassadorContacts();
  const { 
    activities, 
    loading, 
    searchActivities, 
    getActivitiesByType,
    getActivitiesByPriority,
    getActivitiesByPlatform,
    getRecentActivities,
    updateActivity,
    activityTypes 
  } = useAmbassadorActivities();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // ✏️ ACTIVITY EDITING STATE  
  const [editingActivity, setEditingActivity] = useState(null);
  const [editingActivityData, setEditingActivityData] = useState({});
  const [selectedTags, setSelectedTags] = useState([]);
  const [suggestedTags, setSuggestedTags] = useState([]);

  // Create a map of contact IDs to contact data for quick lookup
  const contactsMap = useMemo(() => {
    const map = {};
    contacts.forEach(contact => {
      map[contact.id] = contact;
    });
    return map;
  }, [contacts]);

  // Filter activities based on current filters
  const filteredActivities = useMemo(() => {
    let filtered = searchTerm ? searchActivities(searchTerm) : activities;
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(activity => activity.type === typeFilter);
    }
    
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(activity => activity.priority === priorityFilter);
    }
    
    if (platformFilter !== 'all') {
      filtered = filtered.filter(activity => activity.platform === platformFilter);
    }
    
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(activity => 
            activity.createdAt && activity.createdAt >= filterDate
          );
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(activity => 
            activity.createdAt && activity.createdAt >= filterDate
          );
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(activity => 
            activity.createdAt && activity.createdAt >= filterDate
          );
          break;
      }
    }
    
    return filtered.sort((a, b) => {
      const aTime = a.createdAt ? a.createdAt.getTime() : 0;
      const bTime = b.createdAt ? b.createdAt.getTime() : 0;
      return bTime - aTime; // Most recent first
    });
  }, [activities, searchTerm, typeFilter, priorityFilter, platformFilter, dateFilter, searchActivities]);

  // Get available platforms for filter
  const availablePlatforms = useMemo(() => {
    const platforms = new Set();
    activities.forEach(activity => {
      if (activity.platform) {
        platforms.add(activity.platform);
      }
    });
    return Array.from(platforms);
  }, [activities]);

  // Get activity stats
  const stats = {
    total: activities.length,
    today: activities.filter(activity => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return activity.createdAt && activity.createdAt >= today;
    }).length,
    thisWeek: getRecentActivities().length,
    calls: getActivitiesByType('call').length,
    emails: getActivitiesByType('email').length,
    meetings: getActivitiesByType('meeting').length,
    proposals: getActivitiesByType('proposal').length
  };

  // Get activity icon
  const getActivityIcon = (type) => {
    const icons = {
      call: PhoneSolid,
      email: EnvelopeSolid,
      meeting: UserSolid,
      note: DocumentTextSolid,
      proposal: ClipboardDocumentListIcon,
      contract: DocumentTextSolid,
      content: CameraIcon,
      follow_up: ClockIcon,
      social_media: ShareSolid
    };
    
    const IconComponent = icons[type] || DocumentTextSolid;
    return <IconComponent className="h-5 w-5" />;
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    const colors = {
      low: 'text-gray-500',
      medium: 'text-yellow-500',
      high: 'text-red-500'
    };
    return colors[priority] || colors.medium;
  };

  // Get contact name
  const getContactName = (contactId) => {
    return contactsMap[contactId]?.name || 'Okänd ambassadör';
  };

  // ✏️ ACTIVITY EDITING FUNCTIONS
  const startEditingActivity = (activity) => {
    setEditingActivity(activity.id);
    setEditingActivityData({
      type: activity.type || 'social_media',
      title: activity.title || '',
      content: activity.content || '',
      outcome: activity.outcome || '',
      nextAction: activity.nextAction || '',
      priority: activity.priority || 'medium',
      platform: activity.platform || 'instagram',
      campaignType: activity.campaignType || '',
      followUpDate: activity.followUpDate || ''
    });
    setSelectedTags(activity.tags || []);
    setSuggestedTags([]);
  };

  const cancelEditingActivity = () => {
    setEditingActivity(null);
    setEditingActivityData({});
    setSelectedTags([]);
    setSuggestedTags([]);
  };

  const saveEditedActivity = async () => {
    try {
      // Find the activity and update it
      const activityToUpdate = activities.find(a => a.id === editingActivity);
      if (!activityToUpdate) {
        toast.error('Aktivitet kunde inte hittas');
        return;
      }

      const updatedActivity = {
        ...activityToUpdate,
        ...editingActivityData,
        tags: selectedTags,
        updatedAt: new Date().toISOString()
      };

      await updateActivity(editingActivity, updatedActivity);
      
      toast.success('Aktivitet uppdaterad!');
      cancelEditingActivity();
    } catch (error) {
      console.error('Error updating activity:', error);
      toast.error('Kunde inte uppdatera aktivitet');
    }
  };

  // 🎯 TAG MANAGEMENT FUNCTIONS
  const addTag = (tag) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const removeTag = (tag) => {
    setSelectedTags(selectedTags.filter(t => t !== tag));
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-lg text-gray-600">Laddar aktiviteter...</span>
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
                  <ChatBubbleLeftRightIcon className="h-8 w-8 text-purple-600 mr-3" />
                  Aktivitetscentrum
                </h1>
                <p className="text-gray-600 mt-1">Översikt över alla ambassadör-aktiviteter och kommunikation</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ChatSolid className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Totalt Aktiviteter</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CalendarDaysIcon className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Idag</p>
                <p className="text-2xl font-bold text-gray-900">{stats.today}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <PhoneSolid className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pitchar</p>
                <p className="text-2xl font-bold text-gray-900">{stats.calls}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ClipboardDocumentListIcon className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Förslag</p>
                <p className="text-2xl font-bold text-gray-900">{stats.proposals}</p>
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
                  placeholder="Sök aktiviteter efter titel, innehåll, resultat..."
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
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="all">Alla Typer</option>
                    {Object.entries(activityTypes).map(([key, type]) => (
                      <option key={key} value={key}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prioritet</label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="all">All Prioritet</option>
                    <option value="low">Låg</option>
                    <option value="medium">Medium</option>
                    <option value="high">Hög</option>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="all">All Tid</option>
                    <option value="today">Idag</option>
                    <option value="week">Senaste Veckan</option>
                    <option value="month">Senaste Månaden</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Results Summary */}
          <div className="px-6 py-3 bg-gray-50 text-sm text-gray-600">
            Visar {filteredActivities.length} av {activities.length} aktiviteter
          </div>
        </div>

        {/* Activities List */}
        <div className="bg-white rounded-lg shadow">
          {filteredActivities.length === 0 ? (
            <div className="text-center py-12">
              <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Inga aktiviteter hittades</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || typeFilter !== 'all' || priorityFilter !== 'all' || platformFilter !== 'all' || dateFilter !== 'all'
                  ? 'Prova att ändra dina filter eller söktermer.'
                  : 'Det finns inga aktiviteter att visa.'
                }
              </p>
            </div>
          ) : (
            <div className="p-6">
              <div className="flow-root">
                <ul className="-mb-8">
                  {filteredActivities.map((activity, activityIdx) => (
                    <li key={activity.id}>
                      <div className="relative pb-8">
                        {activityIdx !== filteredActivities.length - 1 ? (
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className={`h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center ring-8 ring-white`}>
                              <span className="text-purple-600">
                                {getActivityIcon(activity.type)}
                              </span>
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 ${getPriorityColor(activity.priority)}`}>
                                    {activity.priority === 'high' && '🔴'}
                                    {activity.priority === 'medium' && '🟡'}
                                    {activity.priority === 'low' && '⚪'}
                                    {activity.priority}
                                  </span>
                                  {activity.platform && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                      {activity.platform}
                                    </span>
                                  )}
                                </div>
                                
                                <Link
                                  to={`/admin/ambassadors/prospects/${activity.contactId}`}
                                  className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                                >
                                  {getContactName(activity.contactId)}
                                </Link>
                                
                                <p className="text-sm text-gray-700 mt-1">{activity.content}</p>
                                
                                {activity.outcome && (
                                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                                    <p className="text-sm text-green-800">
                                      <strong>Resultat:</strong> {activity.outcome}
                                    </p>
                                  </div>
                                )}
                                
                                {activity.nextAction && (
                                  <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-md">
                                    <p className="text-sm text-orange-800">
                                      <strong>Nästa steg:</strong> {activity.nextAction}
                                    </p>
                                  </div>
                                )}
                                
                                {activity.tags && activity.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {activity.tags.map((tag, index) => (
                                      <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                
                                {activity.followUpDate && (
                                  <div className="mt-2 flex items-center text-sm text-orange-600">
                                    <ClockIcon className="h-4 w-4 mr-1" />
                                    Uppföljning: {new Date(activity.followUpDate).toLocaleDateString('sv-SE')}
                                  </div>
                                )}
                              </div>
                              
                              <div className="text-right text-sm whitespace-nowrap text-gray-500 ml-4">
                                <div className="flex items-center space-x-2 justify-end">
                                  <button
                                    onClick={() => startEditingActivity(activity)}
                                    className="text-gray-400 hover:text-purple-600 transition-colors"
                                    title="Redigera aktivitet"
                                  >
                                    <PencilIcon className="h-4 w-4" />
                                  </button>
                                  <div className="text-right">
                                    <time>{activity.createdAt?.toLocaleDateString('sv-SE')}</time>
                                    <p className="text-xs">{activity.createdAt?.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}</p>
                                    <p className="text-xs capitalize">{activityTypes[activity.type]?.label || activity.type}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* ✏️ EDIT ACTIVITY MODAL */}
          {editingActivity && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <PencilIcon className="h-5 w-5 text-blue-600 mr-2" />
                    Redigera Aktivitet
                  </h3>
                  <button
                    onClick={cancelEditingActivity}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Stäng</span>
                    ×
                  </button>
                </div>
                
                <form className="space-y-4" onSubmit={(e) => {
                  e.preventDefault();
                  saveEditedActivity();
                }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vad hände? (sammanfattning)</label>
                      <input
                        type="text"
                        value={editingActivityData.title}
                        onChange={(e) => setEditingActivityData({ ...editingActivityData, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="T.ex. 'Skickade DM om B8Shield', 'Svarade på story', 'Förslag om samarbete'"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Plattform</label>
                      <select
                        value={editingActivityData.platform}
                        onChange={(e) => setEditingActivityData({ ...editingActivityData, platform: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="instagram">Instagram DM</option>
                        <option value="tiktok">TikTok DM</option>
                        <option value="youtube">YouTube</option>
                        <option value="facebook">Facebook</option>
                        <option value="email">Email</option>
                        <option value="phone">Telefon</option>
                        <option value="other">Annat</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Detaljerad beskrivning</label>
                    <textarea
                      value={editingActivityData.content}
                      onChange={(e) => setEditingActivityData({ ...editingActivityData, content: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Detaljerad beskrivning av aktiviteten..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Resultat/Utfall</label>
                      <input
                        type="text"
                        value={editingActivityData.outcome}
                        onChange={(e) => setEditingActivityData({ ...editingActivityData, outcome: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Vad blev resultatet?"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nästa steg</label>
                      <input
                        type="text"
                        value={editingActivityData.nextAction}
                        onChange={(e) => setEditingActivityData({ ...editingActivityData, nextAction: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Vad är nästa steg?"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Prioritet</label>
                      <select
                        value={editingActivityData.priority}
                        onChange={(e) => setEditingActivityData({ ...editingActivityData, priority: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="low">Låg</option>
                        <option value="medium">Medium</option>
                        <option value="high">Hög</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Uppföljningsdatum</label>
                      <input
                        type="date"
                        value={editingActivityData.followUpDate}
                        onChange={(e) => setEditingActivityData({ ...editingActivityData, followUpDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Selected Tags Display */}
                  {selectedTags.length > 0 && (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Valda taggar:</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedTags.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800"
                          >
                            #{tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="ml-2 text-purple-600 hover:text-purple-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={cancelEditingActivity}
                      className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Avbryt
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? 'Sparar...' : 'Spara Ändringar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default AmbassadorActivityCenter;