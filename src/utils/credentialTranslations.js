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

  // Get language from localStorage/cookie
  getStoredLanguage() {
    // Try localStorage first
    const stored = localStorage.getItem('b8shield-credential-language');
    if (stored) return stored;
    
    // Try cookie
    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('b8shield-credential-language='));
    
    if (cookie) {
      const value = cookie.split('=')[1];
      localStorage.setItem('b8shield-credential-language', value);
      return value;
    }
    
    // Default to Swedish
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
  }
}

// Create singleton instance
const credentialTranslations = new CredentialTranslations();

export default credentialTranslations; 