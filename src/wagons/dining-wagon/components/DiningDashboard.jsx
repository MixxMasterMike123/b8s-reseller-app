import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../../components/layout/AppLayout';
import { useDiningContacts } from '../hooks/useDiningContacts';
import { useDiningActivities } from '../hooks/useDiningActivities';
import B2BImportButton from './B2BImportButton';
import {
  MagnifyingGlassIcon,
  UserPlusIcon,
  PhoneIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  FireIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import {
  PhoneIcon as PhoneSolid,
  ChatBubbleLeftRightIcon as ChatSolid,
  ExclamationTriangleIcon as ExclamationSolid,
  FireIcon as FireSolid,
  BellIcon as BellSolid
} from '@heroicons/react/24/solid';

const DiningDashboard = () => {
  const { contacts, loading: contactsLoading } = useDiningContacts();
  const { activities, getRecentActivities, loading: activitiesLoading } = useDiningActivities();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [deferredContacts, setDeferredContacts] = useState(new Map()); // Map: contactId -> {timestamp, originalUrgency}
  const [showDeferred, setShowDeferred] = useState(false);

  // Filter contacts based on search
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = contacts.filter(contact => 
        contact.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredContacts(filtered.slice(0, 5)); // Show max 5 results
    } else {
      setFilteredContacts([]);
    }
  }, [searchQuery, contacts]);

  // Swedish business hours respect
  const isSwedishBusinessHours = () => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Monday-Friday, 8:00-17:00 Swedish time
    return day >= 1 && day <= 5 && hour >= 8 && hour <= 17;
  };

  // Advanced trigger scoring system
  const calculateTriggerScore = (contact, contactActivities) => {
    let score = 0;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    if (!contactActivities || contactActivities.length === 0) {
      // New contact with no activities
      return { score: 15, reason: 'Ny kontakt', urgency: 'medium' };
    }

    const latestActivity = contactActivities[0];
    const allTags = contactActivities.flatMap(activity => activity.tags || []);
    const daysSinceLastContact = Math.floor((today - (latestActivity.createdAt?.toDate?.() || new Date())) / (1000 * 60 * 60 * 24));

    // 🔥 URGENCY TRIGGERS (High Priority)
    
    // Date-based triggers - highest priority
    allTags.forEach(tag => {
      if (tag.includes('-')) { // Date tag format: weekday-YYYY-MM-DD
        const tagDate = tag.split('-').slice(1).join('-'); // Extract date part
        if (tagDate === todayStr) {
          score += 50;
          return { score: score + 50, reason: `Ring idag (${tag})`, urgency: 'high' };
        } else if (tagDate < todayStr) {
          score += 40;
          return { score: score + 40, reason: `Försenad uppföljning (${tag})`, urgency: 'high' };
        } else if (tagDate === new Date(today.getTime() + 24*60*60*1000).toISOString().split('T')[0]) {
          score += 25;
          return { score: score + 25, reason: `Förbered för imorgon (${tag})`, urgency: 'medium' };
        }
      }
    });

    // Critical business tags - but only if not dismissed
    const activeAkutActivities = contactActivities.filter(activity => 
      activity.tags?.includes('akut') && !activity.dismissed
    );
    const activeProblemActivities = contactActivities.filter(activity => 
      activity.tags?.includes('problem') && !activity.dismissed
    );
    
    if (activeAkutActivities.length > 0) {
      return { score: 100, reason: 'AKUT - Ring nu!', urgency: 'critical' };
    }
    
    if (activeProblemActivities.length > 0) {
      const problemScore = 25 + (daysSinceLastContact * 5); // Escalates over time
      if (problemScore >= 40) {
        return { score: problemScore, reason: 'Problem eskalerar', urgency: 'high' };
      }
      score += problemScore;
    }

    // Enhanced #ringabak logic - priority on set day OR after couple days if no date
    if (allTags.includes('ringabak')) {
      const hasDateTag = allTags.some(tag => tag.includes('-') && tag.split('-').length === 3);
      
      if (hasDateTag) {
        // If date tag exists, use existing date logic above
        score += 30;
      } else {
        // No date tag - escalate after 2 days
        if (daysSinceLastContact >= 2) {
          return { score: 45, reason: 'Ringabak - Nu är det dags!', urgency: 'high' };
        } else {
          score += 30;
        }
      }
      
      return { score, reason: 'Lovade ringa tillbaka', urgency: 'medium' };
    }

    // 🎯 OPPORTUNITY TRIGGERS (Medium Priority)
    
    if (allTags.includes('hett')) {
      const heatScore = Math.max(35 - (daysSinceLastContact * 3), 15); // Cools over time
      score += heatScore;
      if (heatScore > 25) {
        return { score, reason: 'Het prospect - slå till!', urgency: 'medium' };
      }
    }

    // ⏰ TIME-BASED TRIGGERS (Lower Priority)
    
    // VIP customer silence
    if (contact.priority === 'high' && daysSinceLastContact >= 7) {
      score += 25;
      return { score, reason: `VIP-kund: ${daysSinceLastContact} dagar tystnad`, urgency: 'medium' };
    }
    
    // Regular customer maintenance
    if (contact.status === 'active' && daysSinceLastContact >= 21) {
      score += 15;
      return { score, reason: `Befintlig kund: ${daysSinceLastContact} dagar sedan`, urgency: 'low' };
    }
    
    // New prospect follow-up
    if (contact.status === 'prospect' && daysSinceLastContact >= 3) {
      score += 20;
      return { score, reason: `Ny prospect: ${daysSinceLastContact} dagar sedan`, urgency: 'medium' };
    }

    return { score, reason: 'Allmän uppföljning', urgency: 'low' };
  };

  // Smart trigger-based follow-ups
  const getTodaysFollowUps = () => {
    if (!isSwedishBusinessHours() && activities.length > 0) {
      // Outside business hours - only show critical items that are NOT dismissed
      const criticalActivities = activities.filter(activity => 
        (activity.tags?.includes('akut') || activity.tags?.includes('problem')) && 
        !activity.dismissed
      );
      
      if (criticalActivities.length === 0) {
        return []; // Respect work-life balance
      }
    }

    // Get all contacts with their activities
    const contactTriggers = contacts.map(contact => {
      const contactActivities = activities
        .filter(activity => activity.contactId === contact.id)
        .sort((a, b) => (b.createdAt?.toDate?.() || new Date(b.date)) - (a.createdAt?.toDate?.() || new Date(a.date)));
      
      const triggerData = calculateTriggerScore(contact, contactActivities);
      
      return {
        id: contact.id,
        name: contact.companyName,
        person: contact.contactPerson,
        ...triggerData,
        contact,
        activities: contactActivities
      };
    })
    .filter(item => item.score >= 15) // Minimum threshold
    .sort((a, b) => {
      // Sort by urgency first, then score
      const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      }
      return b.score - a.score;
    });

    return contactTriggers;
  };

  // Get recent conversations (simplified and grouped by contact)
  const getRecentConversations = () => {
    const recentActivities = getRecentActivities(20); // Get more to group properly
    
    // Group activities by contact
    const groupedByContact = {};
    recentActivities.forEach(activity => {
      const contactKey = activity.contactId || activity.contactName;
      if (!groupedByContact[contactKey]) {
        groupedByContact[contactKey] = {
          contactId: activity.contactId,
          contactName: activity.contactName,
          activities: []
        };
      }
      groupedByContact[contactKey].activities.push(activity);
    });
    
    // Convert to array and show most recent activity per contact
    return Object.values(groupedByContact)
      .map(group => {
        const mostRecent = group.activities[0]; // First is most recent
        return {
          id: mostRecent.id,
          contactId: group.contactId,
          contact: group.contactName,
          note: mostRecent.subject || mostRecent.notes,
          when: mostRecent.createdAt?.toDate?.()?.toLocaleDateString('sv-SE') || 'Idag',
          activityCount: group.activities.length
        };
      })
      .slice(0, 6); // Show max 6 different contacts
  };

  // Smart re-surfacing logic - CRM intelligence
  const shouldResurface = (contactId, trigger) => {
    const deferInfo = deferredContacts.get(contactId);
    if (!deferInfo) return false;
    
    const now = new Date();
    const timeSinceDefer = now - deferInfo.timestamp;
    const hoursDeferred = timeSinceDefer / (1000 * 60 * 60);
    
    // OVERRIDE DEFER: Critical events that force re-surfacing
    if (trigger.urgency === 'critical') return true; // AKUT always surfaces
    if (trigger.urgency === 'high' && hoursDeferred > 2) return true; // Problems escalate quickly
    
    // TIME-BASED RE-SURFACING: Based on original urgency and Swedish work patterns
    if (trigger.urgency === 'medium' && hoursDeferred > 24) return true; // Next business day
    if (trigger.urgency === 'low' && hoursDeferred > 72) return true; // After 3 days
    
    // EVENT-BASED RE-SURFACING: New activity on this contact
    const contactActivities = activities
      .filter(activity => activity.contactId === contactId)
      .sort((a, b) => (b.createdAt?.toDate?.() || new Date(b.date)) - (a.createdAt?.toDate?.() || new Date(a.date)));
    
    if (contactActivities.length > 0) {
      const latestActivity = contactActivities[0];
      const activityTime = latestActivity.createdAt?.toDate?.() || new Date(latestActivity.date);
      if (activityTime > deferInfo.timestamp) return true; // New activity since defer
    }
    
    return false;
  };

  // Apply smart re-surfacing in useEffect to avoid state updates during render
  useEffect(() => {
    const allTriggers = getTodaysFollowUps();
    const resurfacedContacts = new Map(deferredContacts);
    let hasChanges = false;
    
    allTriggers.forEach(trigger => {
      if (deferredContacts.has(trigger.id) && shouldResurface(trigger.id, trigger)) {
        resurfacedContacts.delete(trigger.id);
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      setDeferredContacts(resurfacedContacts);
    }
  }, [activities, contacts, deferredContacts]);

  // Split triggers for display
  const allTriggers = getTodaysFollowUps();
  const availableTriggers = allTriggers.filter(trigger => !deferredContacts.has(trigger.id));
  const todaysFollowUps = availableTriggers.slice(0, 3); // Swedish Lagom: max 3 primary items
  const deferredTriggers = allTriggers.filter(trigger => deferredContacts.has(trigger.id));
  
  const recentConversations = getRecentConversations();
  const loading = contactsLoading || activitiesLoading;

  // Strategic relationship timing function (not task postponement!)
  const handleDeferContact = (contactId, urgency) => {
    const newDeferred = new Map(deferredContacts);
    newDeferred.set(contactId, {
      timestamp: new Date(),
      originalUrgency: urgency
    });
    setDeferredContacts(newDeferred);
  };

  // Bring contact back to focus
  const handleUndeferContact = (contactId) => {
    const newDeferred = new Map(deferredContacts);
    newDeferred.delete(contactId);
    setDeferredContacts(newDeferred);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <span className="ml-3 text-gray-600">Laddar...</span>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
        
        {/* Main Question & Search */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Vem ska jag prata med?
          </h1>
          <p className="text-gray-600 mb-4">Sök kontakt eller se vem du bör kontakta idag</p>
          
          {/* Second Key Question */}
          <h2 className="text-2xl font-semibold text-gray-700 mb-6">
            Vad hände senast?
          </h2>
          
          {/* Search Bar */}
          <div className="relative max-w-lg mx-auto mb-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-4 border border-gray-300 rounded-xl text-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Sök efter företag eller person..."
            />
            
            {/* Search Results Dropdown */}
            {filteredContacts.length > 0 && (
              <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                {filteredContacts.map(contact => (
                  <Link
                    key={contact.id}
                    to={`/admin/dining/contacts/${contact.id}`}
                    className="block px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    onClick={() => setSearchQuery('')}
                  >
                    <div className="font-medium text-gray-900">{contact.companyName}</div>
                    <div className="text-sm text-gray-600">{contact.contactPerson}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          
          {/* Add New Contact Button */}
          <Link
            to="/admin/dining/contacts/new"
            className="inline-flex items-center px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-xl transition-colors space-x-2"
          >
            <UserPlusIcon className="h-5 w-5" />
            <span>Lägg till ny kontakt</span>
          </Link>
        </div>

        {/* Two Main Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Today's Follow-ups */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <PhoneSolid className="h-5 w-5 text-orange-600 mr-2" />
                Du bör ringa
              </h2>
              <Link
                to="/admin/dining/follow-ups"
                className="text-orange-600 hover:text-orange-700 text-sm font-medium flex items-center"
              >
                Visa alla
                <ArrowRightIcon className="h-4 w-4 ml-1" />
              </Link>
            </div>
            
            <div className="space-y-3">
              {!isSwedishBusinessHours() && todaysFollowUps.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <ClockIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p>Vila gott!</p>
                  <p className="text-sm">Inga akuta ärenden - återkom under kontorstid</p>
                  <p className="text-xs text-gray-400 mt-1">Mån-Fre 08:00-17:00</p>
                </div>
              )}
              
              {isSwedishBusinessHours() && todaysFollowUps.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <PhoneIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p>Inga uppföljningar idag</p>
                  <p className="text-sm">Bra jobbat!</p>
                </div>
              )}
              
              {todaysFollowUps.map(followUp => {
                // Dynamic styling based on urgency
                const getUrgencyStyle = (urgency) => {
                  switch(urgency) {
                    case 'critical':
                      return {
                        border: 'border-red-400 bg-red-50',
                        hover: 'hover:border-red-500 hover:bg-red-100',
                        text: 'text-red-800',
                        badge: 'bg-red-100 text-red-800',
                        IconComponent: ExclamationSolid,
                        iconColor: 'text-red-600'
                      };
                    case 'high':
                      return {
                        border: 'border-orange-200 bg-orange-50',
                        hover: 'hover:border-orange-300 hover:bg-orange-100',
                        text: 'text-orange-700',
                        badge: 'bg-orange-100 text-orange-700',
                        IconComponent: FireSolid,
                        iconColor: 'text-orange-500'
                      };
                    case 'medium':
                      return {
                        border: 'border-blue-200 bg-blue-50',
                        hover: 'hover:border-blue-300 hover:bg-blue-100',
                        text: 'text-blue-700',
                        badge: 'bg-blue-100 text-blue-700',
                        IconComponent: BellSolid,
                        iconColor: 'text-blue-500'
                      };
                    default:
                      return {
                        border: 'border-gray-200',
                        hover: 'hover:border-gray-300 hover:bg-gray-50',
                        text: 'text-gray-700',
                        badge: 'bg-gray-100 text-gray-800',
                        IconComponent: ChatBubbleLeftRightIcon,
                        iconColor: 'text-gray-600'
                      };
                  }
                };
                
                const style = getUrgencyStyle(followUp.urgency);
                const isCritical = followUp.urgency === 'critical' || followUp.urgency === 'high';
                
                return (
                  <div key={followUp.id} className={`p-4 rounded-lg border ${style.border} transition-colors`}>
                    <div className="flex items-center justify-between">
                      <Link
                        to={`/admin/dining/contacts/${followUp.id}`}
                        className={`flex-1 ${style.hover} rounded-md p-2 -m-2`}
                      >
                        <div className="flex items-center space-x-2">
                          <div className="font-medium text-gray-900">{followUp.name}</div>
                          {followUp.urgency === 'critical' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              AKUT
                            </span>
                          )}
                        </div>
                        {followUp.person && (
                          <div className="text-sm text-gray-600">{followUp.person}</div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          {followUp.reason}
                        </div>
                      </Link>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <style.IconComponent className={`h-6 w-6 ${style.iconColor}`} />
                        
                                              {/* Individual defer button for non-critical activities */}
                      {!isCritical && (
                        <button
                          onClick={() => handleDeferContact(followUp.id, followUp.urgency)}
                          className="text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
                          title="Hantera senare - aktiviteten återkommer automatiskt vid bättre tillfälle"
                        >
                          Senare
                        </button>
                      )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Deferred items section */}
              {(deferredTriggers.length > 0 || availableTriggers.length > 3) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  {availableTriggers.length > 3 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Övriga aktiviteter som behöver uppföljning:</h4>
                      <div className="space-y-1 mb-3">
                        {availableTriggers.slice(3).map(trigger => (
                          <div key={trigger.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                            <Link
                              to={`/admin/dining/contacts/${trigger.id}`}
                              className="flex-1 hover:bg-gray-100 rounded p-1 -m-1"
                            >
                              <span className="font-medium">{trigger.name}</span> • {trigger.reason}
                            </Link>
                            <div className="flex items-center space-x-2 ml-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                trigger.urgency === 'critical' ? 'bg-red-100 text-red-800' :
                                trigger.urgency === 'high' ? 'bg-orange-100 text-orange-700' :
                                trigger.urgency === 'medium' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {trigger.urgency === 'critical' ? 'Kritisk' :
                                 trigger.urgency === 'high' ? 'Hög' : 
                                 trigger.urgency === 'medium' ? 'Medium' : 'Låg'}
                              </span>
                              {trigger.urgency !== 'critical' && (
                                <button
                                  onClick={() => handleDeferContact(trigger.id, trigger.urgency)}
                                  className="text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
                                  title="Hantera senare - aktiviteten återkommer automatiskt vid bättre tillfälle"
                                >
                                  Senare
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                                                       {deferredTriggers.length > 0 && (
                    <button
                      onClick={() => setShowDeferred(!showDeferred)}
                      className="w-full text-center py-2 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      {showDeferred ? 'Dölj' : 'Visa'} uppskjutna aktiviteter ({deferredTriggers.length})
                    </button>
                  )}
                 </div>
               )}
               
               {/* Show deferred activities when expanded */}
               {showDeferred && deferredTriggers.length > 0 && (
                 <div className="mt-4 space-y-2 bg-blue-50 rounded-lg p-4">
                   <h4 className="text-sm font-medium text-gray-700 mb-2">Uppskjutna aktiviteter - återkommer automatiskt</h4>
                   <p className="text-xs text-gray-600 mb-3">Dessa aktiviteter återkommer automatiskt vid bättre tillfälle baserat på prioritet och aktivitet.</p>
                   {deferredTriggers.map(followUp => {
                     const deferInfo = deferredContacts.get(followUp.id);
                     const timeSinceDefer = deferInfo ? Math.floor((new Date() - deferInfo.timestamp) / (1000 * 60 * 60)) : 0;
                     
                     return (
                       <div key={followUp.id} className="flex items-center justify-between p-3 bg-white rounded border border-gray-200">
                         <Link
                           to={`/admin/dining/contacts/${followUp.id}`}
                           className="flex-1 hover:bg-gray-50 rounded p-1 -m-1"
                         >
                           <div className="font-medium text-gray-900">{followUp.name}</div>
                           <div className="text-xs text-gray-500">{followUp.reason}</div>
                           <div className="text-xs text-blue-600 mt-1">
                             Uppskjuten sedan {timeSinceDefer}h • Återkommer automatiskt vid bättre tillfälle
                           </div>
                         </Link>
                         <button
                           onClick={() => handleUndeferContact(followUp.id)}
                           className="text-xs text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded transition-colors ml-2"
                           title="Ta upp aktiviteten nu istället för att vänta"
                         >
                           Ta upp nu
                         </button>
                       </div>
                     );
                   })}
                 </div>
               )}
            </div>
          </div>

          {/* Recent Conversations */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <ChatSolid className="h-5 w-5 text-blue-600 mr-2" />
                Senaste aktivitet
              </h2>
              <Link
                to="/admin/dining/activities"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
              >
                Visa alla
                <ArrowRightIcon className="h-4 w-4 ml-1" />
              </Link>
            </div>
            
            <div className="space-y-3">
              {recentConversations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ChatBubbleLeftRightIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p>Inga aktiviteter registrerade</p>
                  <p className="text-sm">Lägg till aktiviteter för att se dem här</p>
                </div>
              ) : (
                recentConversations.map((conversation, index) => (
                  <Link
                    key={conversation.id || index}
                    to={`/admin/dining/contacts/${conversation.contactId}`}
                    className="block p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <div className="font-medium text-gray-900">{conversation.contact}</div>
                          {conversation.activityCount > 1 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {conversation.activityCount} aktiviteter
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                          "{conversation.note}"
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 ml-3 flex-shrink-0">
                        {conversation.when}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions Footer */}
        <div className="mt-12 text-center">
          <div className="flex items-center justify-center space-x-6">
            <Link
              to="/admin/dining/contacts"
              className="text-gray-600 hover:text-gray-900 font-medium flex items-center space-x-1"
            >
              <span>Alla kontakter</span>
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <span className="text-gray-300">•</span>
            <Link
              to="/admin/dining/activities/new"
              className="text-gray-600 hover:text-gray-900 font-medium flex items-center space-x-1"
            >
              <span>Registrera samtal</span>
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <span className="text-gray-300">•</span>
            <B2BImportButton />
          </div>
        </div>

      </div>
    </AppLayout>
  );
};

export default DiningDashboard; 