# Unified Contact Architecture
## One Database, Multiple Views 🎯

### 🔍 **Current Problem**
- **B2B System**: `users` collection (default database)
- **CRM System**: `diningContacts` collection (named database `b8s-reseller-db`)
- **Result**: Complex sync, data duplication, sync failures

### 🎯 **New Solution: Single Source of Truth**

#### **1. Unified Contact Collection**
```javascript
// Location: Named database 'b8s-reseller-db', 'contacts' collection
{
  id: string,
  
  // Core contact information
  email: string,
  companyName: string,
  contactPerson: string,
  phone: string,
  
  // Address information
  address: string,
  city: string,
  postalCode: string,
  country: string,
  deliveryAddress: string,
  deliveryCity: string,
  deliveryPostalCode: string,
  deliveryCountry: string,
  sameAsCompanyAddress: boolean,
  
  // B2B-specific fields
  role: 'admin' | 'user',
  active: boolean,
  marginal: number,
  firebaseAuthUid: string,
  credentialsSent: boolean,
  temporaryPassword: string,
  
  // CRM-specific fields
  status: 'prospect' | 'active' | 'inactive' | 'closed',
  priority: 'low' | 'medium' | 'high',
  source: 'manual' | 'b2b-registration' | 'import',
  tags: [string],
  notes: string,
  
  // Metadata
  createdAt: timestamp,
  updatedAt: timestamp,
  lastActivityAt: timestamp
}
```

#### **2. Context-Aware Views**

##### **B2B Admin View (`/admin/users`)**
```javascript
// Filter: role !== 'admin' (show only customers)
// Display: companyName, contactPerson, email, active, marginal
// Actions: Edit margins, activate/deactivate, send credentials
```

##### **CRM View (`/admin/dining/contacts`)**
```javascript
// Filter: role !== 'admin' (show only customers)
// Display: companyName, contactPerson, status, priority, lastActivityAt
// Actions: Update status, add activities, schedule follow-ups
```

##### **Admin Management View (`/admin/admins`)**
```javascript
// Filter: role === 'admin' (show only admin users)
// Display: Admin-specific management
```

#### **3. Unified Components**

##### **ContactForm Component**
```javascript
// Single form component with context-aware fields
// B2B context: Show margin, credentials, activation
// CRM context: Show status, priority, tags, notes
// Admin context: Show role management
```

##### **ContactList Component**
```javascript
// Single list component with context-aware columns
// Props: context ('b2b' | 'crm' | 'admin')
// Filters and displays based on context
```

### 🔧 **Implementation Plan**

#### **Phase 1: Database Migration (Week 1)**
1. **Create unified `contacts` collection** in named database
2. **Migrate B2B `users`** → `contacts` (preserve all B2B fields)
3. **Migrate CRM `diningContacts`** → `contacts` (merge with B2B data)
4. **Update all references** to use unified collection

#### **Phase 2: Context-Aware Components (Week 2)**
1. **Create unified ContactForm** with context switching
2. **Create unified ContactList** with context-aware columns
3. **Update all admin pages** to use unified components
4. **Add context switching** in navigation

#### **Phase 3: Enhanced UX (Week 3)**
1. **Cross-context insights**: Show CRM data in B2B views
2. **Unified search**: Search across all contact data
3. **Smart suggestions**: Use all data for better UX
4. **Seamless navigation**: Switch between B2B and CRM views

### 🎯 **Benefits**

#### **Immediate Benefits**
- ✅ **No more sync issues**: Single source of truth
- ✅ **Real-time updates**: All views show same data instantly
- ✅ **Simplified code**: No complex sync logic
- ✅ **Better performance**: No duplicate queries

#### **Long-term Benefits**
- 🚀 **Enhanced UX**: Rich cross-context insights
- 🚀 **Unified search**: Find contacts across all contexts
- 🚀 **Smart features**: Use all data for better automation
- 🚀 **Scalable**: Easy to add new contexts/views

### 📋 **Migration Steps**

#### **Step 1: Create Migration Script**
```javascript
// scripts/migrate-to-unified-contacts.js
// 1. Read all users from default database
// 2. Read all diningContacts from named database
// 3. Merge data intelligently
// 4. Create unified contacts in named database
// 5. Verify data integrity
```

#### **Step 2: Update Components**
```javascript
// src/components/contacts/UnifiedContactForm.jsx
// src/components/contacts/UnifiedContactList.jsx
// src/hooks/useContacts.js (context-aware)
```

#### **Step 3: Update Pages**
```javascript
// src/pages/admin/AdminUsers.jsx → use unified components
// src/wagons/dining-wagon/components/ContactList.jsx → use unified components
```

#### **Step 4: Update Contexts**
```javascript
// src/contexts/AuthContext.jsx → use unified collection
// src/wagons/dining-wagon/hooks/useDiningContacts.js → use unified collection
```

### 🔒 **Data Safety**

#### **Backup Strategy**
1. **Export all existing data** before migration
2. **Keep old collections** as backup during transition
3. **Gradual rollout** with feature flags
4. **Rollback plan** if issues occur

#### **Testing Strategy**
1. **Unit tests** for unified components
2. **Integration tests** for context switching
3. **User acceptance testing** with real workflows
4. **Performance testing** with large datasets

### 🎉 **Expected Outcome**

After migration:
- **Single contact update** → **Instant reflection** in all views
- **B2B admin updates email** → **CRM sees change immediately**
- **CRM updates status** → **B2B sees status change immediately**
- **No sync delays, no sync failures, no duplicate data**

**Contacts will truly be unified, not just synchronized!** 🤝 