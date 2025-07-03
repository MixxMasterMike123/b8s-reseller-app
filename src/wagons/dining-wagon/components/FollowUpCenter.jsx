import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../../components/layout/AppLayout';
import { useDiningContacts } from '../hooks/useDiningContacts';
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  ClockIcon,
  PhoneIcon,
  EnvelopeIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
  VideoCameraIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import {
  CalendarDaysIcon as CalendarDaysSolid,
  ExclamationTriangleIcon as ExclamationTriangleSolid,
  ClockIcon as ClockSolid
} from '@heroicons/react/24/solid';
import { db } from '../../../firebase/config';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import toast from 'react-hot-toast';

const FollowUpCenter = () => {
  const { contacts, loading: contactsLoading } = useDiningContacts();
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState(null);
  
  // New follow-up form
  const [newFollowUp, setNewFollowUp] = useState({
    contactId: '',
    type: 'call',
    subject: '',
    description: '',
    scheduledDate: '',
    scheduledTime: '',
    duration: 30,
    location: '',
    status: 'scheduled',
    priority: 'medium',
    reminderMinutes: 15
  });

  // Load follow-ups from Firebase
  useEffect(() => {
    setLoading(true);
    
    // Use 'followUps' collection for fresh start
    const followUpsRef = collection(db, 'followUps');
    let q;
    
    if (selectedFilter === 'overdue') {
      const now = new Date();
      q = query(
        followUpsRef,
        where('scheduledDateTime', '<', now),
        where('status', '==', 'scheduled'),
        orderBy('scheduledDateTime', 'asc')
      );
    } else if (selectedFilter === 'today') {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      q = query(
        followUpsRef,
        where('scheduledDateTime', '>=', today),
        where('scheduledDateTime', '<', tomorrow),
        orderBy('scheduledDateTime', 'asc')
      );
    } else if (selectedFilter === 'thisWeek') {
      const today = new Date();
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      
      q = query(
        followUpsRef,
        where('scheduledDateTime', '>=', today),
        where('scheduledDateTime', '<', weekFromNow),
        orderBy('scheduledDateTime', 'asc')
      );
    } else {
      q = query(
        followUpsRef,
        orderBy('scheduledDateTime', 'asc')
      );
    }
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const followUpsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setFollowUps(followUpsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching follow-ups:', error);
        toast.error('Kunde inte ladda uppföljningar');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [selectedFilter]);

  // Handle form changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewFollowUp(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Add new follow-up
  const handleAddFollowUp = async (e) => {
    e.preventDefault();
    
    if (!newFollowUp.contactId || !newFollowUp.subject || !newFollowUp.scheduledDate || !newFollowUp.scheduledTime) {
      toast.error('Fyll i alla obligatoriska fält');
      return;
    }

    try {
      // Combine date and time
      const scheduledDateTime = new Date(`${newFollowUp.scheduledDate}T${newFollowUp.scheduledTime}`);
      
      // Find contact info
      const contact = contacts.find(c => c.id === newFollowUp.contactId);
      
      const followUpData = {
        ...newFollowUp,
        scheduledDateTime,
        contactName: contact?.companyName || 'Okänd gäst',
        contactPerson: contact?.contactPerson || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, 'followUps'), followUpData);
      
      // Reset form
      setNewFollowUp({
        contactId: '',
        type: 'call',
        subject: '',
        description: '',
        scheduledDate: '',
        scheduledTime: '',
        duration: 30,
        location: '',
        status: 'scheduled',
        priority: 'medium',
        reminderMinutes: 15
      });
      
      setShowAddForm(false);
      toast.success('🗓️ Uppföljning schemalagd!');
    } catch (error) {
      console.error('Error adding follow-up:', error);
      toast.error('Kunde inte schemalägga uppföljning');
    }
  };

  // Update follow-up status
  const updateFollowUpStatus = async (followUpId, newStatus) => {
    try {
      await updateDoc(doc(db, 'followUps', followUpId), {
        status: newStatus,
        updatedAt: new Date(),
        ...(newStatus === 'completed' && { completedAt: new Date() })
      });
      
      toast.success('🍽️ Uppföljning uppdaterad');
    } catch (error) {
      console.error('Error updating follow-up:', error);
      toast.error('Kunde inte uppdatera uppföljning');
    }
  };

  // Delete follow-up
  const handleDeleteFollowUp = async (followUpId) => {
    if (!confirm('Är du säker på att du vill ta bort denna uppföljning?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'followUps', followUpId));
      toast.success('🍽️ Uppföljning borttagen');
    } catch (error) {
      console.error('Error deleting follow-up:', error);
      toast.error('Kunde inte ta bort uppföljning');
    }
  };

  // Get follow-up type icon
  const getFollowUpIcon = (type) => {
    const icons = {
      call: PhoneIcon,
      email: EnvelopeIcon,
      meeting: CalendarDaysIcon,
      video: VideoCameraIcon,
      visit: MapPinIcon
    };
    
    const IconComponent = icons[type] || CalendarDaysIcon;
    return <IconComponent className="h-5 w-5" />;
  };

  // Get status badge
  const getStatusBadge = (status, scheduledDateTime) => {
    const now = new Date();
    const isOverdue = scheduledDateTime < now && status === 'scheduled';
    
    const styles = {
      scheduled: isOverdue 
        ? 'bg-red-100 text-red-800 border-red-200' 
        : 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
      rescheduled: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    
    const labels = {
      scheduled: isOverdue ? 'Försenad' : 'Schemalagd',
      completed: 'Genomförd',
      cancelled: 'Avbruten',
      rescheduled: 'Omschemalagd'
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.scheduled}`}>
        {isOverdue && status === 'scheduled' && <ExclamationTriangleSolid className="h-3 w-3 mr-1" />}
        {labels[status] || status}
      </span>
    );
  };

  // Get priority indicator
  const getPriorityColor = (priority) => {
    const colors = {
      low: 'border-l-gray-400',
      medium: 'border-l-blue-400',
      high: 'border-l-red-400'
    };
    return colors[priority] || colors.medium;
  };

  // Calculate stats
  const stats = {
    total: followUps.length,
    overdue: followUps.filter(f => f.scheduledDateTime?.toDate() < new Date() && f.status === 'scheduled').length,
    today: followUps.filter(f => {
      const today = new Date();
      const followUpDate = f.scheduledDateTime?.toDate();
      return followUpDate && 
             followUpDate.toDateString() === today.toDateString() &&
             f.status === 'scheduled';
    }).length,
    thisWeek: followUps.filter(f => {
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const followUpDate = f.scheduledDateTime?.toDate();
      return followUpDate && 
             followUpDate >= now && 
             followUpDate < weekFromNow &&
             f.status === 'scheduled';
    }).length
  };

  if (contactsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <span className="ml-3 text-lg text-gray-600">Laddar kontakter...</span>
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
              <Link 
                to="/admin/dining" 
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </Link>
              <div className="flex items-center">
                <div className="bg-orange-100 p-3 rounded-xl mr-4">
                  <CalendarDaysSolid className="h-8 w-8 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-1">Uppföljningskalender</h1>
                  <p className="text-gray-600">Schemalägg och hantera gästmöten</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Ny Uppföljning</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Totalt</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <CalendarDaysSolid className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Försenade</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              </div>
              <ExclamationTriangleSolid className="h-8 w-8 text-red-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Idag</p>
                <p className="text-2xl font-bold text-orange-600">{stats.today}</p>
              </div>
              <ClockSolid className="h-8 w-8 text-orange-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Denna vecka</p>
                <p className="text-2xl font-bold text-green-600">{stats.thisWeek}</p>
              </div>
              <UserGroupIcon className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center space-x-4 overflow-x-auto">
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Filtrera:</span>
            {[
              { key: 'all', label: 'Alla', count: stats.total },
              { key: 'overdue', label: 'Försenade', count: stats.overdue },
              { key: 'today', label: 'Idag', count: stats.today },
              { key: 'thisWeek', label: 'Denna vecka', count: stats.thisWeek }
            ].map(filter => (
              <button
                key={filter.key}
                onClick={() => setSelectedFilter(filter.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedFilter === filter.key
                    ? 'bg-orange-100 text-orange-700 border border-orange-200'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>
        </div>

        {/* Add Follow-Up Form */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Ny Uppföljning</h2>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleAddFollowUp} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gäst *</label>
                    <select
                      name="contactId"
                      value={newFollowUp.contactId}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    >
                      <option value="">Välj gäst...</option>
                      {contacts.map(contact => (
                        <option key={contact.id} value={contact.id}>
                          {contact.companyName} - {contact.contactPerson}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Typ *</label>
                    <select
                      name="type"
                      value={newFollowUp.type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="call">Telefonsamtal</option>
                      <option value="email">E-post</option>
                      <option value="meeting">Fysiskt möte</option>
                      <option value="video">Videomöte</option>
                      <option value="visit">Kundbesök</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ämne *</label>
                  <input
                    type="text"
                    name="subject"
                    value={newFollowUp.subject}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="T.ex. Produktdemo, Kontraktsdiskussion..."
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Datum *</label>
                    <input
                      type="date"
                      name="scheduledDate"
                      value={newFollowUp.scheduledDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tid *</label>
                    <input
                      type="time"
                      name="scheduledTime"
                      value={newFollowUp.scheduledTime}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Varaktighet (min)</label>
                    <select
                      name="duration"
                      value={newFollowUp.duration}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>1 timme</option>
                      <option value={90}>1.5 timme</option>
                      <option value={120}>2 timmar</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Prioritet</label>
                    <select
                      name="priority"
                      value={newFollowUp.priority}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="low">Låg</option>
                      <option value="medium">Medium</option>
                      <option value="high">Hög</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Påminnelse</label>
                    <select
                      name="reminderMinutes"
                      value={newFollowUp.reminderMinutes}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value={0}>Ingen påminnelse</option>
                      <option value={15}>15 minuter innan</option>
                      <option value={30}>30 minuter innan</option>
                      <option value={60}>1 timme innan</option>
                      <option value={1440}>1 dag innan</option>
                    </select>
                  </div>
                </div>

                {(newFollowUp.type === 'meeting' || newFollowUp.type === 'visit') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Plats</label>
                    <input
                      type="text"
                      name="location"
                      value={newFollowUp.location}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Kontor, restaurang, kundlokal..."
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Beskrivning</label>
                  <textarea
                    name="description"
                    value={newFollowUp.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Agenda, mål, förberedelser..."
                  />
                </div>

                <div className="flex space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Schemalägga
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Avbryt
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Follow-ups List */}
        <div className="bg-white rounded-xl shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
              <span className="ml-3 text-gray-600">Laddar uppföljningar...</span>
            </div>
          ) : followUps.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDaysIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">Inga uppföljningar ännu</p>
              <p className="text-gray-600 mb-6">Schemalägg ditt första gästmöte för att komma igång</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Lägg till uppföljning
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {followUps.map((followUp) => {
                const scheduledDate = followUp.scheduledDateTime?.toDate();
                const isOverdue = scheduledDate < new Date() && followUp.status === 'scheduled';
                
                return (
                  <div
                    key={followUp.id}
                    className={`p-6 hover:bg-gray-50 transition-colors border-l-4 ${getPriorityColor(followUp.priority)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className={`p-2 rounded-lg ${
                          isOverdue ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {getFollowUpIcon(followUp.type)}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {followUp.subject}
                            </h3>
                            {getStatusBadge(followUp.status, scheduledDate)}
                          </div>
                          
                          <p className="text-gray-600 mb-2">
                            <Link 
                              to={`/admin/dining/contacts/${followUp.contactId}`}
                              className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                              {followUp.contactName}
                            </Link>
                            {followUp.contactPerson && ` - ${followUp.contactPerson}`}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                            <span className="flex items-center">
                              <CalendarDaysIcon className="h-4 w-4 mr-1" />
                              {scheduledDate?.toLocaleDateString('sv-SE')}
                            </span>
                            <span className="flex items-center">
                              <ClockIcon className="h-4 w-4 mr-1" />
                              {scheduledDate?.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span>{followUp.duration} min</span>
                            {followUp.location && (
                              <span className="flex items-center">
                                <MapPinIcon className="h-4 w-4 mr-1" />
                                {followUp.location}
                              </span>
                            )}
                          </div>
                          
                          {followUp.description && (
                            <p className="text-gray-600 text-sm">
                              {followUp.description}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {followUp.status === 'scheduled' && (
                          <>
                            <button
                              onClick={() => updateFollowUpStatus(followUp.id, 'completed')}
                              className="text-green-600 hover:bg-green-50 p-2 rounded-lg transition-colors"
                              title="Markera som genomförd"
                            >
                              <CheckCircleIcon className="h-5 w-5" />
                            </button>
                            
                            <button
                              onClick={() => setEditingFollowUp(followUp)}
                              className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                              title="Redigera"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                          </>
                        )}
                        
                        <button
                          onClick={() => handleDeleteFollowUp(followUp.id)}
                          className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                          title="Ta bort"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default FollowUpCenter; 