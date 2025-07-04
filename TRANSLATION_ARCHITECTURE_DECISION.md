# B8Shield Translation Architecture Decision
## Google Sheets SSoT vs Database SSoT Analysis

## 🎯 Scope: Customer-Facing Pages Only

### **Translation Scope:**
- ✅ **B2B Portal**: `partner.b8shield.com` (customer dashboard, product catalog, orders)
- ✅ **B2C Shop**: `shop.b8shield.com` (public storefront, checkout, account)
- ❌ **Admin Pages**: Remain Swedish-only (no translation needed)

## 🏗️ Architecture Options

### **Option A: Database SSoT (Recommended)**
```
Swedish (Default) → Database → Google Sheets (Sync) → Database (EN Collections)
```

#### **Data Flow:**
```javascript
// 1. Swedish content lives in main collections
products: {
  name: "B8Shield Beteskydd",
  descriptions: { b2c: "Skyddar dina beten..." }
}

// 2. English translations in separate collections
products_en_GB: {
  productId: "prod_123",
  name: "B8Shield Bait Protection", 
  descriptions: { b2c: "Protects your bait..." },
  translatedAt: timestamp,
  translatedBy: "translator@example.com",
  status: "approved"
}

products_en_US: {
  productId: "prod_123", 
  name: "B8Shield Bait Protection",
  descriptions: { b2c: "Protects your bait..." },
  translatedAt: timestamp,
  translatedBy: "translator@example.com", 
  status: "approved"
}
```

#### **Benefits:**
- ✅ **Offline Resilience**: Works when Google Sheets unavailable
- ✅ **Performance**: Fast database queries, no external API calls
- ✅ **Version Control**: Full audit trail in database
- ✅ **Rollback**: Easy to revert translations
- ✅ **Admin Override**: Can edit translations in admin if needed
- ✅ **Caching**: Can cache translations for performance

#### **Workflow:**
```
1. Admin exports Swedish content → Google Sheets
2. Translators work in Google Sheets
3. Admin imports approved translations → Database EN collections
4. Customer pages read from Database (Swedish fallback)
5. Optional: Admin can override specific translations in database
```

### **Option B: Google Sheets SSoT**
```
Swedish (Default) → Google Sheets (Master) → Database (Cache Only)
```

#### **Data Flow:**
```javascript
// Google Sheets as master, database as cache
translations_cache: {
  key: "product.name.b8s-4-re",
  swedish: "B8Shield Beteskydd",
  englishUK: "B8Shield Bait Protection",
  englishUS: "B8Shield Bait Protection",
  lastSync: timestamp,
  version: "1.2"
}
```

#### **Benefits:**
- ✅ **True SSoT**: One authoritative source
- ✅ **Translator Control**: Translators have full ownership
- ✅ **Real-time Updates**: Changes reflect immediately
- ✅ **Collaboration**: Built-in Google Sheets features

#### **Risks:**
- ❌ **External Dependency**: Portal breaks if Google Sheets API fails
- ❌ **Performance**: API calls for every translation lookup
- ❌ **Limited Admin Control**: Can't override without Google Sheets access
- ❌ **Complex Caching**: Need sophisticated cache invalidation

## 🎯 **Recommended Approach: Database SSoT with Google Sheets Sync**

### **Why Database SSoT is Better:**

#### **1. Resilience**
```javascript
// Fallback strategy
const getTranslation = async (key, language, fallbackToSwedish = true) => {
  try {
    // 1. Try language-specific collection
    const translation = await getFromDatabase(`translations_${language}`, key);
    if (translation) return translation;
    
    // 2. Fallback to Swedish if enabled
    if (fallbackToSwedish) {
      return await getFromDatabase('translations_sv', key);
    }
    
    return null;
  } catch (error) {
    console.error('Translation lookup failed:', error);
    // Always fallback to Swedish for customer-facing pages
    return await getFromDatabase('translations_sv', key);
  }
};
```

