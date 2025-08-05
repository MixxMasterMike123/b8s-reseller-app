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
    console.log('🍽️ Setting up Firebase subscription to users collection...');
    setLoading(true);
    
    // Use users collection - simplified query to avoid index requirement
    const contactsRef = collection(db, 'users');
    // Remove complex query that requires index - filter in memory instead
    const q = query(contactsRef);
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        console.log('🍽️ Firebase snapshot received:', {
          size: snapshot.size,
          empty: snapshot.empty,
          docs: snapshot.docs.length
        });
        
        const contactsData = snapshot.docs
          .map(doc => {
            const data = doc.data();
            console.log('🍽️ Contact loaded:', { id: doc.id, companyName: data.companyName });
            
            // Safe date handling to prevent getTime errors
            const safeDate = (dateValue) => {
              if (!dateValue) return new Date();
              if (dateValue instanceof Date) return dateValue;
              if (dateValue.toDate && typeof dateValue.toDate === 'function') {
                return dateValue.toDate(); // Firestore Timestamp
              }
              if (typeof dateValue === 'string') {
                const parsed = new Date(dateValue);
                return isNaN(parsed.getTime()) ? new Date() : parsed;
              }
              return new Date();
            };
            
            // Map B2B fields to CRM format and add CRM defaults
            return {
              id: doc.id,
              ...data,
              // Map B2B active status to CRM status
              status: data.status || (data.active ? 'active' : 'prospect'),
              // Add CRM defaults if not present
              priority: data.priority || 'medium',
              source: data.source || 'b2b-existing',
              tags: data.tags || [],
              notes: data.notes || '',
              lastActivityAt: safeDate(data.lastActivityAt || data.updatedAt),
              updatedAt: safeDate(data.updatedAt),
              createdAt: safeDate(data.createdAt),
              // Keep original B2B fields
              phoneNumber: data.phone || data.phoneNumber, // Handle both field names
            };
          })
          .filter(contact => contact.role !== 'admin') // Filter out admins in memory
          .sort((a, b) => {
            try {
              // Safe sorting with fallback dates
              const aTime = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date().getTime();
              const bTime = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date().getTime();
              
              // Additional safety check
              if (isNaN(aTime) || isNaN(bTime)) {
                return 0;
              }
              
              return bTime - aTime;
            } catch (error) {
              console.warn('Contact sort error:', error);
              return 0;
            }
          }); // Sort by updatedAt desc
        
        console.log('🍽️ Total contacts loaded (excluding admins):', contactsData.length);
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
      
      const now = new Date();
      const newContact = {
        ...contactData,
        // B2B required fields
        role: 'user',
        active: contactData.status === 'active',
        marginal: contactData.marginal || 35,
        // CRM fields
        status: contactData.status || 'prospect',
        priority: contactData.priority || 'medium',
        source: contactData.source || 'manual',
        tags: contactData.tags || [],
        notes: contactData.notes || '',
        lastActivityAt: now,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };

      const docRef = await addDoc(collection(db, 'users'), newContact);
      
      // ✅ No sync needed - using unified users collection
      
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
      
      const contactRef = doc(db, 'users', contactId);
      const now = new Date();
      const updatedData = {
        ...updates,
        // Sync CRM status to B2B active field
        ...(updates.status && { active: updates.status === 'active' }),
        // Update activity timestamp
        lastActivityAt: now,
        updatedAt: now.toISOString()
      };

      await updateDoc(contactRef, updatedData);
      
      // ✅ No sync needed - using unified users collection
      
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

  // 🎯 NEW: Activate contact (Convert prospect to active B2B customer)
  const activateContact = useCallback(async (contactId) => {
    try {
      setLoading(true);
      
      const contactRef = doc(db, 'users', contactId);
      const now = new Date();
      const activationData = {
        active: true,          // 🔥 CRITICAL: Makes them appear in B2B Admin
        status: 'active',      // Updates CRM status too
        lastActivityAt: now,
        updatedAt: now.toISOString()
      };

      await updateDoc(contactRef, activationData);
      
      toast.success('🍽️ Kontakt aktiverad som B2B-kund! Nu synlig i kundhantering.');
      return true;
    } catch (error) {
      console.error('Error activating contact:', error);
      toast.error('Kunde inte aktivera kontakt');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete contact (Remove guest)
  const deleteContact = useCallback(async (contactId) => {
    try {
      setLoading(true);
      
      await deleteDoc(doc(db, 'users', contactId));
      
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
        contact.email?.toLowerCase().includes(searchTerm) ||
        contact.phone?.toLowerCase().includes(searchTerm) ||
        contact.website?.toLowerCase().includes(searchTerm) ||
        contact.notes?.toLowerCase().includes(searchTerm) ||
        // 🏷️ NEW: Search in tags array
        (contact.tags && contact.tags.some(tag => 
          tag.toLowerCase().includes(searchTerm)
        ))
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(contact => 
        filters.tags.some(tag => contact.tags?.includes(tag))
      );
    }

    return filtered;
  }, [contacts]);

  // Get all unique tags from all contacts for autocomplete
  const getAllTags = useCallback(() => {
    const allTags = new Set();
    
    contacts.forEach(contact => {
      if (contact.tags && Array.isArray(contact.tags)) {
        contact.tags.forEach(tag => {
          if (tag && typeof tag === 'string' && tag.trim()) {
            allTags.add(tag.toLowerCase().trim());
          }
        });
      }
    });
    
    return Array.from(allTags).sort();
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
    activateContact,   // 🎯 NEW: Convert prospect to active B2B customer
    getContact,
    
    // Utilities
    filterContacts,
    getContactStats,
    getCountries,
    getAllTags,
    getTags,
    
    // State management
    setError,
    refreshContacts: () => {
      // Force refresh if needed
      setLoading(true);
    }
  };
}; 