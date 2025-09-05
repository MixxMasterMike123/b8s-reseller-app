// Script to debug specifically why KAJJAN10 can't access their campaign
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

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

async function debugKajjanAccess() {
  try {
    console.log('🔍 Debugging KAJJAN10 campaign access specifically...\n');

    // 1. Find KAJJAN10 affiliate
    console.log('📋 STEP 1: Finding KAJJAN10 affiliate...');
    const affiliatesRef = collection(db, 'affiliates');
    const kajjanQuery = query(affiliatesRef, where('affiliateCode', '==', 'KAJJAN10'));
    const kajjanSnap = await getDocs(kajjanQuery);
    
    if (kajjanSnap.empty) {
      console.log('❌ KAJJAN10 affiliate not found!');
      return;
    }
    
    const kajjanDoc = kajjanSnap.docs[0];
    const kajjanData = { id: kajjanDoc.id, ...kajjanDoc.data() };
    
    console.log('✅ KAJJAN10 found:');
    console.log(`   ID: ${kajjanData.id}`);
    console.log(`   Name: ${kajjanData.name}`);
    console.log(`   Email: ${kajjanData.email}`);
    console.log(`   Status: ${kajjanData.status}`);
    console.log(`   Created: ${kajjanData.createdAt?.toDate?.()?.toLocaleString('sv-SE')}`);

    // 2. Find KAJJAN campaign
    console.log('\n📋 STEP 2: Finding KAJJAN campaign...');
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
    
    console.log('✅ KAJJAN campaign found:');
    console.log(`   ID: ${kajjanCampaign.id}`);
    console.log(`   Name: ${kajjanCampaign.name?.['sv-SE']}`);
    console.log(`   Code: ${kajjanCampaign.code}`);
    console.log(`   Status: ${kajjanCampaign.status}`);
    console.log(`   Targeting: ${kajjanCampaign.selectedAffiliates}`);
    console.log(`   Affiliate IDs: ${JSON.stringify(kajjanCampaign.affiliateIds)}`);
    console.log(`   Revenue Share: ${kajjanCampaign.isRevenueShare} (${kajjanCampaign.revenueShareRate}%)`);

    // 3. Check the exact matching logic
    console.log('\n📋 STEP 3: Testing campaign matching logic...');
    
    // Simulate the exact logic from AffiliatePortalCampaigns.jsx
    const shouldShowCampaign = (campaign, affiliateData) => {
      // Only show active campaigns
      if (campaign.status !== 'active') {
        console.log(`   ❌ Campaign not active: ${campaign.status}`);
        return false;
      }
      
      // Show campaigns that target all affiliates
      if (campaign.selectedAffiliates === 'all') {
        console.log(`   ✅ Campaign targets ALL affiliates`);
        return true;
      }
      
      // Show campaigns that specifically target this affiliate
      if (campaign.selectedAffiliates === 'selected' && campaign.affiliateIds?.includes(affiliateData.id)) {
        console.log(`   ✅ Campaign specifically targets this affiliate`);
        console.log(`      Looking for: ${affiliateData.id}`);
        console.log(`      In array: ${JSON.stringify(campaign.affiliateIds)}`);
        console.log(`      Match: ${campaign.affiliateIds.includes(affiliateData.id)}`);
        return true;
      }
      
      console.log(`   ❌ Campaign does not target this affiliate`);
      console.log(`      Targeting: ${campaign.selectedAffiliates}`);
      console.log(`      Affiliate IDs: ${JSON.stringify(campaign.affiliateIds)}`);
      console.log(`      Looking for: ${affiliateData.id}`);
      return false;
    };
    
    const shouldShow = shouldShowCampaign(kajjanCampaign, kajjanData);
    console.log(`\n📊 RESULT: Should KAJJAN10 see their campaign? ${shouldShow ? '✅ YES' : '❌ NO'}`);

    // 4. Check for any potential issues
    console.log('\n📋 STEP 4: Checking for potential issues...');
    
    if (kajjanData.status !== 'active') {
      console.log('⚠️  ISSUE: KAJJAN10 affiliate status is not active!');
    }
    
    if (kajjanCampaign.status !== 'active') {
      console.log('⚠️  ISSUE: KAJJAN campaign status is not active!');
    }
    
    if (!kajjanCampaign.affiliateIds || kajjanCampaign.affiliateIds.length === 0) {
      console.log('⚠️  ISSUE: KAJJAN campaign has no affiliate IDs!');
    }
    
    if (kajjanCampaign.affiliateIds && !kajjanCampaign.affiliateIds.includes(kajjanData.id)) {
      console.log('⚠️  ISSUE: KAJJAN10 ID not found in campaign affiliate IDs!');
      console.log(`   KAJJAN10 ID: ${kajjanData.id}`);
      console.log(`   Campaign IDs: ${JSON.stringify(kajjanCampaign.affiliateIds)}`);
    }

    // 5. Compare with EMMA10 for reference
    console.log('\n📋 STEP 5: Comparing with EMMA10...');
    const emmaQuery = query(affiliatesRef, where('affiliateCode', '==', 'EMMA10'));
    const emmaSnap = await getDocs(emmaQuery);
    
    if (!emmaSnap.empty) {
      const emmaDoc = emmaSnap.docs[0];
      const emmaData = { id: emmaDoc.id, ...emmaDoc.data() };
      
      console.log('📊 EMMA10 for comparison:');
      console.log(`   ID: ${emmaData.id}`);
      console.log(`   Status: ${emmaData.status}`);
      
      // Find EMMA campaign
      let emmaCampaign = null;
      campaignsSnap.docs.forEach(doc => {
        const campaign = { id: doc.id, ...doc.data() };
        if (campaign.name?.['sv-SE']?.includes('EMMA')) {
          emmaCampaign = campaign;
        }
      });
      
      if (emmaCampaign) {
        console.log('📊 EMMA campaign for comparison:');
        console.log(`   Status: ${emmaCampaign.status}`);
        console.log(`   Targeting: ${emmaCampaign.selectedAffiliates}`);
        console.log(`   Affiliate IDs: ${JSON.stringify(emmaCampaign.affiliateIds)}`);
        console.log(`   EMMA10 in IDs: ${emmaCampaign.affiliateIds?.includes(emmaData.id)}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error debugging KAJJAN access:', error);
    throw error;
  }
}

// Run the script
debugKajjanAccess()
  .then(() => {
    console.log('\n🔍 KAJJAN debugging complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 KAJJAN debugging failed:', error);
    process.exit(1);
  });
