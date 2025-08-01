import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import AppLayout from '../../../components/layout/AppLayout';
import { useAmbassadorContacts } from '../hooks/useAmbassadorContacts';
import { useAmbassadorActivities } from '../hooks/useAmbassadorActivities';
import {
  ArrowLeftIcon,
  PhoneIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  PencilIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  ShareIcon,
  GlobeAltIcon,
  UserIcon,
  StarIcon,
  FireIcon,
  BellIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import {
  PhoneIcon as PhoneSolid,
  ChatBubbleLeftRightIcon as ChatSolid,
  EnvelopeIcon as EnvelopeSolid,
  CalendarDaysIcon as CalendarDaysSolid,
  StarIcon as StarSolid,
  FireIcon as FireSolid,
  UserIcon as UserSolid
} from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

const AmbassadorContactDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getContactById, updateContact, loading: contactLoading } = useAmbassadorContacts();
  const { activities, addActivity, loading: activitiesLoading, activityTypes } = useAmbassadorActivities(id);

  const [contact, setContact] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityData, setActivityData] = useState({
    type: 'note',
    title: '',
    content: '',
    outcome: '',
    nextAction: '',
    priority: 'medium',
    platform: '',
    campaignType: '',
    followUpDate: ''
  });

  // Load contact data
  useEffect(() => {
    if (id) {
      const contactData = getContactById(id);
      if (contactData) {
        setContact(contactData);
        setEditData(contactData);
      }
    }
  }, [id, getContactById]);

  // Get tier badge
  const getTierBadge = (tier) => {
    const styles = {
      nano: 'bg-green-100 text-green-800',
      micro: 'bg-blue-100 text-blue-800',
      macro: 'bg-purple-100 text-purple-800',
      mega: 'bg-yellow-100 text-yellow-800'
    };
    
    const labels = {
      nano: 'Nano (1K-10K)',
      micro: 'Mikro (10K-100K)', 
      macro: 'Makro (100K-1M)',
      mega: 'Mega (1M+)'
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${styles[tier]}`}>
        {labels[tier]}
      </span>
    );
  };

  // Get status badge
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
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  // Get activity icon
  const getActivityIcon = (type) => {
    const icons = {
      call: PhoneSolid,
      email: EnvelopeSolid,
      meeting: UserSolid,
      note: DocumentTextIcon,
      proposal: ClipboardDocumentListIcon,
      contract: DocumentTextIcon,
      content: CameraIcon,
      follow_up: ClockIcon,
      social_media: ShareIcon
    };
    
    const IconComponent = icons[type] || DocumentTextIcon;
    return <IconComponent className="h-5 w-5" />;
  };

  // Handle save contact
  const handleSaveContact = async () => {
    try {
      await updateContact(id, editData);
      setContact({ ...contact, ...editData });
      setIsEditing(false);
      toast.success('Ambassadör uppdaterad');
    } catch (error) {
      console.error('Error updating contact:', error);
      toast.error('Kunde inte uppdatera ambassadör');
    }
  };

  // Handle add activity
  const handleAddActivity = async (e) => {
    e.preventDefault();
    
    try {
      await addActivity({
        ...activityData,
        contactId: id
      });
      
      setActivityData({
        type: 'note',
        title: '',
        content: '',
        outcome: '',
        nextAction: '',
        priority: 'medium',
        platform: '',
        campaignType: '',
        followUpDate: ''
      });
      setShowActivityForm(false);
      toast.success('Aktivitet tillagd');
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error('Kunde inte lägga till aktivitet');
    }
  };

  // Handle convert to affiliate
  const handleConvertToAffiliate = () => {
    if (window.confirm(`Vill du konvertera ${contact.name} till aktiv affiliate?`)) {
      // TODO: Implement conversion logic
      toast.success('Konvertering till affiliate är under utveckling');
      navigate('/admin/ambassadors/conversions');
    }
  };

  if (contactLoading || !contact) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-lg text-gray-600">Laddar ambassadör...</span>
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
                to="/admin/ambassadors/prospects"
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <UserIcon className="h-8 w-8 text-purple-600 mr-3" />
                  {contact.name}
                </h1>
                <div className="flex items-center space-x-3 mt-2">
                  {getTierBadge(contact.influencerTier)}
                  {getStatusBadge(contact.status)}
                  {contact.totalFollowers && (
                    <span className="text-sm text-gray-600">
                      {contact.totalFollowers.toLocaleString()} följare totalt
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              {contact.status === 'negotiating' && (
                <button
                  onClick={handleConvertToAffiliate}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  <StarSolid className="h-4 w-4 mr-2" />
                  Konvertera till Affiliate
                </button>
              )}
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                {isEditing ? 'Avbryt' : 'Redigera'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Contact Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Contact Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Kontaktinformation</h2>
              
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Namn</label>
                    <input
                      type="text"
                      value={editData.name || ''}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={editData.email || ''}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={editData.status || 'prospect'}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="prospect">Prospekt</option>
                      <option value="contacted">Kontaktad</option>
                      <option value="negotiating">Förhandlar</option>
                      <option value="converted">Konverterad</option>
                      <option value="declined">Avböjd</option>
                    </select>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveContact}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700"
                    >
                      Spara
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Avbryt
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-sm text-gray-900">{contact.email}</span>
                  </div>
                  {contact.phone && (
                    <div className="flex items-center">
                      <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-sm text-gray-900">{contact.phone}</span>
                    </div>
                  )}
                  {contact.country && (
                    <div className="flex items-center">
                      <GlobeAltIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-sm text-gray-900">{contact.country}</span>
                    </div>
                  )}
                  {contact.lastContactedAt && (
                    <div className="flex items-center">
                      <ClockIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-sm text-gray-900">
                        Senast kontaktad: {contact.lastContactedAt.toLocaleDateString('sv-SE')}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Social Media Platforms */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Social Media Plattformar</h2>
              
              {contact.platforms && Object.keys(contact.platforms).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(contact.platforms).map(([platform, data]) => (
                    <div key={platform} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-900 capitalize">
                          {platform === 'youtube' ? 'YouTube' : platform.charAt(0).toUpperCase() + platform.slice(1)}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {(data.followers || data.subscribers || 0).toLocaleString()} 
                          {platform === 'youtube' ? ' prenumeranter' : ' följare'}
                        </span>
                      </div>
                      {data.handle && (
                        <p className="text-sm text-gray-600">@{data.handle}</p>
                      )}
                      {data.url && (
                        <a 
                          href={data.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-purple-600 hover:text-purple-800"
                        >
                          Besök profil →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Inga plattformar tillagda</p>
              )}
            </div>

            {/* Important Links */}
            {(contact.websiteUrl || contact.mediaKitUrl || contact.rateCardUrl) && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Viktiga Länkar</h2>
                <div className="space-y-3">
                  {contact.websiteUrl && (
                    <div className="flex items-center">
                      <GlobeAltIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <a 
                        href={contact.websiteUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-purple-600 hover:text-purple-800"
                      >
                        Webbsida
                      </a>
                    </div>
                  )}
                  {contact.mediaKitUrl && (
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <a 
                        href={contact.mediaKitUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-purple-600 hover:text-purple-800"
                      >
                        Media Kit
                      </a>
                    </div>
                  )}
                  {contact.rateCardUrl && (
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <a 
                        href={contact.rateCardUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-purple-600 hover:text-purple-800"
                      >
                        Rate Card
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tags */}
            {contact.tags && contact.tags.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Taggar</h2>
                <div className="flex flex-wrap gap-2">
                  {contact.tags.map((tag, index) => (
                    <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Activities */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">Aktiviteter & Kommunikation</h2>
                  <button
                    onClick={() => setShowActivityForm(!showActivityForm)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Ny Aktivitet
                  </button>
                </div>
              </div>

              {/* Activity Form */}
              {showActivityForm && (
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <form onSubmit={handleAddActivity} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
                        <select
                          value={activityData.type}
                          onChange={(e) => setActivityData({ ...activityData, type: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                        >
                          {Object.entries(activityTypes).map(([key, type]) => (
                            <option key={key} value={key}>{type.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Plattform</label>
                        <select
                          value={activityData.platform}
                          onChange={(e) => setActivityData({ ...activityData, platform: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                        >
                          <option value="">Välj plattform</option>
                          <option value="instagram">Instagram</option>
                          <option value="youtube">YouTube</option>
                          <option value="tiktok">TikTok</option>
                          <option value="facebook">Facebook</option>
                          <option value="other">Annat</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                      <input
                        type="text"
                        value={activityData.title}
                        onChange={(e) => setActivityData({ ...activityData, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Kort beskrivning av aktiviteten"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Innehåll</label>
                      <textarea
                        value={activityData.content}
                        onChange={(e) => setActivityData({ ...activityData, content: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Detaljerad beskrivning, använd #taggar för smart taggning"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Resultat</label>
                        <input
                          type="text"
                          value={activityData.outcome}
                          onChange={(e) => setActivityData({ ...activityData, outcome: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                          placeholder="Vad var resultatet?"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nästa steg</label>
                        <input
                          type="text"
                          value={activityData.nextAction}
                          onChange={(e) => setActivityData({ ...activityData, nextAction: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                          placeholder="Vad är nästa steg?"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowActivityForm(false)}
                        className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Avbryt
                      </button>
                      <button
                        type="submit"
                        disabled={activitiesLoading}
                        className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                      >
                        {activitiesLoading ? 'Sparar...' : 'Spara Aktivitet'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Activities List */}
              <div className="p-6">
                {activities.length === 0 ? (
                  <div className="text-center py-8">
                    <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Inga aktiviteter än</h3>
                    <p className="mt-1 text-sm text-gray-500">Lägg till den första aktiviteten för denna ambassadör.</p>
                  </div>
                ) : (
                  <div className="flow-root">
                    <ul className="-mb-8">
                      {activities.map((activity, activityIdx) => (
                        <li key={activity.id}>
                          <div className="relative pb-8">
                            {activityIdx !== activities.length - 1 ? (
                              <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                            ) : null}
                            <div className="relative flex space-x-3">
                              <div>
                                <span className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                                  {getActivityIcon(activity.type)}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1 pt-1.5">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                                    <p className="text-sm text-gray-500">{activity.content}</p>
                                    {activity.outcome && (
                                      <p className="text-sm text-green-600 mt-1">Resultat: {activity.outcome}</p>
                                    )}
                                    {activity.nextAction && (
                                      <p className="text-sm text-orange-600 mt-1">Nästa steg: {activity.nextAction}</p>
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
                                  </div>
                                  <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                    <time>{activity.createdAt?.toLocaleDateString('sv-SE')}</time>
                                    <p className="text-xs">{activity.createdAt?.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AmbassadorContactDetail;