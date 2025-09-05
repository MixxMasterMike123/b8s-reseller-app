/**
 * Credit KAJJAN10 for missing commission from order B8S-249100-6RPW
 * This order was processed before the localStorage bug fix and missed commission calculation
 */

const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
db.settings({ databaseId: 'b8s-reseller-db' });

async function creditKajjanMissingCommission() {
  try {
    console.log('🔍 Starting KAJJAN10 missing commission credit process...');
    console.log('');

    // Order details
    const orderNumber = 'B8S-249100-6RPW';
    const orderTotal = 109.00; // SEK
    const shipping = 29.00; // SEK
    const affiliateCode = 'KAJJAN10';
    const commissionRate = 20; // 20%
    
    // Calculate missing commission
    const productValue = orderTotal - shipping; // 80 SEK
    const productValueExVAT = productValue / 1.25; // 64 SEK (remove 25% VAT)
    const commission = Math.round((productValueExVAT * (commissionRate / 100)) * 100) / 100; // 12.80 SEK
    
    console.log('📊 Commission Calculation:');
    console.log(`Order: ${orderNumber}`);
    console.log(`Total: ${orderTotal} SEK`);
    console.log(`Shipping: ${shipping} SEK`);
    console.log(`Product value: ${productValue} SEK`);
    console.log(`Product value ex-VAT: ${productValueExVAT} SEK`);
    console.log(`Commission (${commissionRate}%): ${commission} SEK`);
    console.log('');

    // Find KAJJAN10 affiliate
    console.log('🔍 Finding KAJJAN10 affiliate...');
    const affiliatesRef = db.collection('affiliates');
    const affiliateQuery = affiliatesRef.where('affiliateCode', '==', affiliateCode);
    const affiliateSnapshot = await affiliateQuery.get();

    if (affiliateSnapshot.empty) {
      console.error('❌ KAJJAN10 affiliate not found!');
      return;
    }

    const affiliateDoc = affiliateSnapshot.docs[0];
    const affiliateData = affiliateDoc.data();
    const affiliateId = affiliateDoc.id;

    console.log(`✅ Found affiliate: ${affiliateData.name || affiliateData.email}`);
    console.log(`Current total earnings: ${affiliateData.stats?.totalEarnings || 0} SEK`);
    console.log(`Current balance: ${affiliateData.stats?.balance || 0} SEK`);
    console.log('');

    // Update affiliate stats
    console.log('💰 Crediting missing commission...');
    const currentEarnings = affiliateData.stats?.totalEarnings || 0;
    const currentBalance = affiliateData.stats?.balance || 0;
    const currentConversions = affiliateData.stats?.conversions || 0;

    const updatedStats = {
      ...affiliateData.stats,
      totalEarnings: Math.round((currentEarnings + commission) * 100) / 100,
      balance: Math.round((currentBalance + commission) * 100) / 100,
      conversions: currentConversions // Don't increment - order already counted
    };

    await affiliateDoc.ref.update({
      stats: updatedStats,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Affiliate stats updated successfully!');
    console.log(`New total earnings: ${updatedStats.totalEarnings} SEK`);
    console.log(`New balance: ${updatedStats.balance} SEK`);
    console.log('');

    // Create affiliate click record for audit trail
    console.log('📝 Creating audit trail...');
    const clicksRef = db.collection('affiliateClicks');
    await clicksRef.add({
      affiliateCode: affiliateCode,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ipAddress: 'MANUAL_CREDIT',
      userAgent: 'Admin Manual Credit Script',
      landingPage: `/admin/manual-credit/${orderNumber}`,
      converted: true,
      orderId: `MANUAL_CREDIT_${orderNumber}`,
      commissionAmount: commission,
      notes: `Manual credit for missing commission from order ${orderNumber} (localStorage bug fix)`
    });

    console.log('✅ Audit trail created successfully!');
    console.log('');

    // Summary
    console.log('🎉 COMMISSION CREDIT COMPLETED!');
    console.log('');
    console.log('📋 SUMMARY:');
    console.log(`Affiliate: KAJJAN10`);
    console.log(`Order: ${orderNumber}`);
    console.log(`Commission credited: ${commission} SEK`);
    console.log(`Reason: Missing commission due to localStorage bug (fixed Sept 4th)`);
    console.log(`Date: ${new Date().toISOString()}`);
    console.log('');
    console.log('✅ KAJJAN10 has been properly credited for the missing commission!');

  } catch (error) {
    console.error('❌ Error crediting commission:', error);
  }

  process.exit(0);
}

// Run the script
creditKajjanMissingCommission();