#### **2. Performance**
```javascript
// Fast database queries vs API calls
// Database: ~1-2ms query time
// Google Sheets API: ~100-300ms response time

// Plus caching capability
const translationCache = new Map();

const getCachedTranslation = (key, language) => {
  const cacheKey = `${language}:${key}`;
  
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }
  
  const translation = getTranslation(key, language);
  translationCache.set(cacheKey, translation);
  return translation;
};
```

#### **3. Admin Override Capability**
```javascript
// Admin can override specific translations when needed
const overrideTranslation = async (key, language, newValue, adminUser) => {
  await updateDoc(doc(db, `translations_${language}`, key), {
    value: newValue,
    overriddenBy: adminUser.uid,
    overriddenAt: serverTimestamp(),
    isOverride: true,
    originalValue: currentValue // Keep original for reference
  });
  
  // Clear cache
  translationCache.delete(`${language}:${key}`);
};
```

## 🏗️ Implementation Architecture

### **Database Schema**
```javascript
// Main collections (Swedish)
products: {
  id: "prod_123",
  name: "B8Shield Beteskydd",
  descriptions: { b2c: "Skyddar dina beten..." },
  // ... other fields
}

// Translation collections
translations_en_GB: {
  id: "product.name.prod_123",
  sourceCollection: "products",
  sourceId: "prod_123", 
  sourceField: "name",
  value: "B8Shield Bait Protection",
  translatedAt: timestamp,
  translatedBy: "translator@example.com",
  status: "approved", // draft, translated, reviewed, approved
  isOverride: false,
  version: "1.0"
}

translations_en_US: {
  id: "product.descriptions.b2c.prod_123",
  sourceCollection: "products",
  sourceId: "prod_123",
  sourceField: "descriptions.b2c", 
  value: "Protects your bait from small fish...",
  translatedAt: timestamp,
  translatedBy: "translator@example.com",
  status: "approved",
  isOverride: false,
  version: "1.0"
}

// Translation metadata
translation_sync: {
  id: "sync_2024_12_20",
  exportedAt: timestamp,
  importedAt: timestamp,
  totalStrings: 156,
  updatedStrings: 23,
  newStrings: 12,
  googleSheetsId: "sheet_id_here",
  version: "1.2"
}
```

### **Translation Service**
```javascript
class TranslationService {
  constructor() {
    this.cache = new Map();
    this.fallbackLanguage = 'sv-SE';
  }
  
  async getTranslation(key, language, options = {}) {
    const { fallback = true, useCache = true } = options;
    
    // Check cache first
    if (useCache) {
      const cached = this.cache.get(`${language}:${key}`);
      if (cached) return cached;
    }
    
    try {
      // Try specific language collection
      const translation = await this.getFromDatabase(language, key);
      
      if (translation) {
        this.cache.set(`${language}:${key}`, translation);
        return translation;
      }
      
      // Fallback to Swedish
      if (fallback && language !== this.fallbackLanguage) {
        return await this.getTranslation(key, this.fallbackLanguage, { fallback: false });
      }
      
      return null;
      
    } catch (error) {
      console.error(`Translation lookup failed for ${key}:${language}`, error);
      
      // Always fallback to Swedish for customer-facing pages
      if (fallback && language !== this.fallbackLanguage) {
        return await this.getTranslation(key, this.fallbackLanguage, { fallback: false });
      }
      
      return null;
    }
  }
  
  async getFromDatabase(language, key) {
    const collectionName = `translations_${language.replace('-', '_')}`;
    const docRef = doc(db, collectionName, key);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        value: data.value,
        status: data.status,
        isOverride: data.isOverride || false,
        lastModified: data.translatedAt || data.overriddenAt
      };
    }
    
    return null;
  }
  
  // Bulk translation import from Google Sheets
  async importTranslations(sheetData, language) {
    const batch = writeBatch(db);
    const collectionName = `translations_${language.replace('-', '_')}`;
    let imported = 0;
    
    sheetData.forEach(row => {
      if (row.status === 'approved' || row.status === 'reviewed') {
        const docRef = doc(db, collectionName, row.key);
        batch.set(docRef, {
          sourceCollection: row.sourceCollection,
          sourceId: row.sourceId,
          sourceField: row.sourceField,
          value: row.value,
          translatedAt: serverTimestamp(),
          translatedBy: row.translator,
          status: row.status,
          isOverride: false,
          version: row.version || '1.0'
        });
        
        // Clear cache
        this.cache.delete(`${language}:${row.key}`);
        imported++;
      }
    });
    
    await batch.commit();
    return { imported, total: sheetData.length };
  }
}
```

