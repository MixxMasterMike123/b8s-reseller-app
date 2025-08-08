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

  // Load activities from Firebase - using 'activities' collection for fresh start
  useEffect(() => {
    setLoading(true);
    
    // Use 'activities' collection instead of 'diningActivities' for fresh start
    const activitiesRef = collection(db, 'activities');
    let q;
    
    if (contactId) {
      // Load activities for specific contact
      q = query(
        activitiesRef,
        where('contactId', '==', contactId),
        orderBy('createdAt', 'desc')
      );
    } else {
      // Load all activities, most recent first
      q = query(
        activitiesRef,
        orderBy('createdAt', 'desc'),
        limit(100) // Limit for performance
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
        toast.error('Kunde inte ladda aktiviteter');
      }
    );

    return () => unsubscribe();
  }, [contactId]);

  // Add new activity
  const addActivity = useCallback(async (activityData) => {
    try {
      setLoading(true);
      
      const newActivity = {
        ...activityData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Use 'activities' collection for fresh start
      const docRef = await addDoc(collection(db, 'activities'), newActivity);
      
      toast.success('Aktivitet registrerad');
      return docRef.id;
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error('Kunde inte lägga till aktivitet');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update existing activity
  const updateActivity = useCallback(async (activityId, updates) => {
    try {
      setLoading(true);
      
      // Use 'activities' collection for fresh start
      const activityRef = doc(db, 'activities', activityId);
      await updateDoc(activityRef, {
        ...updates,
        updatedAt: new Date()
      });
      
      toast.success('Aktivitet uppdaterad');
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
      
      // Use 'activities' collection for fresh start
      await deleteDoc(doc(db, 'activities', activityId));
      
      toast.success('Aktivitet borttagen');
      return true;
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast.error('Kunde inte ta bort aktivitet');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get activities for specific contact
  const getActivitiesByContact = useCallback((contactId) => {
    return activities.filter(activity => activity.contactId === contactId);
  }, [activities]);

  // Get recent activities (last 10)
  const getRecentActivities = useCallback((limit = 10) => {
    return activities.slice(0, limit);
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