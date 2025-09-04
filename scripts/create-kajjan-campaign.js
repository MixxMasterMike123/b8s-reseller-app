// Script to create the KAJJAN10 Special Edition Revenue Share Campaign
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

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

async function createKajjanCampaign() {
  try {
    console.log('🎯 Creating KAJJAN10 Special Edition Revenue Share Campaign...');

    // First, get KAJJAN10 affiliate ID
    console.log('📋 Finding KAJJAN10 affiliate...');
    const affiliatesRef = collection(db, 'affiliates');
    const kajjanQuery = query(affiliatesRef, where('affiliateCode', '==', 'KAJJAN10'));
    const kajjanSnap = await getDocs(kajjanQuery);
    
    if (kajjanSnap.empty) {
      throw new Error('KAJJAN10 affiliate not found! Please create the affiliate first.');
    }
    
    const kajjanAffiliate = kajjanSnap.docs[0];
    const kajjanId = kajjanAffiliate.id;
    const kajjanData = kajjanAffiliate.data();
    
    console.log(`✅ Found KAJJAN10 affiliate: ${kajjanData.name} (ID: ${kajjanId})`);

    // Get all Special Edition products (products with "Special" in the name)
    console.log('📋 Finding Special Edition products...');
    const productsRef = collection(db, 'products');
    const productsSnap = await getDocs(productsRef);
    
    const specialEditionProducts = [];
    productsSnap.docs.forEach(doc => {
      const product = doc.data();
      const productName = product.name?.['sv-SE'] || product.name || '';
      if (productName.toLowerCase().includes('special') || 
          productName.toLowerCase().includes('kajjan')) {
        specialEditionProducts.push(doc.id);
        console.log(`   - Found: ${productName} (${doc.id})`);
      }
    });
    
    if (specialEditionProducts.length === 0) {
      console.warn('⚠️ No Special Edition products found. Campaign will apply to all products.');
    } else {
      console.log(`✅ Found ${specialEditionProducts.length} Special Edition products`);
    }

    // Create the campaign
    const campaignData = {
      // Multilingual content
      name: {
        'sv-SE': 'KAJJAN Special Edition Revenue Share',
        'en-GB': 'KAJJAN Special Edition Revenue Share',
        'en-US': 'KAJJAN Special Edition Revenue Share'
      },
      description: {
        'sv-SE': 'KAJJAN10 får 50% av intäkterna från alla Special Edition försäljningar',
        'en-GB': 'KAJJAN10 receives 50% of revenue from all Special Edition sales',
        'en-US': 'KAJJAN10 receives 50% of revenue from all Special Edition sales'
      },
      affiliateInfo: {
        'sv-SE': 'Denna kampanj ger KAJJAN10 50% av intäkterna efter att affiliate-provisionen har dragits av',
        'en-GB': 'This campaign gives KAJJAN10 50% of revenue after affiliate commission is deducted',
        'en-US': 'This campaign gives KAJJAN10 50% of revenue after affiliate commission is deducted'
      },
      
      // Campaign identity
      code: '', // No specific code required - works with any affiliate code
      type: 'special_discount',
      status: 'active',
      
      // Targeting - KAJJAN10 gets revenue share from ANY affiliate's sales of Special Editions
      selectedAffiliates: 'selected',
      affiliateIds: [kajjanId], // KAJJAN10 is the revenue share recipient
      
      // Product targeting
      applicableProducts: specialEditionProducts.length > 0 ? 'selected' : 'all',
      productIds: specialEditionProducts,
      
      // Revenue sharing configuration
      isRevenueShare: true,
      revenueShareRate: 50, // KAJJAN gets 50% of remaining amount
      revenueShareType: 'fixed_percentage',
      
      // Standard campaign fields
      customAffiliateRate: 20, // Standard affiliate rate (not used for revenue share)
      customerDiscountRate: 10, // Standard customer discount
      
      // Social media assets
      banners: {},
      
      // Competition features
      isLottery: false,
      lotteryRules: {
        'sv-SE': '',
        'en-GB': '',
        'en-US': ''
      },
      maxParticipants: null,
      
      // Analytics
      totalClicks: 0,
      totalConversions: 0,
      totalRevenue: 0,
      
      // Dates - Active for 1 year
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      
      // System fields
      createdAt: new Date(),
      createdBy: 'system-script',
      updatedAt: new Date()
    };

    // Add campaign to database
    console.log('💾 Creating campaign in database...');
    const campaignsRef = collection(db, 'campaigns');
    const campaignRef = await addDoc(campaignsRef, campaignData);
    
    console.log(`✅ KAJJAN10 Special Edition Campaign created successfully!`);
    console.log(`   Campaign ID: ${campaignRef.id}`);
    console.log(`   Revenue Share: 50% to KAJJAN10`);
    console.log(`   Products: ${specialEditionProducts.length > 0 ? `${specialEditionProducts.length} Special Edition products` : 'All products'}`);
    console.log(`   Status: Active`);
    console.log(`   Valid until: ${campaignData.endDate.toLocaleDateString('sv-SE')}`);

    console.log('\n🎯 Campaign Details:');
    console.log('   - ANY affiliate can drive sales of Special Edition products');
    console.log('   - The referring affiliate gets their normal commission (e.g., EMMA10 gets 20%)');
    console.log('   - KAJJAN10 gets 50% of the remaining revenue after affiliate commission');
    console.log('   - Company keeps 50% of the remaining revenue');
    
    console.log('\n📊 Example calculation (89 SEK Special Edition with EMMA10 code):');
    console.log('   1. Customer discount (10%): 89 × 0.10 = 8.90 SEK');
    console.log('   2. Price after discount: 89 - 8.90 = 80.10 SEK');
    console.log('   3. EMMA10 commission (20%): 80.10 × 0.20 = 16.02 SEK');
    console.log('   4. Remaining for split: 80.10 - 16.02 = 64.08 SEK');
    console.log('   5. KAJJAN10 share (50%): 64.08 × 0.50 = 32.04 SEK');
    console.log('   6. Company share (50%): 64.08 × 0.50 = 32.04 SEK');

    return campaignRef.id;
    
  } catch (error) {
    console.error('❌ Error creating KAJJAN campaign:', error);
    throw error;
  }
}

// Run the script
createKajjanCampaign()
  .then((campaignId) => {
    console.log(`\n🚀 KAJJAN10 Campaign is now LIVE! Campaign ID: ${campaignId}`);
    console.log('   Next order with Special Edition products will trigger the revenue share!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed to create campaign:', error);
    process.exit(1);
  });
