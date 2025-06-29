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

export const useDiningActivities = (contactId = null) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Activity types with restaurant theme
  const activityTypes = {
    call: { 
      label: 'Samtal', 
      icon: '📞', 
      description: 'Telefonsamtal med gäst' 
    },
    email: { 
      label: 'Meddelande', 
      icon: '📧', 
      description: 'E-postmeddelande till gäst' 
    },
    meeting: { 
      label: 'Middag', 
      icon: '🍽️', 
      description: 'Personligt möte/middag' 
    },
    note: { 
      label: 'Anteckning', 
      icon: '📝', 
      description: 'Intern anteckning om gäst' 
    },
    proposal: { 
      label: 'Meny', 
      icon: '📋', 
      description: 'Förslag/offert skickad' 
    },
    follow_up: { 
      label: 'Uppföljning', 
      icon: '🔄', 
      description: 'Planerad uppföljning' 
    }
  };

  // Real-time activities subscription
  useEffect(() => {
    setLoading(true);
    
    const activitiesRef = collection(db, 'diningActivities');
    let q;
    
    if (contactId) {
      // Get activities for specific contact
      q = query(
        activitiesRef, 
        where('contactId', '==', contactId),
        orderBy('createdAt', 'desc')
      );
    } else {
      // Get all recent activities
      q = query(
        activitiesRef, 
        orderBy('createdAt', 'desc'),
        limit(100)
      );
    }
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const activitiesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setActivities(activitiesData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching activities:', error);
        setError('Kunde inte ladda aktiviteter');
        setLoading(false);
        toast.error('Kunde inte ladda servicehistorik');
      }
    );

    return () => unsubscribe();
  }, [contactId]);

  // Add new activity (Record service interaction)
  const addActivity = useCallback(async (activityData) => {
    try {
      setLoading(true);
      
      const newActivity = {
        ...activityData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Validate required fields
      if (!newActivity.contactId || !newActivity.type || !newActivity.subject) {
        throw new Error('Saknade obligatoriska fält');
      }

      const docRef = await addDoc(collection(db, 'diningActivities'), newActivity);
      
      const activityType = activityTypes[newActivity.type];
      toast.success(`${activityType?.icon || '📝'} ${activityType?.label || 'Aktivitet'} registrerad`);
      
      return docRef.id;
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error('Kunde inte registrera aktivitet');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update activity
  const updateActivity = useCallback(async (activityId, updates) => {
    try {
      setLoading(true);
      
      const activityRef = doc(db, 'diningActivities', activityId);
      const updatedData = {
        ...updates,
        updatedAt: new Date()
      };

      await updateDoc(activityRef, updatedData);
      
      toast.success('📝 Aktivitet uppdaterad');
      return true;
    } catch (error) {
      console.error('Error updating activity:', error);
      toast.error('Kunde inte uppdatera aktivitet');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete activity
  const deleteActivity = useCallback(async (activityId) => {
    try {
      setLoading(true);
      
      await deleteDoc(doc(db, 'diningActivities', activityId));
      
      toast.success('🗑️ Aktivitet borttagen');
      return true;
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast.error('Kunde inte ta bort aktivitet');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get activities by contact
  const getActivitiesByContact = useCallback((targetContactId) => {
    return activities.filter(activity => activity.contactId === targetContactId);
  }, [activities]);

  // Get recent activities (last 7 days)
  const getRecentActivities = useCallback((days = 7) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return activities.filter(activity => {
      const activityDate = activity.createdAt?.toDate?.() || new Date(activity.createdAt);
      return activityDate >= cutoffDate;
    });
  }, [activities]);

  // Activity statistics
  const getActivityStats = useCallback(() => {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats = {
      total: activities.length,
      thisWeek: 0,
      thisMonth: 0,
      byType: {}
    };

    activities.forEach(activity => {
      const activityDate = activity.createdAt?.toDate?.() || new Date(activity.createdAt);
      
      if (activityDate >= weekAgo) stats.thisWeek++;
      if (activityDate >= monthAgo) stats.thisMonth++;
      
      const type = activity.type || 'other';
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });

    // Restaurant-themed naming
    stats.serviceInteractions = stats.total;
    stats.recentService = stats.thisWeek;
    stats.monthlyService = stats.thisMonth;

    return stats;
  }, [activities]);

  // Get activities grouped by date
  const getActivitiesByDate = useCallback(() => {
    const grouped = {};
    
    activities.forEach(activity => {
      const activityDate = activity.createdAt?.toDate?.() || new Date(activity.createdAt);
      const dateKey = activityDate.toDateString();
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      
      grouped[dateKey].push(activity);
    });

    return grouped;
  }, [activities]);

  // Quick action helpers
  const recordCall = useCallback(async (contactId, subject, outcome, nextAction) => {
    return addActivity({
      contactId,
      type: 'call',
      subject: subject || 'Telefonsamtal',
      description: outcome || '',
      nextAction: nextAction || '',
      createdBy: 'current_user' // This would come from auth context
    });
  }, [addActivity]);

  const recordEmail = useCallback(async (contactId, subject, description, nextAction) => {
    return addActivity({
      contactId,
      type: 'email',
      subject: subject || 'E-postmeddelande',
      description: description || '',
      nextAction: nextAction || '',
      createdBy: 'current_user'
    });
  }, [addActivity]);

  const recordMeeting = useCallback(async (contactId, subject, outcome, nextAction) => {
    return addActivity({
      contactId,
      type: 'meeting',
      subject: subject || 'Personligt möte',
      description: outcome || '',
      nextAction: nextAction || '',
      createdBy: 'current_user'
    });
  }, [addActivity]);

  return {
    // Data
    activities,
    loading,
    error,
    activityTypes,
    
    // CRUD operations
    addActivity,
    updateActivity,
    deleteActivity,
    
    // Utilities
    getActivitiesByContact,
    getRecentActivities,
    getActivityStats,
    getActivitiesByDate,
    
    // Quick actions
    recordCall,
    recordEmail,
    recordMeeting,
    
    // State management
    setError
  };
}; 