// Safe conversion of Firestore Timestamp | ISO string | number | Date to Date
export const toJsDate = (value) => {
  try {
    if (!value) return null;
    if (value instanceof Date) return value;
    // Firestore Timestamp
    if (typeof value?.toDate === 'function') return value.toDate();
    // ISO string or millis
    if (typeof value === 'string') {
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof value === 'number') {
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  } catch (_) {
    return null;
  }
};

