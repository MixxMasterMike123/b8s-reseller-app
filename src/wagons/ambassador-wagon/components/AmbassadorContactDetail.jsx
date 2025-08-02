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
  CameraIcon
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
  const { getContactById, updateContact, loading: contactLoading } = useAmbassadorContacts();
  const { activities, addActivity, updateActivity, loading: activitiesLoading, activityTypes } = useAmbassadorActivities(id);

  const [contact, setContact] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [showActivityForm, setShowActivityForm] = useState(false);
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

  // Advanced Swedish weekday and date parsing for ambassadors
  const parseSwedishWeekdays = (text) => {
    const weekdays = {
      'måndag': 1, 'tisdag': 2, 'onsdag': 3, 'torsdag': 4, 
      'fredag': 5, 'lördag': 6, 'söndag': 0
    };
    
    const lowerText = text.toLowerCase();
    const today = new Date();
    const currentDay = today.getDay();
    const dateTags = [];
    
    // Special case: "nästa vecka" defaults to next Tuesday
    if (lowerText.includes('nästa vecka') || lowerText.includes('nästa veck')) {
      const nextTuesday = new Date(today);
      const currentDayAdjusted = currentDay === 0 ? 7 : currentDay;
      const daysUntilNextTuesday = (7 - currentDayAdjusted) + 2; // 2 = Tuesday
      
      nextTuesday.setDate(today.getDate() + daysUntilNextTuesday);
      const dateStr = nextTuesday.toISOString().split('T')[0];
      const tagName = `tisdag-${dateStr}`;
      
      if (!dateTags.includes(tagName)) {
        dateTags.push(tagName);
      }
    }

    // Check for weekday mentions with context
    Object.entries(weekdays).forEach(([weekdayName, weekdayNum]) => {
      const patterns = [
        `på ${weekdayName}`,
        `i ${weekdayName}`,
        `${weekdayName}`,
        `nästa ${weekdayName}`,
        `kommande ${weekdayName}`
      ];
      
      patterns.forEach(pattern => {
        if (lowerText.includes(pattern)) {
          let targetDate = new Date(today);
          let daysUntilTarget;
          
          // Calculate days until target weekday
          if (weekdayNum === 0) weekdayNum = 7; // Convert Sunday to 7 for easier calculation
          const currentDayAdjusted = currentDay === 0 ? 7 : currentDay;
          
          if (pattern.includes('nästa') || pattern.includes('kommande')) {
            // Explicitly next week
            daysUntilTarget = (7 - currentDayAdjusted) + weekdayNum;
          } else {
            // This week or next week logic
            daysUntilTarget = weekdayNum - currentDayAdjusted;
            if (daysUntilTarget <= 0) {
              daysUntilTarget += 7; // Move to next week if day has passed
            }
          }
          
          targetDate.setDate(today.getDate() + daysUntilTarget);
          
          // Format as Swedish date tag
          const dateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD
          const tagName = `${weekdayName}-${dateStr}`;
          
          if (!dateTags.includes(tagName)) {
            dateTags.push(tagName);
          }
        }
      });
    });
    
    return dateTags;
  };

  // 🧠 SMART TAG ANALYSIS FOR AMBASSADORS
  const analyzeTextForTags = (text) => {
    if (!text.trim()) return [];
    
    const keywordMap = {
      'hett': ['intresserad', 'vill samarbeta', 'collaboration', 'partnerskap', 'sponsring', 'deals', 'affär', 'möjlighet', 'potential'],
      'akut': ['akut', 'bråttom', 'snabbt', 'idag', 'direkt', 'asap', 'nu', 'omgående', 'urgent', 'rush'],
      'intresserad': ['intresserad', 'interested', 'gillar', 'love', 'kul', 'spännande', 'exciting', 'cool'],
      'följare': ['följare', 'followers', 'subs', 'prenumeranter', 'audience', 'reach', 'engagement'],
      'content': ['content', 'innehåll', 'video', 'post', 'story', 'reel', 'youtube', 'tiktok'],
      'svar': ['svarade', 'replied', 'answered', 'response', 'comeback', 'answered'],
      'ignorerad': ['ignorerad', 'inget svar', 'no response', 'tystnad', 'inte svarat', 'quiet'],
      'väntar': ['väntar', 'waiting', 'pending', 'avvaktar', 'kommer höra'],
      'kontakt': ['kontakt', 'contact', 'dm', 'meddelande', 'message', 'skrev', 'sent'],
      'gratis': ['gratis', 'free', 'kostnadsfritt', 'sample', 'prov', 'test']
    };
    
    const lowerText = text.toLowerCase();
    const detected = [];
    
    // Standard keyword detection
    Object.entries(keywordMap).forEach(([tag, keywords]) => {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        detected.push(tag);
      }
    });
    
    // Advanced: Swedish weekday date parsing
    const dateTags = parseSwedishWeekdays(text);
    detected.push(...dateTags);
    
    // Max 5 suggested tags for ambassador keywords and dates
    return detected.slice(0, 5);
  };

  // 🧠 AUTO-ANALYZE CONTENT FOR SMART TAG SUGGESTIONS
  useEffect(() => {
    let combinedText = '';
    
    // Check if we're editing an activity or adding a new one
    if (editingActivity) {
      combinedText = `${editingActivityData.title || ''} ${editingActivityData.content || ''}`.trim();
    } else {
      combinedText = `${activityData.title} ${activityData.content}`.trim();
    }
    
    if (combinedText) {
      const allSuggestions = analyzeTextForTags(combinedText);
      // Filter out tags that are already selected
      const filteredSuggestions = allSuggestions.filter(tag => !selectedTags.includes(tag));
      setSuggestedTags(filteredSuggestions);
      
      // Debug logging for development
      console.log('🎯 Ambassador Tag Analysis:', {
        text: combinedText,
        allSuggestions,
        selectedTags,
        filteredSuggestions,
        editingMode: !!editingActivity
      });
    } else {
      setSuggestedTags([]);
    }
  }, [activityData.title, activityData.content, editingActivityData.title, editingActivityData.content, selectedTags, editingActivity]);

  // 🎯 SMART TAG MANAGEMENT FUNCTIONS
  const addTag = (tag) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
    // Remove from suggestions once added
    setSuggestedTags(suggestedTags.filter(t => t !== tag));
  };

  const removeTag = (tag) => {
    setSelectedTags(selectedTags.filter(t => t !== tag));
  };

  const ignoreSuggestion = (tag) => {
    setSuggestedTags(suggestedTags.filter(t => t !== tag));
  };

  // Manual tag input functions (copied from Dining Wagon)
  const processManualTags = (input) => {
    if (!input.trim()) return;
    
    // Split by comma, space, or newline, clean and filter
    const newTags = input
      .split(/[,\s\n]+/)
      .map(tag => tag.replace('#', '').trim().toLowerCase())
      .filter(tag => tag.length > 0 && !selectedTags.includes(tag));
    
    if (newTags.length > 0) {
      setSelectedTags([...selectedTags, ...newTags]);
      setManualTagInput('');
    }
  };

  const handleManualTagKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      processManualTags(manualTagInput);
    } else if (e.key === ',' || e.key === ' ') {
      e.preventDefault();
      processManualTags(manualTagInput);
    }
  };

  const handleManualTagChange = (e) => {
    const value = e.target.value;
    setManualTagInput(value);
    
    // Show autocomplete suggestions for ambassadors
    if (value.trim().length > 0) {
      const commonTags = ['hett', 'akut', 'intresserad', 'följare', 'content', 'svar', 'ignorerad', 'väntar', 'kontakt', 'gratis', 'samarbete', 'sponsring', 'partnerskap', 'influencer', 'brand', 'campaign', 'story', 'post', 'reel', 'video'];
      const inputText = value.replace('#', '').toLowerCase();
      const matches = commonTags.filter(tag => 
        tag.includes(inputText) && !selectedTags.includes(tag)
      );
      setAutocompleteOptions(matches.slice(0, 5)); // Max 5 suggestions
      setShowAutocomplete(matches.length > 0);
    } else {
      setShowAutocomplete(false);
    }
  };

  const selectAutocompleteOption = (tag) => {
    setSelectedTags([...selectedTags, tag]);
    setManualTagInput('');
    setShowAutocomplete(false);
  };

  // 👁️ ACTIVITY EXPANSION FUNCTIONS
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

  // Check if text needs expansion (longer than 100 characters)
  const needsExpansion = (text) => {
    return text && text.length > 100;
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
    setShowActivityForm(false); // Hide add form if open
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

      // Update in database (we need to implement updateActivity in the hook)
      await updateActivity(editingActivity, updatedActivity);
      
      toast.success('Aktivitet uppdaterad!');
      cancelEditingActivity();
    } catch (error) {
      console.error('Error updating activity:', error);
      toast.error('Kunde inte uppdatera aktivitet');
    }
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

  // Handle add activity with smart tags
  const handleAddActivity = async (e) => {
    e.preventDefault();
    
    try {
      await addActivity({
        ...activityData,
        contactId: id,
        tags: selectedTags // 🧠 Include smart tags
      });
      
      // Reset form and tag state
      setActivityData({
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
      setSelectedTags([]);
      setSuggestedTags([]);
      setManualTagInput('');
      setShowAutocomplete(false);
      setShowActivityForm(false);
      toast.success('🎯 DM-aktivitet med smarta taggar tillagd');
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
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-md font-medium text-gray-900 border-b border-gray-200 pb-2">Grundläggande Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Namn *</label>
                        <input
                          type="text"
                          value={editData.name || ''}
                          onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                        <input
                          type="email"
                          value={editData.email || ''}
                          onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                        <input
                          type="tel"
                          value={editData.phone || ''}
                          onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Webbplats</label>
                        <input
                          type="url"
                          value={editData.website || ''}
                          onChange={(e) => setEditData({ ...editData, website: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                          placeholder="https://"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Land/Region</label>
                        <input
                          type="text"
                          value={editData.country || ''}
                          onChange={(e) => setEditData({ ...editData, country: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tidszon</label>
                        <select
                          value={editData.timezone || 'Europe/Stockholm'}
                          onChange={(e) => setEditData({ ...editData, timezone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                        >
                          <option value="Europe/Stockholm">Europe/Stockholm (CET)</option>
                          <option value="Europe/London">Europe/London (GMT)</option>
                          <option value="America/New_York">America/New_York (EST)</option>
                          <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                          <option value="Europe/Berlin">Europe/Berlin (CET)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Professional Information */}
                  <div className="space-y-4">
                    <h3 className="text-md font-medium text-gray-900 border-b border-gray-200 pb-2">Professionell Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Media Kit URL</label>
                        <input
                          type="url"
                          value={editData.mediaKitUrl || ''}
                          onChange={(e) => setEditData({ ...editData, mediaKitUrl: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                          placeholder="https://"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Prislista URL</label>
                        <input
                          type="url"
                          value={editData.rateCardUrl || ''}
                          onChange={(e) => setEditData({ ...editData, rateCardUrl: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                          placeholder="https://"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Social Media Platforms */}
                  <div className="space-y-4">
                    <h3 className="text-md font-medium text-gray-900 border-b border-gray-200 pb-2">Social Media Plattformar</h3>
                    
                    {/* Instagram */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">📷 Instagram</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Handle</label>
                          <input
                            type="text"
                            value={editData.platforms?.instagram?.handle || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              platforms: {
                                ...editData.platforms,
                                instagram: { ...editData.platforms?.instagram, handle: e.target.value }
                              }
                            })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
                            placeholder="användarnamn"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Följare</label>
                          <input
                            type="number"
                            value={editData.platforms?.instagram?.followers || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              platforms: {
                                ...editData.platforms,
                                instagram: { ...editData.platforms?.instagram, followers: parseInt(e.target.value) || 0 }
                              }
                            })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Profil URL</label>
                          <input
                            type="url"
                            value={editData.platforms?.instagram?.url || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              platforms: {
                                ...editData.platforms,
                                instagram: { ...editData.platforms?.instagram, url: e.target.value }
                              }
                            })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
                            placeholder="https://instagram.com/..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* YouTube */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">▶️ YouTube</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Kanal</label>
                          <input
                            type="text"
                            value={editData.platforms?.youtube?.handle || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              platforms: {
                                ...editData.platforms,
                                youtube: { ...editData.platforms?.youtube, handle: e.target.value }
                              }
                            })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
                            placeholder="kanalnamn"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Prenumeranter</label>
                          <input
                            type="number"
                            value={editData.platforms?.youtube?.subscribers || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              platforms: {
                                ...editData.platforms,
                                youtube: { ...editData.platforms?.youtube, subscribers: parseInt(e.target.value) || 0 }
                              }
                            })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Kanal URL</label>
                          <input
                            type="url"
                            value={editData.platforms?.youtube?.url || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              platforms: {
                                ...editData.platforms,
                                youtube: { ...editData.platforms?.youtube, url: e.target.value }
                              }
                            })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
                            placeholder="https://youtube.com/..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* TikTok */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">🎵 TikTok</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Handle</label>
                          <input
                            type="text"
                            value={editData.platforms?.tiktok?.handle || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              platforms: {
                                ...editData.platforms,
                                tiktok: { ...editData.platforms?.tiktok, handle: e.target.value }
                              }
                            })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
                            placeholder="användarnamn"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Följare</label>
                          <input
                            type="number"
                            value={editData.platforms?.tiktok?.followers || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              platforms: {
                                ...editData.platforms,
                                tiktok: { ...editData.platforms?.tiktok, followers: parseInt(e.target.value) || 0 }
                              }
                            })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Profil URL</label>
                          <input
                            type="url"
                            value={editData.platforms?.tiktok?.url || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              platforms: {
                                ...editData.platforms,
                                tiktok: { ...editData.platforms?.tiktok, url: e.target.value }
                              }
                            })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
                            placeholder="https://tiktok.com/@..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status & Classification */}
                  <div className="space-y-4">
                    <h3 className="text-md font-medium text-gray-900 border-b border-gray-200 pb-2">Status & Klassificering</h3>
                    
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
                          <option value="critical">Kritisk</option>
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
                          <option value="outdoor">Utomhus</option>
                          <option value="lifestyle">Livsstil</option>
                          <option value="tech">Teknik</option>
                          <option value="other">Annat</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Anteckningar</label>
                    <textarea
                      value={editData.notes || ''}
                      onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Interna anteckningar om denna ambassadör..."
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={handleSaveContact}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      💾 Spara ändringar
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      ❌ Avbryt
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
          <div className="lg:col-span-2 space-y-6">
            
            {/* What Happened Before? - Timeline Section */}
            {(() => {
              const recentActivities = activities.slice(0, 4); // Show 4 most recent
              
              return activities.length > 0 ? (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <ClockIcon className="h-5 w-5 text-gray-600 mr-2" />
                      Vad har hänt innan? ({activities.length} interaktioner)
                    </h3>
                    <Link
                      to={`/admin/ambassadors/activities?contact=${id}`}
                      className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                    >
                      Se alla →
                    </Link>
                  </div>
                  
                  <div className="space-y-3">
                    {recentActivities.map((activity, index) => {
                      const isUrgent = activity.tags?.includes('akut') || activity.tags?.includes('hett');
                      const urgencyLevel = activity.tags?.includes('akut') ? 'critical' : 
                                         activity.tags?.includes('hett') ? 'high' : 'normal';
                      
                      // Dynamic styling for timeline activities
                      const getTimelineStyle = (level) => {
                        switch(level) {
                          case 'critical':
                            return 'flex items-start space-x-3 p-3 bg-red-50 rounded-lg border-2 border-red-200';
                          case 'high':
                            return 'flex items-start space-x-3 p-3 bg-orange-50 rounded-lg border-2 border-orange-200';
                          default:
                            return 'flex items-start space-x-3 p-3 bg-gray-50 rounded-lg';
                        }
                      };
                      
                      return (
                        <div 
                          key={activity.id || index} 
                          className={getTimelineStyle(urgencyLevel)}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            {/* Date aligned with title */}
                            <div className="flex justify-between items-start mb-1">
                              <div className="flex items-center space-x-2 flex-1">
                                <div className="text-sm font-medium text-gray-900">
                                  {(() => {
                                    const titleText = activity.title || activity.content;
                                    const expanded = isActivityExpanded(activity.id);
                                    const needsTruncation = needsExpansion(titleText);
                                    
                                    if (!needsTruncation || expanded) {
                                      return titleText;
                                    } else {
                                      return titleText.substring(0, 100) + '...';
                                    }
                                  })()}
                                </div>

                                {/* Expand button for long titles */}
                                {needsExpansion(activity.title || activity.content) && (
                                  <button
                                    onClick={() => toggleActivityExpansion(activity.id)}
                                    className="text-purple-600 hover:text-purple-800 text-xs font-medium ml-1"
                                    title={isActivityExpanded(activity.id) ? 'Visa mindre' : 'Visa mer'}
                                  >
                                    {isActivityExpanded(activity.id) ? 'mindre' : 'mer'}
                                  </button>
                                )}

                                {/* Urgency indicators */}
                                {isUrgent && (
                                  <div className="flex items-center space-x-1">
                                    {urgencyLevel === 'critical' && (
                                      <>
                                        <ExclamationTriangleIcon className="h-3 w-3 text-red-600" />
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                          AKUT
                                        </span>
                                      </>
                                    )}
                                    {urgencyLevel === 'high' && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                        HETT
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              {/* Date and edit button */}
                              <div className="flex items-center space-x-2 flex-shrink-0">
                                <span className="text-xs text-gray-500">
                                  {activity.createdAt?.toLocaleDateString('sv-SE') || 'Idag'}
                                </span>
                                <button
                                  onClick={() => startEditingActivity(activity)}
                                  className="text-gray-400 hover:text-purple-600 transition-colors"
                                  title="Redigera aktivitet"
                                >
                                  <PencilIcon className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            
                            {activity.content && activity.content !== activity.title && (
                              <div className="text-sm text-gray-600 mt-1">
                                {(() => {
                                  const expanded = isActivityExpanded(activity.id);
                                  const needsTruncation = needsExpansion(activity.content);
                                  
                                  if (!needsTruncation || expanded) {
                                    return (
                                      <div>
                                        <p className="whitespace-pre-wrap">{activity.content}</p>
                                        {needsTruncation && (
                                          <button
                                            onClick={() => toggleActivityExpansion(activity.id)}
                                            className="text-purple-600 hover:text-purple-800 text-xs font-medium mt-1"
                                          >
                                            Visa mindre
                                          </button>
                                        )}
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <div>
                                        <p className="whitespace-pre-wrap">{activity.content.substring(0, 100)}...</p>
                                        <button
                                          onClick={() => toggleActivityExpansion(activity.id)}
                                          className="text-purple-600 hover:text-purple-800 text-xs font-medium mt-1"
                                        >
                                          Visa mer
                                        </button>
                                      </div>
                                    );
                                  }
                                })()}
                              </div>
                            )}
                            
                            {/* Platform indicator */}
                            {activity.platform && (
                              <div className="flex items-center mt-1">
                                <ShareIcon className="h-3 w-3 text-gray-400 mr-1" />
                                <span className="text-xs text-gray-500 capitalize">
                                  {activity.platform === 'instagram' ? 'Instagram DM' : 
                                   activity.platform === 'tiktok' ? 'TikTok DM' :
                                   activity.platform === 'youtube' ? 'YouTube' :
                                   activity.platform}
                                </span>
                              </div>
                            )}
                            
                            {/* Tags display */}
                            {activity.tags && activity.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {activity.tags.map(tag => (
                                  <span
                                    key={tag}
                                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                      tag === 'akut' ? 'bg-red-100 text-red-800' :
                                      tag === 'hett' ? 'bg-orange-100 text-orange-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    
                    {activities.length > 4 && (
                      <div className="text-center py-3">
                        <Link
                          to={`/admin/ambassadors/activities?contact=${id}`}
                          className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                        >
                          Se alla {activities.length} interaktioner →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ) : null;
            })()}

            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">DM & Kommunikation</h2>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Plattform <span className="text-xs text-gray-500">(DM fokus)</span></label>
                        <select
                          value={activityData.platform}
                          onChange={(e) => setActivityData({ ...activityData, platform: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                        >
                          <option value="instagram">Instagram DM (rekommenderat)</option>
                          <option value="tiktok">TikTok DM</option>
                          <option value="youtube">YouTube kommentar/DM</option>
                          <option value="facebook">Facebook Messenger</option>
                          <option value="email">Email</option>
                          <option value="other">Annat</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vad hände? (sammanfattning)</label>
                      <input
                        type="text"
                        value={activityData.title}
                        onChange={(e) => setActivityData({ ...activityData, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                        placeholder="T.ex. 'Skickade DM om B8Shield', 'Svarade på story', 'Förslag om samarbete'"
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
                        placeholder="Detaljerad beskrivning... Smart tagging aktiveras automatiskt när du skriver!"
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

                    {/* 🧠 SMART TAGGING SYSTEM - Clean Dining Wagon Design */}
                    {(suggestedTags.length > 0 || selectedTags.length > 0) && (
                      <div className="mb-4">
                        
                        {/* Suggested Tags - Elegant and Subtle */}
                        {suggestedTags.length > 0 && (
                          <div className="mb-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-500 font-medium">
                                Föreslås:
                              </span>
                              <button
                                onClick={() => setSuggestedTags([])}
                                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                ignorera
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {suggestedTags.map(tag => (
                                <button
                                  key={tag}
                                  onClick={() => addTag(tag)}
                                  className="inline-flex items-center bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-sm hover:bg-blue-200 transition-colors"
                                >
                                  <span className="text-blue-600 mr-1">+</span>
                                  #{tag}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Selected Tags - Clean and Minimal */}
                        {selectedTags.length > 0 && (
                          <div className="mb-2">
                            <span className="text-xs text-gray-500 font-medium mb-1 block">
                              Taggar:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedTags.map(tag => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-sm"
                                >
                                  #{tag}
                                  <button
                                    onClick={() => removeTag(tag)}
                                    className="ml-1.5 text-gray-600 hover:text-gray-800 transition-colors"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Manual Tag Input - Clean Design */}
                    <div className="mb-4 relative">
                      <label className="block text-xs text-gray-500 font-medium mb-1">
                        Lägg till egna taggar (valfritt)
                      </label>
                      <input
                        type="text"
                        value={manualTagInput}
                        onChange={handleManualTagChange}
                        onKeyPress={handleManualTagKeyPress}
                        onFocus={() => {
                          if (manualTagInput.trim().length > 0 && autocompleteOptions.length > 0) {
                            setShowAutocomplete(true);
                          }
                        }}
                        onBlur={() => {
                          // Delay hiding to allow clicking on options
                          setTimeout(() => setShowAutocomplete(false), 200);
                        }}
                        placeholder="Skriv egna taggar... (tryck Enter, komma eller mellanslag för att lägga till)"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                      />
                      
                      {/* Autocomplete Dropdown */}
                      {showAutocomplete && autocompleteOptions.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-32 overflow-y-auto">
                          {autocompleteOptions.map(tag => (
                            <button
                              key={tag}
                              onClick={() => selectAutocompleteOption(tag)}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center border-b border-gray-100 last:border-b-0"
                            >
                              <span className="text-gray-400 mr-1">#</span>
                              <span className="text-gray-700">{tag}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      
                      <p className="text-xs text-gray-400 mt-1">
                        T.ex. "hett", "akut", "intresserad" - separera med komma eller mellanslag
                      </p>
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

              {/* ✏️ EDIT ACTIVITY FORM */}
              {editingActivity && (
                <div className="border-t border-gray-200 p-6 bg-blue-50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <PencilIcon className="h-5 w-5 text-blue-600 mr-2" />
                      Redigera Aktivitet
                    </h3>
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
                        placeholder="Detaljerad beskrivning... Smart tagging aktiveras automatiskt när du skriver!"
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

                    {/* 🧠 SMART TAGGING SYSTEM FOR EDIT */}
                    <div className="space-y-4">
                      {/* Smart Suggestions */}
                      {suggestedTags.length > 0 && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                          <h4 className="text-sm font-medium text-blue-900 mb-2">🧠 Smarta tagg-förslag:</h4>
                          <div className="flex flex-wrap gap-2">
                            {suggestedTags.map(tag => (
                              <div key={tag} className="flex items-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => addTag(tag)}
                                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                                >
                                  <PlusIcon className="h-3 w-3 mr-1" />
                                  {tag}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Selected Tags */}
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
                    </div>
                    
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={cancelEditingActivity}
                        className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Avbryt
                      </button>
                      <button
                        type="submit"
                        disabled={activitiesLoading}
                        className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                      >
                        {activitiesLoading ? 'Sparar...' : 'Spara Ändringar'}
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
                                  <div className="flex-1">
                                    {/* Expandable Title */}
                                    <div className="flex items-center space-x-2 mb-1">
                                      <div className="text-sm font-medium text-gray-900">
                                        {(() => {
                                          const expanded = isActivityExpanded(activity.id);
                                          const needsTruncation = needsExpansion(activity.title);
                                          
                                          if (!needsTruncation || expanded) {
                                            return activity.title;
                                          } else {
                                            return activity.title.substring(0, 100) + '...';
                                          }
                                        })()}
                                      </div>
                                      {/* Expand button for long titles */}
                                      {needsExpansion(activity.title) && (
                                        <button
                                          onClick={() => toggleActivityExpansion(activity.id)}
                                          className="text-purple-600 hover:text-purple-800 text-xs font-medium"
                                          title={isActivityExpanded(activity.id) ? 'Visa mindre' : 'Visa mer'}
                                        >
                                          {isActivityExpanded(activity.id) ? 'mindre' : 'mer'}
                                        </button>
                                      )}
                                    </div>
                                    
                                    {/* Expandable Content */}
                                    {activity.content && (
                                      <div className="text-sm text-gray-500 mb-2">
                                        {(() => {
                                          const expanded = isActivityExpanded(activity.id);
                                          const needsTruncation = needsExpansion(activity.content);
                                          
                                          if (!needsTruncation || expanded) {
                                            return (
                                              <div>
                                                <p className="whitespace-pre-wrap">{activity.content}</p>
                                                {needsTruncation && (
                                                  <button
                                                    onClick={() => toggleActivityExpansion(activity.id)}
                                                    className="text-purple-600 hover:text-purple-800 text-xs font-medium mt-1"
                                                  >
                                                    Visa mindre
                                                  </button>
                                                )}
                                              </div>
                                            );
                                          } else {
                                            return (
                                              <div>
                                                <p className="whitespace-pre-wrap">{activity.content.substring(0, 100)}...</p>
                                                <button
                                                  onClick={() => toggleActivityExpansion(activity.id)}
                                                  className="text-purple-600 hover:text-purple-800 text-xs font-medium mt-1"
                                                >
                                                  Visa mer
                                                </button>
                                              </div>
                                            );
                                          }
                                        })()}
                                      </div>
                                    )}
                                    
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
                                            #{tag}
                                          </span>
                                        ))}
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
                                        <PencilIcon className="h-3 w-3" />
                                      </button>
                                      <div>
                                        <time>{activity.createdAt?.toLocaleDateString('sv-SE')}</time>
                                        <p className="text-xs">{activity.createdAt?.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}</p>
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