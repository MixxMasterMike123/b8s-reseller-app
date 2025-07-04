# B8Shield Translation Sync System
## Google Sheets + Manual Sync Approach (WordPress-Inspired)

## 🎯 Core Concept: "Translation Updates" Like WordPress

### **The WordPress Way (But Better)**
```
WordPress: Plugin updates with .po/.mo translation files
B8Shield: Translation updates with Google Sheets sync
```

### **Why This is Brilliant**
- ✅ **Separation of Concerns**: Content vs Translation management
- ✅ **Non-Technical Friendly**: Translators work in familiar Google Sheets
- ✅ **Version Control**: Track translation changes over time
- ✅ **Collaboration**: Multiple translators can work simultaneously
- ✅ **Offline Work**: Download, translate offline, upload back
- ✅ **Quality Control**: Review process before sync
- ✅ **Rollback**: Restore previous translation versions

## 🏗️ System Architecture

### **1. Google Sheets Structure**

#### **Master Translation Sheet**
```
Columns:
A: Key (unique identifier)
B: Context (where it's used)
C: Swedish Original
D: English UK
E: English US
F: Status (new/translated/reviewed/approved)
G: Translator
H: Last Modified
I: Notes
J: Character Count
K: Auto-Translation (reference)
```

#### **Example Rows**
```
Key                           | Context        | Swedish Original                    | English UK                     | English US                     | Status
product.name.b8s-4-re        | Product Name   | B8Shield Beteskydd 4-pack Röd     | B8Shield Bait Protection 4-pack Red | B8Shield Bait Protection 4-pack Red | approved
product.desc.b2c.b8s-4-re    | B2C Description| Skyddar dina beten från småfisk... | Protects your bait from small fish... | Protects your bait from small fish... | translated
ui.button.add_to_cart         | UI Button      | Lägg i varukorg                    | Add to Basket                  | Add to Cart                    | approved
ui.menu.product_catalog       | Navigation     | Produktkatalog                     | Product Catalogue              | Product Catalog                | approved
```

### **2. Translation Sync Workflow**

#### **Export Process (Admin → Google Sheets)**
```javascript
// 1. Extract all translatable content from database
const exportTranslations = async () => {
  const data = [];
  
  // Products
  const products = await getProducts();
  products.forEach(product => {
    data.push({
      key: `product.name.${product.sku}`,
      context: 'Product Name',
      swedish: product.name,
      englishUK: product.content?.['en-GB']?.name || '',
      englishUS: product.content?.['en-US']?.name || '',
      status: getTranslationStatus(product, 'name')
    });
    
    data.push({
      key: `product.desc.b2c.${product.sku}`,
      context: 'B2C Description',
      swedish: product.descriptions?.b2c || '',
      englishUK: product.content?.['en-GB']?.descriptions?.b2c || '',
      englishUS: product.content?.['en-US']?.descriptions?.b2c || '',
      status: getTranslationStatus(product, 'descriptions.b2c')
    });
  });
  
  // UI Elements
  const uiStrings = await getUIStrings();
  uiStrings.forEach(string => {
    data.push({
      key: string.key,
      context: string.context,
      swedish: string.swedish,
      englishUK: string.englishUK || '',
      englishUS: string.englishUS || '',
      status: string.status
    });
  });
  
  return data;
};
```

#### **Import Process (Google Sheets → Admin)**
```javascript
// 2. Import translations from Google Sheets
const importTranslations = async (sheetData) => {
  const updates = [];
  
  sheetData.forEach(row => {
    if (row.status === 'approved' || row.status === 'reviewed') {
      updates.push({
        key: row.key,
        translations: {
          'en-GB': row.englishUK,
          'en-US': row.englishUS
        },
        lastModified: row.lastModified,
        translator: row.translator
      });
    }
  });
  
  // Apply updates to database
  await applyTranslationUpdates(updates);
  
  return {
    imported: updates.length,
    skipped: sheetData.length - updates.length
  };
};
```

