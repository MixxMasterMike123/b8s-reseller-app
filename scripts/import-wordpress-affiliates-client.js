#!/usr/bin/env node

/**
 * B8Shield WordPress Affiliate Import Script (Client SDK Version)
 * Uses the same authentication as our working database scripts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import fs from 'fs';
import csv from 'csv-parser';

// Same Firebase config as working scripts
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

function generateAffiliateCode(username, firstName, lastName) {
  let baseName = username?.trim();
  if (!baseName || baseName.length < 2) {
    baseName = `${firstName} ${lastName}`.trim();
  }
  
  const namePart = baseName
    .split(/[\s_@-]/)[0]
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 8);
  
  const randomPart = Math.floor(100 + Math.random() * 900);
  return `${namePart}-${randomPart}`;
}

async function isAffiliateCodeUnique(code) {
  const q = query(collection(db, 'affiliates'), where('affiliateCode', '==', code));
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty;
}

async function generateUniqueAffiliateCode(username, firstName, lastName) {
  let attempts = 0;
  let code;
  
  do {
    code = generateAffiliateCode(username, firstName, lastName);
    attempts++;
    if (attempts > 10) {
      throw new Error(`Could not generate unique affiliate code after 10 attempts`);
    }
  } while (!(await isAffiliateCodeUnique(code)));
  
  return code;
}

async function importWordPressAffiliates(csvFilePath) {
  console.log(`📊 Starting WordPress affiliate import from: ${csvFilePath}`);
  
  const results = {
    total: 0,
    success: 0,
    errors: 0,
    duplicates: 0,
    created: []
  };

  return new Promise((resolve, reject) => {
    const csvData = [];
    
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (data) => csvData.push(data))
      .on('end', async () => {
        console.log(`📄 Found ${csvData.length} WordPress affiliates\n`);
        results.total = csvData.length;
        
        for (let i = 0; i < csvData.length; i++) {
          const row = csvData[i];
          const fullName = `${row['First Name']?.trim() || ''} ${row['Last Name']?.trim() || ''}`.trim();
          console.log(`🔄 Processing ${i + 1}/${csvData.length}: ${fullName} (${row.Email})`);
          
          try {
            // Check if affiliate already exists
            const existingQuery = query(collection(db, 'affiliates'), where('email', '==', row.Email.trim()));
            const existingSnapshot = await getDocs(existingQuery);
            
            if (!existingSnapshot.empty) {
              console.log(`⚠️  Affiliate already exists: ${row.Email}`);
              results.duplicates++;
              continue;
            }

            // Generate unique affiliate code
            const affiliateCode = await generateUniqueAffiliateCode(
              row.Username, 
              row['First Name'], 
              row['Last Name']
            );

            // Convert WordPress rate (0.2) to percentage (20)
            const wpRate = parseFloat(row.Rate) || 0.2;
            const commissionRate = Math.round(wpRate * 100);
            
            // Parse stats
            const earnings = parseFloat(row.Earnings) || 0;
            const unpaidEarnings = parseFloat(row['Unpaid Earnings']) || 0;
            const visits = parseInt(row.Visits) || 0;
            const referrals = parseInt(row.Referrals) || 0;

            // Create affiliate document
            const affiliateData = {
              email: row.Email.trim(),
              name: fullName,
              affiliateCode: affiliateCode,
              status: row.Status?.toLowerCase() === 'active' ? 'active' : 'pending',
              commissionRate: commissionRate,
              checkoutDiscount: Math.min(commissionRate, 15),
              
              // WordPress original data
              wordpressId: row['Affiliate ID'],
              wordpressUsername: row.Username?.trim() || '',
              paymentEmail: row['Payment Email']?.trim() || row.Email.trim(),
              
              // Contact info (empty - to be filled later)
              phone: '',
              address: '',
              postalCode: '',
              city: '',
              country: 'SE',
              
              // Social media (empty)
              socials: {
                website: '',
                instagram: '',
                youtube: '',
                facebook: '',
                tiktok: ''
              },
              
              // Preserve WordPress stats
              stats: {
                clicks: visits,
                conversions: referrals,
                totalEarnings: earnings,
                balance: unpaidEarnings
              },
              
              // Payment info
              paymentInfo: {
                method: 'bank',
                details: {
                  paymentEmail: row['Payment Email']?.trim() || row.Email.trim()
                }
              },
              
              // Import metadata
              importedAt: new Date(),
              importedFrom: 'wordpress',
              createdAt: new Date(row['Date Registered'] || Date.now()),
              updatedAt: new Date()
            };

            // Add to Firestore
            await addDoc(collection(db, 'affiliates'), affiliateData);
            
            results.success++;
            results.created.push({
              name: fullName,
              email: row.Email.trim(),
              affiliateCode: affiliateCode,
              commissionRate: commissionRate,
              visits: visits,
              referrals: referrals,
              earnings: earnings,
              unpaidEarnings: unpaidEarnings
            });

            console.log(`✅ Imported: ${fullName} → ${affiliateCode} (${commissionRate}%)`);
            
          } catch (error) {
            console.error(`❌ Error processing ${fullName}:`, error.message);
            results.errors++;
          }
        }
        
        // Print summary
        console.log('\n' + '='.repeat(70));
        console.log('📊 WORDPRESS AFFILIATE IMPORT SUMMARY');
        console.log('='.repeat(70));
        console.log(`📄 Total processed: ${results.total}`);
        console.log(`✅ Successfully imported: ${results.success}`);
        console.log(`❌ Errors: ${results.errors}`);
        console.log(`⚠️  Duplicates skipped: ${results.duplicates}`);
        
        if (results.created.length > 0) {
          console.log('\n🎉 IMPORTED AFFILIATES:');
          results.created.forEach(affiliate => {
            console.log(`👤 ${affiliate.name} (${affiliate.affiliateCode}) - ${affiliate.commissionRate}%`);
            console.log(`   📊 ${affiliate.visits} visits, ${affiliate.referrals} referrals, ${affiliate.earnings} SEK earned`);
          });
          
          console.log('\n⚠️  IMPORTANT:');
          console.log('• Affiliates imported successfully with historical stats');
          console.log('• Firebase Auth accounts NOT created (requires admin setup)');
          console.log('• Affiliates can register normally via shop.b8shield.com with same email');
          console.log('• Their data will be linked automatically by email matching');
        }
        
        resolve(results);
      })
      .on('error', reject);
  });
}

// Main execution
const csvFilePath = process.argv[2];
if (!csvFilePath) {
  console.error('❌ Please provide CSV file path');
  console.log('Usage: node scripts/import-wordpress-affiliates-client.js path/to/file.csv');
  process.exit(1);
}

try {
  await importWordPressAffiliates(csvFilePath);
  console.log('\n🎉 Import completed successfully!');
} catch (error) {
  console.error('\n❌ Import failed:', error);
  process.exit(1);
}
