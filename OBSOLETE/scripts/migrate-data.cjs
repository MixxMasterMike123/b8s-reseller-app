const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
const serviceAccount = require('./temp/admin.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'b8shield-reseller-app'
});

async function migrateData() {
  try {
    console.log('Starting data migration...');
    
    // Get default database
    const defaultDb = admin.firestore();
    
    // Try to get named database - this might not work with current SDK version
    let namedDb;
    try {
      namedDb = admin.app().firestore('b8s-reseller-db');
    } catch (error) {
      console.error('Cannot access named database directly. Trying alternative approach...');
      console.error('Error:', error.message);
      
      // Alternative: Let's just check what's in the default database and see if we need to migrate
      console.log('Checking current default database contents...');
      
      // Check users
      const usersSnapshot = await defaultDb.collection('users').get();
      console.log(`Default database has ${usersSnapshot.size} users`);
      
      // Check orders  
      const ordersSnapshot = await defaultDb.collection('orders').get();
      console.log(`Default database has ${ordersSnapshot.size} orders`);
      
      // List some user details
      if (usersSnapshot.size > 0) {
        console.log('Users in default database:');
        usersSnapshot.forEach(doc => {
          const data = doc.data();
          console.log(`- ${data.email || 'No email'} (${data.companyName || 'No company'})`);
        });
      }
      
      // List some order details
      if (ordersSnapshot.size > 0) {
        console.log('Orders in default database:');
        ordersSnapshot.forEach(doc => {
          const data = doc.data();
          console.log(`- ${data.orderNumber || doc.id} (${data.status || 'No status'})`);
        });
      }
      
      return;
    }
    
    // If we get here, we can access the named database
    console.log('Successfully connected to named database');
    
    // Migrate users
    console.log('Migrating users...');
    const namedUsersSnapshot = await namedDb.collection('users').get();
    let migratedUsers = 0;
    
    for (const userDoc of namedUsersSnapshot.docs) {
      const userData = userDoc.data();
      await defaultDb.collection('users').doc(userDoc.id).set(userData);
      console.log(`Migrated user: ${userData.email || userDoc.id}`);
      migratedUsers++;
    }
    
    // Migrate orders
    console.log('Migrating orders...');
    const namedOrdersSnapshot = await namedDb.collection('orders').get();
    let migratedOrders = 0;
    
    for (const orderDoc of namedOrdersSnapshot.docs) {
      const orderData = orderDoc.data();
      await defaultDb.collection('orders').doc(orderDoc.id).set(orderData);
      console.log(`Migrated order: ${orderData.orderNumber || orderDoc.id}`);
      migratedOrders++;
    }
    
    console.log(`Migration completed! Migrated ${migratedUsers} users and ${migratedOrders} orders`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

migrateData(); 