### **3. Admin Interface**

#### **Translation Management Dashboard**
```jsx
const TranslationDashboard = () => {
  const [translationStats, setTranslationStats] = useState({});
  const [lastSync, setLastSync] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  return (
    <div className="translation-dashboard">
      <div className="dashboard-header">
        <h1>Translation Management</h1>
        <div className="sync-status">
          <span className="text-sm text-gray-600">
            Last sync: {lastSync ? formatDate(lastSync) : 'Never'}
          </span>
        </div>
      </div>
      
      {/* Translation Stats */}
      <div className="stats-grid grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard 
          title="Total Strings" 
          value={translationStats.total} 
          icon="📝"
        />
        <StatCard 
          title="English UK" 
          value={translationStats.englishUK} 
          icon="🇬🇧"
          percentage={translationStats.englishUK / translationStats.total * 100}
        />
        <StatCard 
          title="English US" 
          value={translationStats.englishUS} 
          icon="🇺🇸"
          percentage={translationStats.englishUS / translationStats.total * 100}
        />
        <StatCard 
          title="Needs Review" 
          value={translationStats.needsReview} 
          icon="⚠️"
          color="orange"
        />
      </div>
      
      {/* Sync Operations */}
      <div className="sync-operations bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Translation Sync</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Export to Google Sheets */}
          <div className="export-section">
            <h3 className="font-medium mb-2">📤 Export to Google Sheets</h3>
            <p className="text-sm text-gray-600 mb-3">
              Export all content to Google Sheets for translation
            </p>
            <button 
              onClick={handleExport}
              disabled={isExporting}
              className="btn btn-primary w-full"
            >
              {isExporting ? 'Exporting...' : 'Export Current Content'}
            </button>
          </div>
          
          {/* Import from Google Sheets */}
          <div className="import-section">
            <h3 className="font-medium mb-2">📥 Import from Google Sheets</h3>
            <p className="text-sm text-gray-600 mb-3">
              Import approved translations from Google Sheets
            </p>
            <button 
              onClick={handleImport}
              disabled={isImporting}
              className="btn btn-success w-full"
            >
              {isImporting ? 'Importing...' : 'Import Translations'}
            </button>
          </div>
        </div>
        
        {/* Google Sheets Link */}
        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <div className="flex items-center">
            <span className="text-sm font-medium">Google Sheets:</span>
            <a 
              href="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              B8Shield Translations Master Sheet →
            </a>
          </div>
        </div>
      </div>
      
      {/* Recent Changes */}
      <TranslationHistory />
    </div>
  );
};
```

### **4. Google Sheets Integration**

