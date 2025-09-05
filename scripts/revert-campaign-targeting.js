// Script to revert campaign targeting back to 'selected' (correct behavior)
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';

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

async function revertCampaignTargeting() {
  try {
    console.log('🔧 REVERTING campaign targeting back to selected (correct behavior)...\n');

    const campaigns = [
      {
        id: 'SZOKjPl1hkggNuoySzsh',
        name: 'KAJJAN Special Edition Revenue Share',
        targetAffiliateId: 'Og6tTmeexnb7RdDFqOgW' // KAJJAN10
      },
      {
        id: 'i8omz8jXuytnOMeuJb2y', 
        name: 'EMMA Special Edition Revenue Share',
        targetAffiliateId: '7S4ApdJeu2M12gZVUbrF9geNCzc2' // EMMA10
      }
    ];

    for (const campaign of campaigns) {
      console.log(`🔧 Reverting ${campaign.name}...`);
      
      // Get current data
      const campaignRef = doc(db, 'campaigns', campaign.id);
      const campaignDoc = await getDoc(campaignRef);
      
      if (!campaignDoc.exists()) {
        console.log(`❌ Campaign ${campaign.id} not found!`);
        continue;
      }
      
      const currentData = campaignDoc.data();
      console.log(`   Current targeting: ${currentData.selectedAffiliates}`);
      
      // Revert to selected targeting with specific affiliate
      const updateData = {
        selectedAffiliates: 'selected', // Back to selected
        affiliateIds: [campaign.targetAffiliateId], // Only target specific affiliate
        isRevenueShare: true,
        revenueShareRate: 50,
        revenueShareType: 'fixed_percentage',
        updatedAt: new Date(),
        updatedBy: 'revert-targeting-script'
      };
      
      console.log(`   Reverting to: selectedAffiliates: 'selected', affiliateIds: ['${campaign.targetAffiliateId}']`);
      
      await updateDoc(campaignRef, updateData);
      
      // Verify the update
      const updatedDoc = await getDoc(campaignRef);
      const updatedData = updatedDoc.data();
      
      console.log(`   ✅ Reverted targeting: ${updatedData.selectedAffiliates}`);
      console.log(`   ✅ Target affiliate: ${updatedData.affiliateIds?.[0]}`);
      console.log(`   ✅ Revenue share: ${updatedData.isRevenueShare} (${updatedData.revenueShareRate}%)\n`);
    }

    console.log('🎉 Campaigns reverted successfully!');
    console.log('📋 Now each affiliate sees ONLY their own campaign:');
    console.log('   - KAJJAN10 sees only KAJJAN Special Edition campaign');
    console.log('   - EMMA10 sees only EMMA Special Edition campaign');
    console.log('   - Products remain available to everyone in the shop');
    
  } catch (error) {
    console.error('❌ Error reverting campaigns:', error);
    throw error;
  }
}

// Run the script
revertCampaignTargeting()
  .then(() => {
    console.log('\n🚀 Revert complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Revert failed:', error);
    process.exit(1);
  });
