/**
 * Credential Translation Utility
 * 
 * A standalone translation utility for credential pages (login, register, forgot password)
 * that works independently of the main TranslationContext since users aren't logged in yet.
 * Fetches translations from Firebase and provides a simple t() function.
 */

import { doc, getDoc } from 'firebase/firestore';
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
      const translationKey = `translations_${language.replace('-', '_')}`;
      const docRef = doc(db, 'translations', translationKey);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        this.translations = docSnap.data();
        this.currentLanguage = language;
        this.loaded = true;
      } else {
        // Fallback to Swedish if translation not found
        if (language !== 'sv-SE') {
          await this.loadTranslations('sv-SE');
        }
      }
    } catch (error) {
      console.error('Failed to load credential translations:', error);
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