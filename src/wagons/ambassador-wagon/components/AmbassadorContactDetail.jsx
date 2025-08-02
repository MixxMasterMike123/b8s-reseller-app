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
  TrashIcon,
  ClipboardDocumentListIcon,
  CameraIcon,
  CheckCircleIcon,
  MapPinIcon,
  UserGroupIcon,
  XMarkIcon,
  BuildingOffice2Icon
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
import {
  analyzeTextForAmbassadorTags,
  getAmbassadorUrgencyLevel,
  isUrgentAmbassadorActivity,
  processManualAmbassadorTags,
  getAmbassadorTagAutocomplete,
  ambassadorCommonTags
} from '../utils/smartTagging';

const AmbassadorContactDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getContactById, updateContact, activateContact, loading: contactLoading } = useAmbassadorContacts();
  const { activities, addActivity, updateActivity, loading: activitiesLoading, activityTypes } = useAmbassadorActivities(id);

  const [contact, setContact] = useState(null);
  const [editData, setEditData] = useState({});
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [newPortfolioUrl, setNewPortfolioUrl] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newOtherPlatform, setNewOtherPlatform] = useState({
    name: '',
    handle: '',
    followers: 0,
    url: ''
  });
  const [activityData, setActivityData] = useState({
    type: 'social_media', // Default to DM/social media contact
    title: '',
    content: '',
    outcome: '',
    nextAction: '',
    priority: 'medium',
    platform: 'instagram', // Default to Instagram DMs
    campaignType: '',
    followUpDate: ''
  });

  // 🧠 SMART TAGGING STATE MANAGEMENT
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [manualTagInput, setManualTagInput] = useState('');
  const [autocompleteOptions, setAutocompleteOptions] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  
  // 👁️ ACTIVITY EXPANSION STATE
  const [expandedActivities, setExpandedActivities] = useState(new Set());
  
  // ✏️ ACTIVITY EDITING STATE  
  const [editingActivity, setEditingActivity] = useState(null);
  const [editingActivityData, setEditingActivityData] = useState({});

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

  // Smart tagging functions (keeping existing logic)
  const analyzeTextForTags = (text) => {
    return analyzeTextForAmbassadorTags(text);
  };

  const addTag = (tag) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
    // Remove from suggested after adding
    setSuggestedTags(suggestedTags.filter(t => t !== tag));
  };

  const removeTag = (tag) => {
    setSelectedTags(selectedTags.filter(t => t !== tag));
  };

  // Activity expansion functions
  const toggleActivityExpansion = (activityId) => {
    const newExpanded = new Set(expandedActivities);
    if (newExpanded.has(activityId)) {
      newExpanded.delete(activityId);
    } else {
      newExpanded.add(activityId);
    }
    setExpandedActivities(newExpanded);
  };

  const isActivityExpanded = (activityId) => {
    return expandedActivities.has(activityId);
  };

  const needsExpansion = (text) => {
    return text && text.length > 100;
  };

  // Activity editing functions
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
    setShowActivityForm(false);
  };

  const cancelEditingActivity = () => {
    setEditingActivity(null);
    setEditingActivityData({});
    setSelectedTags([]);
    setSuggestedTags([]);
  };

  const saveEditedActivity = async () => {
    try {
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

  // Badge functions
  const getContactTypeBadge = (contact) => {
    if (contact.contactType === 'ambassador') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 border border-purple-200">
          <StarIcon className="h-3 w-3 mr-1" />
          Ambassadör
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
          <ShareIcon className="h-3 w-3 mr-1" />
          Affiliate
        </span>
      );
    }
  };

  const getTierBadge = (tier) => {
    const styles = {
      nano: 'bg-gray-100 text-gray-800',
      mikro: 'bg-blue-100 text-blue-800',
      makro: 'bg-purple-100 text-purple-800',
      mega: 'bg-red-100 text-red-800'
    };
    
    const labels = {
      nano: 'Nano (1K-10K)',
      mikro: 'Mikro (10K-100K)',
      makro: 'Makro (100K-1M)',
      mega: 'Mega (1M+)'
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${styles[tier] || styles.nano}`}>
        {labels[tier] || tier}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const styles = {
      prospect: 'bg-gray-100 text-gray-800',
      contacted: 'bg-blue-100 text-blue-800',
      negotiating: 'bg-orange-100 text-orange-800',
      converted: 'bg-green-100 text-green-800',
      declined: 'bg-red-100 text-red-800',
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      suspended: 'bg-red-100 text-red-800'
    };
    
    const labels = {
      prospect: 'Prospekt',
      contacted: 'Kontaktad', 
      negotiating: 'Förhandlar',
      converted: 'Konverterad',
      declined: 'Avböjd',
      active: 'Aktiv',
      pending: 'Väntande',
      suspended: 'Avstängd'
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${styles[status] || styles.prospect}`}>
        {labels[status] || status || 'Prospekt'}
      </span>
    );
  };

  // Handler functions
  const handleSaveEdit = async () => {
    try {
      setIsSavingEdit(true);
      await updateContact(id, editData);
      setContact({ ...contact, ...editData });
      setShowEditModal(false);
      toast.success('Ambassadör uppdaterad');
    } catch (error) {
      console.error('Error updating contact:', error);
      toast.error('Kunde inte uppdatera ambassadör');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSaveActivity = async () => {
    try {
      await addActivity({
        ...activityData,
        contactId: id,
        tags: selectedTags
      });
      
      // Reset form and state
      setActivityData({
        type: 'social_media',
        title: '',
        content: '',
        outcome: '',
        nextAction: '',
        priority: 'medium',
        platform: 'instagram',
        campaignType: '',
        followUpDate: ''
      });
      setSelectedTags([]);
      setSuggestedTags([]);
      setManualTagInput('');
      setShowAutocomplete(false);
      setShowActivityForm(false);
      toast.success('🎯 Aktivitet tillagd');
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error('Kunde inte lägga till aktivitet');
    }
  };

  const handleActivateContact = async () => {
    if (!window.confirm(`Är du säker på att du vill aktivera "${contact.name}" som affiliate? De kommer då att visas i affiliate-hanteringen.`)) {
      return;
    }

    try {
      await activateContact(id);
      setContact({ ...contact, active: true, status: 'active' });
    } catch (error) {
      console.error('Error activating ambassador:', error);
    }
  };

  // Portfolio URL handlers
  const handleAddPortfolioUrl = () => {
    if (newPortfolioUrl.trim()) {
      const currentUrls = editData.portfolioUrls || [];
      setEditData({
        ...editData,
        portfolioUrls: [...currentUrls, newPortfolioUrl.trim()]
      });
      setNewPortfolioUrl('');
    }
  };

  const handleRemovePortfolioUrl = (urlToRemove) => {
    const currentUrls = editData.portfolioUrls || [];
    setEditData({
      ...editData,
      portfolioUrls: currentUrls.filter(url => url !== urlToRemove)
    });
  };

  // Tag handlers
  const handleAddTag = () => {
    if (newTag.trim() && !editData.tags?.includes(newTag.trim())) {
      const currentTags = editData.tags || [];
      setEditData({
        ...editData,
        tags: [...currentTags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    const currentTags = editData.tags || [];
    setEditData({
      ...editData,
      tags: currentTags.filter(tag => tag !== tagToRemove)
    });
  };

  // Other platform handlers for edit modal
  const handleAddOtherPlatform = () => {
    if (newOtherPlatform.name.trim() && newOtherPlatform.handle.trim()) {
      const currentOtherPlatforms = editData.otherPlatforms || [];
      setEditData({
        ...editData,
        otherPlatforms: [...currentOtherPlatforms, { ...newOtherPlatform }]
      });
      setNewOtherPlatform({ name: '', handle: '', followers: 0, url: '' });
    }
  };

  const handleRemoveOtherPlatform = (index) => {
    const currentOtherPlatforms = editData.otherPlatforms || [];
    setEditData({
      ...editData,
      otherPlatforms: currentOtherPlatforms.filter((_, i) => i !== index)
    });
  };

  // Activity Item Component
  const ActivityItem = ({ activity, isTimeline = false }) => {
    const isExpanded = isActivityExpanded(activity.id);
    const shouldShowExpansion = needsExpansion(activity.content);
    
    return (
      <div className="flex space-x-3 p-4 bg-gray-50 rounded-lg">
        <div className="flex-shrink-0">
          <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
            <ShareIcon className="h-4 w-4 text-purple-600" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900">
              {activity.title || 'Untitled Activity'}
            </p>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => startEditingActivity(activity)}
                className="text-gray-600 hover:text-purple-600 transition-colors p-1 rounded hover:bg-purple-50"
                title="Redigera aktivitet"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
              <span className="text-xs text-gray-500">
                {activity.createdAt?.toLocaleDateString('sv-SE')}
              </span>
            </div>
          </div>
          
          {activity.content && (
            <div className="mt-1">
              <p className="text-sm text-gray-600">
                {shouldShowExpansion && !isExpanded 
                  ? `${activity.content.substring(0, 100)}...`
                  : activity.content
                }
              </p>
              {shouldShowExpansion && (
                <button
                  onClick={() => toggleActivityExpansion(activity.id)}
                  className="text-xs text-purple-600 hover:text-purple-700 mt-1"
                >
                  {isExpanded ? 'Visa mindre' : 'Visa mer'}
                </button>
              )}
            </div>
          )}
          
          {activity.tags && activity.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {activity.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-800"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
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
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        
        {/* Back Button */}
        <div className="mb-6">
          <Link 
            to="/admin/ambassadors/prospects" 
            className="inline-flex items-center text-gray-600 hover:text-gray-900 font-medium"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Tillbaka till ambassadörer
          </Link>
        </div>

        {/* 🎯 NEW: Full-Width Contact Card (Like DiningWagon) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
          {/* Contact Header with Icon */}
          <div className="flex items-start space-x-4 mb-6">
            <div className="bg-purple-100 p-3 rounded-xl">
              <UserIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{contact.name}</h2>
              <p className="text-lg text-gray-600">{contact.email}</p>
            </div>
          </div>

          {/* Contact Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {/* Basic Contact */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Kontaktuppgifter</h4>
              <div className="space-y-2">
                {contact.phone && (
                  <a 
                    href={`tel:${contact.phone}`}
                    className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <PhoneIcon className="h-4 w-4 mr-2" />
                    {contact.phone}
                  </a>
                )}
                <a 
                  href={`mailto:${contact.email}`}
                  className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
                >
                  <EnvelopeIcon className="h-4 w-4 mr-2" />
                  {contact.email}
                </a>
                {contact.website && (
                  <a 
                    href={contact.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <GlobeAltIcon className="h-4 w-4 mr-2" />
                    Webbplats
                  </a>
                )}
              </div>
            </div>

            {/* Social Media Stats */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Social Media</h4>
              <div className="space-y-2">
                {(() => {
                  // Calculate total followers dynamically including otherPlatforms
                  const platformFollowers = contact.platforms ? 
                    Object.values(contact.platforms).reduce((sum, platform) => 
                      sum + (platform.followers || platform.subscribers || 0), 0) : 0;
                  
                  const otherFollowers = contact.otherPlatforms ? 
                    contact.otherPlatforms.reduce((sum, platform) => 
                      sum + (platform.followers || 0), 0) : 0;
                  
                  const totalFollowers = platformFollowers + otherFollowers;
                  
                  return totalFollowers > 0 ? (
                    <div className="flex items-center text-gray-600">
                      <UserGroupIcon className="h-4 w-4 mr-2" />
                      {totalFollowers.toLocaleString()} följare totalt
                    </div>
                  ) : null;
                })()}
                {contact.platforms && Object.entries(contact.platforms).map(([platform, data]) => {
                  // Handle different platforms with different terminology
                  const count = data.followers || data.subscribers || 0;
                  const term = platform === 'youtube' ? 'prenumeranter' : 'följare';
                  
                  return (
                    <div key={platform} className="flex items-center text-gray-600">
                      <span className="capitalize font-medium mr-2">
                        {platform === 'youtube' ? 'YouTube' : platform.charAt(0).toUpperCase() + platform.slice(1)}:
                      </span>
                      <span>{count.toLocaleString()} {term}</span>
                    </div>
                  );
                })}
                {contact.otherPlatforms && contact.otherPlatforms.map((platform, index) => (
                  <div key={`other-${index}`} className="flex items-center text-gray-600">
                    <span className="font-medium mr-2">
                      {platform.name}:
                    </span>
                    <span>{platform.followers.toLocaleString()} följare</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Professional Info */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Professionell Info</h4>
              <div className="space-y-2">
                {contact.location && (
                  <div className="flex items-center text-gray-600">
                    <MapPinIcon className="h-4 w-4 mr-2" />
                    {contact.location}
                  </div>
                )}
                {contact.timezone && (
                  <div className="flex items-center text-gray-600">
                    <ClockIcon className="h-4 w-4 mr-2" />
                    {contact.timezone}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status and Tags */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex flex-wrap items-center gap-3">
              {getContactTypeBadge(contact)}
              {contact.influencerTier && getTierBadge(contact.influencerTier)}
              {getStatusBadge(contact.status)}
              {contact.totalFollowers && (
                <span className="text-sm text-gray-600">
                  {contact.totalFollowers.toLocaleString()} följare totalt
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <div className="flex flex-wrap items-center gap-3">
              {/* Make Active Button (Only for inactive contacts - check both active field and status) */}
              {contact.active !== true && contact.status !== 'active' && (
                <button
                  onClick={handleActivateContact}
                  className="flex items-center px-4 py-2 border border-green-300 text-green-700 hover:bg-green-50 rounded-lg font-medium transition-colors space-x-2"
                  title="Aktivera som affiliate"
                >
                  <CheckCircleIcon className="h-5 w-5" />
                  <span>Gör Aktiv</span>
                </button>
              )}
              
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors space-x-2"
              >
                <PencilIcon className="h-5 w-5" />
                <span>Redigera</span>
              </button>
            </div>
          </div>
        </div>

        {/* Activities and Communication Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Activity Center */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">DM & Kommunikation</h3>
              <button
                onClick={() => setShowActivityForm(!showActivityForm)}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Ny Aktivitet
              </button>
            </div>

            {showActivityForm && (
              <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
                      <select
                        value={activityData.type}
                        onChange={(e) => setActivityData({ ...activityData, type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="social_media">Social Media</option>
                        <option value="email">E-post</option>
                        <option value="call">Telefonsamtal</option>
                        <option value="meeting">Möte</option>
                        <option value="note">Anteckning</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Plattform</label>
                      <select
                        value={activityData.platform}
                        onChange={(e) => setActivityData({ ...activityData, platform: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="instagram">Instagram</option>
                        <option value="youtube">YouTube</option>
                        <option value="tiktok">TikTok</option>
                        <option value="facebook">Facebook</option>
                        <option value="email">E-post</option>
                        <option value="phone">Telefon</option>
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
                      placeholder="Sammanfattning av aktiviteten..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Innehåll</label>
                    <textarea
                      value={activityData.content}
                      onChange={(e) => {
                        const newContent = e.target.value;
                        setActivityData({ ...activityData, content: newContent });
                        // Auto-suggest tags
                        const suggested = analyzeTextForTags(newContent);
                        setSuggestedTags(suggested);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                      rows={4}
                      placeholder="Vad hände? Beskriv interaktionen..."
                    />
                  </div>

                  {/* Tags Section */}
                  {(suggestedTags.length > 0 || selectedTags.length > 0) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Taggar</label>
                      
                      {/* Selected Tags */}
                      {selectedTags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {selectedTags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-purple-100 text-purple-800 border border-purple-200"
                            >
                              #{tag}
                              <button
                                onClick={() => removeTag(tag)}
                                className="ml-1 hover:text-purple-600"
                              >
                                <XMarkIcon className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Suggested Tags */}
                      {suggestedTags.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 mb-2">Föreslagna taggar:</p>
                          <div className="flex flex-wrap gap-2">
                            {suggestedTags.map((tag, index) => (
                              <button
                                key={index}
                                onClick={() => addTag(tag)}
                                className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-gray-100 text-gray-700 border border-gray-200 hover:bg-purple-100 hover:text-purple-800 hover:border-purple-200 transition-colors"
                                disabled={selectedTags.includes(tag)}
                              >
                                <PlusIcon className="h-3 w-3 mr-1" />
                                #{tag}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <button
                      onClick={handleSaveActivity}
                      disabled={!activityData.content.trim() || activitiesLoading}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white text-sm rounded-lg transition-colors"
                    >
                      {activitiesLoading ? 'Sparar...' : 'Spara Aktivitet'}
                    </button>
                    <button
                      onClick={() => setShowActivityForm(false)}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded-lg transition-colors"
                    >
                      Avbryt
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Activities List */}
            <div className="space-y-4">
              {activities.length === 0 ? (
                <div className="text-center py-8">
                  <div className="mx-auto h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <ChatBubbleLeftRightIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500">Inga aktiviteter än</p>
                  <p className="text-sm text-gray-400">Lägg till den första aktiviteten för denna ambassadör.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.slice(0, 4).map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} isTimeline={true} />
                  ))}
                  
                  {activities.length > 4 && (
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Äldre aktiviteter</h4>
                      <div className="space-y-3">
                        {activities.slice(4).map((activity) => (
                          <ActivityItem key={activity.id} activity={activity} isTimeline={false} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Additional Info */}
          <div className="space-y-8">
            {/* Professional Information */}
            {(contact.mediaKitUrl || contact.pricelistUrl || contact.notes) && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Professionell Information</h3>
                <div className="space-y-4">
                  {contact.mediaKitUrl && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Media Kit</label>
                      <a 
                        href={contact.mediaKitUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:text-purple-700 text-sm break-all"
                      >
                        {contact.mediaKitUrl}
                      </a>
                    </div>
                  )}
                  {contact.pricelistUrl && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Prislista</label>
                      <a 
                        href={contact.pricelistUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:text-purple-700 text-sm break-all"
                      >
                        {contact.pricelistUrl}
                      </a>
                    </div>
                  )}
                  {contact.notes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Anteckningar</label>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{contact.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 🎯 NEW: Edit Modal (Like DiningWagon) */}
        {showEditModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Redigera Ambassadör</h3>
              </div>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                handleSaveEdit();
              }} className="p-6 space-y-6">
                {/* Basic Information */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Grundläggande Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Namn</label>
                      <input
                        type="text"
                        value={editData.name || ''}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Influencerns fullständiga namn"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={editData.email || ''}
                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                        placeholder="kontakt@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                      <input
                        type="tel"
                        value={editData.phone || ''}
                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                        placeholder="+46 70 123 45 67"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Affärs-email</label>
                      <input
                        type="email"
                        value={editData.businessEmail || ''}
                        onChange={(e) => setEditData({ ...editData, businessEmail: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                        placeholder="business@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Management Kontakt</label>
                      <input
                        type="text"
                        value={editData.managementContact || ''}
                        onChange={(e) => setEditData({ ...editData, managementContact: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Manager/agent kontaktinfo"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Land</label>
                      <select
                        value={editData.country || editData.location || 'Sverige'}
                        onChange={(e) => setEditData({ ...editData, country: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="Sverige">Sverige</option>
                        <option value="Norge">Norge</option>
                        <option value="Danmark">Danmark</option>
                        <option value="Finland">Finland</option>
                        <option value="Tyskland">Tyskland</option>
                        <option value="Storbritannien">Storbritannien</option>
                        <option value="USA">USA</option>
                        <option value="Annat">Annat</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Språk</label>
                      <select
                        value={editData.language || 'sv-SE'}
                        onChange={(e) => setEditData({ ...editData, language: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="sv-SE">Svenska</option>
                        <option value="en-US">English (US)</option>
                        <option value="en-GB">English (UK)</option>
                        <option value="de-DE">Deutsch</option>
                        <option value="da-DK">Dansk</option>
                        <option value="no-NO">Norsk</option>
                        <option value="fi-FI">Suomi</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tidszon</label>
                      <select
                        value={editData.timezone || 'Europe/Stockholm'}
                        onChange={(e) => setEditData({ ...editData, timezone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="Europe/Stockholm">Europe/Stockholm</option>
                        <option value="Europe/London">Europe/London</option>
                        <option value="Europe/Berlin">Europe/Berlin</option>
                        <option value="America/New_York">America/New_York</option>
                        <option value="America/Los_Angeles">America/Los_Angeles</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Important Links */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Viktiga Länkar</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Webbsida</label>
                      <input
                        type="url"
                        value={editData.websiteUrl || editData.website || ''}
                        onChange={(e) => setEditData({ ...editData, websiteUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                        placeholder="https://www.example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Media Kit URL</label>
                      <input
                        type="url"
                        value={editData.mediaKitUrl || ''}
                        onChange={(e) => setEditData({ ...editData, mediaKitUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                        placeholder="https://drive.google.com/..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rate Card URL</label>
                      <input
                        type="url"
                        value={editData.rateCardUrl || editData.pricelistUrl || ''}
                        onChange={(e) => setEditData({ ...editData, rateCardUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Prislista för samarbeten"
                      />
                    </div>
                  </div>

                  {/* Portfolio URLs */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Portfolio-länkar</label>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="url"
                        value={newPortfolioUrl || ''}
                        onChange={(e) => setNewPortfolioUrl(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                        placeholder="https://example.com/portfolio"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPortfolioUrl())}
                      />
                      <button
                        type="button"
                        onClick={handleAddPortfolioUrl}
                        className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100"
                      >
                        Lägg till
                      </button>
                    </div>
                    
                    {editData.portfolioUrls && editData.portfolioUrls.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {editData.portfolioUrls.map((url, index) => (
                          <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                            {url}
                            <button
                              type="button"
                              onClick={() => handleRemovePortfolioUrl(url)}
                              className="ml-2 text-purple-600 hover:text-purple-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status & Kategorisering */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Status & Kategorisering</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <option value="active">Aktiv</option>
                        <option value="pending">Väntande</option>
                        <option value="suspended">Avstängd</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Prioritet</label>
                      <select
                        value={editData.priority || 'medium'}
                        onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="low">Låg</option>
                        <option value="medium">Medium</option>
                        <option value="high">Hög</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                      <select
                        value={editData.category || 'fishing'}
                        onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="fishing">Fiske</option>
                        <option value="outdoor">Outdoor</option>
                        <option value="lifestyle">Livsstil</option>
                        <option value="sports">Sport</option>
                        <option value="travel">Resor</option>
                        <option value="other">Annat</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Influencer Tier</label>
                    <select
                      value={editData.influencerTier || ''}
                      onChange={(e) => setEditData({ ...editData, influencerTier: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="">Välj tier</option>
                      <option value="nano">Nano (1K-10K)</option>
                      <option value="mikro">Mikro (10K-100K)</option>
                      <option value="makro">Makro (100K-1M)</option>
                      <option value="mega">Mega (1M+)</option>
                    </select>
                  </div>
                </div>

                {/* Social Media Platforms */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Social Media Plattformar</h4>
                  <div className="space-y-4">
                    {/* Instagram */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <span className="font-medium text-gray-900">📸 Instagram</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Handle</label>
                          <input
                            type="text"
                            value={editData.platforms?.instagram?.handle || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              platforms: {
                                ...editData.platforms,
                                instagram: {
                                  ...editData.platforms?.instagram,
                                  handle: e.target.value
                                }
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                            placeholder="användarnamn"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Följare</label>
                          <input
                            type="number"
                            value={editData.platforms?.instagram?.followers || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              platforms: {
                                ...editData.platforms,
                                instagram: {
                                  ...editData.platforms?.instagram,
                                  followers: parseInt(e.target.value) || 0
                                }
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Profil URL</label>
                          <input
                            type="url"
                            value={editData.platforms?.instagram?.url || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              platforms: {
                                ...editData.platforms,
                                instagram: {
                                  ...editData.platforms?.instagram,
                                  url: e.target.value
                                }
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                            placeholder="https://instagram.com/username"
                          />
                        </div>
                      </div>
                    </div>

                    {/* YouTube */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <span className="font-medium text-gray-900">▶️ YouTube</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Kanal</label>
                          <input
                            type="text"
                            value={editData.platforms?.youtube?.handle || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              platforms: {
                                ...editData.platforms,
                                youtube: {
                                  ...editData.platforms?.youtube,
                                  handle: e.target.value
                                }
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                            placeholder="kanalnamn"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Prenumeranter</label>
                          <input
                            type="number"
                            value={editData.platforms?.youtube?.subscribers || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              platforms: {
                                ...editData.platforms,
                                youtube: {
                                  ...editData.platforms?.youtube,
                                  subscribers: parseInt(e.target.value) || 0
                                }
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Kanal URL</label>
                          <input
                            type="url"
                            value={editData.platforms?.youtube?.url || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              platforms: {
                                ...editData.platforms,
                                youtube: {
                                  ...editData.platforms?.youtube,
                                  url: e.target.value
                                }
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                            placeholder="https://youtube.com/username"
                          />
                        </div>
                      </div>
                    </div>

                    {/* TikTok */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <span className="font-medium text-gray-900">🎵 TikTok</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Handle</label>
                          <input
                            type="text"
                            value={editData.platforms?.tiktok?.handle || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              platforms: {
                                ...editData.platforms,
                                tiktok: {
                                  ...editData.platforms?.tiktok,
                                  handle: e.target.value
                                }
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                            placeholder="användarnamn"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Följare</label>
                          <input
                            type="number"
                            value={editData.platforms?.tiktok?.followers || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              platforms: {
                                ...editData.platforms,
                                tiktok: {
                                  ...editData.platforms?.tiktok,
                                  followers: parseInt(e.target.value) || 0
                                }
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Profil URL</label>
                          <input
                            type="url"
                            value={editData.platforms?.tiktok?.url || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              platforms: {
                                ...editData.platforms,
                                tiktok: {
                                  ...editData.platforms?.tiktok,
                                  url: e.target.value
                                }
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                            placeholder="https://tiktok.com/@username"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Facebook */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <span className="font-medium text-gray-900">📘 Facebook</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Handle</label>
                          <input
                            type="text"
                            value={editData.platforms?.facebook?.handle || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              platforms: {
                                ...editData.platforms,
                                facebook: {
                                  ...editData.platforms?.facebook,
                                  handle: e.target.value
                                }
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                            placeholder="användarnamn"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Följare</label>
                          <input
                            type="number"
                            value={editData.platforms?.facebook?.followers || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              platforms: {
                                ...editData.platforms,
                                facebook: {
                                  ...editData.platforms?.facebook,
                                  followers: parseInt(e.target.value) || 0
                                }
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Sida URL</label>
                          <input
                            type="url"
                            value={editData.platforms?.facebook?.url || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              platforms: {
                                ...editData.platforms,
                                facebook: {
                                  ...editData.platforms?.facebook,
                                  url: e.target.value
                                }
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                            placeholder="https://facebook.com/username"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Twitter */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <span className="font-medium text-gray-900">🐦 Twitter/X</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Handle</label>
                          <input
                            type="text"
                            value={editData.platforms?.twitter?.handle || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              platforms: {
                                ...editData.platforms,
                                twitter: {
                                  ...editData.platforms?.twitter,
                                  handle: e.target.value
                                }
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                            placeholder="användarnamn"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Följare</label>
                          <input
                            type="number"
                            value={editData.platforms?.twitter?.followers || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              platforms: {
                                ...editData.platforms,
                                twitter: {
                                  ...editData.platforms?.twitter,
                                  followers: parseInt(e.target.value) || 0
                                }
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Profil URL</label>
                          <input
                            type="url"
                            value={editData.platforms?.twitter?.url || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              platforms: {
                                ...editData.platforms,
                                twitter: {
                                  ...editData.platforms?.twitter,
                                  url: e.target.value
                                }
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                            placeholder="https://twitter.com/username"
                          />
                        </div>
                      </div>
                    </div>

                    {/* LinkedIn */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <span className="font-medium text-gray-900">💼 LinkedIn</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Handle</label>
                          <input
                            type="text"
                            value={editData.platforms?.linkedin?.handle || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              platforms: {
                                ...editData.platforms,
                                linkedin: {
                                  ...editData.platforms?.linkedin,
                                  handle: e.target.value
                                }
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                            placeholder="användarnamn"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Följare</label>
                          <input
                            type="number"
                            value={editData.platforms?.linkedin?.followers || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              platforms: {
                                ...editData.platforms,
                                linkedin: {
                                  ...editData.platforms?.linkedin,
                                  followers: parseInt(e.target.value) || 0
                                }
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Profil URL</label>
                          <input
                            type="url"
                            value={editData.platforms?.linkedin?.url || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              platforms: {
                                ...editData.platforms,
                                linkedin: {
                                  ...editData.platforms?.linkedin,
                                  url: e.target.value
                                }
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                            placeholder="https://linkedin.com/in/username"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Other Platforms */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Andra Plattformar</h4>
                  
                  {/* Add New Other Platform */}
                  <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
                    <h5 className="text-sm font-medium text-gray-900 mb-3">Lägg till ny plattform</h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Plattform</label>
                        <input
                          type="text"
                          value={newOtherPlatform.name}
                          onChange={(e) => setNewOtherPlatform({ ...newOtherPlatform, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                          placeholder="BlueSky, Threads..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Handle</label>
                        <input
                          type="text"
                          value={newOtherPlatform.handle}
                          onChange={(e) => setNewOtherPlatform({ ...newOtherPlatform, handle: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                          placeholder="användarnamn"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Följare</label>
                        <input
                          type="number"
                          value={newOtherPlatform.followers}
                          onChange={(e) => setNewOtherPlatform({ ...newOtherPlatform, followers: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                        <input
                          type="url"
                          value={newOtherPlatform.url}
                          onChange={(e) => setNewOtherPlatform({ ...newOtherPlatform, url: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={handleAddOtherPlatform}
                        className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100"
                      >
                        Lägg till plattform
                      </button>
                    </div>
                  </div>

                  {/* Existing Other Platforms */}
                  {editData.otherPlatforms && editData.otherPlatforms.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-sm font-medium text-gray-900">Tillagda plattformar</h5>
                      {editData.otherPlatforms.map((platform, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h6 className="text-sm font-medium text-gray-900">{platform.name}</h6>
                            <button
                              type="button"
                              onClick={() => handleRemoveOtherPlatform(index)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Ta bort
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600">
                            <div>Handle: @{platform.handle}</div>
                            <div>Följare: {platform.followers.toLocaleString()}</div>
                            <div>
                              URL: {platform.url ? (
                                <a href={platform.url} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700">
                                  Länk
                                </a>
                              ) : (
                                'Ingen URL'
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Taggar</h4>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newTag || ''}
                      onChange={(e) => setNewTag(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Lägg till tagg (t.ex. #hett, #kontrakt)"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100"
                    >
                      Lägg till
                    </button>
                  </div>
                  
                  {editData.tags && editData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {editData.tags.map((tag, index) => (
                        <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-2 text-purple-600 hover:text-purple-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Anteckningar</label>
                  <textarea
                    value={editData.notes || ''}
                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                    rows={4}
                    placeholder="Interna anteckningar om denna ambassadör..."
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 transition-colors"
                  >
                    {isSavingEdit ? 'Sparar...' : 'Spara Ändringar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Activity Edit Modal */}
        {editingActivity && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Redigera Aktivitet</h3>
              </div>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                saveEditedActivity();
              }} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                  <input
                    type="text"
                    value={editingActivityData.title}
                    onChange={(e) => setEditingActivityData({ ...editingActivityData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Innehåll</label>
                  <textarea
                    value={editingActivityData.content}
                    onChange={(e) => {
                      const newContent = e.target.value;
                      setEditingActivityData({ ...editingActivityData, content: newContent });
                      const suggested = analyzeTextForTags(newContent);
                      setSuggestedTags(suggested);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                    rows={4}
                  />
                </div>

                {/* Tags in Edit Modal */}
                {(suggestedTags.length > 0 || selectedTags.length > 0) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Taggar</label>
                    
                    {selectedTags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {selectedTags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-purple-100 text-purple-800 border border-purple-200"
                          >
                            #{tag}
                            <button
                              onClick={() => removeTag(tag)}
                              className="ml-1 hover:text-purple-600"
                            >
                              <XMarkIcon className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {suggestedTags.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Föreslagna taggar:</p>
                        <div className="flex flex-wrap gap-2">
                          {suggestedTags.map((tag, index) => (
                            <button
                              key={index}
                              onClick={() => addTag(tag)}
                              className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-gray-100 text-gray-700 border border-gray-200 hover:bg-purple-100 hover:text-purple-800 hover:border-purple-200 transition-colors"
                              disabled={selectedTags.includes(tag)}
                            >
                              <PlusIcon className="h-3 w-3 mr-1" />
                              #{tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={cancelEditingActivity}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                  >
                    Spara Ändringar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
};

export default AmbassadorContactDetail;