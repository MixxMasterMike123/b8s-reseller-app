import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, addDoc, doc, serverTimestamp } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Firebase config (using the same config as the app)
const firebaseConfig = {
  apiKey: "AIzaSyCsYgMVRlipm-PxsHPZOxew5tqcZ_3Kccw",
  authDomain: "shop.b8shield.com",
  projectId: "b8shield-reseller-app",
  storageBucket: "b8shield-reseller-app.firebasestorage.app",
  messagingSenderId: "996315128348",
  appId: "1:996315128348:web:75388494e2bcdfa1f3f5d9",
  measurementId: "G-7JFF08MLM2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, 'b8s-reseller-db'); // Use named database
const auth = getAuth(app);

// CSV file path
const csvFilePath = path.join(__dirname, '../affiliate-wp-export-affiliates-07-15-2025.csv');

// Function to parse CSV
function parseCSV(csvContent) {
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }
  }
  
  return data;
}

// Function to generate affiliate code
function generateAffiliateCode(name) {
  const namePart = name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').substring(0, 8);
  const randomPart = Math.floor(100 + Math.random() * 900);
  return `${namePart}-${randomPart}`;
}

// Function to check if affiliate already exists
async function checkExistingAffiliate(email) {
  try {
    const affiliatesRef = collection(db, 'affiliates');
    const q = query(affiliatesRef, where('email', '==', email));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking existing affiliate:', error);
    return false;
  }
}

// Function to create Firebase Auth user
async function createAuthUser(email, name, tempPassword) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, tempPassword);
    return userCredential.user;
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      console.log(`User with email ${email} already exists in Auth`);
      // Try to sign in to get the user
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, tempPassword);
        return userCredential.user;
      } catch (signInError) {
        console.error('Error signing in existing user:', signInError);
        return null;
      }
    } else {
      console.error('Error creating auth user:', error);
      return null;
    }
  }
}

