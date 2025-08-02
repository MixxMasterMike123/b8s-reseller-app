#!/usr/bin/env node

/**
 * CRITICAL SCRIPT: Identify Paying B2B Customers
 * 
 * This script finds customers who have been sent credentials and are real paying customers.
 * We need to handle these with EXTREME CARE to not break their portal access.
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

// Initialize Firebase Admin with application default credentials
const app = initializeApp({
  projectId: 'b8shield-reseller-app',
  databaseURL: 'https://b8s-reseller-db-default-rtdb.firebaseio.com/'
});

const db = getFirestore(app, 'b8s-reseller-db');
const auth = getAuth(app);

async function identifyPayingCustomers() {
  try {
    console.log('🔍 SEARCHING FOR PAYING B2B CUSTOMERS...\n');
    
    // Get all users from Firestore
    const usersSnapshot = await db.collection('users').get();
    const firestoreUsers = [];
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      firestoreUsers.push({
        id: doc.id,
        ...userData
      });
    });
    
    console.log(`📊 Total Firestore users found: ${firestoreUsers.length}\n`);
    
    // Get all Firebase Auth users
    let authUsers = [];
    let nextPageToken;
    
    do {
      const result = await auth.listUsers(1000, nextPageToken);
      authUsers = authUsers.concat(result.users);
      nextPageToken = result.pageToken;
    } while (nextPageToken);
    
    console.log(`🔐 Total Firebase Auth users found: ${authUsers.length}\n`);
    
    // Find customers who have BOTH Firestore record AND Firebase Auth account
    const payingCustomers = [];
    const prospectsOnly = [];
    
    for (const firestoreUser of firestoreUsers) {
      // Look for matching Firebase Auth user by email
      const authUser = authUsers.find(au => au.email === firestoreUser.email);
      
      if (authUser) {
        // This user has both Firestore + Auth = PAYING CUSTOMER
        payingCustomers.push({
          firestoreId: firestoreUser.id,
          authUid: authUser.uid,
          email: firestoreUser.email,
          companyName: firestoreUser.companyName || firestoreUser.företagsnamn,
          contactPerson: firestoreUser.contactPerson,
          active: firestoreUser.active,
          marginal: firestoreUser.marginal,
          role: firestoreUser.role,
          credentialsSent: firestoreUser.credentialsSent,
          credentialsSentAt: firestoreUser.credentialsSentAt,
          createdAt: firestoreUser.createdAt
        });
      } else {
        // This user only exists in Firestore = PROSPECT
        prospectsOnly.push({
          firestoreId: firestoreUser.id,
          email: firestoreUser.email,
          companyName: firestoreUser.companyName || firestoreUser.företagsnamn,
          contactPerson: firestoreUser.contactPerson,
          status: firestoreUser.status,
          priority: firestoreUser.priority,
          source: firestoreUser.source,
          createdAt: firestoreUser.createdAt
        });
      }
    }
    
    // Display results
    console.log('🎯 ===== PAYING B2B CUSTOMERS (CRITICAL - DO NOT BREAK) =====');
    console.log(`Found ${payingCustomers.length} paying customers with portal access:\n`);
    
    payingCustomers.forEach((customer, index) => {
      console.log(`${index + 1}. 💚 ${customer.companyName || 'NO COMPANY NAME'}`);
      console.log(`   📧 Email: ${customer.email}`);
      console.log(`   👤 Contact: ${customer.contactPerson || 'N/A'}`);
      console.log(`   🆔 Firestore ID: ${customer.firestoreId}`);
      console.log(`   🔐 Auth UID: ${customer.authUid}`);
      console.log(`   📊 Marginal: ${customer.marginal || 'N/A'}%`);
      console.log(`   ✅ Active: ${customer.active !== false ? 'Yes' : 'No'}`);
      console.log(`   👑 Role: ${customer.role || 'user'}`);
      console.log(`   📨 Credentials Sent: ${customer.credentialsSent ? 'Yes' : 'No'}`);
      if (customer.credentialsSentAt) {
        console.log(`   📅 Sent At: ${new Date(customer.credentialsSentAt).toLocaleString('sv-SE')}`);
      }
      console.log(`   🗓️ Created: ${customer.createdAt ? new Date(customer.createdAt).toLocaleString('sv-SE') : 'N/A'}`);
      console.log('');
    });
    
    console.log('\n🧡 ===== PROSPECTS (CRM ONLY - NO PORTAL ACCESS) =====');
    console.log(`Found ${prospectsOnly.length} prospects without portal access:\n`);
    
    prospectsOnly.forEach((prospect, index) => {
      console.log(`${index + 1}. 🧡 ${prospect.companyName || 'NO COMPANY NAME'}`);
      console.log(`   📧 Email: ${prospect.email || 'N/A'}`);
      console.log(`   👤 Contact: ${prospect.contactPerson || 'N/A'}`);
      console.log(`   🆔 Firestore ID: ${prospect.firestoreId}`);
      console.log(`   📊 Status: ${prospect.status || 'N/A'}`);
      console.log(`   ⚡ Priority: ${prospect.priority || 'N/A'}`);
      console.log(`   📍 Source: ${prospect.source || 'N/A'}`);
      console.log(`   🗓️ Created: ${prospect.createdAt ? new Date(prospect.createdAt).toLocaleString('sv-SE') : 'N/A'}`);
      console.log('');
    });
    
    // Summary
    console.log('\n📋 ===== SUMMARY =====');
    console.log(`💚 Paying B2B Customers: ${payingCustomers.length} (DO NOT TOUCH - CRITICAL)`);
    console.log(`🧡 CRM Prospects: ${prospectsOnly.length} (Safe to migrate)`);
    console.log(`📊 Total Contacts: ${firestoreUsers.length}`);
    
    // Save results to file for review
    const results = {
      timestamp: new Date().toISOString(),
      payingCustomers,
      prospectsOnly,
      summary: {
        payingCustomersCount: payingCustomers.length,
        prospectsCount: prospectsOnly.length,
        totalContacts: firestoreUsers.length
      }
    };
    
    const fs = require('fs');
    fs.writeFileSync('customer-classification-results.json', JSON.stringify(results, null, 2));
    console.log('\n💾 Results saved to: customer-classification-results.json');
    console.log('\n⚠️  NEXT STEPS:');
    console.log('1. Review the paying customers list carefully');
    console.log('2. Confirm these are the 6-7 customers with credentials');
    console.log('3. Only proceed with migration after verification');
    
  } catch (error) {
    console.error('❌ Error identifying customers:', error);
  }
}

// Run the identification
identifyPayingCustomers().then(() => {
  console.log('\n✅ Customer identification complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});