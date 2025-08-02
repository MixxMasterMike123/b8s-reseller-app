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

export const useAmbassadorContacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Real-time ambassador contact subscription
  useEffect(() => {
    console.log('👑 Setting up Firebase subscription to ambassadorContacts collection...');
    setLoading(true);
    
    // 🎯 NEW: Use same affiliates collection as Affiliate Admin
    const contactsRef = collection(db, 'affiliates');
    // 🎯 NEW: Show ALL affiliates (both regular affiliates and ambassadors) like Dining Wagon shows all B2B customers
    const q = query(contactsRef, orderBy('updatedAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        console.log('👑 Firebase snapshot received:', {
          size: snapshot.size,
          empty: snapshot.empty,
          docs: snapshot.docs.length
        });
        
        const contactsData = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log('👑 Ambassador contact loaded:', { id: doc.id, name: data.name });
          
          // Safe date handling
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

          // Calculate total followers across all platforms
          const calculateTotalFollowers = (platforms) => {
            if (!platforms) return 0;
            return Object.values(platforms).reduce((total, platform) => {
              return total + (platform.followers || platform.subscribers || 0);
            }, 0);
          };

          // Determine influencer tier based on highest platform
          const determineInfluencerTier = (platforms) => {
            if (!platforms) return 'nano';
            
            const maxFollowers = Math.max(
              ...Object.values(platforms).map(p => p.followers || p.subscribers || 0)
            );
            
            if (maxFollowers >= 1000000) return 'mega';
            if (maxFollowers >= 100000) return 'macro'; 
            if (maxFollowers >= 10000) return 'micro';
            return 'nano';
          };

          return {
            id: doc.id,
            ...data,
            // Add calculated fields
            totalFollowers: calculateTotalFollowers(data.platforms),
            influencerTier: data.influencerTier || determineInfluencerTier(data.platforms),
            // Safe date fields
            lastActivityAt: safeDate(data.lastActivityAt || data.updatedAt),
            updatedAt: safeDate(data.updatedAt),
            createdAt: safeDate(data.createdAt),
            lastContactedAt: safeDate(data.lastContactedAt)
          };
        });
        
        console.log('👑 Total ambassador contacts loaded:', contactsData.length);
        setContacts(contactsData);
        setLoading(false);
        setHasInitialized(true);
      },
      (error) => {
        console.error('❌ Firebase error fetching ambassador contacts:', error);
        setError('Kunde inte ladda ambassadör-kontakter');
        setLoading(false);
        setHasInitialized(true);
        toast.error('Kunde inte ladda ambassadör-listan');
      }
    );

    return () => unsubscribe();
  }, []);

  // Create new ambassador contact
  const addContact = useCallback(async (contactData) => {
    try {
      setLoading(true);
      
      const now = new Date();
      
      // Calculate influencer tier from platforms
      const determineInfluencerTier = (platforms) => {
        if (!platforms) return 'nano';
        
        const maxFollowers = Math.max(
          ...Object.values(platforms).map(p => p.followers || p.subscribers || 0)
        );
        
        if (maxFollowers >= 1000000) return 'mega';
        if (maxFollowers >= 100000) return 'macro'; 
        if (maxFollowers >= 10000) return 'micro';
        return 'nano';
      };

      const newContact = {
        // Basic info
        name: contactData.name || '',
        email: contactData.email || '',
        phone: contactData.phone || '',
        
        // Social media platforms
        platforms: contactData.platforms || {},
        
        // Categorization
        influencerTier: contactData.influencerTier || determineInfluencerTier(contactData.platforms),
        category: contactData.category || 'fishing',
        
        // Important links
        websiteUrl: contactData.websiteUrl || '',
        mediaKitUrl: contactData.mediaKitUrl || '',
        rateCardUrl: contactData.rateCardUrl || '',
        portfolioUrls: contactData.portfolioUrls || [],
        
        // Business info
        country: contactData.country || 'Sverige',
        language: contactData.language || 'sv-SE',
        timezone: contactData.timezone || 'Europe/Stockholm',
        businessEmail: contactData.businessEmail || contactData.email,
        managementContact: contactData.managementContact || '',
        
        // Tracking & Status
        status: contactData.status || 'prospect',
        priority: contactData.priority || 'medium',
        tags: contactData.tags || [],
        notes: contactData.notes || '',
        
        // Conversion tracking
        convertedToAffiliate: false,
        affiliateId: null,
        conversionDate: null,
        
        // Metadata
        createdAt: now,
        updatedAt: now,
        createdBy: contactData.createdBy || 'admin',
        lastContactedAt: null,
        lastActivityAt: now
      };

      // 🎯 NEW: Add ambassador-specific fields for affiliates collection
      const ambassadorContact = {
        ...newContact,
        contactType: 'ambassador',  // 🔥 Distinguish from regular affiliates
        active: false,              // 🔥 New ambassadors are inactive prospects by default 
      };
      
      const docRef = await addDoc(collection(db, 'affiliates'), ambassadorContact);
      
      toast.success(`👑 Ny ambassadör tillagd: ${contactData.name}`);
      return docRef.id;
    } catch (error) {
      console.error('Error adding ambassador contact:', error);
      toast.error('Kunde inte lägga till ambassadör');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update existing ambassador contact
  const updateContact = useCallback(async (contactId, updates) => {
    try {
      setLoading(true);
      
      // 🎯 NEW: Use affiliates collection
      const contactRef = doc(db, 'affiliates', contactId);
      const now = new Date();
      
      // Recalculate influencer tier if platforms updated
      let updatedData = { ...updates };
      if (updates.platforms) {
        const determineInfluencerTier = (platforms) => {
          const maxFollowers = Math.max(
            ...Object.values(platforms).map(p => p.followers || p.subscribers || 0)
          );
          
          if (maxFollowers >= 1000000) return 'mega';
          if (maxFollowers >= 100000) return 'macro'; 
          if (maxFollowers >= 10000) return 'micro';
          return 'nano';
        };
        
        updatedData.influencerTier = determineInfluencerTier(updates.platforms);
      }
      
      updatedData = {
        ...updatedData,
        lastActivityAt: now,
        updatedAt: now
      };

      await updateDoc(contactRef, updatedData);
      
      toast.success('👑 Ambassadör-information uppdaterad');
      return true;
    } catch (error) {
      console.error('Error updating ambassador contact:', error);
      toast.error('Kunde inte uppdatera ambassadör-information');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete ambassador contact
  const deleteContact = useCallback(async (contactId) => {
    try {
      setLoading(true);
      
      // 🎯 NEW: Use affiliates collection
      await deleteDoc(doc(db, 'affiliates', contactId));
      
      toast.success('👑 Ambassadör borttagen från listan');
      return true;
    } catch (error) {
      console.error('Error deleting ambassador contact:', error);
      toast.error('Kunde inte ta bort ambassadör');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 🎯 NEW: Activate ambassador (Convert prospect to active affiliate)
  const activateContact = useCallback(async (contactId) => {
    try {
      setLoading(true);
      
      const contactRef = doc(db, 'affiliates', contactId);
      const now = new Date();
      const activationData = {
        active: true,              // 🔥 CRITICAL: Makes them appear in Affiliate Admin
        status: 'active',          // Updates status too
        lastActivityAt: now,
        updatedAt: now
      };

      await updateDoc(contactRef, activationData);
      
      toast.success('👑 Ambassadör aktiverad som affiliate! Nu synlig i affiliate-hantering.');
      return true;
    } catch (error) {
      console.error('Error activating ambassador:', error);
      toast.error('Kunde inte aktivera ambassadör');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get contact by ID
  const getContactById = useCallback((contactId) => {
    return contacts.find(contact => contact.id === contactId);
  }, [contacts]);

  // Filter contacts by status
  const getContactsByStatus = useCallback((status) => {
    return contacts.filter(contact => contact.status === status);
  }, [contacts]);

  // Filter contacts by influencer tier
  const getContactsByTier = useCallback((tier) => {
    return contacts.filter(contact => contact.influencerTier === tier);
  }, [contacts]);

  // Get top contacts by followers
  const getTopInfluencers = useCallback((limit = 10) => {
    return [...contacts]
      .sort((a, b) => (b.totalFollowers || 0) - (a.totalFollowers || 0))
      .slice(0, limit);
  }, [contacts]);

  // Search contacts
  const searchContacts = useCallback((searchTerm) => {
    if (!searchTerm) return contacts;
    
    const term = searchTerm.toLowerCase();
    return contacts.filter(contact => 
      contact.name?.toLowerCase().includes(term) ||
      contact.email?.toLowerCase().includes(term) ||
      contact.category?.toLowerCase().includes(term) ||
      contact.tags?.some(tag => tag.toLowerCase().includes(term)) ||
      Object.keys(contact.platforms || {}).some(platform => 
        platform.toLowerCase().includes(term)
      )
    );
  }, [contacts]);

  return {
    contacts,
    loading,
    error,
    hasInitialized,
    addContact,
    updateContact,
    deleteContact,
    activateContact,       // 🎯 NEW: Convert ambassador to active affiliate
    getContactById,
    getContactsByStatus,
    getContactsByTier,
    getTopInfluencers,
    searchContacts
  };
};