#### **Google Sheets API Setup**
```javascript
// Google Sheets API integration
class GoogleSheetsTranslationSync {
  constructor(sheetId, apiKey) {
    this.sheetId = sheetId;
    this.apiKey = apiKey;
    this.baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  }
  
  async exportToSheet(translationData) {
    const values = [
      // Header row
      ['Key', 'Context', 'Swedish Original', 'English UK', 'English US', 'Status', 'Translator', 'Last Modified', 'Notes', 'Character Count', 'Auto-Translation'],
      
      // Data rows
      ...translationData.map(item => [
        item.key,
        item.context,
        item.swedish,
        item.englishUK,
        item.englishUS,
        item.status,
        item.translator || '',
        item.lastModified || '',
        item.notes || '',
        item.swedish?.length || 0,
        item.autoTranslation || ''
      ])
    ];
    
    const response = await fetch(
      `${this.baseUrl}/${this.sheetId}/values/Sheet1!A1:K${values.length}?valueInputOption=RAW&key=${this.apiKey}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values })
      }
    );
    
    return response.json();
  }
  
  async importFromSheet() {
    const response = await fetch(
      `${this.baseUrl}/${this.sheetId}/values/Sheet1!A2:K?key=${this.apiKey}`
    );
    
    const data = await response.json();
    
    return data.values?.map(row => ({
      key: row[0],
      context: row[1],
      swedish: row[2],
      englishUK: row[3],
      englishUS: row[4],
      status: row[5],
      translator: row[6],
      lastModified: row[7],
      notes: row[8],
      characterCount: parseInt(row[9]) || 0,
      autoTranslation: row[10]
    })) || [];
  }
}
```

### **5. Translation File Upload (WordPress-Style)**

#### **Translation File Format**
```json
// translations-update-v1.2.json
{
  "version": "1.2",
  "timestamp": "2024-12-20T10:30:00Z",
  "languages": ["en-GB", "en-US"],
  "translations": {
    "en-GB": {
      "product.name.b8s-4-re": "B8Shield Bait Protection 4-pack Red",
      "product.desc.b2c.b8s-4-re": "Protects your bait from small fish and crustaceans...",
      "ui.button.add_to_cart": "Add to Basket",
      "ui.menu.product_catalog": "Product Catalogue"
    },
    "en-US": {
      "product.name.b8s-4-re": "B8Shield Bait Protection 4-pack Red",
      "product.desc.b2c.b8s-4-re": "Protects your bait from small fish and crustaceans...",
      "ui.button.add_to_cart": "Add to Cart",
      "ui.menu.product_catalog": "Product Catalog"
    }
  },
  "metadata": {
    "totalStrings": 156,
    "newStrings": 12,
    "updatedStrings": 8,
    "translator": "Professional Translation Services",
    "reviewedBy": "Micke Öhlén"
  }
}
```

### **6. Translator Workflow**

#### **Step-by-Step Process**
```
1. Admin exports current content to Google Sheets
2. Translator opens Google Sheets link
3. Translator works on translations (can work offline)
4. Translator marks status as "translated" or "reviewed"
5. Admin imports approved translations back to portal
6. System applies updates and shows summary
```

#### **Google Sheets Features**
- **Conditional Formatting**: Highlight untranslated/needs review
- **Comments**: Translators can ask questions
- **Version History**: Track changes over time
- **Collaboration**: Multiple translators can work simultaneously
- **Filters**: Show only specific languages or status
- **Character Count**: Help with space constraints

## 🚀 Implementation Benefits

### **For Translators**
- ✅ **Familiar Interface**: Everyone knows Google Sheets
- ✅ **Offline Work**: Download, translate offline, upload
- ✅ **Collaboration**: Multiple people can work together
- ✅ **Context**: See where each string is used
- ✅ **Reference**: Auto-translation as starting point

### **For Admins**
- ✅ **Simple Process**: Export → Translate → Import
- ✅ **Version Control**: Track translation updates
- ✅ **Quality Control**: Review before applying
- ✅ **Rollback**: Restore previous versions
- ✅ **Professional**: Like WordPress plugin updates

### **For Business**
- ✅ **Cost-Effective**: Use freelance translators
- ✅ **Scalable**: Easy to add new languages
- ✅ **Professional**: Proper translation workflow
- ✅ **Maintainable**: Clear separation of concerns

## 🎯 Implementation Plan

### **Phase 1: Foundation (Week 1)**
- [ ] Translation key extraction system
- [ ] Google Sheets API integration
- [ ] Basic export/import functionality

### **Phase 2: Admin Interface (Week 2)**
- [ ] Translation dashboard
- [ ] File upload interface
- [ ] Preview and validation

### **Phase 3: Google Sheets Setup (Week 3)**
- [ ] Master translation sheet template
- [ ] Conditional formatting and validation
- [ ] Collaboration features

### **Phase 4: Quality Control (Week 4)**
- [ ] Translation validation rules
- [ ] Version history tracking
- [ ] Rollback functionality

This system gives you the best of both worlds: the professionalism of WordPress translation updates with the flexibility of Google Sheets collaboration! 