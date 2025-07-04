/**
 * Extract Content Fields for Translation
 * Scrapes all dynamic content from Firestore to create translation starting point
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin with project ID
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'b8shield-reseller-app',
    // Use application default credentials or service account
    credential: admin.credential.applicationDefault(),
  });
}

// Use the named database directly
const db = admin.firestore();
// Set the database ID for the named database
db.settings({ databaseId: 'b8s-reseller-db' });

// Content extraction configuration
const CONTENT_COLLECTIONS = {
  products: {
    fields: [
      'name', 'description', 'sku', 'size', 'color',
      'descriptions.b2b', 'descriptions.b2c'
    ],
    keyPrefix: 'product'
  },
  users: {
    fields: [
      'companyName', 'contactPerson', 'notes'
    ],
    keyPrefix: 'user'
  },
  marketingMaterials: {
    fields: [
      'name', 'category'
    ],
    keyPrefix: 'marketing'
  },
  affiliates: {
    fields: [
      'name'
    ],
    keyPrefix: 'affiliate'
  }
};

// Category mappings for marketing materials
const MARKETING_CATEGORIES = {
  'allmänt': 'General',
  'produktbilder': 'Product Images',
  'annonser': 'Advertisements',
  'broschyrer': 'Brochures',
  'videos': 'Videos',
  'prislista': 'Price Lists',
  'instruktioner': 'Instructions',
  'dokument': 'Documents',
  'övrigt': 'Other'
};

// Color mappings
const COLOR_MAPPINGS = {
  'Transparent': 'Transparent',
  'Röd': 'Red',
  'Fluorescerande': 'Fluorescent',
  'Glitter': 'Glitter'
};

// Size mappings
const SIZE_MAPPINGS = {
  '2': 'Size 2',
  '3': 'Size 3',
  '4': 'Size 4',
  '3-pack': '3-pack',
  '5-pack': '5-pack'
};

async function extractContentFields() {
  console.log('🔍 Extracting content fields for translation...');
  console.log('📡 Using project: b8shield-reseller-app');
  console.log('🗄️  Using database: b8s-reseller-db');
  
  const contentEntries = [];
  let entryCount = 0;

  try {
    // Extract from each collection
    for (const [collectionName, config] of Object.entries(CONTENT_COLLECTIONS)) {
      console.log(`📋 Processing ${collectionName}...`);
      
      const snapshot = await db.collection(collectionName).get();
      console.log(`   Found ${snapshot.size} documents`);
      
      snapshot.forEach(doc => {
        const data = doc.data();
        
        config.fields.forEach(fieldPath => {
          const value = getNestedValue(data, fieldPath);
          
          if (value && typeof value === 'string' && value.trim()) {
            entryCount++;
            
            // Generate translation key
            const key = `${config.keyPrefix}.${fieldPath.replace('.', '_')}.${doc.id}`;
            
            // Determine context
            const context = `${collectionName} - ${fieldPath}`;
            
            // Get English suggestion based on field type
            const englishSuggestion = getEnglishSuggestion(fieldPath, value);
            
            contentEntries.push({
              key,
              context,
              swedishOriginal: value.trim(),
              englishUK: englishSuggestion,
              englishUS: englishSuggestion,
              status: 'Ny',
              translator: '',
              lastModified: new Date().toISOString().split('T')[0],
              notes: `Auto-extracted from ${collectionName}/${doc.id}`,
              characterCount: value.trim().length
            });
          }
        });
      });
    }

    // Add common product variants that might not be in database
    addCommonProductVariants(contentEntries);
    
    // Sort by collection and field
    contentEntries.sort((a, b) => {
      if (a.context !== b.context) return a.context.localeCompare(b.context);
      return a.swedishOriginal.localeCompare(b.swedishOriginal);
    });

    // Generate CSV
    const csvContent = generateCSV(contentEntries);
    
    // Write to file
    const outputPath = path.join(__dirname, '..', 'content_fields_translations.csv');
    fs.writeFileSync(outputPath, csvContent, 'utf8');
    
    console.log(`✅ Extracted ${entryCount} content fields`);
    console.log(`📄 CSV saved to: ${outputPath}`);
    console.log(`🎯 Ready for Google Sheets import!`);
    
    // Generate summary
    const summary = generateSummary(contentEntries);
    console.log('\n📊 Content Summary:');
    console.log(summary);
    
  } catch (error) {
    console.error('❌ Error extracting content fields:', error);
    console.error('💡 Make sure you have Firebase credentials set up:');
    console.error('   - Run: firebase login');
    console.error('   - Or set GOOGLE_APPLICATION_CREDENTIALS environment variable');
    process.exit(1);
  }
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
}

function getEnglishSuggestion(fieldPath, swedishValue) {
  // Handle specific field types
  if (fieldPath === 'color') {
    return COLOR_MAPPINGS[swedishValue] || swedishValue;
  }
  
  if (fieldPath === 'size') {
    return SIZE_MAPPINGS[swedishValue] || swedishValue;
  }
  
  if (fieldPath === 'category') {
    return MARKETING_CATEGORIES[swedishValue] || swedishValue;
  }
  
  // For descriptions and names, leave empty for manual translation
  if (fieldPath.includes('description') || fieldPath === 'name') {
    return ''; // Requires manual translation
  }
  
  // For other fields, return as-is (might be technical terms)
  return swedishValue;
}

function addCommonProductVariants(contentEntries) {
  // Add common product name patterns
  const commonVariants = [
    { key: 'product.name.b8shield_transparent', context: 'products - name', swedish: 'B8Shield Transparent', english: 'B8Shield Transparent' },
    { key: 'product.name.b8shield_red', context: 'products - name', swedish: 'B8Shield Röd', english: 'B8Shield Red' },
    { key: 'product.name.b8shield_fluorescent', context: 'products - name', swedish: 'B8Shield Fluorescerande', english: 'B8Shield Fluorescent' },
    { key: 'product.name.b8shield_glitter', context: 'products - name', swedish: 'B8Shield Glitter', english: 'B8Shield Glitter' },
    { key: 'product.description.standard', context: 'products - description', swedish: 'Skyddar dina fiskedrag från att fastna i vass och vegetation', english: 'Protects your fishing lures from getting caught in reeds and vegetation' },
    { key: 'product.description.multipack', context: 'products - description', swedish: 'Flerfärgat paket med B8Shield för olika fiskesituationer', english: 'Multi-color pack of B8Shield for different fishing situations' }
  ];
  
  commonVariants.forEach(variant => {
    contentEntries.push({
      key: variant.key,
      context: variant.context,
      swedishOriginal: variant.swedish,
      englishUK: variant.english,
      englishUS: variant.english,
      status: 'Ny',
      translator: '',
      lastModified: new Date().toISOString().split('T')[0],
      notes: 'Common product variant',
      characterCount: variant.swedish.length
    });
  });
}

function generateCSV(entries) {
  const headers = [
    'Key',
    'Context',
    'Swedish Original',
    'English UK',
    'English US',
    'Status',
    'Translator',
    'Last Modified',
    'Notes',
    'Character Count'
  ];
  
  const csvRows = [headers.join(',')];
  
  entries.forEach(entry => {
    const row = [
      entry.key,
      entry.context,
      `"${entry.swedishOriginal.replace(/"/g, '""')}"`,
      `"${entry.englishUK.replace(/"/g, '""')}"`,
      `"${entry.englishUS.replace(/"/g, '""')}"`,
      entry.status,
      entry.translator,
      entry.lastModified,
      `"${entry.notes.replace(/"/g, '""')}"`,
      entry.characterCount
    ];
    csvRows.push(row.join(','));
  });
  
  return csvRows.join('\n');
}

function generateSummary(entries) {
  const byCollection = {};
  
  entries.forEach(entry => {
    const collection = entry.context.split(' - ')[0];
    if (!byCollection[collection]) {
      byCollection[collection] = 0;
    }
    byCollection[collection]++;
  });
  
  let summary = '';
  Object.entries(byCollection).forEach(([collection, count]) => {
    summary += `  ${collection}: ${count} entries\n`;
  });
  
  return summary;
}

// Run the extraction
if (require.main === module) {
  extractContentFields()
    .then(() => {
      console.log('🎉 Content field extraction completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Extraction failed:', error);
      process.exit(1);
    });
}

module.exports = { extractContentFields }; 