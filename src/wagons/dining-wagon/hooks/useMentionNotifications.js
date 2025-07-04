import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../contexts/AuthContext';

export const useMentionNotifications = () => {
  const { currentUser } = useAuth();
  const [mentions, setMentions] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Load mentions for current user
  useEffect(() => {
    if (!currentUser) {
      setMentions([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    
    const mentionsRef = collection(db, 'userMentions');
    const q = query(
      mentionsRef,
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const mentionsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setMentions(mentionsData);
        setUnreadCount(mentionsData.filter(mention => !mention.isRead).length);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching mentions:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Mark mention as read
  const markAsRead = async (mentionId) => {
    try {
      const mentionRef = doc(db, 'userMentions', mentionId);
      await updateDoc(mentionRef, {
        isRead: true,
        readAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error marking mention as read:', error);
    }
  };

  // Delete mention
  const deleteMention = async (mentionId) => {
    try {
      await deleteDoc(doc(db, 'userMentions', mentionId));
    } catch (error) {
      console.error('Error deleting mention:', error);
    }
  };

  // Mark all mentions as read
  const markAllAsRead = async () => {
    try {
      const unreadMentions = mentions.filter(mention => !mention.isRead);
      const promises = unreadMentions.map(mention => 
        updateDoc(doc(db, 'userMentions', mention.id), {
          isRead: true,
          readAt: serverTimestamp()
        })
      );
      await Promise.all(promises);
    } catch (error) {
      console.error('Error marking all mentions as read:', error);
    }
  };

  return {
    mentions,
    unreadCount,
    loading,
    markAsRead,
    deleteMention,
    markAllAsRead
  };
}; 