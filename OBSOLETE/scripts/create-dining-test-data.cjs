const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, connectFirestoreEmulator } = require('firebase/firestore');
const { getAuth } = require('firebase/auth');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC8ZOAoGWJLv8JuGsD8PnJBi1GxTNrE7VE",
  authDomain: "b8shield-reseller-app.firebaseapp.com",
  databaseURL: "https://b8shield-reseller-app-default-rtdb.firebaseio.com",
  projectId: "b8shield-reseller-app",
  storageBucket: "b8shield-reseller-app.appspot.com",
  messagingSenderId: "391049066316",
  appId: "1:391049066316:web:53e834c26b73b4f9fecda6",
  measurementId: "G-T4CP70CX17"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Use the named database
db._settings = { databaseId: 'b8s-reseller-db' };

// Test contacts for The Dining Wagon™
const testContacts = [
  {
    companyName: 'Fiskebutiken AB',
    contactPerson: 'Erik Lindberg',
    email: 'erik@fiskebutiken.se',
    phone: '+46701234567',
    website: 'https://fiskebutiken.se',
    address: 'Storgatan 12',
    city: 'Stockholm', 
    postalCode: '11122',
    country: 'Sverige',
    status: 'prospect',
    priority: 'high',
    source: 'manual',
    tags: ['återförsäljare', 'stockholm', 'vip'],
    notes: 'Stor återförsäljare i Stockholm. Intresserade av större order.',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    companyName: 'Nordic Outdoors',
    contactPerson: 'Anna Svensson',
    email: 'anna@nordicoutdoors.se',
    phone: '+46709876543',
    website: 'https://nordicoutdoors.se',
    address: 'Industrigatan 5',
    city: 'Göteborg',
    postalCode: '41234',
    country: 'Sverige',
    status: 'active',
    priority: 'medium',
    source: 'website',
    tags: ['outdoor', 'göteborg', 'stamkund'],
    notes: 'Etablerad kund sedan 2022. Beställer regelbundet.',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    companyName: 'Sportfiske Sverige',
    contactPerson: 'Magnus Johansson',
    email: 'magnus@sportfiske.se', 
    phone: '+46731111222',
    website: 'https://sportfiske.se',
    address: 'Fiskevägen 8',
    city: 'Malmö',
    postalCode: '21134',
    country: 'Sverige',
    status: 'prospect',
    priority: 'high',
    source: 'referral',
    tags: ['sportfiske', 'malmö', 'potentiell-stor-kund'],
    notes: 'Rekommenderad av Erik från Fiskebutiken AB. Potentiellt stor kund.',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    companyName: 'Outdoor Adventure Norway',
    contactPerson: 'Ole Hansen',
    email: 'ole@outdooradventure.no',
    phone: '+4791234567',
    website: 'https://outdooradventure.no',
    address: 'Jernbanetorget 1',
    city: 'Oslo',
    postalCode: '0154',
    country: 'Norge',
    status: 'active',
    priority: 'medium',
    source: 'trade_show',
    tags: ['norge', 'outdoor', 'mässa'],
    notes: 'Träffades på fiskemässan i Oslo. Reguljär beställare.',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    companyName: 'Fiskecentret Danmark',
    contactPerson: 'Lars Nielsen',
    email: 'lars@fiskecentret.dk',
    phone: '+4512345678',
    website: 'https://fiskecentret.dk',
    address: 'Havnegade 15',
    city: 'København',
    postalCode: '1058',
    country: 'Danmark',
    status: 'inactive',
    priority: 'low',
    source: 'cold_call',
    tags: ['danmark', 'inaktiv', 'följup-behövs'],
    notes: 'Var aktiv 2023 men har inte beställt på länge. Behöver uppföljning.',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function createTestContacts() {
  console.log('🍽️ Creating test contacts for The Dining Wagon™...');
  
  try {
    const contactsRef = collection(db, 'diningContacts');
    
    for (const contact of testContacts) {
      const docRef = await addDoc(contactsRef, contact);
      console.log(`✅ Added contact: ${contact.companyName} (ID: ${docRef.id})`);
    }
    
    console.log(`🎉 Successfully created ${testContacts.length} test contacts!`);
    console.log('🍽️ The Dining Wagon™ is now ready to serve!');
    
  } catch (error) {
    console.error('❌ Error creating test contacts:', error);
  }
}

// Run the script
createTestContacts(); 