### **React Hook for Translations**
```javascript
// Custom hook for customer-facing pages
const useTranslation = (language = 'sv-SE') => {
  const [translations, setTranslations] = useState(new Map());
  const [loading, setLoading] = useState(false);
  const translationService = useRef(new TranslationService());
  
  const t = useCallback(async (key, fallback = '') => {
    // Check if already loaded
    if (translations.has(key)) {
      return translations.get(key);
    }
    
    try {
      const translation = await translationService.current.getTranslation(key, language);
      const value = translation?.value || fallback;
      
      setTranslations(prev => new Map(prev).set(key, value));
      return value;
      
    } catch (error) {
      console.error(`Translation failed for ${key}`, error);
      return fallback;
    }
  }, [language, translations]);
  
  // Preload common translations
  const preloadTranslations = useCallback(async (keys) => {
    setLoading(true);
    const promises = keys.map(key => translationService.current.getTranslation(key, language));
    const results = await Promise.all(promises);
    
    const newTranslations = new Map(translations);
    keys.forEach((key, index) => {
      if (results[index]) {
        newTranslations.set(key, results[index].value);
      }
    });
    
    setTranslations(newTranslations);
    setLoading(false);
  }, [language, translations]);
  
  return { t, preloadTranslations, loading };
};

// Usage in components
const ProductCard = ({ product }) => {
  const { t } = useTranslation('en-GB');
  const [productName, setProductName] = useState(product.name);
  const [description, setDescription] = useState(product.descriptions?.b2c || '');
  
  useEffect(() => {
    // Load translations
    t(`product.name.${product.id}`, product.name).then(setProductName);
    t(`product.descriptions.b2c.${product.id}`, product.descriptions?.b2c || '').then(setDescription);
  }, [product.id, t]);
  
  return (
    <div className="product-card">
      <h3>{productName}</h3>
      <p>{description}</p>
    </div>
  );
};
```

## 🚀 Implementation Plan

### **Phase 1: Foundation (Week 1)**
- [ ] Create translation collections schema
- [ ] Build TranslationService class
- [ ] Create useTranslation hook
- [ ] Basic export functionality to Google Sheets

### **Phase 2: Google Sheets Integration (Week 2)** 
- [ ] Google Sheets API setup
- [ ] Export all customer-facing strings
- [ ] Import functionality from Google Sheets
- [ ] Translation status tracking

### **Phase 3: Customer Pages (Week 3)**
- [ ] Integrate translations into B2B portal pages
- [ ] Integrate translations into B2C shop pages
- [ ] Language switcher UI
- [ ] Fallback mechanisms

### **Phase 4: Admin Tools (Week 4)**
- [ ] Translation management dashboard
- [ ] Override functionality for admins
- [ ] Sync status and history
- [ ] Performance optimization and caching

## 🎯 Final Recommendation

**Use Database SSoT with Google Sheets Sync** because:

1. **Reliability**: Customer pages always work, even if Google Sheets is down
2. **Performance**: Fast database queries vs slow API calls  
3. **Control**: Admins can override translations when needed
4. **Scalability**: Easy to add caching and optimization
5. **Professional**: WordPress-style translation updates with enterprise reliability

The Google Sheets becomes a **translation workflow tool**, not the runtime data source. This gives you the best of both worlds: professional translation workflow + enterprise reliability. 