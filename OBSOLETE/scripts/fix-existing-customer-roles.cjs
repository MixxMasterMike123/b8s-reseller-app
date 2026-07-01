const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://b8shield-reseller-app-default-rtdb.firebaseio.com/'
  });
}

// Use the named database
const db = admin.firestore();
db.settings({ databaseId: 'b8s-reseller-db' });

async function fixExistingCustomerRoles() {
  console.log('🔧 B8Shield Customer Role Fix');
  console.log('=============================');
  console.log('Fixing existing B2B customers with wrong roles...\n');

  try {
    // Get all users from the database
    const usersSnapshot = await db.collection('users').get();
    const allUsers = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📊 Found ${allUsers.length} total users in database\n`);

    // Identify users that should be B2B customers (resellers)
    const potentialB2BCustomers = allUsers.filter(user => {
      // Skip admins
      if (user.role === 'admin') return false;
      
      // Skip if already has correct role
      if (user.role === 'reseller') return false;
      
      // Look for B2B indicators:
      // 1. Has company information (companyName, orgNumber, etc.)
      // 2. NOT created by admin (manual prospects should stay as 'user')
      return (
        user.companyName && 
        user.contactPerson && 
        !user.createdByAdmin && // Don't touch manual prospects
        user.role === 'user' // Currently has wrong role
      );
    });

    console.log(`🎯 Found ${potentialB2BCustomers.length} B2B customers with wrong roles:`);
    console.log('=====================================================');

    if (potentialB2BCustomers.length === 0) {
      console.log('✅ No customers need role updates!');
      return;
    }

    // Show what we found
    potentialB2BCustomers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.companyName} (${user.email})`);
      console.log(`   Contact: ${user.contactPerson}`);
      console.log(`   Current Role: ${user.role} → Will change to: reseller`);
      console.log(`   Active: ${user.active}`);
      console.log(`   Created: ${user.createdAt || 'Unknown'}`);
      console.log(`   ---`);
    });

    console.log(`\n🚀 Updating ${potentialB2BCustomers.length} customer roles...`);

    let successCount = 0;
    let errorCount = 0;

    // Update each customer
    for (const user of potentialB2BCustomers) {
      try {
        await db.collection('users').doc(user.id).update({
          role: 'reseller',
          updatedAt: new Date().toISOString(),
          roleFixedAt: new Date().toISOString() // Track when we fixed this
        });
        
        console.log(`✅ Fixed: ${user.companyName} (${user.email})`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to fix ${user.companyName}: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n🎯 RESULTS:');
    console.log('===========');
    console.log(`✅ Successfully updated: ${successCount} customers`);
    console.log(`❌ Failed to update: ${errorCount} customers`);
    console.log(`📊 Total processed: ${potentialB2BCustomers.length} customers`);

    if (successCount > 0) {
      console.log('\n🎉 SUCCESS! B2B customers should now appear in admin interface!');
      console.log('🔄 Refresh your admin panel to see the updated customer list.');
    }

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Run the fix
console.log('🚨 Starting customer role fix...\n');

fixExistingCustomerRoles().then(() => {
  console.log('\n✅ Customer role fix completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Customer role fix failed:', error);
  process.exit(1);
});
