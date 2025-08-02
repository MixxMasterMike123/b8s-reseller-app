#!/usr/bin/env node

/**
 * ACCURATE SCRIPT: Identify Customers by Active Field
 * 
 * Uses the 'active' field to properly classify:
 * - active: true = Paying B2B Customers
 * - active: false = Prospects
 */

const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

// Initialize Firebase Admin
const app = initializeApp({
  projectId: 'b8shield-reseller-app',
  databaseURL: 'https://b8s-reseller-db-default-rtdb.firebaseio.com/'
});

const db = getFirestore(app, 'b8s-reseller-db');
const auth = getAuth(app);

// The 5 customers with credentials sent (from user)
const credentialsSentTo = [
  '9fWlyT67D34xUPnCs7OX', // Willys Sportfiske AB
  'Qx9vpk01LOdK2cOjgVcV', // Fiskehörnan Stenmans
  'TIUzk1fn5ZLDU33DB1sM', // Sportfiskepoolen Uppsala
  'pTE8L03baHOARdARHnpV', // Orsa Fiskecenter
  'zJq9s1iETQHOLbXNG1QU'  // Gnesta Vildmark
];

async function identifyByActiveField() {
  try {
    console.log('🔍 ANALYZING CUSTOMERS BY ACTIVE FIELD...\n');
    
    // Get all users from Firestore
    const usersSnapshot = await db.collection('users').get();
    const allUsers = [];
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      allUsers.push({
        id: doc.id,
        ...userData
      });
    });
    
    console.log(`📊 Total users in database: ${allUsers.length}\n`);
    
    // Get Firebase Auth users for cross-reference
    let authUsers = [];
    let nextPageToken;
    
    do {
      const result = await auth.listUsers(1000, nextPageToken);
      authUsers = authUsers.concat(result.users);
      nextPageToken = result.pageToken;
    } while (nextPageToken);
    
    // Classify by active field
    const activeCustomers = [];
    const inactiveProspects = [];
    const unclearStatus = [];
    
    for (const user of allUsers) {
      // Check if user has Firebase Auth account
      const authUser = authUsers.find(au => au.email === user.email);
      const hasCredentialsSent = credentialsSentTo.includes(user.id);
      
      const userInfo = {
        id: user.id,
        companyName: user.companyName || user.företagsnamn || 'NO COMPANY NAME',
        email: user.email || 'NO EMAIL',
        contactPerson: user.contactPerson || 'N/A',
        active: user.active,
        marginal: user.marginal,
        role: user.role,
        hasAuth: !!authUser,
        authUid: authUser?.uid || 'NO AUTH',
        credentialsSent: user.credentialsSent,
        hasCredentialsSentByUser: hasCredentialsSent,
        createdAt: user.createdAt
      };
      
      if (user.active === true) {
        activeCustomers.push(userInfo);
      } else if (user.active === false) {
        inactiveProspects.push(userInfo);
      } else {
        // Active field is undefined/null
        unclearStatus.push(userInfo);
      }
    }
    
    // Display Active Customers (Paying B2B)
    console.log('💚 ===== ACTIVE CUSTOMERS (PAYING B2B) =====');
    console.log(`Found ${activeCustomers.length} active customers:\n`);
    
    activeCustomers.forEach((customer, index) => {
      console.log(`${index + 1}. 💚 ${customer.companyName}`);
      console.log(`   🆔 ID: ${customer.id}`);
      console.log(`   📧 Email: ${customer.email}`);
      console.log(`   👤 Contact: ${customer.contactPerson}`);
      console.log(`   📊 Marginal: ${customer.marginal || 'N/A'}%`);
      console.log(`   👑 Role: ${customer.role || 'user'}`);
      console.log(`   🔐 Has Auth: ${customer.hasAuth ? 'YES' : 'NO'} ${customer.hasAuth ? `(${customer.authUid})` : ''}`);
      console.log(`   📨 Credentials in DB: ${customer.credentialsSent ? 'YES' : 'NO'}`);
      console.log(`   ✉️ User confirmed sent: ${customer.hasCredentialsSentByUser ? '✅ YES' : '❌ NO'}`);
      console.log(`   🗓️ Created: ${customer.createdAt ? new Date(customer.createdAt).toLocaleString('sv-SE') : 'N/A'}`);
      console.log('');
    });
    
    // Display Inactive Prospects
    console.log('\n🧡 ===== INACTIVE PROSPECTS (CRM ONLY) =====');
    console.log(`Found ${inactiveProspects.length} inactive prospects:\n`);
    
    inactiveProspects.slice(0, 10).forEach((prospect, index) => {
      console.log(`${index + 1}. 🧡 ${prospect.companyName}`);
      console.log(`   🆔 ID: ${prospect.id}`);
      console.log(`   📧 Email: ${prospect.email}`);
      console.log(`   👤 Contact: ${prospect.contactPerson}`);
      console.log(`   🔐 Has Auth: ${prospect.hasAuth ? 'YES (Why?)' : 'NO (Correct)'}`);
      console.log(`   ✉️ User confirmed sent: ${prospect.hasCredentialsSentByUser ? '✅ YES (Wait, why?)' : '❌ NO (Correct)'}`);
      console.log('');
    });
    
    if (inactiveProspects.length > 10) {
      console.log(`   ... and ${inactiveProspects.length - 10} more inactive prospects\n`);
    }
    
    // Display Unclear Status
    if (unclearStatus.length > 0) {
      console.log('\n❓ ===== UNCLEAR STATUS (active field undefined) =====');
      console.log(`Found ${unclearStatus.length} users with unclear status:\n`);
      
      unclearStatus.forEach((user, index) => {
        console.log(`${index + 1}. ❓ ${user.companyName}`);
        console.log(`   🆔 ID: ${user.id}`);
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   🔐 Has Auth: ${user.hasAuth ? 'YES' : 'NO'}`);
        console.log(`   ✉️ User confirmed sent: ${user.hasCredentialsSentByUser ? '✅ YES' : '❌ NO'}`);
        console.log('');
      });
    }
    
    // Analysis of the 5 credential recipients
    console.log('\n🎯 ===== ANALYSIS OF 5 CREDENTIAL RECIPIENTS =====');
    credentialsSentTo.forEach(userId => {
      const user = allUsers.find(u => u.id === userId);
      if (user) {
        const authUser = authUsers.find(au => au.email === user.email);
        console.log(`📧 ${user.companyName || 'NO NAME'} (${userId})`);
        console.log(`   ✅ Active Status: ${user.active === true ? 'ACTIVE (Paying)' : user.active === false ? 'INACTIVE (Prospect)' : 'UNDEFINED'}`);
        console.log(`   🔐 Firebase Auth: ${authUser ? 'YES' : 'NO'}`);
        console.log(`   📊 Marginal: ${user.marginal || 'N/A'}%`);
        console.log('');
      }
    });
    
    // Summary
    console.log('\n📋 ===== SUMMARY =====');
    console.log(`💚 Active Customers (active=true): ${activeCustomers.length}`);
    console.log(`🧡 Inactive Prospects (active=false): ${inactiveProspects.length}`);
    console.log(`❓ Unclear Status (active=undefined): ${unclearStatus.length}`);
    console.log(`📊 Total Users: ${allUsers.length}`);
    
    // Save detailed results
    const results = {
      timestamp: new Date().toISOString(),
      activeCustomers,
      inactiveProspects,
      unclearStatus,
      credentialsAnalysis: credentialsSentTo.map(userId => {
        const user = allUsers.find(u => u.id === userId);
        const authUser = authUsers.find(au => au.email === user?.email);
        return {
          userId,
          user: user || null,
          hasAuth: !!authUser,
          authUser: authUser || null
        };
      })
    };
    
    const fs = require('fs');
    fs.writeFileSync('active-field-analysis.json', JSON.stringify(results, null, 2));
    console.log('\n💾 Detailed results saved to: active-field-analysis.json');
    
  } catch (error) {
    console.error('❌ Error analyzing customers:', error);
  }
}

// Run the analysis
identifyByActiveField().then(() => {
  console.log('\n✅ Analysis complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});