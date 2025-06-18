import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

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

// Test order data
const testOrders = [
  {
    orderNumber: 'B8-20250118-1001',
    userId: 'test-user-1',
    companyName: 'Test Company AB',
    customerName: 'Test Customer',
    customerEmail: 'test@example.com',
    antalForpackningar: 50,
    color: 'Transparent',
    size: 'Storlek 4',
    marginal: 35,
    prisInfo: {
      produktPris: 3560,
      totalPris: 3560,
      marginalKr: 1246
    },
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    orderNumber: 'B8-20250118-1002',
    userId: 'test-user-2', 
    companyName: 'Another Test Company',
    customerName: 'Jane Doe',
    customerEmail: 'jane@example.com',
    antalForpackningar: 100,
    color: 'Röd',
    size: 'Storlek 6',
    marginal: 40,
    prisInfo: {
      produktPris: 7120,
      totalPris: 7120,
      marginalKr: 2848
    },
    status: 'processing',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    orderNumber: 'B8-20250118-1003',
    userId: 'test-user-3',
    companyName: 'Third Test Company',
    customerName: 'Bob Smith',
    customerEmail: 'bob@example.com',
    antalForpackningar: 25,
    color: 'Glitter',
    size: 'Storlek 2',
    marginal: 30,
    prisInfo: {
      produktPris: 1780,
      totalPris: 1780,
      marginalKr: 534
    },
    status: 'shipped',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
];

// Create test orders
async function createTestOrders() {
  try {
    console.log('Creating test orders...');
    
    for (const order of testOrders) {
      const docRef = await addDoc(collection(db, 'orders'), order);
      console.log(`✅ Created order ${order.orderNumber} with ID: ${docRef.id}`);
    }
    
    console.log('🎉 All test orders created successfully!');
    console.log('Now log in as admin (micke.ohlen@gmail.com) and go to Admin → Orders');
    
  } catch (error) {
    console.error('❌ Error creating test orders:', error);
  }
}

createTestOrders(); 