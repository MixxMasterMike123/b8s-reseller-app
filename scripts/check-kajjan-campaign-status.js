// Script to check KAJJAN campaign status and activate if needed
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDLNLhpnPLw8TbKPXGCbHJ6r4y8zTMBLmw",
  authDomain: "b8shield-reseller-app.firebaseapp.com",
  databaseURL: "https://b8shield-reseller-app-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "b8shield-reseller-app",
  storageBucket: "b8shield-reseller-app.firebasestorage.app",
  messagingSenderId: "1048859685969",
  appId: "1:1048859685969:web:c5c6f4e7e8f9a0b1c2d3e4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, 'b8s-reseller-db');

async function checkKajjanCampaignStatus() {
  try {
    console.log('🔍 Checking KAJJAN campaign status...\n');

    const campaignsRef = collection(db, 'campaigns');
    const campaignsSnap = await getDocs(campaignsRef);
    
    let kajjanCampaign = null;
    campaignsSnap.docs.forEach(doc => {
      const campaign = { id: doc.id, ...doc.data() };
      if (campaign.name?.['sv-SE']?.includes('KAJJAN')) {
        kajjanCampaign = campaign;
      }
    });
    
    if (!kajjanCampaign) {
      console.log('❌ KAJJAN campaign not found!');
      return;
    }
    
    console.log('📊 KAJJAN Campaign Status:');
    console.log(`   ID: ${kajjanCampaign.id}`);
    console.log(`   Name: ${kajjanCampaign.name?.['sv-SE']}`);
    console.log(`   Code: ${kajjanCampaign.code}`);
    console.log(`   Status: ${kajjanCampaign.status}`);
    console.log(`   Targeting: ${kajjanCampaign.selectedAffiliates}`);
    console.log(`   Affiliate IDs: ${JSON.stringify(kajjanCampaign.affiliateIds)}`);
    console.log(`   Start Date: ${kajjanCampaign.startDate?.toDate?.()?.toLocaleString('sv-SE') || kajjanCampaign.startDate}`);
    console.log(`   End Date: ${kajjanCampaign.endDate?.toDate?.()?.toLocaleString('sv-SE') || kajjanCampaign.endDate}`);
    console.log(`   Revenue Share: ${kajjanCampaign.isRevenueShare} (${kajjanCampaign.revenueShareRate}%)`);

    // Check if campaign needs to be activated
    if (kajjanCampaign.status !== 'active') {
      console.log('\n⚠️  KAJJAN campaign is not active! Activating now...');
      
      const campaignRef = doc(db, 'campaigns', kajjanCampaign.id);
      await updateDoc(campaignRef, {
        status: 'active',
        updatedAt: new Date(),
        updatedBy: 'activation-script'
      });
      
      console.log('✅ KAJJAN campaign activated!');
    } else {
      console.log('\n✅ KAJJAN campaign is already active');
    }

    // Check date validity
    const now = new Date();
    const startDate = kajjanCampaign.startDate?.toDate ? kajjanCampaign.startDate.toDate() : new Date(kajjanCampaign.startDate);
    const endDate = kajjanCampaign.endDate?.toDate ? kajjanCampaign.endDate.toDate() : new Date(kajjanCampaign.endDate);
    
    console.log(`\n📅 Date Check:`);
    console.log(`   Now: ${now.toLocaleString('sv-SE')}`);
    console.log(`   Start: ${startDate.toLocaleString('sv-SE')}`);
    console.log(`   End: ${endDate.toLocaleString('sv-SE')}`);
    console.log(`   Is Current: ${now >= startDate && now <= endDate ? '✅ YES' : '❌ NO'}`);

    if (now < startDate) {
      console.log('⚠️  Campaign has not started yet!');
    }
    if (now > endDate) {
      console.log('⚠️  Campaign has already ended!');
    }
    
  } catch (error) {
    console.error('❌ Error checking KAJJAN campaign:', error);
    throw error;
  }
}

// Run the script
checkKajjanCampaignStatus()
  .then(() => {
    console.log('\n🔍 KAJJAN campaign check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 KAJJAN campaign check failed:', error);
    process.exit(1);
  });
