// Database configuration for Firebase Functions
// Centralized database access using named database

import { getFirestore } from 'firebase-admin/firestore';
import { getApp } from 'firebase-admin/app';

// Use the named database consistently across all functions
export const db = getFirestore(getApp(), 'b8s-reseller-db');
