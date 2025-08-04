import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../contexts/AuthContext';
import { useContentTranslation } from '../../../hooks/useContentTranslation';
import toast from 'react-hot-toast';
import { getDefaultCampaign, generateCampaignCode } from '../utils/campaignUtils';

export const useCampaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const { user } = useAuth();
  const { setContentValue } = useContentTranslation();

  // Real-time campaigns subscription
  useEffect(() => {
    console.log('🚂 Setting up Firebase subscription to campaigns collection...');
    setLoading(true);
    
    const campaignsRef = collection(db, 'campaigns');
    const q = query(campaignsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        console.log('🚂 Firebase snapshot received:', {
          size: snapshot.size,
          empty: snapshot.empty,
          docs: snapshot.docs.length
        });
        
        const campaignsData = snapshot.docs
          .map(doc => {
            const data = doc.data();
            console.log('🚂 Campaign loaded:', { id: doc.id, name: data.name });
            
            // Safe date handling
            const safeDate = (dateValue) => {
              if (!dateValue) return new Date();
              if (dateValue instanceof Date) return dateValue;
              if (dateValue.toDate && typeof dateValue.toDate === 'function') {
                return dateValue.toDate();
              }
              if (typeof dateValue === 'string') return new Date(dateValue);
              return new Date();
            };
            
            return {
              id: doc.id,
              ...data,
              // Ensure dates are properly formatted
              startDate: safeDate(data.startDate),
              endDate: safeDate(data.endDate),
              createdAt: safeDate(data.createdAt),
              updatedAt: safeDate(data.updatedAt)
            };
          });
        
        console.log('🚂 Processed campaigns data:', campaignsData.length);
        setCampaigns(campaignsData);
        setLoading(false);
        setHasInitialized(true);
        setError(null);
      },
      (error) => {
        console.error('🚂 Firebase subscription error:', error);
        setError(error.message);
        setLoading(false);
        setHasInitialized(true);
        toast.error('Fel vid hämtning av kampanjer: ' + error.message);
      }
    );

    return () => unsubscribe();
  }, []);

  // Add new campaign
  const addCampaign = useCallback(async (campaignData) => {
    if (!campaignData.name || !campaignData.name['sv-SE']) {
      toast.error('Kampanjnamn krävs');
      return null;
    }

    try {
      console.log('🚂 Adding new campaign:', campaignData);
      
      // Generate unique campaign code if not provided
      const campaignCode = campaignData.code || generateCampaignCode(campaignData.name['sv-SE']);
      
      // Check if code already exists
      const existingQuery = query(
        collection(db, 'campaigns'),
        where('code', '==', campaignCode)
      );
      const existingSnapshot = await getDocs(existingQuery);
      
      if (!existingSnapshot.empty) {
        toast.error('Kampanjkod finns redan. Välj ett annat namn.');
        return null;
      }

      const newCampaign = {
        ...getDefaultCampaign(),
        ...campaignData,
        code: campaignCode,
        createdAt: serverTimestamp(),
        createdBy: user?.uid || 'system',
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'campaigns'), newCampaign);
      console.log('🚂 Campaign added with ID:', docRef.id);
      
      toast.success('Kampanj skapad framgångsrikt!');
      return docRef.id;
    } catch (error) {
      console.error('🚂 Error adding campaign:', error);
      toast.error('Fel vid skapande av kampanj: ' + error.message);
      setError(error.message);
      return null;
    }
  }, [user?.uid]);

  // Update existing campaign
  const updateCampaign = useCallback(async (campaignId, updates) => {
    if (!campaignId) {
      toast.error('Kampanj-ID krävs för uppdatering');
      return false;
    }

    try {
      console.log('🚂 Updating campaign:', campaignId, updates);
      
      const campaignRef = doc(db, 'campaigns', campaignId);
      await updateDoc(campaignRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      
      console.log('🚂 Campaign updated successfully');
      toast.success('Kampanj uppdaterad framgångsrikt!');
      return true;
    } catch (error) {
      console.error('🚂 Error updating campaign:', error);
      toast.error('Fel vid uppdatering av kampanj: ' + error.message);
      setError(error.message);
      return false;
    }
  }, []);

  // Delete campaign
  const deleteCampaign = useCallback(async (campaignId) => {
    if (!campaignId) {
      toast.error('Kampanj-ID krävs för borttagning');
      return false;
    }

    try {
      console.log('🚂 Deleting campaign:', campaignId);
      
      const campaignRef = doc(db, 'campaigns', campaignId);
      await deleteDoc(campaignRef);
      
      console.log('🚂 Campaign deleted successfully');
      toast.success('Kampanj borttagen framgångsrikt!');
      return true;
    } catch (error) {
      console.error('🚂 Error deleting campaign:', error);
      toast.error('Fel vid borttagning av kampanj: ' + error.message);
      setError(error.message);
      return false;
    }
  }, []);

  // Toggle campaign status (active/paused)
  const toggleCampaignStatus = useCallback(async (campaignId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    return await updateCampaign(campaignId, { status: newStatus });
  }, [updateCampaign]);

  // Get campaign by ID (synchronous - from loaded campaigns)
  const getCampaignById = useCallback((campaignId) => {
    return campaigns.find(campaign => campaign.id === campaignId);
  }, [campaigns]);

  // Get campaign by ID (async - direct Firebase fetch)
  const fetchCampaignById = useCallback(async (campaignId) => {
    if (!campaignId) return null;
    
    try {
      console.log('🚂 Fetching campaign by ID:', campaignId);
      
      const campaignRef = doc(db, 'campaigns', campaignId);
      const campaignSnap = await getDoc(campaignRef);
      
      if (!campaignSnap.exists()) {
        console.log('🚂 Campaign not found:', campaignId);
        return null;
      }
      
      const campaignData = campaignSnap.data();
      const safeDate = (dateValue) => {
        if (!dateValue) return new Date();
        if (dateValue instanceof Date) return dateValue;
        if (dateValue.toDate && typeof dateValue.toDate === 'function') {
          return dateValue.toDate();
        }
        if (typeof dateValue === 'string') return new Date(dateValue);
        return new Date();
      };
      
      const campaign = {
        id: campaignSnap.id,
        ...campaignData,
        startDate: safeDate(campaignData.startDate),
        endDate: safeDate(campaignData.endDate),
        createdAt: safeDate(campaignData.createdAt),
        updatedAt: safeDate(campaignData.updatedAt)
      };
      
      console.log('🚂 Campaign fetched successfully:', campaign);
      return campaign;
    } catch (error) {
      console.error('🚂 Error fetching campaign:', error);
      return null;
    }
  }, []);

  // Get campaigns by status
  const getCampaignsByStatus = useCallback((status) => {
    return campaigns.filter(campaign => campaign.status === status);
  }, [campaigns]);

  // Get active campaigns
  const getActiveCampaigns = useCallback(() => {
    return getCampaignsByStatus('active');
  }, [getCampaignsByStatus]);

  // Get draft campaigns
  const getDraftCampaigns = useCallback(() => {
    return getCampaignsByStatus('draft');
  }, [getCampaignsByStatus]);

  // Get paused campaigns
  const getPausedCampaigns = useCallback(() => {
    return getCampaignsByStatus('paused');
  }, [getCampaignsByStatus]);

  // Get completed campaigns
  const getCompletedCampaigns = useCallback(() => {
    return getCampaignsByStatus('completed');
  }, [getCampaignsByStatus]);

  // Get cancelled campaigns
  const getCancelledCampaigns = useCallback(() => {
    return getCampaignsByStatus('cancelled');
  }, [getCampaignsByStatus]);

  // Get all campaigns (for comprehensive view)
  const getAllCampaigns = useCallback(() => {
    return campaigns.sort((a, b) => {
      // Sort by status priority: active -> paused -> draft -> completed -> cancelled
      const statusOrder = { active: 1, paused: 2, draft: 3, completed: 4, cancelled: 5 };
      const aOrder = statusOrder[a.status] || 6;
      const bOrder = statusOrder[b.status] || 6;
      
      if (aOrder !== bOrder) return aOrder - bOrder;
      
      // Within same status, sort by updatedAt (newest first)
      return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
    });
  }, [campaigns]);

  // Search campaigns by name
  const searchCampaigns = useCallback((searchTerm) => {
    if (!searchTerm) return campaigns;
    
    const term = searchTerm.toLowerCase();
    return campaigns.filter(campaign => {
      const name = campaign.name?.['sv-SE'] || '';
      const description = campaign.description?.['sv-SE'] || '';
      const code = campaign.code || '';
      
      return name.toLowerCase().includes(term) ||
             description.toLowerCase().includes(term) ||
             code.toLowerCase().includes(term);
    });
  }, [campaigns]);

  // Campaign statistics
  const getCampaignStats = useCallback(() => {
    const total = campaigns.length;
    const active = campaigns.filter(c => c.status === 'active').length;
    const draft = campaigns.filter(c => c.status === 'draft').length;
    const completed = campaigns.filter(c => c.status === 'completed').length;
    const paused = campaigns.filter(c => c.status === 'paused').length;
    
    const totalClicks = campaigns.reduce((sum, c) => sum + (c.totalClicks || 0), 0);
    const totalConversions = campaigns.reduce((sum, c) => sum + (c.totalConversions || 0), 0);
    const totalRevenue = campaigns.reduce((sum, c) => sum + (c.totalRevenue || 0), 0);
    
    return {
      total,
      active,
      draft,
      completed,
      paused,
      totalClicks,
      totalConversions,
      totalRevenue,
      conversionRate: totalClicks > 0 ? Math.round((totalConversions / totalClicks) * 10000) / 100 : 0
    };
  }, [campaigns]);

  return {
    // Data
    campaigns,
    loading,
    error,
    hasInitialized,
    
    // CRUD operations
    addCampaign,
    updateCampaign,
    deleteCampaign,
    toggleCampaignStatus,
    
    // Query operations
    getCampaignById,
    fetchCampaignById,
    getCampaignsByStatus,
    getActiveCampaigns,
    getDraftCampaigns,
    getPausedCampaigns,
    getCompletedCampaigns,
    getCancelledCampaigns,
    getAllCampaigns,
    searchCampaigns,
    
    // Statistics
    getCampaignStats
  };
};