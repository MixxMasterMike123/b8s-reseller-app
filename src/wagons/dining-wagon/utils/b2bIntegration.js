// B2B Integration utility - DEPRECATED
// 
// This file is no longer needed since we've unified the architecture:
// - CRM now reads directly from 'users' collection
// - No sync needed between separate collections
// - Single source of truth achieved
//
// This file is kept for reference but should not be used.

console.warn('⚠️ b2bIntegration.js is deprecated - CRM now uses users collection directly');

export const deprecatedNotice = 'This utility is no longer needed after unification'; 