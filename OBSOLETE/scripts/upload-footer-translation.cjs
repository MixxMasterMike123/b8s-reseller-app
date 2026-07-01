const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCsYgMVRlipm-PxsHPZOxew5tqcZ_3Kccw",
  authDomain: "shop.b8shield.com",
  projectId: "b8shield-reseller-app",
  storageBucket: "b8shield-reseller-app.firebasestorage.app",
  messagingSenderId: "996315128348",
  appId: "1:996315128348:web:75388494e2bcdfa1f3f5d9",
  measurementId: "G-7JFF08MLM2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, 'b8s-reseller-db'); // Use named database

async function uploadFooterTranslation() {
  try {
    console.log('🚀 Uploading footer_follow_us translation...');
    
    // Upload to English (GB) collection
    const enGBRef = doc(db, 'translations_en_GB', 'footer_follow_us');
    await setDoc(enGBRef, {
      value: 'Follow B8Shield',
      key: 'footer_follow_us',
      context: 'B2C footer - social media heading',
      updatedAt: new Date().toISOString()
    });
    
    // Upload to English (US) collection
    const enUSRef = doc(db, 'translations_en_US', 'footer_follow_us');
    await setDoc(enUSRef, {
      value: 'Follow B8Shield',
      key: 'footer_follow_us',
      context: 'B2C footer - social media heading',
      updatedAt: new Date().toISOString()
    });
    
    // Upload to Swedish collection (for consistency)
    const svSERef = doc(db, 'translations_sv_SE', 'footer_follow_us');
    await setDoc(svSERef, {
      value: 'Följ B8Shield',
      key: 'footer_follow_us',
      context: 'B2C footer - social media heading',
      updatedAt: new Date().toISOString()
    });
    
    console.log('✅ Successfully uploaded footer_follow_us translation to all language collections');
    
    // Also upload a few other common footer translations that might be missing
    const footerTranslations = {
      'footer_company_description': {
        'sv-SE': 'Professionellt skydd för dina fiskedon. Utvecklat av JPH Innovation AB för att maximera din framgång på vattnet.',
        'en-GB': 'Professional protection for your fishing lures. Developed by JPH Innovation AB to maximize your success on the water.',
        'en-US': 'Professional protection for your fishing lures. Developed by JPH Innovation AB to maximize your success on the water.'
      },
      'footer_quick_links': {
        'sv-SE': 'Snabblänkar',
        'en-GB': 'Quick Links',
        'en-US': 'Quick Links'
      },
      'footer_customer_service': {
        'sv-SE': 'Kundservice & Info',
        'en-GB': 'Customer Service & Info',
        'en-US': 'Customer Service & Info'
      },
      'footer_legal': {
        'sv-SE': 'Juridiskt',
        'en-GB': 'Legal',
        'en-US': 'Legal'
      },
      'footer_legal_info': {
        'sv-SE': 'Organisationsnummer: {{orgNr}} | Registrerad för F-skatt | Medlem i Svensk Handel',
        'en-GB': 'Organization number: {{orgNr}} | Registered for F-tax | Member of Swedish Trade Federation',
        'en-US': 'Organization number: {{orgNr}} | Registered for F-tax | Member of Swedish Trade Federation'
      }
    };
    
    console.log('📝 Uploading additional footer translations...');
    
    for (const [key, translations] of Object.entries(footerTranslations)) {
      for (const [lang, value] of Object.entries(translations)) {
        const collectionName = `translations_${lang.replace('-', '_')}`;
        const docRef = doc(db, collectionName, key);
        await setDoc(docRef, {
          value: value,
          key: key,
          context: 'B2C footer translations',
          updatedAt: new Date().toISOString()
        });
      }
    }
    
    console.log('✅ All footer translations uploaded successfully!');
    console.log('🔄 Please refresh your B2C shop to see the translations take effect.');
    
  } catch (error) {
    console.error('❌ Error uploading translations:', error);
  }
}

uploadFooterTranslation();
