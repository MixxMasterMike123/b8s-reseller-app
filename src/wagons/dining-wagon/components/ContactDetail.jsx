import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import AppLayout from '../../../components/layout/AppLayout';
import { useDiningContacts } from '../hooks/useDiningContacts';
import { useDiningActivities } from '../hooks/useDiningActivities';
import DocumentCenter from './DocumentCenter';
import {
  ArrowLeftIcon,
  UserIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  CalendarDaysIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  TagIcon,
  StarIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import {
  StarIcon as StarSolid,
  ExclamationTriangleIcon as ExclamationTriangleSolid
} from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

const ContactDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { contacts, getContact, updateContact, loading: contactLoading, hasInitialized } = useDiningContacts();
  const { getActivitiesByContact, addActivity, loading: activityLoading } = useDiningActivities();
  
  const [contact, setContact] = useState(null);
  const [activities, setActivities] = useState([]);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [showDocumentCenter, setShowDocumentCenter] = useState(false);
  
  // New activity form
  const [newActivity, setNewActivity] = useState({
    type: 'call',
    subject: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Load contact data (wait for contacts to load first)
  useEffect(() => {
    console.log('🍽️ ContactDetail Effect:', { 
      id, 
      contactLoading, 
      hasInitialized,
      contactsCount: contacts.length,
      contactIds: contacts.map(c => c.id),
      allContactNames: contacts.map(c => c.companyName)
    });
    
    if (id) {
      if (!hasInitialized) {
        console.log('🍽️ Firebase hasn\'t responded yet, waiting...');
        return;
      }
      
      console.log('🍽️ Looking for contact with ID:', id);
      const contactData = getContact(id);
      console.log('🍽️ Found contact:', contactData ? contactData.companyName : 'NONE');
      
      if (contactData) {
        console.log('✅ Contact found, setting data');
        setContact(contactData);
        setEditData(contactData);
      } else {
        // Only show error if Firebase has responded (hasInitialized = true)
        // but we still can't find the specific contact
        console.error('❌ Contact not found after Firebase response:', { 
          searchId: id, 
          availableContacts: contacts.map(c => ({ id: c.id, name: c.companyName })),
          contactsCount: contacts.length, 
          hasInitialized,
          contactLoading 
        });
        toast.error('Gäst kunde inte hittas');
        navigate('/admin/dining/contacts');
      }
    }
  }, [id, contacts, getContact, navigate, hasInitialized]);

  // Load activities for this contact
  useEffect(() => {
    if (id) {
      const contactActivities = getActivitiesByContact(id);
      setActivities(contactActivities);
    }
  }, [id, getActivitiesByContact]);

  // Handle edit form changes
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Save contact edits
  const handleSaveEdit = async () => {
    try {
      await updateContact(id, editData);
      setContact(editData);
      setIsEditing(false);
      toast.success('🍽️ Gästinformation uppdaterad');
    } catch (error) {
      console.error('Error updating contact:', error);
      toast.error('Kunde inte uppdatera gästinformation');
    }
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditData(contact);
    setIsEditing(false);
  };

  // Handle new activity form
  const handleActivityChange = (e) => {
    const { name, value } = e.target;
    setNewActivity(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Add new activity
  const handleAddActivity = async (e) => {
    e.preventDefault();
    
    if (!newActivity.subject.trim()) {
      toast.error('Ämne är obligatoriskt');
      return;
    }

    try {
      await addActivity({
        ...newActivity,
        contactId: id,
        contactName: contact.companyName,
        createdAt: new Date()
      });
      
      setNewActivity({
        type: 'call',
        subject: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      setShowAddActivity(false);
      
      // Reload activities
      const updatedActivities = getActivitiesByContact(id);
      setActivities(updatedActivities);
      
      toast.success('🍽️ Ny service registrerad');
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error('Kunde inte lägga till aktivitet');
    }
  };

  // Status badge
  const getStatusBadge = (status) => {
    const styles = {
      prospect: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      active: 'bg-green-100 text-green-800 border-green-200',
      inactive: 'bg-gray-100 text-gray-800 border-gray-200',
      closed: 'bg-red-100 text-red-800 border-red-200'
    };
    
    const labels = {
      prospect: 'Reservering',
      active: 'Stamgäst',
      inactive: 'Inaktiv',
      closed: 'Stängd'
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${styles[status] || styles.inactive}`}>
        {labels[status] || status}
      </span>
    );
  };

  // Priority icon
  const getPriorityIcon = (priority) => {
    if (priority === 'high') {
      return <ExclamationTriangleSolid className="h-5 w-5 text-red-500" title="Hög prioritet" />;
    }
    if (priority === 'medium') {
      return <StarIcon className="h-5 w-5 text-yellow-500" title="Medium prioritet" />;
    }
    return <StarIcon className="h-5 w-5 text-gray-400" title="Låg prioritet" />;
  };

  // Activity type icon
  const getActivityIcon = (type) => {
    switch (type) {
      case 'call':
        return <PhoneIcon className="h-5 w-5 text-blue-600" />;
      case 'email':
        return <EnvelopeIcon className="h-5 w-5 text-green-600" />;
      case 'meeting':
        return <CalendarDaysIcon className="h-5 w-5 text-purple-600" />;
      case 'note':
        return <DocumentTextIcon className="h-5 w-5 text-gray-600" />;
      default:
        return <ChatBubbleLeftRightIcon className="h-5 w-5 text-orange-600" />;
    }
  };

  if (!hasInitialized || !contact) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <span className="ml-3 text-lg text-gray-600">Laddar gästinformation...</span>
        </div>
      </AppLayout>
    );
  }

  return (
    <>
      <AppLayout>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link 
                to="/admin/dining/contacts" 
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </Link>
              <div className="flex items-center">
                <div className="bg-orange-100 p-3 rounded-xl mr-4">
                  <UserIcon className="h-8 w-8 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-1">{contact.companyName}</h1>
                  <p className="text-gray-600">Gästprofil och servicehistorik</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => setShowDocumentCenter(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
                  >
                    <FolderIcon className="h-5 w-5" />
                    <span>Dokument</span>
                  </button>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
                  >
                    <PencilIcon className="h-5 w-5" />
                    <span>Redigera</span>
                  </button>
                </>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Avbryt
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
                  >
                    <CheckCircleIcon className="h-5 w-5" />
                    <span>Spara</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Information */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <BuildingOfficeIcon className="h-6 w-6 text-orange-600 mr-2" />
                  Gästinformation
                </h2>
                <div className="flex items-center space-x-3">
                  {getStatusBadge(contact.status)}
                  {getPriorityIcon(contact.priority)}
                </div>
              </div>

              {isEditing ? (
                // Edit Form
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Företagsnamn</label>
                      <input
                        type="text"
                        name="companyName"
                        value={editData.companyName || ''}
                        onChange={handleEditChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Kontaktperson</label>
                      <input
                        type="text"
                        name="contactPerson"
                        value={editData.contactPerson || ''}
                        onChange={handleEditChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">E-post</label>
                      <input
                        type="email"
                        name="email"
                        value={editData.email || ''}
                        onChange={handleEditChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                      <input
                        type="tel"
                        name="phone"
                        value={editData.phone || ''}
                        onChange={handleEditChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select
                        name="status"
                        value={editData.status || 'prospect'}
                        onChange={handleEditChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="prospect">Reservering</option>
                        <option value="active">Stamgäst</option>
                        <option value="inactive">Inaktiv</option>
                        <option value="closed">Stängd</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Prioritet</label>
                      <select
                        name="priority"
                        value={editData.priority || 'medium'}
                        onChange={handleEditChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="low">Låg</option>
                        <option value="medium">Medium</option>
                        <option value="high">Hög (VIP)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Land</label>
                      <input
                        type="text"
                        name="country"
                        value={editData.country || ''}
                        onChange={handleEditChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                // Display Mode
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <UserIcon className="h-5 w-5 text-gray-600" />
                        <div>
                          <p className="text-sm text-gray-600">Kontaktperson</p>
                          <p className="font-semibold text-gray-900">{contact.contactPerson}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <EnvelopeIcon className="h-5 w-5 text-gray-600" />
                        <div>
                          <p className="text-sm text-gray-600">E-post</p>
                          <a href={`mailto:${contact.email}`} className="font-semibold text-blue-600 hover:text-blue-700">
                            {contact.email}
                          </a>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <PhoneIcon className="h-5 w-5 text-gray-600" />
                        <div>
                          <p className="text-sm text-gray-600">Telefon</p>
                          <a href={`tel:${contact.phone}`} className="font-semibold text-blue-600 hover:text-blue-700">
                            {contact.phone}
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {contact.website && (
                        <div className="flex items-center space-x-3">
                          <GlobeAltIcon className="h-5 w-5 text-gray-600" />
                          <div>
                            <p className="text-sm text-gray-600">Webbplats</p>
                            <a href={contact.website} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 hover:text-blue-700">
                              {contact.website}
                            </a>
                          </div>
                        </div>
                      )}
                      
                      {(contact.address || contact.city) && (
                        <div className="flex items-start space-x-3">
                          <MapPinIcon className="h-5 w-5 text-gray-600 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-600">Adress</p>
                            <div className="font-semibold text-gray-900">
                              {contact.address && <p>{contact.address}</p>}
                              {contact.city && <p>{contact.postalCode} {contact.city}</p>}
                              {contact.country && <p>{contact.country}</p>}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  {contact.tags && contact.tags.length > 0 && (
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <TagIcon className="h-5 w-5 text-gray-600" />
                        <span className="text-sm text-gray-600">Taggar</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {contact.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {contact.notes && (
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <DocumentTextIcon className="h-5 w-5 text-gray-600" />
                        <span className="text-sm text-gray-600">Anteckningar</span>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-gray-900">{contact.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Activities */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <ClockIcon className="h-6 w-6 text-orange-600 mr-2" />
                  Servicehistorik
                </h2>
                <button
                  onClick={() => setShowAddActivity(!showAddActivity)}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>Ny Service</span>
                </button>
              </div>

              {/* Add Activity Form */}
              {showAddActivity && (
                <form onSubmit={handleAddActivity} className="bg-gray-50 p-6 rounded-lg mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Typ av service</label>
                      <select
                        name="type"
                        value={newActivity.type}
                        onChange={handleActivityChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="call">Telefonsamtal</option>
                        <option value="email">E-post</option>
                        <option value="meeting">Möte/Middag</option>
                        <option value="note">Anteckning</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Datum</label>
                      <input
                        type="date"
                        name="date"
                        value={newActivity.date}
                        onChange={handleActivityChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ämne</label>
                    <input
                      type="text"
                      name="subject"
                      value={newActivity.subject}
                      onChange={handleActivityChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Kort beskrivning av servicen..."
                      required
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Beskrivning</label>
                    <textarea
                      name="description"
                      value={newActivity.description}
                      onChange={handleActivityChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Detaljerad beskrivning..."
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={activityLoading}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {activityLoading ? 'Sparar...' : 'Lägg till Service'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddActivity(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Avbryt
                    </button>
                  </div>
                </form>
              )}

              {/* Activities List */}
              <div className="space-y-4">
                {activities.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <ClockIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>Ingen servicehistorik registrerad ännu</p>
                    <p className="text-sm">Börja dokumentera interaktioner med denna gäst</p>
                  </div>
                ) : (
                  activities.map((activity, index) => (
                    <div key={activity.id || index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 mt-1">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-900">{activity.subject}</p>
                          <span className="text-sm text-gray-500">
                            {activity.date || activity.createdAt?.toDate?.()?.toLocaleDateString('sv-SE') || 'Idag'}
                          </span>
                        </div>
                        {activity.description && (
                          <p className="text-gray-600 mt-1">{activity.description}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Snabbåtgärder</h3>
              <div className="space-y-3">
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center space-x-3 p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <PhoneIcon className="h-5 w-5" />
                  <span>Ring gäst</span>
                </a>
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center space-x-3 p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <EnvelopeIcon className="h-5 w-5" />
                  <span>Skicka e-post</span>
                </a>
                <button
                  onClick={() => setShowAddActivity(true)}
                  className="w-full flex items-center space-x-3 p-3 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>Lägg till service</span>
                </button>
              </div>
            </div>

            {/* Guest Stats */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Gäststatistik</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Totala interaktioner</span>
                  <span className="font-semibold text-gray-900">{activities.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Medlem sedan</span>
                  <span className="font-semibold text-gray-900">
                    {contact.createdAt?.toDate?.()?.toLocaleDateString('sv-SE') || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Senast uppdaterad</span>
                  <span className="font-semibold text-gray-900">
                    {contact.updatedAt?.toDate?.()?.toLocaleDateString('sv-SE') || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>

    {/* Document Center Modal */}
    <DocumentCenter
      contactId={contact?.id}
      contactName={contact?.companyName}
      isOpen={showDocumentCenter}
      onClose={() => setShowDocumentCenter(false)}
    />
    </>
  );
};

export default ContactDetail; 