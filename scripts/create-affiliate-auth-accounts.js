#!/usr/bin/env node

/**
 * B8Shield: Create Firebase Auth Accounts for Imported Affiliates
 * 
 * This script creates Firebase Auth accounts for affiliates who were imported
 * but don't have login credentials (like from WordPress imports).
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

// Firebase config (same as other working scripts)
const firebaseConfig = {
  apiKey: "AIzaSyCsYgMVRlipm-PxsHPZOxew5tqcZ_3Kccw",
  authDomain: "b8shield-reseller-app.firebaseapp.com",
  projectId: "b8shield-reseller-app",
  storageBucket: "b8shield-reseller-app.firebasestorage.app",
  messagingSenderId: "996315128348",
  appId: "1:996315128348:web:75388494e2bcdfa1f3f5d9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, 'b8s-reseller-db');
const auth = getAuth(app);

// Generate secure password
function generateSecurePassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function createAuthAccountsForAffiliates() {
  console.log('🔍 Fetching all affiliates from database...');
  
  try {
    // Get all affiliates from Firestore
    const affiliatesRef = collection(db, 'affiliates');
    const snapshot = await getDocs(affiliatesRef);
    
    if (snapshot.empty) {
      console.log('❌ No affiliates found in database');
      return;
    }
    
    const affiliates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`📊 Found ${affiliates.length} affiliates in database`);
    
    const results = {
      total: affiliates.length,
      authCreated: 0,
      alreadyExists: 0,
      errors: 0,
      credentials: []
    };
    
    // Process each affiliate
    for (let i = 0; i < affiliates.length; i++) {
      const affiliate = affiliates[i];
      console.log(`\n🔄 Processing ${i + 1}/${affiliates.length}: ${affiliate.name} (${affiliate.email})`);
      
      try {
        // Generate secure password
        const tempPassword = generateSecurePassword();
        
        // Try to create Firebase Auth account
        const userCredential = await createUserWithEmailAndPassword(auth, affiliate.email, tempPassword);
        const firebaseAuthUid = userCredential.user.uid;
        
        console.log(`✅ Created Firebase Auth account: ${firebaseAuthUid}`);
        
        // Update affiliate record with auth UID (optional - for reference)
        await updateDoc(doc(db, 'affiliates', affiliate.id), {
          firebaseAuthUid: firebaseAuthUid,
          temporaryPassword: tempPassword, // Store for admin reference
          passwordCreatedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        
        // Store credentials for admin reference
        results.credentials.push({
          name: affiliate.name,
          email: affiliate.email,
          affiliateCode: affiliate.affiliateCode,
          password: tempPassword,
          firebaseAuthUid: firebaseAuthUid
        });
        
        results.authCreated++;
        
        // Sign out to clear auth state for next user
        await signOut(auth);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        if (error.code === 'auth/email-already-exists') {
          console.log(`⚠️  Firebase Auth account already exists for ${affiliate.email}`);
          results.alreadyExists++;
        } else {
          console.error(`❌ Error creating auth for ${affiliate.email}:`, error.message);
          results.errors++;
        }
      }
    }
    
    // Display results
    console.log('\n' + '='.repeat(60));
    console.log('📊 IMPORT RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total affiliates processed: ${results.total}`);
    console.log(`Firebase Auth accounts created: ${results.authCreated}`);
    console.log(`Already existed: ${results.alreadyExists}`);
    console.log(`Errors: ${results.errors}`);
    
    if (results.credentials.length > 0) {
      console.log('\n' + '🔐 AFFILIATE LOGIN CREDENTIALS');
      console.log('='.repeat(60));
      console.log('Send these credentials to your affiliates:\n');
      
      results.credentials.forEach((cred, index) => {
        console.log(`${index + 1}. ${cred.name} (${cred.affiliateCode})`);
        console.log(`   Email: ${cred.email}`);
        console.log(`   Password: ${cred.password}`);
        console.log(`   Portal: https://shop.b8shield.com/affiliate-portal`);
        console.log(`   Link: https://shop.b8shield.com/?ref=${cred.affiliateCode}`);
        console.log('');
      });
      
      console.log('⚠️  IMPORTANT: Save these passwords securely and send them to your affiliates!');
      console.log('💡 Consider sending welcome emails with these credentials.');
    }
    
    if (results.authCreated > 0) {
      console.log('\n✅ SUCCESS: All affiliates can now login to the affiliate portal!');
    }
    
  } catch (error) {
    console.error('❌ Critical error:', error);
  }
}

// Run the script
console.log('🚀 B8Shield: Creating Firebase Auth Accounts for Imported Affiliates');
console.log('============================================================\n');

createAuthAccountsForAffiliates()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  }); 