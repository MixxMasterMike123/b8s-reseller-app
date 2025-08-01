import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where,
  onSnapshot,
  limit 
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import toast from 'react-hot-toast';

export const useAmbassadorActivities = (contactId = null) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Activity types with ambassador/influence theme
  const activityTypes = {
    call: { 
      label: 'Pitch', 
      icon: 'phone', 
      description: 'Telefonpitch med influencer' 
    },
    email: { 
      label: 'Förfrågan', 
      icon: 'envelope', 
      description: 'E-postförfrågan till influencer' 
    },
    meeting: { 
      label: 'Partnerskap', 
      icon: 'users', 
      description: 'Partnerskaps-möte' 
    },
    note: { 
      label: 'Anteckning', 
      icon: 'document-text', 
      description: 'Intern anteckning om influencer' 
    },
    proposal: { 
      label: 'Samarbetserbjudande', 
      icon: 'clipboard-document-list', 
      description: 'Samarbetserbjudande skickat' 
    },
    contract: { 
      label: 'Kontrakt', 
      icon: 'document', 
      description: 'Kontrakt/avtal diskussion' 
    },
    content: { 
      label: 'Innehåll', 
      icon: 'camera', 
      description: 'Innehållsplanering/material' 
    },
    follow_up: { 
      label: 'Uppföljning', 
      icon: 'arrow-path', 
      description: 'Planerad uppföljning' 
    },
    social_media: { 
      label: 'Social Media', 
      icon: 'share', 
      description: 'Social media aktivitet/diskussion' 
    }
  };

  // Load activities from Firebase - using separate 'ambassadorActivities' collection
  useEffect(() => {
    setLoading(true);
    
    const activitiesRef = collection(db, 'ambassadorActivities');
    let q;
    
    if (contactId) {
      // Load activities for specific ambassador contact
      q = query(
        activitiesRef,
        where('contactId', '==', contactId),
        orderBy('createdAt', 'desc')
      );
    } else {
      // Load all ambassador activities, most recent first
      q = query(
        activitiesRef,
        orderBy('createdAt', 'desc'),
        limit(100) // Limit for performance
      );
    }
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const activitiesData = snapshot.docs.map(doc => {
          const data = doc.data();
          
          // Safe date handling
          const safeDate = (dateValue) => {
            if (!dateValue) return new Date();
            if (dateValue instanceof Date) return dateValue;
            if (dateValue.toDate && typeof dateValue.toDate === 'function') {
              return dateValue.toDate();
            }
            return new Date(dateValue);
          };

          return {
            id: doc.id,
            ...data,
            createdAt: safeDate(data.createdAt),
            updatedAt: safeDate(data.updatedAt)
          };
        });
        
        setActivities(activitiesData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching ambassador activities:', error);
        setError('Kunde inte ladda ambassadör-aktiviteter');
        setLoading(false);
        toast.error('Kunde inte ladda ambassadör-aktiviteter');
      }
    );

    return () => unsubscribe();
  }, [contactId]);

  // Add new activity
  const addActivity = useCallback(async (activityData) => {
    try {
      const now = new Date();
      
      // Parse tags from content (same smart tagging as Dining Wagon)
      const parseTagsFromContent = (content) => {
        if (!content) return [];
        const tagMatches = content.match(/#[\wåäöÅÄÖ]+/g);
        return tagMatches ? tagMatches.map(tag => tag.toLowerCase()) : [];
      };

      const newActivity = {
        contactId: activityData.contactId,
        type: activityData.type || 'note',
        title: activityData.title || '',
        content: activityData.content || '',
        outcome: activityData.outcome || '',
        nextAction: activityData.nextAction || '',
        
        // Smart tagging from content
        tags: parseTagsFromContent(activityData.content),
        
        // Priority and status
        priority: activityData.priority || 'medium',
        status: activityData.status || 'completed',
        
        // Follow-up
        followUpDate: activityData.followUpDate || null,
        followUpRequired: !!activityData.followUpDate,
        
        // Social media context
        platform: activityData.platform || null, // instagram, youtube, etc.
        campaignType: activityData.campaignType || null,
        expectedReach: activityData.expectedReach || null,
        
        // Metadata
        createdAt: now,
        updatedAt: now,
        createdBy: activityData.createdBy || 'admin'
      };

      const docRef = await addDoc(collection(db, 'ambassadorActivities'), newActivity);
      
      // Update contact's last activity timestamp
      if (activityData.contactId) {
        await updateDoc(doc(db, 'ambassadorContacts', activityData.contactId), {
          lastActivityAt: now,
          lastContactedAt: now,
          updatedAt: now
        });
      }
      
      toast.success('👑 Ambassadör-aktivitet tillagd');
      return docRef.id;
    } catch (error) {
      console.error('Error adding ambassador activity:', error);
      toast.error('Kunde inte lägga till aktivitet');
      throw error;
    }
  }, []);

  // Update activity
  const updateActivity = useCallback(async (activityId, updates) => {
    try {
      const activityRef = doc(db, 'ambassadorActivities', activityId);
      const now = new Date();
      
      // Re-parse tags if content updated
      let updatedData = { ...updates };
      if (updates.content) {
        const parseTagsFromContent = (content) => {
          const tagMatches = content.match(/#[\wåäöÅÄÖ]+/g);
          return tagMatches ? tagMatches.map(tag => tag.toLowerCase()) : [];
        };
        updatedData.tags = parseTagsFromContent(updates.content);
      }
      
      updatedData.updatedAt = now;

      await updateDoc(activityRef, updatedData);
      
      toast.success('👑 Aktivitet uppdaterad');
      return true;
    } catch (error) {
      console.error('Error updating ambassador activity:', error);
      toast.error('Kunde inte uppdatera aktivitet');
      throw error;
    }
  }, []);

  // Delete activity
  const deleteActivity = useCallback(async (activityId) => {
    try {
      await deleteDoc(doc(db, 'ambassadorActivities', activityId));
      toast.success('👑 Aktivitet borttagen');
      return true;
    } catch (error) {
      console.error('Error deleting ambassador activity:', error);
      toast.error('Kunde inte ta bort aktivitet');
      throw error;
    }
  }, []);

  // Get activities by type
  const getActivitiesByType = useCallback((type) => {
    return activities.filter(activity => activity.type === type);
  }, [activities]);

  // Get activities by priority
  const getActivitiesByPriority = useCallback((priority) => {
    return activities.filter(activity => activity.priority === priority);
  }, [activities]);

  // Get activities with follow-up required
  const getFollowUpActivities = useCallback(() => {
    return activities.filter(activity => 
      activity.followUpRequired && activity.followUpDate
    );
  }, [activities]);

  // Get activities by platform
  const getActivitiesByPlatform = useCallback((platform) => {
    return activities.filter(activity => activity.platform === platform);
  }, [activities]);

  // Get recent activities (last 7 days)
  const getRecentActivities = useCallback(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    return activities.filter(activity => 
      activity.createdAt && activity.createdAt >= weekAgo
    );
  }, [activities]);

  // Search activities
  const searchActivities = useCallback((searchTerm) => {
    if (!searchTerm) return activities;
    
    const term = searchTerm.toLowerCase();
    return activities.filter(activity => 
      activity.title?.toLowerCase().includes(term) ||
      activity.content?.toLowerCase().includes(term) ||
      activity.outcome?.toLowerCase().includes(term) ||
      activity.tags?.some(tag => tag.includes(term)) ||
      activity.platform?.toLowerCase().includes(term)
    );
  }, [activities]);

  return {
    activities,
    loading,
    error,
    activityTypes,
    addActivity,
    updateActivity,
    deleteActivity,
    getActivitiesByType,
    getActivitiesByPriority,
    getFollowUpActivities,
    getActivitiesByPlatform,
    getRecentActivities,
    searchActivities
  };
};