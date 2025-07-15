const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin (uses default credentials)
admin.initializeApp();

// Initialize Firestore for the CORRECT named database
const db = getFirestore('b8s-reseller-db');
db.settings({ ignoreUndefinedProperties: true });

const AFFILIATES_TO_ZERO = [
  {
    name: 'Emma Mattsdal',
    email: 'e.mattsdal@gmail.com',
    code: 'EMMA-768',
    id: '7S4ApdJeu2M12gZVUbrF9geNCzc2'
  },
  {
    name: 'Bill Karlberg',
    email: 'bill.karlberg@gmail.com',
    code: 'KALLBERG-644',
    id: 'EFbSHLocwCk5nMFSAEC8'
  }
];

async function zeroOutAffiliate(affiliate) {
  console.log(`\n🔄 Zeroing out affiliate: ${affiliate.name} (${affiliate.code})`);
  
  try {
    // 1. Update affiliate document to reset stats
    const affiliateRef = db.collection('affiliates').doc(affiliate.id);
    await affiliateRef.update({
      stats: {
        clicks: 0,
        conversions: 0,
        totalEarnings: 0,
        balance: 0
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`✅ Reset stats for ${affiliate.name}`);

    // 2. Delete all affiliate clicks
    const clicksRef = db.collection('affiliateClicks');
    const clicksQuery = clicksRef.where('affiliateCode', '==', affiliate.code);
    const clicksSnapshot = await clicksQuery.get();
    
    if (!clicksSnapshot.empty) {
      const batch = db.batch();
      clicksSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`🗑️ Deleted ${clicksSnapshot.size} click records for ${affiliate.code}`);
    } else {
      console.log(`ℹ️ No click records found for ${affiliate.code}`);
    }

    // 3. Update orders to remove affiliate attribution
    const ordersRef = db.collection('orders');
    const ordersQuery = ordersRef.where('affiliateCode', '==', affiliate.code);
    const ordersSnapshot = await ordersQuery.get();
    
    if (!ordersSnapshot.empty) {
      const batch = db.batch();
      ordersSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          affiliateCode: null,
          affiliateCommission: 0,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      await batch.commit();
      console.log(`🔄 Removed affiliate attribution from ${ordersSnapshot.size} orders for ${affiliate.code}`);
    } else {
      console.log(`ℹ️ No orders found with affiliate code ${affiliate.code}`);
    }

    // 4. Delete affiliate payouts (if any)
    const payoutsRef = db.collection('affiliatePayouts');
    const payoutsQuery = payoutsRef.where('affiliateId', '==', affiliate.id);
    const payoutsSnapshot = await payoutsQuery.get();
    
    if (!payoutsSnapshot.empty) {
      const batch = db.batch();
      payoutsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`🗑️ Deleted ${payoutsSnapshot.size} payout records for ${affiliate.name}`);
    } else {
      console.log(`ℹ️ No payout records found for ${affiliate.name}`);
    }

    console.log(`✅ Successfully zeroed out ${affiliate.name}`);
    
  } catch (error) {
    console.error(`❌ Error zeroing out ${affiliate.name}:`, error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting affiliate data reset...');
  console.log(`📋 Affiliates to zero out: ${AFFILIATES_TO_ZERO.length}`);
  
  for (const affiliate of AFFILIATES_TO_ZERO) {
    console.log(`\n--- ${affiliate.name} ---`);
    console.log(`Email: ${affiliate.email}`);
    console.log(`Code: ${affiliate.code}`);
    console.log(`ID: ${affiliate.id}`);
  }
  
  console.log('\n⚠️ This will:');
  console.log('  • Reset all stats to 0 (clicks, conversions, earnings)');
  console.log('  • Delete all click tracking records');
  console.log('  • Remove affiliate attribution from orders');
  console.log('  • Delete all payout records');
  console.log('  • Keep affiliate accounts active');
  
  // Ask for confirmation
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const answer = await new Promise(resolve => {
    rl.question('\n❓ Are you sure you want to proceed? (yes/no): ', resolve);
  });
  
  rl.close();
  
  if (answer.toLowerCase() !== 'yes') {
    console.log('❌ Operation cancelled');
    process.exit(0);
  }
  
  console.log('\n🔄 Proceeding with reset...');
  
  try {
    for (const affiliate of AFFILIATES_TO_ZERO) {
      await zeroOutAffiliate(affiliate);
    }
    
    console.log('\n🎉 Successfully zeroed out all affiliate data!');
    console.log('✅ Affiliate accounts are still active and ready for fresh start');
    
  } catch (error) {
    console.error('\n❌ Error during reset:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main(); 