import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where,
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import toast from 'react-hot-toast';

export const useDiningContacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true); // Start as true
  const [error, setError] = useState(null);
  const [hasInitialized, setHasInitialized] = useState(false); // Track if Firebase has responded

  // Real-time contact subscription
  useEffect(() => {
    console.log('🍽️ Setting up Firebase subscription...');
    setLoading(true);
    
    const contactsRef = collection(db, 'diningContacts');
    const q = query(contactsRef, orderBy('updatedAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        console.log('🍽️ Firebase snapshot received:', {
          size: snapshot.size,
          empty: snapshot.empty,
          docs: snapshot.docs.length
        });
        
        const contactsData = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log('🍽️ Contact loaded:', { id: doc.id, companyName: data.companyName });
          return {
            id: doc.id,
            ...data
          };
        });
        
        console.log('🍽️ Total contacts loaded:', contactsData.length);
        setContacts(contactsData);
        setLoading(false);
        setHasInitialized(true); // Mark as initialized after first Firebase response
      },
      (error) => {
        console.error('❌ Firebase error fetching contacts:', error);
        setError('Kunde inte ladda kontakter');
        setLoading(false);
        setHasInitialized(true); // Mark as initialized even on error
        toast.error('Kunde inte ladda gästlistan');
      }
    );

    return () => unsubscribe();
  }, []);

  // Create new contact (Add new guest to restaurant)
  const addContact = useCallback(async (contactData) => {
    try {
      setLoading(true);
      
      const newContact = {
        ...contactData,
        status: contactData.status || 'prospect',
        priority: contactData.priority || 'medium',
        source: contactData.source || 'manual',
        tags: contactData.tags || [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'diningContacts'), newContact);
      
      // 🤝 Auto-sync CRM update to B2B (for new contacts)
      try {
        const { autoSyncCRMUpdate } = await import('../../../utils/contactSync');
        await autoSyncCRMUpdate(docRef.id, newContact);
      } catch (error) {
        console.error('Auto-sync CRM update failed (contact creation successful):', error);
      }
      
      toast.success(`🍽️ Ny gäst tillagd: ${contactData.companyName}`);
      return docRef.id;
    } catch (error) {
      console.error('Error adding contact:', error);
      toast.error('Kunde inte lägga till gäst');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update existing contact (Update guest information)
  const updateContact = useCallback(async (contactId, updates) => {
    try {
      setLoading(true);
      
      const contactRef = doc(db, 'diningContacts', contactId);
      const updatedData = {
        ...updates,
        updatedAt: new Date()
      };

      await updateDoc(contactRef, updatedData);
      
      // 🤝 Auto-sync CRM update to B2B
      try {
        const { autoSyncCRMUpdate } = await import('../../../utils/contactSync');
        await autoSyncCRMUpdate(contactId, updates);
      } catch (error) {
        console.error('Auto-sync CRM update failed (contact update successful):', error);
      }
      
      toast.success('🍽️ Gästinformation uppdaterad');
      return true;
    } catch (error) {
      console.error('Error updating contact:', error);
      toast.error('Kunde inte uppdatera gästinformation');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete contact (Remove guest)
  const deleteContact = useCallback(async (contactId) => {
    try {
      setLoading(true);
      
      await deleteDoc(doc(db, 'diningContacts', contactId));
      
      toast.success('🍽️ Gäst borttagen från listan');
      return true;
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('Kunde inte ta bort gäst');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get contact by ID
  const getContact = useCallback((contactId) => {
    return contacts.find(contact => contact.id === contactId);
  }, [contacts]);

  // Filter and search utilities
  const filterContacts = useCallback((filters) => {
    let filtered = [...contacts];

    if (filters.status) {
      filtered = filtered.filter(contact => contact.status === filters.status);
    }

    if (filters.country) {
      filtered = filtered.filter(contact => contact.country === filters.country);
    }

    if (filters.priority) {
      filtered = filtered.filter(contact => contact.priority === filters.priority);
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(contact => 
        contact.companyName?.toLowerCase().includes(searchTerm) ||
        contact.contactPerson?.toLowerCase().includes(searchTerm) ||
        contact.email?.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(contact => 
        filters.tags.some(tag => contact.tags?.includes(tag))
      );
    }

    return filtered;
  }, [contacts]);

  // Statistics for dashboard
  const getContactStats = useCallback(() => {
    const stats = {
      total: contacts.length,
      prospects: contacts.filter(c => c.status === 'prospect').length,
      active: contacts.filter(c => c.status === 'active').length,
      inactive: contacts.filter(c => c.status === 'inactive').length,
      closed: contacts.filter(c => c.status === 'closed').length,
      highPriority: contacts.filter(c => c.priority === 'high').length
    };

    // Restaurant terminology
    stats.reservations = stats.prospects; // Reservations
    stats.regularGuests = stats.active; // Regular guests
    stats.specialGuests = stats.highPriority; // VIP guests

    return stats;
  }, [contacts]);

  // Get unique countries for filtering
  const getCountries = useCallback(() => {
    const countries = [...new Set(contacts.map(c => c.country).filter(Boolean))];
    return countries.sort();
  }, [contacts]);

  // Get unique tags for filtering
  const getTags = useCallback(() => {
    const allTags = contacts.flatMap(c => c.tags || []);
    return [...new Set(allTags)].sort();
  }, [contacts]);

  return {
    // Data
    contacts,
    loading,
    error,
    hasInitialized, // Export the initialization state
    
    // CRUD operations
    addContact,
    updateContact,
    deleteContact,
    getContact,
    
    // Utilities
    filterContacts,
    getContactStats,
    getCountries,
    getTags,
    
    // State management
    setError,
    refreshContacts: () => {
      // Force refresh if needed
      setLoading(true);
    }
  };
}; 