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
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import {
  PhoneIcon as PhoneSolid,
  ChatBubbleLeftRightIcon as ChatSolid
} from '@heroicons/react/24/solid';

const DiningDashboard = () => {
  const { contacts, loading: contactsLoading } = useDiningContacts();
  const { activities, getRecentActivities, loading: activitiesLoading } = useDiningActivities();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredContacts, setFilteredContacts] = useState([]);

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

  // Get today's follow-ups (simplified)
  const getTodaysFollowUps = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Get contacts that need follow-up (mock logic for now)
    return contacts
      .filter(contact => contact.status === 'prospect' || contact.priority === 'high')
      .slice(0, 4)
      .map(contact => ({
        id: contact.id,
        name: contact.companyName,
        person: contact.contactPerson,
        action: contact.priority === 'high' ? 'Ring idag' : 'Följ upp',
        priority: contact.priority || 'medium'
      }));
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

  const todaysFollowUps = getTodaysFollowUps();
  const recentConversations = getRecentConversations();
  const loading = contactsLoading || activitiesLoading;

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
              {todaysFollowUps.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <PhoneIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p>Inga uppföljningar idag</p>
                  <p className="text-sm">Bra jobbat!</p>
                </div>
              ) : (
                todaysFollowUps.map(followUp => (
                  <Link
                    key={followUp.id}
                    to={`/admin/dining/contacts/${followUp.id}`}
                    className="block p-4 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{followUp.name}</div>
                        {followUp.person && (
                          <div className="text-sm text-gray-600">{followUp.person}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${
                          followUp.priority === 'high' ? 'text-red-600' : 'text-orange-600'
                        }`}>
                          {followUp.action}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
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