/**
 * Credential Translation Utility
 * 
 * A standalone translation utility for credential pages (login, register, forgot password)
 * that works independently of the main TranslationContext since users aren't logged in yet.
 * Fetches translations from Firebase and provides a simple t() function.
 */

import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

class CredentialTranslations {
  constructor() {
    this.translations = {};
    this.currentLanguage = this.getStoredLanguage();
    this.loaded = false;
  }

  // Get language from localStorage/cookie (shared with main app)
  getStoredLanguage() {
    // Try localStorage first (same key as main app)
    const stored = localStorage.getItem('b8shield-language');
    if (stored) {
      console.log(`🔐 Language loaded from localStorage: ${stored}`);
      return stored;
    }
    
    // Try old credential-specific key for backward compatibility
    const oldStored = localStorage.getItem('b8shield-credential-language');
    if (oldStored) {
      // Migrate to new unified key
      localStorage.setItem('b8shield-language', oldStored);
      localStorage.removeItem('b8shield-credential-language');
      console.log(`🔐 Language migrated from old key: ${oldStored}`);
      return oldStored;
    }
    
    // Try cookie (unified key)
    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('b8shield-language='));
    
    if (cookie) {
      const value = cookie.split('=')[1];
      localStorage.setItem('b8shield-language', value);
      console.log(`🔐 Language loaded from cookie: ${value}`);
      return value;
    }
    
    // Default to Swedish
    console.log(`🔐 Language defaulted to: sv-SE`);
    return 'sv-SE';
  }

  // Load translations from Firebase
  async loadTranslations(language) {
    if (this.loaded && this.currentLanguage === language) return;
    
    try {
      // Load from Firebase for all languages including Swedish
      const collectionName = `translations_${language.replace('-', '_')}`;
      console.log(`🔐 Loading credential translations from: ${collectionName}`);
      const querySnapshot = await getDocs(collection(db, collectionName));
      
      if (!querySnapshot.empty) {
        // Process Firebase translations
        const firebaseTranslations = {};
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Use 'value' field if available
          firebaseTranslations[doc.id] = data.value || data.translation || '';
        });
        
        this.translations = firebaseTranslations;
        this.currentLanguage = language;
        this.loaded = true;
        console.log(`✅ Credential translations loaded: ${Object.keys(firebaseTranslations).length} keys for ${language}`);
      } else {
        console.log(`⚠️ No credential translations found for ${language}, using fallbacks`);
        // No translations found, set empty and mark as loaded
        this.translations = {};
        this.currentLanguage = language;
        this.loaded = true;
      }
    } catch (error) {
      console.error('Failed to load credential translations:', error);
      // On error, set empty and mark as loaded to prevent infinite loading
      this.translations = {};
      this.currentLanguage = language;
      this.loaded = true;
    }
  }

  // Translation function
  t(key, fallback = null) {
    if (!this.loaded) {
      console.warn('Translations not loaded yet');
      return fallback || key;
    }
    
    return this.translations[key] || fallback || key;
  }

  // Set language and reload translations
  async setLanguage(language) {
    this.currentLanguage = language;
    this.loaded = false;
    await this.loadTranslations(language);
    
    // Store preference in localStorage (unified key shared with main app)
    localStorage.setItem('b8shield-language', language);
    console.log(`🔐 Language preference saved: ${language} (shared with main app)`);
    
    // Also set cookie for cross-session persistence
    document.cookie = `b8shield-language=${language}; path=/; max-age=${365 * 24 * 60 * 60}`; // 1 year
  }
}

// Create singleton instance
const credentialTranslations = new CredentialTranslations();

export default credentialTranslations; 