// Function to import affiliate
async function importAffiliate(affiliateData) {
  const email = affiliateData['Email'];
  const firstName = affiliateData['First Name'];
  const lastName = affiliateData['Last Name'];
  const name = `${firstName} ${lastName}`.trim();
  const rate = parseFloat(affiliateData['Rate']) || 0.2; // Convert percentage to decimal
  const earnings = parseFloat(affiliateData['Earnings']) || 0;
  const unpaidEarnings = parseFloat(affiliateData['Unpaid Earnings']) || 0;
  const referrals = parseInt(affiliateData['Referrals']) || 0;
  const visits = parseInt(affiliateData['Visits']) || 0;
  const status = affiliateData['Status'] === 'active' ? 'active' : 'suspended';
  const dateRegistered = affiliateData['Date Registered'];

  console.log(`\n📋 Processing affiliate: ${name} (${email})`);

  // Check if affiliate already exists
  const exists = await checkExistingAffiliate(email);
  if (exists) {
    console.log(`⏭️  Affiliate ${email} already exists, skipping...`);
    return { status: 'skipped', reason: 'already_exists' };
  }

  // Generate affiliate code
  const affiliateCode = generateAffiliateCode(name);
  
  // Generate temporary password
  const tempPassword = Math.random().toString(36).slice(-8);

  // Create Firebase Auth user
  console.log(`🔐 Creating Firebase Auth user for ${email}...`);
  const authUser = await createAuthUser(email, name, tempPassword);
  
  if (!authUser) {
    console.log(`❌ Failed to create auth user for ${email}`);
    return { status: 'failed', reason: 'auth_creation_failed' };
  }

  // Create affiliate record
  const affiliateRecord = {
    id: authUser.uid,
    affiliateCode: affiliateCode,
    name: name,
    email: email,
    status: status,
    commissionRate: rate * 100, // Convert back to percentage for B8Shield
    checkoutDiscount: 10, // Default discount
    stats: {
      clicks: visits,
      conversions: referrals,
      totalEarnings: earnings,
      balance: unpaidEarnings
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    // Import date for reference
    importedFrom: 'wordpress_csv',
    originalData: {
      rate: rate,
      earnings: earnings,
      unpaidEarnings: unpaidEarnings,
      referrals: referrals,
      visits: visits,
      dateRegistered: dateRegistered
    }
  };

  try {
    console.log(`💾 Creating affiliate record in Firestore...`);
    // Use the auth UID as the document ID to match the expected structure
    const affiliateRef = doc(db, 'affiliates', authUser.uid);
    await affiliateRef.set(affiliateRecord);
    
    console.log(`✅ Successfully imported affiliate: ${name}`);
    console.log(`   📧 Email: ${email}`);
    console.log(`   🏷️  Affiliate Code: ${affiliateCode}`);
    console.log(`   🔑 Temp Password: ${tempPassword}`);
    console.log(`   💰 Commission Rate: ${(rate * 100).toFixed(1)}%`);
    console.log(`   📊 Stats: ${visits} visits, ${referrals} conversions, ${unpaidEarnings} unpaid earnings`);
    
    return { 
      status: 'success', 
      affiliateCode, 
      tempPassword,
      stats: { visits, referrals, unpaidEarnings }
    };
  } catch (error) {
    console.error(`❌ Error creating affiliate record for ${email}:`, error);
    return { status: 'failed', reason: 'firestore_error', error: error.message };
  }
}

// Main import function
async function importAffiliates() {
  try {
    console.log('🚀 Starting affiliate import from CSV...');
    
    // Check if CSV file exists
    if (!fs.existsSync(csvFilePath)) {
      console.error(`❌ CSV file not found: ${csvFilePath}`);
      return;
    }

    // Read and parse CSV
    console.log(`📖 Reading CSV file: ${csvFilePath}`);
    const csvContent = fs.readFileSync(csvFilePath, 'utf8');
    const affiliates = parseCSV(csvContent);
    
    console.log(`📊 Found ${affiliates.length} affiliates in CSV`);

    // Import results tracking
    const results = {
      total: affiliates.length,
      imported: 0,
      skipped: 0,
      failed: 0,
      details: []
    };

    // Process each affiliate
    for (const affiliate of affiliates) {
      const result = await importAffiliate(affiliate);
      results.details.push({
        email: affiliate['Email'],
        name: `${affiliate['First Name']} ${affiliate['Last Name']}`.trim(),
        ...result
      });

      if (result.status === 'success') {
        results.imported++;
      } else if (result.status === 'skipped') {
        results.skipped++;
      } else {
        results.failed++;
      }

      // Small delay to avoid overwhelming Firebase
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Print summary
    console.log('\n📈 IMPORT SUMMARY:');
    console.log(`📊 Total affiliates in CSV: ${results.total}`);
    console.log(`✅ Successfully imported: ${results.imported}`);
    console.log(`⏭️  Skipped (already exists): ${results.skipped}`);
    console.log(`❌ Failed: ${results.failed}`);

    if (results.imported > 0) {
      console.log('\n🎉 SUCCESSFULLY IMPORTED AFFILIATES:');
      results.details
        .filter(r => r.status === 'success')
        .forEach(r => {
          console.log(`   • ${r.name} (${r.email}) - Code: ${r.affiliateCode}`);
        });
    }

    if (results.failed > 0) {
      console.log('\n❌ FAILED IMPORTS:');
      results.details
        .filter(r => r.status === 'failed')
        .forEach(r => {
          console.log(`   • ${r.name} (${r.email}) - Reason: ${r.reason}`);
        });
    }

    // Save results to file
    const resultsFile = path.join(__dirname, '../affiliate-import-results.json');
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved to: ${resultsFile}`);

  } catch (error) {
    console.error('❌ Error during import:', error);
  }
}

// Run the import
importAffiliates(); 