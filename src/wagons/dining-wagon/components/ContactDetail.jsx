import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import AppLayout from '../../../components/layout/AppLayout';
import UserBadge, { UserBadgeGroup } from '../../../components/UserBadge';
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
  ClockIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  CheckCircleIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import {
  PhoneIcon as PhoneSolid,
  ChatBubbleLeftRightIcon as ChatSolid,
  EnvelopeIcon as EnvelopeSolid,
  DevicePhoneMobileIcon as DevicePhoneMobileSolid,
  CalendarDaysIcon as CalendarDaysSolid,
  DocumentTextIcon as DocumentTextSolid,
  ExclamationTriangleIcon as ExclamationSolid
} from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { doc, updateDoc, Timestamp, collection, addDoc, orderBy, query, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getAdminDocuments,
  uploadAdminDocument,
  deleteAdminDocument,
  formatFileSize,
  getFileType
} from '../../../utils/adminDocuments';
import {
  ArrowLeftIcon as ArrowLeftIconOutline,
  PencilIcon as PencilIconOutline,
  TrashIcon,
  MapPinIcon,
  UserIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconOutline,
  ClipboardDocumentListIcon,
  FolderIcon,
  FireIcon,
  BellIcon,
  StarIcon,
  DocumentArrowUpIcon,
  PlusIcon,
  XMarkIcon,
  EyeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

// Component to render text with highlighted mentions using consistent UserBadge
const TextWithMentions = ({ text, className = "", adminUsers = [] }) => {
  if (!text) return null;
  
  // Get all admin user full names for highlighting
  const adminNames = adminUsers.map(user => user.fullName);
  
  // If no admin names to highlight, just return plain text
  if (adminNames.length === 0) {
    return <span className={className}>{text}</span>;
  }
  
  // Create regex to match any admin full name
  const namePattern = new RegExp(`(${adminNames.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
  const parts = text.split(namePattern);
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
                 // Check if this part is an admin name
         if (adminNames.includes(part)) {
           return (
             <span
               key={index}
               className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600"
             >
               {part}
             </span>
           );
         }
        return part;
      })}
    </span>
  );
};

// ZEN Inline Activity Editor Component
const InlineActivityEditor = ({ activity, onSave, onCancel, contactName }) => {
  const [editData, setEditData] = useState({
    subject: activity.subject || '',
    description: activity.description || '',
    tags: activity.tags || []
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editData.subject.trim()) {
      toast.error('Beskriv vad som hände');
      return;
    }

    setSaving(true);
    try {
      await onSave(editData);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 rounded-md p-3 mt-2">
      <div className="mb-2">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Vad är läget med {contactName}?
        </label>
        <input
          type="text"
          value={editData.subject}
          onChange={(e) => setEditData(prev => ({ ...prev, subject: e.target.value }))}
          onKeyDown={handleKeyDown}
          placeholder="Beskriv vad som hände..."
          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
          autoFocus
        />
      </div>

      <div className="mb-2">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Detaljer (valfritt)
        </label>
        <textarea
          value={editData.description}
          onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
          onKeyDown={handleKeyDown}
          placeholder="Mer information..."
          rows={2}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSave}
            disabled={saving || !editData.subject.trim()}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-xs rounded transition-colors"
          >
            {saving ? 'Sparar...' : 'Spara'}
          </button>
          <button
            onClick={onCancel}
            className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 dark:text-gray-300 text-xs rounded transition-colors"
          >
            Avbryt
          </button>
        </div>
        <div className="text-xs text-gray-400">
          Ctrl+Enter, Esc
        </div>
      </div>
    </div>
  );
};

const ContactDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, userData, isAdmin, getAllUsers } = useAuth();
  const { contacts, getContact, updateContact, deleteContact, activateContact, hasInitialized, getAllTags } = useDiningContacts();
  const { getActivitiesByContact, addActivity, updateActivity, deleteActivity } = useDiningActivities();
  
  // URL parameter detection for activity highlighting
  const [searchParams, setSearchParams] = useState(new URLSearchParams(window.location.search));
  const highlightActivityId = searchParams.get('highlight');
  
  const [contact, setContact] = useState(null);
  const [lastConversation, setLastConversation] = useState(null);
  const [newActivity, setNewActivity] = useState({
    type: 'call',
    subject: '',
    description: ''
  });
  const [isSavingActivity, setIsSavingActivity] = useState(false);
  
  // ZEN Inline Editing State
  const [editingActivity, setEditingActivity] = useState(null);
  
  // Tag system state
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [manualTagInput, setManualTagInput] = useState('');
  const [autocompleteOptions, setAutocompleteOptions] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  
  // @mention system state (admin-only)
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionOptions, setMentionOptions] = useState([]);
  const [mentionInputRef, setMentionInputRef] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  
  // Dismissed activities state for trigger management
  const [dismissedActivities, setDismissedActivities] = useState(new Set());

  // ✏️ CONTACT EDITING STATE
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editingContactData, setEditingContactData] = useState({});
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [editingContactTags, setEditingContactTags] = useState([]);
  const [newContactTag, setNewContactTag] = useState('');

  // Admin Documents state (ZEN integration)
  const [adminDocuments, setAdminDocuments] = useState([]);
  const [adminDocsLoading, setAdminDocsLoading] = useState(false);
  const [showAdminDocUpload, setShowAdminDocUpload] = useState(false);
  const [adminDocFile, setAdminDocFile] = useState(null);
  const [adminDocCategory, setAdminDocCategory] = useState('dokument');
  const [adminDocNotes, setAdminDocNotes] = useState('');
  const [adminDocUploading, setAdminDocUploading] = useState(false);

  // META scraping state
  const [metaScraping, setMetaScraping] = useState(false);

  // Auto-scroll and highlight activity from URL parameter
  useEffect(() => {
    if (highlightActivityId && contact) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`activity-${highlightActivityId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add highlight animation
          element.style.animation = 'highlight-pulse 2s ease-in-out';
          
          // Remove highlight parameter from URL after navigation
          const newUrl = window.location.pathname;
          window.history.replaceState({}, '', newUrl);
        }
      }, 500); // Small delay to ensure DOM is ready
      
      return () => clearTimeout(timer);
    }
  }, [highlightActivityId, contact]);

  // Load admin users dynamically for @mentions
  useEffect(() => {
    const loadAdminUsers = async () => {
      try {
        const allUsers = await getAllUsers();
        const admins = allUsers.filter(user => user.role === 'admin');
        
        // Create mention-friendly usernames from names with deduplication
        const adminMentions = [];
        const usedUsernames = new Set();
        
        admins.forEach(admin => {
          const name = admin.contactPerson || admin.companyName || admin.email;
          const firstName = name.split(' ')[0].toLowerCase();
          let username = firstName.substring(0, Math.min(4, firstName.length));
          
          // Make username unique if already used
          let counter = 1;
          let originalUsername = username;
          while (usedUsernames.has(username)) {
            username = originalUsername + counter;
            counter++;
          }
          
          usedUsernames.add(username);
          
          adminMentions.push({
            username,
            fullName: name,
            trigger: `@${username.substring(0, 3)}`,
            userId: admin.id,
            email: admin.email
          });
        });
        
        setAdminUsers(adminMentions);
      } catch (error) {
        console.error('Error loading admin users:', error);
      }
    };
    
    if (isAdmin && getAllUsers) {
      loadAdminUsers();
    }
  }, [isAdmin, getAllUsers]);

  // User helper functions
  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const getUserDisplayName = (activity) => {
    return activity.createdByName || activity.createdBy || 'Okänd';
  };

  // Debug user data - remove this after fixing
  useEffect(() => {
    if (currentUser) {
      console.log('🔍 Current user object:', {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        userData: userData,
        isAdmin: isAdmin
      });
    }
  }, [currentUser, userData, isAdmin]);

  // User Attribution Component using centralized UserBadge
  const UserAttribution = ({ activity, isDismissed = false }) => {
    const creatorName = getUserDisplayName(activity);
    const resolverName = isDismissed && activity.dismissedByName ? activity.dismissedByName : null;
    
    const creatorTimestamp = activity.createdAt?.toDate?.()?.toLocaleString('sv-SE') || activity.date || 'Okänt datum';
    const resolverTimestamp = activity.dismissedAt?.toDate?.()?.toLocaleString('sv-SE') || null;
    
    // Use centralized UserBadgeGroup for consistent styling
    const users = [
      {
        name: creatorName,
        tooltip: `Skapad: ${creatorTimestamp}`,
        separator: resolverName ? '→' : null
      }
    ];
    
    if (resolverName) {
      users.push({
        name: resolverName,
        tooltip: `Löst: ${resolverTimestamp}`
      });
    }
    
    return (
      <UserBadgeGroup 
        users={users}
        size="sm"
        className="mt-2"
      />
    );
  };

  // Activity type options with Swedish labels and icons
  const activityTypes = [
    { value: 'call', label: 'Telefonsamtal', icon: PhoneSolid, color: 'text-blue-600 dark:text-blue-400' },
    { value: 'email', label: 'E-post', icon: EnvelopeSolid, color: 'text-green-600 dark:text-green-400' },
    { value: 'text', label: 'SMS/Text', icon: DevicePhoneMobileSolid, color: 'text-purple-600' },
    { value: 'meeting', label: 'Möte', icon: CalendarDaysSolid, color: 'text-orange-600 dark:text-orange-400' },
    { value: 'note', label: 'Anteckning', icon: DocumentTextSolid, color: 'text-gray-600 dark:text-gray-400' }
  ];

  // Advanced Swedish weekday and date parsing
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

  // Core Swedish business tag analysis (without @mention extraction)
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
    
    // Standard keyword detection
    Object.entries(keywordMap).forEach(([tag, keywords]) => {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        detected.push(tag);
      }
    });
    
    // Advanced: Swedish weekday date parsing
    const dateTags = parseSwedishWeekdays(text);
    detected.push(...dateTags);
    
    // Max 5 suggested tags for business keywords and dates
    return detected.slice(0, 5);
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

  // Urgency detection and management
  const isUrgentActivity = (activity) => {
    const tags = activity.tags || [];
    return tags.includes('akut') || tags.includes('problem');
  };

  const getUrgencyLevel = (activity) => {
    const tags = activity.tags || [];
    if (tags.includes('akut')) return 'critical';
    if (tags.includes('problem')) return 'high';
    return 'normal';
  };

  // Dismiss activity (mark as resolved to remove from triggers)
  const dismissActivity = async (activityId) => {
    try {
      // Use 'activities' collection for fresh start
      const activityRef = doc(db, 'activities', activityId);
      await updateDoc(activityRef, {
        dismissed: true,
        dismissedAt: new Date(),
        dismissedBy: user?.uid || 'unknown',
        dismissedByName: userData?.contactPerson || user?.displayName || user?.email || 'Okänd användare'
      });
      
      // Add to local dismissed set for immediate UI update
      setDismissedActivities(prev => new Set([...prev, activityId]));
      
      toast.success('Aktivitet löst');
    } catch (error) {
      console.error('Error dismissing activity:', error);
      toast.error('Kunde inte lösa aktivitet');
    }
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
    
    // Show autocomplete suggestions from database
    if (value.trim().length > 0) {
      const allTags = getAllTags(); // Get from database instead of hardcoded list
      const inputText = value.replace('#', '').toLowerCase();
      const matches = allTags.filter(tag => 
        tag.includes(inputText) && !selectedTags.includes(tag)
      );
      setAutocompleteOptions(matches.slice(0, 8)); // Max 8 suggestions
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

  // Load admin documents
  useEffect(() => {
    if (id) {
      loadAdminDocuments();
    }
  }, [id]);

  const loadAdminDocuments = async () => {
    if (!id) return;
    
    setAdminDocsLoading(true);
    try {
      const docs = await getAdminDocuments(id);
      setAdminDocuments(docs);
    } catch (error) {
      console.error('Error loading admin documents:', error);
      toast.error('Kunde inte ladda admin-dokument');
    } finally {
      setAdminDocsLoading(false);
    }
  };

  // Admin document upload
  const handleAdminDocUpload = async () => {
    if (!adminDocFile || !id) return;

    setAdminDocUploading(true);
    try {
      await uploadAdminDocument(id, adminDocFile, {
        category: adminDocCategory,
        notes: adminDocNotes,
        title: adminDocFile.name.split('.')[0]
      }, currentUser?.uid);
      
      toast.success('Admin-dokument uppladdat');
      setAdminDocFile(null);
      setAdminDocCategory('dokument');
      setAdminDocNotes('');
      setShowAdminDocUpload(false);
      await loadAdminDocuments();
    } catch (error) {
      console.error('Error uploading admin document:', error);
      toast.error('Kunde inte ladda upp admin-dokument');
    } finally {
      setAdminDocUploading(false);
    }
  };

  // Delete admin document
  const handleDeleteAdminDoc = async (docId, fileName) => {
    if (!confirm(`Är du säker på att du vill ta bort "${fileName}"?`)) return;

    try {
      await deleteAdminDocument(docId);
      toast.success('Admin-dokument borttaget');
      await loadAdminDocuments();
    } catch (error) {
      console.error('Error deleting admin document:', error);
      toast.error('Kunde inte ta bort admin-dokument');
    }
  };

  // Document categories for admin docs
  const adminDocCategories = [
    { id: 'dokument', name: 'Dokument' },
    { id: 'kontrakt', name: 'Kontrakt' },
    { id: 'förslag', name: 'Förslag' },
    { id: 'faktura', name: 'Fakturor' },
    { id: 'anteckningar', name: 'Anteckningar' },
    { id: 'teknisk', name: 'Teknisk Info' },
    { id: 'kommunikation', name: 'Kommunikation' },
    { id: 'övrigt', name: 'Övrigt' }
  ];

  // Handle activity form changes
  // Available users for @mentions (admin-only) - now dynamic from database
  const availableUsers = adminUsers;

  // Handle @mention detection and autocomplete
  const handleSubjectChange = (value) => {
    setNewActivity(prev => ({ ...prev, subject: value }));
    
    // Only show @mentions for admins
    if (!isAdmin) return;
    
    // Check for @mention trigger
    const words = value.split(' ');
    const lastWord = words[words.length - 1];
    
    if (lastWord.startsWith('@') && lastWord.length > 1) {
      const query = lastWord.slice(1).toLowerCase();
      const matches = availableUsers.filter(user => 
        user.username.includes(query) || 
        user.fullName.toLowerCase().includes(query) ||
        user.trigger.slice(1).includes(query)
      );
      
      if (matches.length > 0) {
        setMentionOptions(matches);
        setShowMentionDropdown(true);
      } else {
        setShowMentionDropdown(false);
      }
    } else {
      setShowMentionDropdown(false);
    }
  };

  // Insert @mention into subject
  const insertMention = (user) => {
    const words = newActivity.subject.split(' ');
    // Insert the full name instead of @username for clean text storage
    words[words.length - 1] = user.fullName;
    const newSubject = words.join(' ') + ' ';
    
    setNewActivity(prev => ({ ...prev, subject: newSubject }));
    setShowMentionDropdown(false);
    
    // Focus back to input
    if (mentionInputRef) {
      mentionInputRef.focus();
    }
  };

  const handleActivityChange = (field, value) => {
    if (field === 'subject') {
      handleSubjectChange(value);
    } else {
    setNewActivity(prev => ({
      ...prev,
        [field]: value
      }));
    }
  };

  // Function to extract mentioned users and create notifications
  const createMentionNotifications = async (activityId, text) => {
    if (!isAdmin || !text) return;
    
    const mentionedUsers = [];
    
    // Extract mentioned full names from text
    adminUsers.forEach(user => {
      if (text.includes(user.fullName)) {
        mentionedUsers.push(user);
      }
    });
    
    // Create notification records for each mentioned user
    for (const user of mentionedUsers) {
      try {
        await addDoc(collection(db, 'userMentions'), {
          userId: user.userId,
          activityId: activityId,
          contactId: id,
          contactName: contact.companyName,
          mentionText: text,
          mentionedBy: currentUser.uid,
          mentionedByName: userData?.contactPerson || currentUser?.displayName || currentUser?.email || 'Okänd',
          isRead: false,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        console.error('Error creating mention notification:', error);
      }
    }
    
    if (mentionedUsers.length > 0) {
      console.log(`Created ${mentionedUsers.length} mention notifications`);
    }
  };

  // Save activity
  const handleSaveActivity = async () => {
    if (!newActivity.subject.trim()) {
      toast.error('Beskriv vad som hände');
      return;
    }

    setIsSavingActivity(true);
    const user = currentUser;
    
    try {
      const activityData = {
        type: newActivity.type,
        subject: newActivity.subject.trim(),
        description: newActivity.description.trim(),
        tags: selectedTags, // Include selected tags
        contactId: id,
        contactName: contact.companyName,
        createdAt: serverTimestamp(),
        createdBy: user?.uid || 'unknown',
        createdByName: userData?.contactPerson || user?.displayName || user?.email || 'Okänd användare',
        createdByInitials: getInitials(userData?.contactPerson || user?.displayName || user?.email || 'Okänd')
      };

      const activityId = await addActivity(activityData);
      
      // Create mention notifications if any @mentions detected
      const combinedText = `${newActivity.subject} ${newActivity.description}`.trim();
      await createMentionNotifications(activityId, combinedText);
      
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
    return <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
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

  // ZEN Inline Editing Functions
  const handleEditActivity = (activity) => {
    setEditingActivity(activity.id);
  };

  const handleSaveEdit = async (activityId, editData) => {
    try {
      await updateActivity(activityId, {
        subject: editData.subject,
        description: editData.description,
        tags: editData.tags
      });
      setEditingActivity(null);
      toast.success('Aktivitet uppdaterad');
    } catch (error) {
      console.error('Error updating activity:', error);
      toast.error('Kunde inte uppdatera aktivitet');
    }
  };

  const handleCancelEdit = () => {
    setEditingActivity(null);
  };

  const handleDeleteActivity = async (activityId) => {
    if (!window.confirm('Är du säker på att du vill ta bort denna aktivitet?')) {
      return;
    }

    try {
      await deleteActivity(activityId);
      toast.success('Aktivitet borttagen');
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast.error('Kunde inte ta bort aktivitet');
    }
  };

  // ✏️ CONTACT EDITING FUNCTIONS
  const handleEditContact = () => {
    setEditingContactData({
      companyName: contact.companyName || '',
      contactPerson: contact.contactPerson || '',
      phone: contact.phone || '',
      email: contact.email || '',
      website: contact.website || '',
      address: contact.address || '',
      city: contact.city || '',
      postalCode: contact.postalCode || '',
      country: contact.country || 'Sverige',
      orgNumber: contact.orgNumber || '',
      notes: contact.notes || '',
      // CRM fields
      status: contact.status || 'prospect',
      priority: contact.priority || 'medium',
      source: contact.source || 'manual',
      // B2B fields
      marginal: contact.marginal || 35,
      deliveryAddress: contact.deliveryAddress || '',
      deliveryCity: contact.deliveryCity || '',
      deliveryPostalCode: contact.deliveryPostalCode || '',
      deliveryCountry: contact.deliveryCountry || 'Sverige',
      sameAsCompanyAddress: contact.sameAsCompanyAddress !== false
    });
    setEditingContactTags(contact.tags || []);
    setIsEditingContact(true);
  };

  const handleSaveContact = async () => {
    try {
      setIsSavingContact(true);
      const updatedData = {
        ...editingContactData,
        tags: editingContactTags
      };
      await updateContact(id, updatedData);
      setIsEditingContact(false);
      toast.success('Kontaktinformation uppdaterad');
    } catch (error) {
      console.error('Error updating contact:', error);
      toast.error('Kunde inte uppdatera kontakt');
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleCancelContactEdit = () => {
    setIsEditingContact(false);
    setEditingContactData({});
    setEditingContactTags([]);
    setNewContactTag('');
  };

  // Contact tag management functions
  const handleAddContactTag = () => {
    if (newContactTag.trim() && !editingContactTags.includes(newContactTag.trim())) {
      setEditingContactTags([...editingContactTags, newContactTag.trim()]);
      setNewContactTag('');
    }
  };

  const handleRemoveContactTag = (tagToRemove) => {
    setEditingContactTags(editingContactTags.filter(tag => tag !== tagToRemove));
  };

  const handleContactTagKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddContactTag();
    }
  };

  // 🎯 NEW: Activate contact (Convert prospect to B2B customer)
  const handleActivateContact = async () => {
    if (!window.confirm(`Är du säker på att du vill aktivera "${contact.companyName}" som B2B-kund? De kommer då att visas i kundhanteringen.`)) {
      return;
    }

    try {
      await activateContact(id);
      // Success message handled by the hook
    } catch (error) {
      console.error('Error activating contact:', error);
      // Error message handled by the hook
    }
  };

  const handleDeleteContact = async () => {
    if (!window.confirm(`Är du säker på att du vill ta bort kontakten "${contact.companyName}"? Detta kan inte ångras.`)) {
      return;
    }

    try {
      await deleteContact(id);
      toast.success('Kontakt borttagen');
      navigate('/admin/dining/contacts'); // Redirect to contact list after deletion
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('Kunde inte ta bort kontakt');
    }
  };

  // META scraping function
  const handleScrapeWebsiteMeta = async () => {
    if (!editingContactData.website) {
      toast.error('Ingen webbsida angiven');
      return;
    }

    setMetaScraping(true);

    try {
      // Call Firebase Function for META scraping
      const response = await fetch('https://us-central1-b8shield-reseller-app.cloudfunctions.net/scrapeWebsiteMetaV2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: editingContactData.website
        })
      });

      const result = await response.json();

      if (!result.success) {
        toast.error(`Kunde inte hämta META data: ${result.error}`);
        return;
      }

      const { data } = result;
      
      // Format the META data for appending to notes
      let metaText = '\n\n--- WEBBSIDA META ---\n';
      
      if (data.title) {
        metaText += `Titel: ${data.title}\n`;
      }
      
      if (data.description) {
        metaText += `Beskrivning: ${data.description}\n`;
      }
      
      if (data.keywords) {
        metaText += `Nyckelord: ${data.keywords}\n`;
      }
      
      metaText += `Språk: ${data.detectedLanguage === 'sv' ? 'Svenska' : 
                            data.detectedLanguage === 'en' ? 'Engelska' : 
                            data.detectedLanguage === 'de' ? 'Tyska' : 
                            data.detectedLanguage || 'Okänt'}\n`;
      
      if (data.simpleTranslation) {
        metaText += `Enkel översättning: ${data.simpleTranslation}\n`;
      }
      
      metaText += `Hämtad: ${new Date().toLocaleDateString('sv-SE')}\n`;
      metaText += `---`;

      // Append to existing notes
      const currentNotes = editingContactData.notes || '';
      const updatedNotes = currentNotes + metaText;

      setEditingContactData({
        ...editingContactData,
        notes: updatedNotes
      });

      toast.success('META-data hämtad och tillagd i anteckningar');

    } catch (error) {
      console.error('Error scraping META:', error);
      toast.error('Kunde inte hämta META data från webbsidan');
    } finally {
      setMetaScraping(false);
    }
  };

  if (!hasInitialized) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 dark:border-orange-400"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400 dark:text-gray-400">Laddar kontakt...</span>
        </div>
      </AppLayout>
    );
  }

  if (!contact) {
  return (
      <AppLayout>
        <div className="text-center py-16">
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400">Kontakt kunde inte hittas</p>
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
                to="/admin/dining/contacts" 
            className="inline-flex items-center text-gray-600 dark:text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100 dark:hover:text-gray-100 font-medium"
              >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Tillbaka till kontakter
              </Link>
        </div>

        {/* Main Question */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Vad ska jag säga?
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Till {contact.contactPerson} på {contact.companyName}</p>
        </div>

                {/* Contact Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 mb-8">
          {/* 🎯 IMPROVED: Desktop-First Layout - Header on top, buttons below */}
          
          {/* Company Header with Icon */}
          <div className="flex items-start space-x-4 mb-4">
            <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-xl">
              <BuildingOffice2Icon className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{contact.companyName}</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">{contact.contactPerson}</p>
            </div>
          </div>

          {/* Contact Information */}
          <div className="mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
              {contact.phone && (
                <a 
                  href={`tel:${contact.phone}`}
                  className="flex items-center text-blue-600 dark:text-blue-400 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  <PhoneIcon className="h-4 w-4 mr-1" />
                  {contact.phone}
                </a>
              )}
              {contact.email && (
                <a 
                  href={`mailto:${contact.email}`}
                  className="flex items-center text-blue-600 dark:text-blue-400 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  <EnvelopeIcon className="h-4 w-4 mr-1" />
                  {contact.email}
                </a>
              )}
              {contact.website && (
                <a 
                  href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-blue-600 dark:text-blue-400 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  <GlobeAltIcon className="h-4 w-4 mr-1" />
                  {contact.website.replace(/^https?:\/\//, '')}
                </a>
              )}
              {contact.orgNumber && (
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <BuildingOffice2Icon className="h-4 w-4 mr-1" />
                  <span className="text-sm">Org.nr: {contact.orgNumber}</span>
                </div>
              )}
            </div>

            {/* Address Information */}
            {(contact.address || contact.city) && (
              <div className="mb-3">
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <MapPinIcon className="h-4 w-4 mr-1" />
                  <span className="text-sm">
                    {[contact.address, contact.postalCode, contact.city, contact.country].filter(Boolean).join(', ')}
                  </span>
                </div>
              </div>
            )}

            {/* CRM Information */}
            <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg border border-blue-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                {/* Status */}
                <div className="flex items-center">
                  <ClipboardDocumentListIcon className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-medium text-blue-700">Status</div>
                    <div className="text-sm">
                      {(() => {
                        const statusLabels = {
                          ej_kontaktad: 'Ej kontaktad',
                          kontaktad: 'Kontaktad', 
                          dialog: 'Dialog',
                          af: 'ÅF',
                          closed: 'Stängd',
                          prospect: 'Reservering',
                          active: 'Stamgäst',
                          inactive: 'Inaktiv'
                        };
                        return statusLabels[contact.status] || contact.status || 'Okänd';
                      })()}
                    </div>
                  </div>
                </div>

                {/* Priority */}
                <div className="flex items-center">
                  <StarIcon className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-medium text-blue-700">Prioritet</div>
                    <div className="flex items-center text-sm">
                      {contact.priority === 'high' && <ExclamationTriangleIcon className="h-3 w-3 text-red-500 mr-1" />}
                      {contact.priority === 'medium' && <StarIcon className="h-3 w-3 text-yellow-500 mr-1" />}
                      <span>
                        {contact.priority === 'high' ? 'Hög' : 
                         contact.priority === 'medium' ? 'Medium' : 
                         contact.priority === 'low' ? 'Låg' : 
                         contact.priority || 'Medium'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Source */}
                <div className="flex items-center">
                  <UserIcon className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-medium text-blue-700">Källa</div>
                    <div className="text-sm">
                      {(() => {
                        const sourceLabels = {
                          manual: 'Manuell',
                          web: 'Webb',
                          referral: 'Hänvisning',
                          phone: 'Telefon',
                          email: 'E-post',
                          social: 'Sociala medier',
                          event: 'Evenemang',
                          advertising: 'Annonsering'
                        };
                        return sourceLabels[contact.source] || contact.source || 'Manuell';
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Full Text */}
            {contact.notes && (
              <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-start">
                  <DocumentTextIcon className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Anteckningar</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {contact.notes}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Active/Prospect Status Indicator */}
            <div className="mb-3">
              {contact.active === true ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 border border-green-200 font-medium">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  Aktiv B2B Kund
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300 border border-orange-200 font-medium">
                  <span className="w-2 h-2 bg-orange-400 rounded-full mr-2"></span>
                  CRM Reservering
                </span>
              )}
            </div>

            {/* Contact Tags */}
            {contact.tags && contact.tags.length > 0 && (
              <div>
                <div className="flex flex-wrap gap-1">
                  {contact.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* 🎯 NEW: Action Buttons Below (Smaller & More Compact) */}
          <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
            <a
              href={`tel:${contact.phone}`}
              className="flex items-center px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-sm font-medium transition-colors space-x-1.5"
            >
              <PhoneSolid className="h-4 w-4" />
              <span>Ring nu</span>
            </a>
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 rounded-md text-sm font-medium transition-colors space-x-1.5"
            >
              <EnvelopeIcon className="h-4 w-4" />
              <span>Maila</span>
            </a>
            <button
              onClick={() => setShowAdminDocUpload(true)}
              className="flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 rounded-md text-sm font-medium transition-colors space-x-1.5"
              title="Admin-dokument (endast synligt för administratörer)"
            >
              <DocumentArrowUpIcon className="h-4 w-4" />
              <span>Dokument</span>
              {adminDocuments.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300">
                  {adminDocuments.length}
                </span>
              )}
            </button>
            
            {/* Make Active Button (Only for prospects) */}
            {contact.active !== true && (
              <button
                onClick={handleActivateContact}
                className="flex items-center px-3 py-1.5 border border-green-300 text-green-700 hover:bg-green-50 rounded-md text-sm font-medium transition-colors space-x-1.5"
                title="Aktivera som B2B-kund"
              >
                <CheckCircleIcon className="h-4 w-4" />
                <span>Gör Aktiv</span>
              </button>
            )}
            
            <button
              onClick={handleEditContact}
              className="flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 rounded-md text-sm font-medium transition-colors space-x-1.5"
              title="Redigera kontaktinformation"
            >
              <PencilIcon className="h-4 w-4" />
              <span>Redigera</span>
            </button>
            <button
              onClick={handleDeleteContact}
              className="flex items-center px-3 py-1.5 border border-red-300 text-red-700 hover:bg-red-50 dark:hover:bg-red-900 dark:bg-red-900 rounded-md text-sm font-medium transition-colors space-x-1.5"
              title="Ta bort kontakt"
            >
              <TrashIcon className="h-4 w-4" />
              <span>Ta bort</span>
            </button>
          </div>
        </div>

        {/* Two Main Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* Last Conversation */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <ChatSolid className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
              Senaste kontakten
            </h3>
            
            {lastConversation ? (
              <div className="space-y-3">
                {(() => {
                  const urgencyLevel = getUrgencyLevel(lastConversation);
                  const isUrgent = isUrgentActivity(lastConversation);
                  const isDismissed = dismissedActivities.has(lastConversation.id) || lastConversation.dismissed;
                  
                  // Dynamic styling based on urgency
                  const getActivityStyle = (level, dismissed) => {
                    if (dismissed) {
                      return 'p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600';
                    }
                    switch(level) {
                      case 'critical':
                        return 'p-4 bg-red-50 dark:bg-red-900 rounded-lg border-2 border-red-200';
                      case 'high':
                        return 'p-4 bg-orange-50 dark:bg-orange-900 rounded-lg border-2 border-orange-200';
                      default:
                        return 'p-4 bg-blue-50 dark:bg-blue-900 rounded-lg';
                    }
                  };
                  
                  return (
                    <div 
                      id={`activity-${lastConversation.id}`}
                      className={getActivityStyle(urgencyLevel, isDismissed)} 
                      style={{ position: 'relative' }}
                    >
                      {/* Date positioned horizontally with title */}
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2 flex-1">
                          {getActivityIcon(lastConversation.type)}
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            <TextWithMentions text={lastConversation.subject} adminUsers={adminUsers} />
                          </div>
                          
                          {/* Urgency indicators */}
                          {isUrgent && !isDismissed && (
                            <div className="flex items-center space-x-1">
                              {urgencyLevel === 'critical' && (
                                <>
                                  <ExclamationSolid className="h-4 w-4 text-red-600 dark:text-red-400" />
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300">
                                    AKUT
                                  </span>
                                </>
                              )}
                              {urgencyLevel === 'high' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300">
                                  PROBLEM
                                </span>
                              )}
                            </div>
                          )}
                          
                          {/* Dismissed indicator */}
                          {isDismissed && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:text-gray-400">
                              <CheckIcon className="h-3 w-3 mr-1" />
                              Löst
                            </span>
                          )}
                        </div>
                        
                        {/* Date aligned with title */}
                        <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                          {lastConversation.createdAt?.toDate?.()?.toLocaleDateString('sv-SE') || lastConversation.date || 'Idag'}
                        </span>
                      </div>
                      
                      {lastConversation.description && (
                        <p className="text-gray-700 dark:text-gray-300 mt-2">{lastConversation.description}</p>
                      )}
                      
                      {/* Bottom section with tags, user attribution, and buttons */}
                      <div className="flex justify-between items-end mt-3">
                        <div className="flex flex-col space-y-2">
                                                      {/* Show tags if any */}
                            {lastConversation.tags && lastConversation.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {lastConversation.tags
                                  .filter(tag => !tag.startsWith('@')) // Filter out @mention tags
                                  .map(tag => {
                                  // Only show business tags (no @mentions as tags)
                                  return (
                                    <span
                                      key={tag}
                                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                        tag === 'akut' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300' :
                                        tag === 'problem' ? 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300' :
                                        'bg-gray-100 text-gray-800'
                                      }`}
                                    >
                                      #{tag}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          
                          {/* User Attribution pill */}
                          <UserAttribution activity={lastConversation} isDismissed={isDismissed} />
                        </div>
                        
                        {/* Action buttons aligned with bottom */}
                        <div className="flex flex-col space-y-1">
                          {/* ZEN Inline Edit Button */}
                          {!isDismissed && (
                  <button
                              onClick={() => handleEditActivity(lastConversation)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:bg-blue-900 border border-blue-300 rounded transition-colors"
                              title="Redigera aktivitet"
                  >
                              <PencilIcon className="h-3 w-3 mr-1" />
                              Redigera
                  </button>
                          )}
                          
                          {/* Delete Button */}
                          {!isDismissed && (
                  <button
                              onClick={() => handleDeleteActivity(lastConversation.id)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-800 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900 dark:bg-red-900 border border-red-300 rounded transition-colors"
                              title="Ta bort aktivitet"
                  >
                              <TrashIcon className="h-3 w-3 mr-1" />
                              Ta bort
                  </button>
                          )}
                          
                          {/* Dismiss button for urgent activities */}
                          {isUrgent && !isDismissed && (
                  <button
                              onClick={() => dismissActivity(lastConversation.id)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded transition-colors"
                              title="Markera som löst"
                  >
                              <CheckIcon className="h-3 w-3 mr-1" />
                              Löst
                  </button>
                          )}
                </div>
                      </div>
                      
                      {/* ZEN Inline Editor */}
                      {editingActivity === lastConversation.id && (
                        <InlineActivityEditor
                          activity={lastConversation}
                          onSave={(editData) => handleSaveEdit(lastConversation.id, editData)}
                          onCancel={handleCancelEdit}
                          contactName={contact.companyName}
                        />
              )}
            </div>
                  );
                })()}
          </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <ChatBubbleLeftRightIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p>Ingen tidigare kontakt</p>
                <p className="text-sm">Detta blir er första kontakt!</p>
              </div>
            )}
        </div>

          {/* Conversation Context */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <PencilIcon className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
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
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  <p className="text-sm">Ring och hör hur det går!</p>
              </div>
              )}
              
              {/* General conversation tips */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 font-medium">Allmänna frågor:</p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                  <ClockIcon className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
                  Vad har hänt innan? ({allActivities.length} kontakter)
                </h3>
                <Link
                  to={`/admin/dining/activities?contact=${id}`}
                  className="text-blue-600 dark:text-blue-400 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
                >
                  Se alla →
                </Link>
                    </div>
              
              <div className="space-y-3">
                {recentActivities.map((activity, index) => {
                  const urgencyLevel = getUrgencyLevel(activity);
                  const isUrgent = isUrgentActivity(activity);
                  const isDismissed = dismissedActivities.has(activity.id) || activity.dismissed;
                  
                  // Dynamic styling for timeline activities
                  const getTimelineStyle = (level, dismissed) => {
                    if (dismissed) {
                      return 'flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600';
                    }
                    switch(level) {
                      case 'critical':
                        return 'flex items-start space-x-3 p-3 bg-red-50 dark:bg-red-900 rounded-lg border-2 border-red-200';
                      case 'high':
                        return 'flex items-start space-x-3 p-3 bg-orange-50 dark:bg-orange-900 rounded-lg border-2 border-orange-200';
                      default:
                        return 'flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg';
                    }
                  };
                  
                  return (
                    <div 
                      key={activity.id || index} 
                      id={`activity-${activity.id}`}
                      className={getTimelineStyle(urgencyLevel, isDismissed)}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getActivityIcon(activity.type)}
                    </div>
                      <div className="flex-1 min-w-0">
                        {/* Date aligned with title */}
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center space-x-2 flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              <TextWithMentions text={activity.subject || activity.notes} adminUsers={adminUsers} />
                  </div>

                            {/* Urgency indicators */}
                            {isUrgent && !isDismissed && (
                              <div className="flex items-center space-x-1">
                                {urgencyLevel === 'critical' && (
                                  <>
                                    <ExclamationSolid className="h-3 w-3 text-red-600 dark:text-red-400" />
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300">
                                      AKUT
                                    </span>
                                  </>
                                )}
                                {urgencyLevel === 'high' && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300">
                                    PROBLEM
                                  </span>
                                )}
                    </div>
                            )}
                            
                            {/* Dismissed indicator */}
                            {isDismissed && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:text-gray-400">
                                <CheckIcon className="h-3 w-3 mr-1" />
                                Löst
                              </span>
                            )}
                    </div>
                          
                          {/* Date aligned with title */}
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                            {activity.createdAt?.toDate?.()?.toLocaleDateString('sv-SE') || activity.date || 'Idag'}
                          </span>
                    </div>
                        
                        {activity.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
                            {activity.description}
                          </p>
                        )}
                        
                        {/* Bottom section with tags, user attribution, and buttons */}
                        <div className="flex justify-between items-end mt-2">
                          <div className="flex flex-col space-y-1">
                            {/* Show tags if any */}
                            {activity.tags && activity.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {activity.tags
                                  .filter(tag => !tag.startsWith('@')) // Filter out @mention tags
                                  .map(tag => {
                                  // Only show business tags (no @mentions as tags)
                                  return (
                                    <span
                                      key={tag}
                                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                        tag === 'akut' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300' :
                                        tag === 'problem' ? 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300' :
                                        'bg-gray-100 text-gray-800'
                                      }`}
                                    >
                                      #{tag}
                                    </span>
                                  );
                                })}
                  </div>
                            )}
                            
                            {/* User Attribution pill */}
                            <UserAttribution activity={activity} isDismissed={isDismissed} />
                </div>
                          
                          {/* Action buttons aligned with bottom */}
                          <div className="flex flex-col space-y-1">
                            {/* ZEN Edit Button */}
                            {!isDismissed && (
                              <button
                                onClick={() => handleEditActivity(activity)}
                                className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:bg-blue-900 border border-blue-300 rounded transition-colors"
                                title="Redigera"
                              >
                                <PencilIcon className="h-3 w-3" />
                              </button>
                            )}
                            
                            {/* Delete Button */}
                            {!isDismissed && (
                              <button
                                onClick={() => handleDeleteActivity(activity.id)}
                                className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-800 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900 dark:bg-red-900 border border-red-300 rounded transition-colors"
                                title="Ta bort"
                              >
                                <TrashIcon className="h-3 w-3" />
                              </button>
                            )}
                            
                            {/* Dismiss button for urgent activities */}
                            {isUrgent && !isDismissed && (
                              <button
                                onClick={() => dismissActivity(activity.id)}
                                className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded transition-colors"
                                title="Markera som löst"
                              >
                                <CheckIcon className="h-3 w-3 mr-0.5" />
                                Löst
                              </button>
                            )}
                        </div>
                      </div>
                      
                        {/* ZEN Inline Editor */}
                        {editingActivity === activity.id && (
                          <div className="mt-2">
                            <InlineActivityEditor
                              activity={activity}
                              onSave={(editData) => handleSaveEdit(activity.id, editData)}
                              onCancel={handleCancelEdit}
                              contactName={contact.companyName}
                            />
                        </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {allActivities.length > 4 && (
                  <div className="text-center py-3">
                    <Link
                      to={`/admin/dining/activities?contact=${id}`}
                      className="text-sm text-blue-600 dark:text-blue-400 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
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
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Vad hände? Registrera kontakt</h3>
          
          {/* Activity Type Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Typ av kontakt</label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {activityTypes.map((type) => {
                const IconComponent = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => handleActivityChange('type', type.value)}
                    className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-colors ${
                      newActivity.type === type.value
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900 text-orange-700'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <IconComponent className="h-5 w-5" />
                    <span className="text-sm font-medium">{type.label}</span>
                  </button>
                );
              })}
                          </div>
                        </div>

          {/* Subject/Summary with @mention support */}
          <div className="mb-4 relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Vad hände? (sammanfattning)
              {isAdmin && (
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">• Skriv @mic, @ken, @adm för att tagga kollegor</span>
              )}
            </label>
            
            <input
              ref={setMentionInputRef}
              type="text"
              value={newActivity.subject}
              onChange={(e) => handleActivityChange('subject', e.target.value)}
              onKeyDown={(e) => {
                if (showMentionDropdown) {
                  if (e.key === 'Tab' || e.key === 'Enter') {
                    e.preventDefault();
                    if (mentionOptions.length > 0) {
                      insertMention(mentionOptions[0]);
                    }
                  } else if (e.key === 'Escape') {
                    setShowMentionDropdown(false);
                  }
                }
              }}
              placeholder="T.ex. 'Intresserad av fler röda', 'Skickade prisförslag @micke', 'Bekräftade leverans'..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            
            {/* @mention dropdown */}
            {isAdmin && showMentionDropdown && mentionOptions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-20 max-h-32 overflow-y-auto">
                {mentionOptions.map((user, index) => (
                  <button
                    key={user.username}
                    onClick={() => insertMention(user)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 flex items-center border-b border-gray-100 last:border-b-0"
                  >
                    <UserBadge userName={user.fullName} size="sm" className="mr-2 me-0" />
                    <span className="text-gray-600 dark:text-gray-400 text-xs">@{user.username}</span>
                  </button>
                ))}
                <div className="px-3 py-1 text-xs text-gray-400 bg-gray-50 dark:bg-gray-700">
                  Tab eller Enter för att välja
                          </div>
                        </div>
                      )}
                  </div>

          {/* Tag System - Between Subject and Description */}
          {(suggestedTags.length > 0 || selectedTags.length > 0) && (
            <div className="mb-4">
              
              {/* Suggested Tags - Elegant and Subtle */}
              {suggestedTags.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      Föreslås:
                    </span>
                    <button
                      onClick={() => setSuggestedTags([])}
                      className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-400 transition-colors"
                    >
                      ignorera
                    </button>
                      </div>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => addTag(tag)}
                        className="inline-flex items-center bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 text-xs font-medium px-2.5 py-0.5 rounded-sm hover:bg-blue-200 transition-colors"
                      >
                        <span className="text-blue-600 dark:text-blue-400 mr-1">+</span>
                        #{tag}
                      </button>
                        ))}
                      </div>
                    </div>
                  )}

              {/* Selected Tags - Clean and Minimal */}
              {selectedTags.length > 0 && (
                <div className="mb-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1 block">
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
                          className="ml-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-800 transition-colors"
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
            <label className="block text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
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
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
            />
            
            {/* Autocomplete Dropdown */}
            {showAutocomplete && autocompleteOptions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-10 max-h-32 overflow-y-auto">
                {autocompleteOptions.map(tag => (
                  <button
                    key={tag}
                    onClick={() => selectAutocompleteOption(tag)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 flex items-center border-b border-gray-100 last:border-b-0"
                  >
                    <span className="text-gray-400 mr-1">#</span>
                    <span className="text-gray-700 dark:text-gray-300">{tag}</span>
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Detaljer (valfritt)
            </label>
            <textarea
              value={newActivity.description}
              onChange={(e) => handleActivityChange('description', e.target.value)}
              placeholder="Mer detaljerad beskrivning av vad som diskuterades..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
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

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Registrera alla typer av kontakt så du får en komplett historik över era interaktioner
          </p>
        </div>

        {/* Admin Document Modal */}
        {showAdminDocUpload && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FolderIcon className="h-8 w-8" />
                    <div>
                      <h2 className="text-2xl font-bold">Admin-dokument</h2>
                      <p className="text-orange-100">{contact.companyName}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAdminDocUpload(false)}
                    className="text-white hover:bg-white dark:bg-gray-800 hover:bg-opacity-20 p-2 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
                
                {/* Upload Section */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Ladda upp dokument</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Kategori
                      </label>
                      <select
                        value={adminDocCategory}
                        onChange={(e) => setAdminDocCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        {adminDocCategories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Anteckningar (valfritt)
                      </label>
                      <textarea
                        value={adminDocNotes}
                        onChange={(e) => setAdminDocNotes(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Interna anteckningar om dokumentet..."
                      />
                  </div>
                  
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Fil
                      </label>
                    <input
                        type="file"
                        onChange={(e) => setAdminDocFile(e.target.files[0])}
                        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp,.svg"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                      {adminDocFile && (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          Vald fil: {adminDocFile.name} ({formatFileSize(adminDocFile.size)})
                        </p>
                      )}
                  </div>
                  
                    <div className="flex justify-end space-x-3">
                    <button
                        onClick={() => setShowAdminDocUpload(false)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 transition-colors"
                    >
                        Avbryt
                    </button>
                    <button
                        onClick={handleAdminDocUpload}
                        disabled={!adminDocFile || adminDocUploading}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
                      >
                        {adminDocUploading ? 'Laddar upp...' : 'Ladda upp'}
                    </button>
                  </div>
                  </div>
                </div>

                {/* Documents List */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Befintliga dokument ({adminDocuments.length})
                  </h3>
                  
                  {adminDocsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                      <span className="ml-3 text-gray-600 dark:text-gray-400">Laddar dokument...</span>
                    </div>
                  ) : adminDocuments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <FolderIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p>Inga admin-dokument uppladdade än</p>
                  </div>
                ) : (
                    <div className="space-y-3">
                      {adminDocuments.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <DocumentTextIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">{doc.fileName}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {doc.category} • {formatFileSize(doc.fileSize)}
                              </p>
                              {doc.notes && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{doc.notes}</p>
                        )}
                      </div>
                    </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => window.open(doc.downloadUrl, '_blank')}
                              className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:bg-blue-900 p-2 rounded-lg transition-colors"
                              title="Visa"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => window.open(doc.downloadUrl, '_blank')}
                              className="text-green-600 dark:text-green-400 hover:bg-green-50 p-2 rounded-lg transition-colors"
                              title="Ladda ner"
                            >
                              <ArrowDownTrayIcon className="h-4 w-4" />
                            </button>
                <button
                              onClick={() => handleDeleteAdminDoc(doc.id, doc.fileName)}
                              className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 dark:bg-red-900 p-2 rounded-lg transition-colors"
                              title="Ta bort"
                >
                              <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
                      ))}
                </div>
                  )}
                </div>
                </div>
              </div>
            </div>
        )}

        {/* ✏️ CONTACT EDIT MODAL */}
        {isEditingContact && (
          <div className="fixed inset-0 bg-gray-600 dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                  <PencilIcon className="h-5 w-5 text-orange-600 dark:text-orange-400 mr-2" />
                  Redigera Kontaktinformation
                </h3>
                <button
                  onClick={handleCancelContactEdit}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-400"
                >
                  <span className="sr-only">Stäng</span>
                  ×
                </button>
              </div>
              
              <form className="space-y-6" onSubmit={(e) => {
                e.preventDefault();
                handleSaveContact();
              }}>
                {/* Company Information */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Företagsinformation</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Företagsnamn</label>
                      <input
                        type="text"
                        value={editingContactData.companyName}
                        onChange={(e) => setEditingContactData({ ...editingContactData, companyName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Företagsnamn"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kontaktperson</label>
                      <input
                        type="text"
                        value={editingContactData.contactPerson}
                        onChange={(e) => setEditingContactData({ ...editingContactData, contactPerson: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Kontaktperson"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Kontaktuppgifter</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefon</label>
                      <input
                        type="tel"
                        value={editingContactData.phone}
                        onChange={(e) => setEditingContactData({ ...editingContactData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Telefonnummer"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-post</label>
                      <input
                        type="email"
                        value={editingContactData.email}
                        onChange={(e) => setEditingContactData({ ...editingContactData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-orange-500 focus:border-orange-500"
                        placeholder="E-postadress"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Webbsida</label>
                    <input
                      type="url"
                      value={editingContactData.website}
                      onChange={(e) => setEditingContactData({ ...editingContactData, website: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-orange-500 focus:border-orange-500"
                      placeholder="https://www.example.com"
                    />
                  </div>
                </div>

                {/* Address Information */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Adressinformation</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Adress</label>
                      <input
                        type="text"
                        value={editingContactData.address}
                        onChange={(e) => setEditingContactData({ ...editingContactData, address: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Gatuadress"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Postnummer</label>
                        <input
                          type="text"
                          value={editingContactData.postalCode}
                          onChange={(e) => setEditingContactData({ ...editingContactData, postalCode: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-orange-500 focus:border-orange-500"
                          placeholder="Postnummer"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ort</label>
                        <input
                          type="text"
                          value={editingContactData.city}
                          onChange={(e) => setEditingContactData({ ...editingContactData, city: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-orange-500 focus:border-orange-500"
                          placeholder="Ort"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Land</label>
                        <input
                          type="text"
                          value={editingContactData.country}
                          onChange={(e) => setEditingContactData({ ...editingContactData, country: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-orange-500 focus:border-orange-500"
                          placeholder="Land"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* CRM Information */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">CRM-information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                      <select
                        value={editingContactData.status}
                        onChange={(e) => setEditingContactData({ ...editingContactData, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-orange-500 focus:border-orange-500"
                      >
                        {/* New status options - prioritized */}
                        <option value="ej_kontaktad">Ej kontaktad</option>
                        <option value="kontaktad">Kontaktad</option>
                        <option value="dialog">Dialog</option>
                        <option value="af">ÅF</option>
                        <option value="closed">Stängd</option>
                        
                        {/* Legacy status options - for backward compatibility */}
                        <option value="prospect">Reservering</option>
                        <option value="active">Stamgäst</option>
                        <option value="inactive">Inaktiv</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prioritet</label>
                      <select
                        value={editingContactData.priority}
                        onChange={(e) => setEditingContactData({ ...editingContactData, priority: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="low">Låg</option>
                        <option value="medium">Medium</option>
                        <option value="high">Hög</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Källa</label>
                      <select
                        value={editingContactData.source}
                        onChange={(e) => setEditingContactData({ ...editingContactData, source: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="ai">AI</option>
                        <option value="manual">Manuell</option>
                        <option value="website">Webbsida</option>
                        <option value="phone">Telefonsamtal</option>
                        <option value="email">E-post</option>
                        <option value="referral">Rekommendation</option>
                        <option value="marketing">Marknadsföring</option>
                        <option value="cold_call">Cold call</option>
                        <option value="event">Event</option>
                        <option value="other">Annat</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* B2B Information */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">B2B-information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Marginal (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editingContactData.marginal}
                        onChange={(e) => setEditingContactData({ ...editingContactData, marginal: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-orange-500 focus:border-orange-500"
                        placeholder="35"
                      />
                    </div>
                    <div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={editingContactData.sameAsCompanyAddress}
                          onChange={(e) => setEditingContactData({ ...editingContactData, sameAsCompanyAddress: e.target.checked })}
                          className="rounded border-gray-300 dark:border-gray-600 text-orange-600 dark:text-orange-400 focus:border-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Samma leveransadress som företagsadress</span>
                      </label>
                    </div>
                  </div>
                  
                  {!editingContactData.sameAsCompanyAddress && (
                    <div className="mt-4">
                      <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Leveransadress</h5>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Leveransadress</label>
                          <input
                            type="text"
                            value={editingContactData.deliveryAddress}
                            onChange={(e) => setEditingContactData({ ...editingContactData, deliveryAddress: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-orange-500 focus:border-orange-500"
                            placeholder="Leveransadress"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Postnummer</label>
                            <input
                              type="text"
                              value={editingContactData.deliveryPostalCode}
                              onChange={(e) => setEditingContactData({ ...editingContactData, deliveryPostalCode: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-orange-500 focus:border-orange-500"
                              placeholder="Postnummer"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ort</label>
                            <input
                              type="text"
                              value={editingContactData.deliveryCity}
                              onChange={(e) => setEditingContactData({ ...editingContactData, deliveryCity: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-orange-500 focus:border-orange-500"
                              placeholder="Ort"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Land</label>
                            <input
                              type="text"
                              value={editingContactData.deliveryCountry}
                              onChange={(e) => setEditingContactData({ ...editingContactData, deliveryCountry: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-orange-500 focus:border-orange-500"
                              placeholder="Land"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional Information */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Ytterligare information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Organisationsnummer</label>
                      <input
                        type="text"
                        value={editingContactData.orgNumber}
                        onChange={(e) => setEditingContactData({ ...editingContactData, orgNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Organisationsnummer"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Anteckningar</label>
                        {editingContactData.website && (
                          <button
                            type="button"
                            onClick={handleScrapeWebsiteMeta}
                            disabled={metaScraping}
                            className="flex items-center space-x-1 text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Hämta META beskrivning från webbsidan"
                          >
                            {metaScraping ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b border-orange-600"></div>
                                <span>Hämtar...</span>
                              </>
                            ) : (
                              <>
                                <GlobeAltIcon className="h-3 w-3" />
                                <span>Hämta META</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      <textarea
                        value={editingContactData.notes}
                        onChange={(e) => setEditingContactData({ ...editingContactData, notes: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Interna anteckningar om kontakten"
                      />
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Taggar</h4>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newContactTag}
                        onChange={(e) => setNewContactTag(e.target.value)}
                        onKeyPress={handleContactTagKeyPress}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Lägg till tagg..."
                      />
                      <button
                        type="button"
                        onClick={handleAddContactTag}
                        className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                      >
                        Lägg till
                      </button>
                    </div>

                    {editingContactTags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {editingContactTags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300"
                          >
                            #{tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveContactTag(tag)}
                              className="ml-2 text-orange-600 dark:text-orange-400 hover:text-orange-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <button
                    type="button"
                    onClick={handleCancelContactEdit}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingContact}
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
                  >
                    {isSavingContact ? 'Sparar...' : 'Spara Ändringar'}
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

export default ContactDetail; 