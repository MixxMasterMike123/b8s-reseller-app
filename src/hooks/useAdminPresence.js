import { useState, useEffect, useCallback } from 'react';
import { collection, doc, onSnapshot, updateDoc, setDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const ACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
const HEARTBEAT_INTERVAL = 60 * 1000; // 1 minute heartbeat

export const useAdminPresence = () => {
  const { currentUser, isAdmin } = useAuth();
  const [adminPresence, setAdminPresence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userActivity, setUserActivity] = useState(Date.now());

  // Update user activity timestamp
  const updateActivity = useCallback(() => {
    setUserActivity(Date.now());
  }, []);

  // Track user interactions to detect activity
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const throttledUpdateActivity = (() => {
      let lastUpdate = 0;
      return () => {
        const now = Date.now();
        if (now - lastUpdate > 30000) { // Update max once per 30 seconds
          lastUpdate = now;
          updateActivity();
        }
      };
    })();

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, throttledUpdateActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledUpdateActivity, true);
      });
    };
  }, [updateActivity]);

  // Update presence in Firestore
  const updatePresence = useCallback(async (status = 'online') => {
    if (!currentUser || !isAdmin) return;

    try {
      const presenceRef = doc(db, 'adminPresence', currentUser.uid);
      await setDoc(presenceRef, {
        userId: currentUser.uid,
        email: currentUser.email,
        status: status,
        lastSeen: serverTimestamp(),
        lastActivity: new Date(userActivity),
        browser: navigator.userAgent,
        timestamp: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error updating admin presence:', error);
    }
  }, [currentUser, isAdmin, userActivity]);

  // Remove presence when going offline
  const removePresence = useCallback(async () => {
    if (!currentUser || !isAdmin) return;

    try {
      const presenceRef = doc(db, 'adminPresence', currentUser.uid);
      await updateDoc(presenceRef, {
        status: 'offline',
        lastSeen: serverTimestamp()
      });
    } catch (error) {
      console.error('Error removing admin presence:', error);
    }
  }, [currentUser, isAdmin]);

  // Heartbeat to keep presence alive
  useEffect(() => {
    if (!currentUser || !isAdmin) return;

    // Initial presence update
    updatePresence('online');

    // Set up heartbeat interval
    const heartbeatInterval = setInterval(() => {
      const timeSinceActivity = Date.now() - userActivity;
      
      if (timeSinceActivity < ACTIVITY_TIMEOUT) {
        updatePresence('online');
      } else {
        updatePresence('away');
      }
    }, HEARTBEAT_INTERVAL);

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateActivity();
        updatePresence('online');
      } else {
        updatePresence('away');
      }
    };

    // Handle page unload
    const handleBeforeUnload = () => {
      removePresence();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      removePresence();
    };
  }, [currentUser, isAdmin, userActivity, updatePresence, removePresence, updateActivity]);

  // Listen to all admin presence
  useEffect(() => {
    if (!isAdmin) {
      setAdminPresence([]);
      setLoading(false);
      return;
    }

    const presenceQuery = query(collection(db, 'adminPresence'));
    
    const unsubscribe = onSnapshot(presenceQuery, (snapshot) => {
      const presenceList = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const lastSeenTime = data.lastSeen?.toDate?.() || data.lastActivity || new Date();
        
        // Ensure lastSeenTime is a valid Date object
        const validLastSeenTime = lastSeenTime instanceof Date ? lastSeenTime : new Date(lastSeenTime);
        const timeSinceLastSeen = Date.now() - validLastSeenTime.getTime();
        
        // Consider user offline if not seen for more than 5 minutes
        const isOnline = data.status === 'online' && timeSinceLastSeen < ACTIVITY_TIMEOUT;
        const isAway = data.status === 'away' && timeSinceLastSeen < ACTIVITY_TIMEOUT;
        
        presenceList.push({
          id: doc.id,
          ...data,
          isOnline,
          isAway,
          isOffline: !isOnline && !isAway,
          lastSeenTime: validLastSeenTime,
          timeSinceLastSeen,
          lastSeenFormatted: formatTimeSince(timeSinceLastSeen)
        });
      });

      // Sort by status (online first) then by last seen
      presenceList.sort((a, b) => {
        if (a.isOnline && !b.isOnline) return -1;
        if (!a.isOnline && b.isOnline) return 1;
        if (a.isAway && !b.isAway) return -1;
        if (!a.isAway && b.isAway) return 1;
        return b.lastSeenTime - a.lastSeenTime;
      });

      setAdminPresence(presenceList);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to admin presence:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, [isAdmin]);

  // Format time since last seen
  const formatTimeSince = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d sedan`;
    if (hours > 0) return `${hours}h sedan`;
    if (minutes > 0) return `${minutes}m sedan`;
    if (seconds > 30) return `${seconds}s sedan`;
    return 'Just nu';
  };

  // Get online admin count
  const onlineCount = adminPresence.filter(admin => admin.isOnline).length;
  const awayCount = adminPresence.filter(admin => admin.isAway).length;
  const totalAdmins = adminPresence.length;

  return {
    adminPresence,
    loading,
    onlineCount,
    awayCount,
    totalAdmins,
    updateActivity,
    formatTimeSince
  };
}; 