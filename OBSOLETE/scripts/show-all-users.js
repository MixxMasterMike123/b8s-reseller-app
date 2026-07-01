import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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
const db = getFirestore(app);

// Demo users from AuthContext (when app runs in demo mode)
const DEMO_USERS = [
  {
    id: 'admin-user-1',
    email: 'admin@example.com',
    companyName: 'B8shield Admin',
    contactPerson: 'Admin User',
    phoneNumber: '+1234567890',
    role: 'admin',
    active: true,
    source: 'DEMO MODE',
    credentials: 'No password needed in demo mode'
  },
  {
    id: 'user-1',
    email: 'user1@example.com',
    companyName: 'Company A',
    contactPerson: 'John Doe',
    phoneNumber: '+1987654321',
    role: 'user',
    active: true,
    source: 'DEMO MODE',
    credentials: 'No password needed in demo mode'
  },
  {
    id: 'user-2',
    email: 'user2@example.com',
    companyName: 'Company B',
    contactPerson: 'Jane Smith',
    phoneNumber: '+1122334455',
    role: 'user',
    active: false,
    source: 'DEMO MODE',
    credentials: 'No password needed in demo mode'
  },
];

// Test users created by scripts
const TEST_USERS = [
  {
    id: 'test-user-1',
    email: 'test@example.com',
    companyName: 'Test Company AB',
    contactPerson: 'Test Customer',
    phoneNumber: '+46701234567',
    role: 'user',
    active: true,
    source: 'TEST DATA',
    credentials: 'No authentication credentials - Firestore document only'
  },
  {
    id: 'test-user-2', 
    email: 'jane@example.com',
    companyName: 'Another Test Company',
    contactPerson: 'Jane Doe',
    phoneNumber: '+46707654321',
    role: 'user',
    active: true,
    source: 'TEST DATA',
    credentials: 'No authentication credentials - Firestore document only'
  },
  {
    id: 'test-user-3',
    email: 'bob@example.com',
    companyName: 'Third Test Company',
    contactPerson: 'Bob Smith',
    phoneNumber: '+46709876543',
    role: 'user',
    active: true,
    source: 'TEST DATA',
    credentials: 'No authentication credentials - Firestore document only'
  }
];

// Known admin user with actual Firebase Auth credentials
const ADMIN_USER = {
  id: '9AudFilG8VeYHcFnKgUtQkByAmn1',
  email: 'micke.ohlen@gmail.com',
  companyName: 'B8Shield Admin',
  contactPerson: 'Micke Ohlén',
  phoneNumber: '+46123456789',
  role: 'admin',
  active: true,
  source: 'FIREBASE AUTH + FIRESTORE',
  credentials: 'Password: temporaryPassword123 (from scripts/create-admin-auth.js)'
};

// Function to fetch users from Firestore
async function fetchFirestoreUsers() {
  try {
    console.log('🔍 Fetching users from Firestore...\n');
    
    const usersCollection = collection(db, 'users');
    const querySnapshot = await getDocs(usersCollection);
    
    const firestoreUsers = [];
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      firestoreUsers.push({
        id: doc.id,
        ...userData,
        source: 'FIRESTORE',
        credentials: doc.id === '9AudFilG8VeYHcFnKgUtQkByAmn1' 
          ? 'Password: temporaryPassword123'
          : 'No authentication credentials - Firestore document only'
      });
    });
    
    return firestoreUsers;
  } catch (error) {
    console.error('❌ Error fetching Firestore users:', error);
    return [];
  }
}

// Function to display user information
function displayUser(user, index) {
  console.log(`${index}. 👤 ${user.contactPerson || 'Unknown'}`);
  console.log(`   📧 Email: ${user.email}`);
  console.log(`   🏢 Company: ${user.companyName || 'N/A'}`);
  console.log(`   📱 Phone: ${user.phoneNumber || 'N/A'}`);
  console.log(`   👑 Role: ${user.role || 'user'}`);
  console.log(`   ✅ Active: ${user.active || user.isActive ? 'Yes' : 'No'}`);
  console.log(`   📍 Source: ${user.source}`);
  console.log(`   🔐 Credentials: ${user.credentials}`);
  console.log(`   🆔 ID: ${user.id}`);
  console.log('   ' + '─'.repeat(50));
}

// Main function to show all users
async function showAllUsers() {
  console.log('🔍 B8Shield Portal - All Users with Credentials\n');
  console.log('=' .repeat(60));
  
  let userCount = 0;
  
  // Show Demo Mode Users
  console.log('\n📱 DEMO MODE USERS (Available when isDemoMode = true)');
  console.log('─'.repeat(60));
  DEMO_USERS.forEach((user, index) => {
    displayUser(user, ++userCount);
  });
  
  // Show Known Admin User with Auth
  console.log('\n🔧 ADMIN USER WITH FIREBASE AUTH');
  console.log('─'.repeat(60));
  displayUser(ADMIN_USER, ++userCount);
  
  // Show Test Users
  console.log('\n🧪 TEST USERS (Created by scripts/create-test-users.js)');
  console.log('─'.repeat(60));
  TEST_USERS.forEach((user, index) => {
    displayUser(user, ++userCount);
  });
  
  // Fetch and show Firestore users
  const firestoreUsers = await fetchFirestoreUsers();
  if (firestoreUsers.length > 0) {
    console.log('\n🗃️  FIRESTORE USERS (Live data from database)');
    console.log('─'.repeat(60));
    firestoreUsers.forEach((user, index) => {
      displayUser(user, ++userCount);
    });
  }
  
  console.log(`\n📊 SUMMARY:`);
  console.log(`   Total users found: ${userCount}`);
  console.log(`   Demo users: ${DEMO_USERS.length}`);
  console.log(`   Admin with auth: 1`);
  console.log(`   Test users: ${TEST_USERS.length}`);
  console.log(`   Firestore users: ${firestoreUsers.length}`);
  
  console.log('\n💡 IMPORTANT NOTES:');
  console.log('   • Demo users work only when isDemoMode = true in firebase/config.js');
  console.log('   • Admin user (micke.ohlen@gmail.com) has actual Firebase Auth credentials');
  console.log('   • Test users are Firestore documents without Firebase Auth');
  console.log('   • Some users may appear in both Firestore and other lists');
  
  console.log('\n🔐 LOGIN CREDENTIALS:');
  console.log('   • Admin: micke.ohlen@gmail.com / temporaryPassword123');
  console.log('   • Demo users: Any email from demo list (no password required)');
  console.log('   • Test users: Cannot login (no Firebase Auth records)');
}

// Run the script
showAllUsers().catch(console.error); 