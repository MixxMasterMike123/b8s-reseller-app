import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCsYgMVRlipm-PxsHPZOxew5tqcZ_3Kccw",
  authDomain: "b8shield-reseller-app.firebaseapp.com",
  projectId: "b8shield-reseller-app",
  storageBucket: "b8shield-reseller-app.appspot.com",
  messagingSenderId: "996315128348",
  appId: "1:996315128348:web:75388494e2bcdfa1f3f5d9",
  measurementId: "G-7JFF08MLM2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // Use default database for Functions compatibility

// Test user data that matches the test orders
const testUsers = [
  {
    id: 'test-user-1',
    email: 'test@example.com',
    companyName: 'Test Company AB',
    contactPerson: 'Test Customer',
    phoneNumber: '+46701234567',
    address: 'Testgatan 123, 111 22 Stockholm',
    role: 'user',
    active: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'test-user-2',
    email: 'jane@example.com',
    companyName: 'Another Test Company',
    contactPerson: 'Jane Doe',
    phoneNumber: '+46707654321',
    address: 'Drottninggatan 456, 222 33 Göteborg',
    role: 'user',
    active: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'test-user-3',
    email: 'bob@example.com',
    companyName: 'Third Test Company',
    contactPerson: 'Bob Smith',
    phoneNumber: '+46709876543',
    address: 'Kungsgatan 789, 333 44 Malmö',
    role: 'user',
    active: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Create test users
async function createTestUsers() {
  try {
    console.log('Creating test users...');
    
    for (const user of testUsers) {
      const { id, ...userData } = user;
      await setDoc(doc(db, 'users', id), userData);
      console.log(`✅ Created user ${userData.contactPerson} (${userData.email}) with ID: ${id}`);
    }
    
    console.log('🎉 All test users created successfully!');
    console.log('Now refresh the admin order details page to see the customer information!');
    
  } catch (error) {
    console.error('❌ Error creating test users:', error);
  }
}

createTestUsers(); 