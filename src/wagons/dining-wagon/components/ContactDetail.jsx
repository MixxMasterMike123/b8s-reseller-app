import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import AppLayout from '../../../components/layout/AppLayout';
import { useDiningContacts } from '../hooks/useDiningContacts';
import { useDiningActivities } from '../hooks/useDiningActivities';
import {
  ArrowLeftIcon,
  PhoneIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  PencilIcon,
  BuildingOffice2Icon,
  DevicePhoneMobileIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import {
  PhoneIcon as PhoneSolid,
  ChatBubbleLeftRightIcon as ChatSolid,
  EnvelopeIcon as EnvelopeSolid,
  DevicePhoneMobileIcon as DevicePhoneMobileSolid,
  CalendarDaysIcon as CalendarDaysSolid,
  DocumentTextIcon as DocumentTextSolid
} from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { doc, updateDoc, Timestamp, collection, addDoc, orderBy, query, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../contexts/AuthContext';

const ContactDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { contacts, getContact, hasInitialized } = useDiningContacts();
  const { getActivitiesByContact, addActivity } = useDiningActivities();
  
  const [contact, setContact] = useState(null);
  const [lastConversation, setLastConversation] = useState(null);
  const [newActivity, setNewActivity] = useState({
    type: 'call',
    subject: '',
    description: ''
  });
  const [isSavingActivity, setIsSavingActivity] = useState(false);
  
  // Tag system state
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [manualTagInput, setManualTagInput] = useState('');
  const [autocompleteOptions, setAutocompleteOptions] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  // Activity type options with Swedish labels and icons
  const activityTypes = [
    { value: 'call', label: 'Telefonsamtal', icon: PhoneSolid, color: 'text-blue-600' },
    { value: 'email', label: 'E-post', icon: EnvelopeSolid, color: 'text-green-600' },
    { value: 'text', label: 'SMS/Text', icon: DevicePhoneMobileSolid, color: 'text-purple-600' },
    { value: 'meeting', label: 'Möte', icon: CalendarDaysSolid, color: 'text-orange-600' },
    { value: 'note', label: 'Anteckning', icon: DocumentTextSolid, color: 'text-gray-600' }
  ];

  // Core Swedish business tag analysis
  const analyzeTextForTags = (text) => {
    if (!text.trim()) return [];
    
    const keywordMap = {
      'hett': ['intresserad', 'vill köpa', 'bestämma', 'offert', 'pris', 'priser', 'köpa', 'beställa', 'hot', 'het', 'möjlighet', 'affär'],
      'ringabak': ['ring tillbaka', 'ringa tillbaka', 'höra av sig', 'kontakta', 'återkomma', 'återkoppla', 'ring', 'ringa', 'hör av', 'kontakt'],
      'problem': ['problem', 'fungerar inte', 'missnöjd', 'fel', 'klagar', 'trasig', 'dålig', 'issue', 'trouble', 'svårt', 'hjälp'],
      'nöjd': ['nöjd', 'bra', 'funkar', 'rekommenderar', 'tack', 'fantastisk', 'perfekt', 'glad', 'bäst', 'toppen', 'excellent'],
      'akut': ['akut', 'bråttom', 'snabbt', 'idag', 'direkt', 'asap', 'nu', 'omgående', 'urgent', 'rush']
    };
    
    const lowerText = text.toLowerCase();
    const detected = [];
    
    Object.entries(keywordMap).forEach(([tag, keywords]) => {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        detected.push(tag);
      }
    });
    
    // Max 3 suggested tags to avoid overwhelming
    return detected.slice(0, 3);
  };

  // Auto-analyze when subject or description changes
  useEffect(() => {
    const combinedText = `${newActivity.subject} ${newActivity.description}`.trim();
    const allSuggestions = analyzeTextForTags(combinedText);
    // Filter out tags that are already selected
    const filteredSuggestions = allSuggestions.filter(tag => !selectedTags.includes(tag));
    
    // Debug logging (temporary)
    if (combinedText) {
      console.log('Tag Analysis:', {
        text: combinedText,
        allSuggestions,
        selectedTags,
        filteredSuggestions
      });
    }
    
    setSuggestedTags(filteredSuggestions);
  }, [newActivity.subject, newActivity.description, selectedTags]);

  // Tag management functions
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

  // Manual tag input functions
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
    
    // Show autocomplete suggestions
    if (value.trim().length > 0) {
      const commonTags = ['hett', 'ringabak', 'problem', 'nöjd', 'akut', 'budget', 'chef', 'vd', 'presentation', 'uppföljning', 'möte', 'demo', 'förhandling', 'kontrakt', 'leverans', 'support', 'reklamation', 'expansion', 'ny-kund', 'återkommande'];
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

  // Load contact data
  useEffect(() => {
    if (id && hasInitialized) {
      const contactData = getContact(id);
      if (contactData) {
        setContact(contactData);
        
        // Get the most recent conversation
        const activities = getActivitiesByContact(id);
        if (activities.length > 0) {
          setLastConversation(activities[0]); // Most recent first
        }
      } else {
        toast.error('Kontakt kunde inte hittas');
        navigate('/admin/dining/contacts');
      }
    }
  }, [id, contacts, getContact, navigate, hasInitialized, getActivitiesByContact]);

  // Handle activity form changes
  const handleActivityChange = (field, value) => {
    setNewActivity(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Save activity
  const handleSaveActivity = async () => {
    if (!newActivity.subject.trim()) {
      toast.error('Beskriv vad som hände');
      return;
    }
    
    setIsSavingActivity(true);
    try {
      const activityData = {
        type: newActivity.type,
        subject: newActivity.subject.trim(),
        description: newActivity.description.trim(),
        tags: selectedTags, // Include selected tags
        contactId: id,
        contactName: contact.companyName,
        createdAt: new Date()
      };

      await addActivity(activityData);
      
      // Immediately update the lastConversation state
      setLastConversation({
        ...activityData,
        id: Date.now().toString(), // Temporary ID for immediate display
      });
      
      // Reset form and tags
      setNewActivity({
        type: 'call',
        subject: '',
        description: ''
      });
      setSelectedTags([]);
      setSuggestedTags([]);
      setManualTagInput('');
      setShowAutocomplete(false);
      
      const selectedType = activityTypes.find(t => t.value === newActivity.type);
      toast.success(`${selectedType.label} registrerat`);
      
    } catch (error) {
      console.error('Error saving activity:', error);
      toast.error('Kunde inte spara aktivitet');
    } finally {
      setIsSavingActivity(false);
    }
  };

  // Get activity icon
  const getActivityIcon = (type) => {
    const activityType = activityTypes.find(t => t.value === type);
    if (activityType) {
      const IconComponent = activityType.icon;
      return <IconComponent className={`h-5 w-5 ${activityType.color}`} />;
    }
    return <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-600" />;
  };

  // Get conversation context for what to talk about
  const getConversationContext = () => {
    if (!contact) return [];
    
    const context = [];
    
    // Priority/status context
    if (contact.priority === 'high') {
      context.push('Viktiga kunden - visa extra uppmärksamhet');
    }
    
    // Recent activity context
    if (lastConversation) {
      const daysSince = Math.floor((new Date() - (lastConversation.createdAt?.toDate?.() || new Date(lastConversation.date))) / (1000 * 60 * 60 * 24));
      if (daysSince > 30) {
        context.push(`Länge sedan senaste kontakt (${daysSince} dagar sedan)`);
      }
    } else {
      context.push('Första kontakten - välkomna dem!');
    }
    
    // Status context
    if (contact.status === 'prospect') {
      context.push('Potentiell kund - fokusera på deras behov');
    } else if (contact.status === 'active') {
      context.push('Befintlig kund - fråga hur det går');
    }
    
    // Notes context
    if (contact.notes) {
      context.push(`Kom ihåg: ${contact.notes}`);
    }
    
    return context.slice(0, 4); // Max 4 context items
  };

  const conversationContext = getConversationContext();

  if (!hasInitialized) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <span className="ml-3 text-gray-600">Laddar kontakt...</span>
        </div>
      </AppLayout>
    );
  }

  if (!contact) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <p className="text-gray-600">Kontakt kunde inte hittas</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
        
        {/* Back Button */}
        <div className="mb-6">
          <Link
            to="/admin/dining/contacts"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 font-medium"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Tillbaka till kontakter
          </Link>
        </div>

        {/* Main Question */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Vad ska jag säga?
          </h1>
          <p className="text-gray-600">Till {contact.contactPerson} på {contact.companyName}</p>
        </div>

        {/* Contact Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start space-x-4">
              <div className="bg-orange-100 p-3 rounded-xl">
                <BuildingOffice2Icon className="h-8 w-8 text-orange-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{contact.companyName}</h2>
                <p className="text-lg text-gray-600">{contact.contactPerson}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <a 
                    href={`tel:${contact.phone}`}
                    className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <PhoneIcon className="h-4 w-4 mr-1" />
                    {contact.phone}
                  </a>
                  <a 
                    href={`mailto:${contact.email}`}
                    className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <EnvelopeIcon className="h-4 w-4 mr-1" />
                    {contact.email}
                  </a>
                </div>
              </div>
            </div>
            
            {/* Quick Action Buttons */}
            <div className="flex space-x-3">
              <a
                href={`tel:${contact.phone}`}
                className="flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors space-x-2"
              >
                <PhoneSolid className="h-5 w-5" />
                <span>Ring nu</span>
              </a>
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors space-x-2"
              >
                <EnvelopeIcon className="h-5 w-5" />
                <span>Maila</span>
              </a>
            </div>
          </div>
        </div>

        {/* Two Main Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* Last Conversation */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <ChatSolid className="h-5 w-5 text-blue-600 mr-2" />
              Senaste kontakten
            </h3>
            
            {lastConversation ? (
              <div className="space-y-3">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      {getActivityIcon(lastConversation.type)}
                      <p className="font-medium text-gray-900">{lastConversation.subject}</p>
                    </div>
                    <span className="text-sm text-gray-500">
                      {lastConversation.createdAt?.toDate?.()?.toLocaleDateString('sv-SE') || lastConversation.date || 'Idag'}
                    </span>
                  </div>
                  {lastConversation.description && (
                    <p className="text-gray-700">{lastConversation.description}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ChatBubbleLeftRightIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p>Ingen tidigare kontakt</p>
                <p className="text-sm">Detta blir er första kontakt!</p>
              </div>
            )}
          </div>

          {/* Conversation Context */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <PencilIcon className="h-5 w-5 text-green-600 mr-2" />
              Vad att prata om
            </h3>
            
            <div className="space-y-3">
              {conversationContext.length > 0 ? (
                conversationContext.map((context, index) => (
                  <div key={index} className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">{context}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p className="text-sm">Ring och hör hur det går!</p>
                </div>
              )}
              
              {/* General conversation tips */}
              <div className="pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2 font-medium">Allmänna frågor:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• "Hur går det med fisket?"</li>
                  <li>• "Är ni nöjda med produkterna?"</li>
                  <li>• "Behöver ni mer material?"</li>
                  <li>• "Har ni fått bra respons från kunder?"</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Contact History Timeline - "Vad har hänt innan?" */}
        {(() => {
          const allActivities = getActivitiesByContact(id);
          const recentActivities = allActivities.slice(0, 4); // Show 4 most recent
          
          return allActivities.length > 1 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <ClockIcon className="h-5 w-5 text-gray-600 mr-2" />
                  Vad har hänt innan? ({allActivities.length} kontakter)
                </h3>
                <Link
                  to={`/admin/dining/activities?contact=${id}`}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Se alla →
                </Link>
              </div>
              
              <div className="space-y-3">
                {recentActivities.map((activity, index) => (
                  <div key={activity.id || index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 mt-0.5">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.subject || activity.notes}
                        </p>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {activity.createdAt?.toDate?.()?.toLocaleDateString('sv-SE') || activity.date || 'Idag'}
                        </span>
                      </div>
                      {activity.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                          {activity.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                
                {allActivities.length > 4 && (
                  <div className="text-center py-3">
                    <Link
                      to={`/admin/dining/activities?contact=${id}`}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Se alla {allActivities.length} kontakter →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ) : null;
        })()}

        {/* Activity Logger Section - "Vad hände?" */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Vad hände? Registrera kontakt</h3>
          
          {/* Activity Type Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Typ av kontakt</label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {activityTypes.map((type) => {
                const IconComponent = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => handleActivityChange('type', type.value)}
                    className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-colors ${
                      newActivity.type === type.value
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <IconComponent className="h-5 w-5" />
                    <span className="text-sm font-medium">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subject/Summary */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vad hände? (sammanfattning)
            </label>
            
            <input
              type="text"
              value={newActivity.subject}
              onChange={(e) => handleActivityChange('subject', e.target.value)}
              placeholder="T.ex. 'Intresserad av fler röda', 'Skickade prisförslag', 'Bekräftade leverans'..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Tag System - Between Subject and Description */}
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

          {/* Manual Tag Input - TAGlist2 for Power Users */}
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
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
            />
            
            {/* Autocomplete Dropdown */}
            {showAutocomplete && autocompleteOptions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-32 overflow-y-auto">
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
              T.ex. "budget", "chef", "presentation" - separera med komma eller mellanslag
            </p>
          </div>

          {/* Description (Optional) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Detaljer (valfritt)
            </label>
            <textarea
              value={newActivity.description}
              onChange={(e) => handleActivityChange('description', e.target.value)}
              placeholder="Mer detaljerad beskrivning av vad som diskuterades..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveActivity}
              disabled={!newActivity.subject.trim() || isSavingActivity}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors"
            >
              {isSavingActivity ? 'Sparar...' : 'Registrera kontakt'}
            </button>
          </div>
          
          <p className="text-sm text-gray-500 mt-2">
            Registrera alla typer av kontakt så du får en komplett historik över era interaktioner
          </p>
        </div>

      </div>
    </AppLayout>
  );
};

export default ContactDetail; 