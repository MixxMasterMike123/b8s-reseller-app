import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';

// Create mention notifications for admin users whose full names appear in text
export const createMentionNotifications = async ({
  activityId,
  text,
  adminUsers = [],
  contactId,
  contactName,
  mentionedByUid,
  mentionedByName
}) => {
  if (!text || !Array.isArray(adminUsers) || adminUsers.length === 0) return 0;

  const mentioned = [];
  adminUsers.forEach(user => {
    if (text.includes(user.fullName)) mentioned.push(user);
  });

  for (const user of mentioned) {
    try {
      await addDoc(collection(db, 'userMentions'), {
        userId: user.userId,
        activityId,
        contactId,
        contactName,
        mentionText: text,
        mentionedBy: mentionedByUid,
        mentionedByName,
        isRead: false,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Mention create error', err);
    }
  }

  return mentioned.length;
};

