const fs = require('fs');
const path = require('path');

// Define the sections and their file patterns
const sections = {
  admin: {
    name: 'Admin Portal',
    patterns: [
      'src/pages/admin/*.jsx',
      'src/components/admin*.jsx'
    ],
    files: [
      'src/pages/admin/AdminDashboard.jsx',
      'src/pages/admin/AdminUsers.jsx',
      'src/pages/admin/AdminOrders.jsx',
      'src/pages/admin/AdminProducts.jsx',
      'src/pages/admin/AdminAffiliates.jsx',
      'src/pages/admin/AdminAffiliatePayout.jsx',
      'src/pages/admin/AdminAffiliateEdit.jsx',
      'src/pages/admin/AdminAffiliateAnalytics.jsx',
      'src/pages/admin/AdminMarketingMaterials.jsx',
      'src/pages/admin/AdminMarketingMaterialEdit.jsx',
      'src/pages/admin/AdminUserCreate.jsx',
      'src/pages/admin/AdminUserEdit.jsx',
      'src/pages/admin/AdminOrderDetail.jsx',
      'src/pages/admin/AdminSettings.jsx',
      'src/pages/admin/AdminTranslations.jsx'
    ]
  },
  b2b: {
    name: 'B2B Portal',
    patterns: [
      'src/pages/DashboardPage.jsx',
      'src/pages/ProductViewPage.jsx',
      'src/pages/OrderPage.jsx',
      'src/pages/OrderHistoryPage.jsx',
      'src/pages/OrderDetailPage.jsx',
      'src/pages/MarketingMaterialsPage.jsx',
      'src/pages/ProfilePage.jsx',
      'src/pages/ContactPage.jsx',
      'src/components/layout/AppLayout.jsx',
      'src/components/TrainingModal.jsx',
      'src/components/ProductDetailPopup.jsx'
    ]
  },
  b2c: {
    name: 'B2C Shop',
    patterns: [
      'src/pages/shop/*.jsx',
      'src/components/shop/*.jsx'
    ],
    files: [
      'src/pages/shop/PublicStorefront.jsx',
      'src/pages/shop/PublicProductPage.jsx',
      'src/pages/shop/ShoppingCart.jsx',
      'src/pages/shop/Checkout.jsx',
      'src/pages/shop/CustomerLogin.jsx',
      'src/pages/shop/CustomerRegister.jsx',
      'src/pages/shop/CustomerAccount.jsx',
      'src/pages/shop/OrderConfirmation.jsx',
      'src/pages/shop/AffiliateRegistration.jsx',
      'src/pages/shop/AffiliatePortal.jsx',
      'src/pages/shop/PrivacyPolicy.jsx',
      'src/pages/shop/TermsOfService.jsx',
      'src/pages/shop/ReturnPolicy.jsx',
      'src/pages/shop/CookiePolicy.jsx',
      'src/pages/shop/ShippingInfo.jsx',
      'src/components/shop/ShopNavigation.jsx',
      'src/components/shop/ShopFooter.jsx'
    ]
  }
};

// Function to extract translation keys from a file
function extractTranslationKeys(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const keys = [];
  
  // Regex to match t('key', 'default') or t("key", "default")
  const regex = /t\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]*?)['"`]\s*\)/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    const key = match[1];
    const defaultValue = match[2];
    
    keys.push({
      key: key,
      swedish: defaultValue,
      file: filePath
    });
  }
  
  return keys;
}

// Function to create CSV content
function createCSV(keys, sectionName) {
  const header = 'key,swedish,englishUK,englishUS,notes\n';
  
  // Remove duplicates and sort
  const uniqueKeys = {};
  keys.forEach(item => {
    if (!uniqueKeys[item.key]) {
      uniqueKeys[item.key] = item;
    }
  });
  
  const sortedKeys = Object.values(uniqueKeys).sort((a, b) => a.key.localeCompare(b.key));
  
  const rows = sortedKeys.map(item => {
    const key = item.key;
    const swedish = item.swedish.replace(/"/g, '""'); // Escape quotes
    const notes = `From: ${item.file}`;
    
    return `"${key}","${swedish}","","","${notes}"`;
  });
  
  return header + rows.join('\n');
}

// Main execution
async function main() {
  console.log('🔍 Extracting translation keys from B8Shield codebase...\n');
  
  for (const [sectionKey, section] of Object.entries(sections)) {
    console.log(`📋 Processing ${section.name}...`);
    
    let allKeys = [];
    const filesToProcess = section.files || section.patterns;
    
    for (const filePattern of filesToProcess) {
      if (filePattern.includes('*')) {
        // Handle glob patterns (simplified)
        const baseDir = filePattern.replace('/*.jsx', '');
        if (fs.existsSync(baseDir)) {
          const files = fs.readdirSync(baseDir)
            .filter(file => file.endsWith('.jsx'))
            .map(file => path.join(baseDir, file));
          
          for (const file of files) {
            const keys = extractTranslationKeys(file);
            allKeys = allKeys.concat(keys);
          }
        }
      } else {
        // Handle specific file
        const keys = extractTranslationKeys(filePattern);
        allKeys = allKeys.concat(keys);
      }
    }
    
    // Create CSV
    const csvContent = createCSV(allKeys, section.name);
    const fileName = `${sectionKey}_portal_translations.csv`;
    
    fs.writeFileSync(fileName, csvContent);
    console.log(`✅ Created ${fileName} with ${allKeys.length} translation keys`);
  }
  
  console.log('\n🎉 All translation CSV files created successfully!');
  console.log('\nNext steps:');
  console.log('1. Import these CSV files to Google Sheets');
  console.log('2. Translate the English columns');
  console.log('3. Export and import back to Firebase');
}

main().catch(console.error); 