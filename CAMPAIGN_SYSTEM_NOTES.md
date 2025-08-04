# 🚀 B8Shield Campaign System - Implementation Notes

## **CRITICAL TECHNICAL NOTES FOR ALL PHASES**

### **URL Structure & Language Awareness**
- **ALWAYS use `/:currentLang/` in all front-facing URLs**
- **Campaign URLs**: `shop.b8shield.com/:currentLang/?ref=AFFILIATE_CODE&campaign=CAMPAIGN_CODE`
- **QR Code Generation**: Must respect affiliate's `preferredLang` setting
- **Future Landing Pages**: `shop.b8shield.com/:currentLang/campaign/CAMPAIGN_CODE/?ref=AFFILIATE_CODE`

### **Translation System**
- **Use ContentTranslations** (like Products system)
- **All campaign fields** must be multilingual: name, description, rules, etc.
- **File**: `src/hooks/useContentTranslation.js` for translation logic
- **Pattern**: `getContentValue(content, currentLanguage)` and `setContentValue(content, language, value)`

### **Social Media Platform Sizes** (Phase 1)
```javascript
const CAMPAIGN_BANNER_SIZES = {
  instagram_post: { width: 1080, height: 1080, name: 'Instagram Post' },
  instagram_story: { width: 1080, height: 1920, name: 'Instagram Story' },
  tiktok_video: { width: 1080, height: 1920, name: 'TikTok Video' },
  twitter_post: { width: 1200, height: 675, name: 'X (Twitter) Post' },
  youtube_thumbnail: { width: 1280, height: 720, name: 'YouTube Thumbnail' },
  facebook_post: { width: 1200, height: 630, name: 'Facebook Post' },
  linkedin_post: { width: 1200, height: 627, name: 'LinkedIn Post' }
};
```

### **Lottery System Logic**
- **Each product SKU = 1 ticket** in lottery draw
- **Multiple SKUs in order = multiple tickets**
- **OPTIONAL feature** for admins to enable per campaign
- **Winner selection**: Random draw from all participants weighted by ticket count

### **Database Collections**
```
campaigns/                    # Main campaign data
campaignParticipants/        # Lottery entries & tracking  
campaignBanners/            # Social media assets
campaignAnalytics/          # Performance data
```

### **Future Features to Consider**
- **Affiliate Tiers/Categories**: OFF by default, enable when 100+ affiliates
- **Approval Process**: Not needed initially, add when needed
- **Landing Pages**: URLs already structured for future implementation

---

## **IMPLEMENTATION APPROACH: CAMPAIGN WAGON** 🚂 ✅ SELECTED

### **Wagon Structure:**
```
src/wagons/campaign-wagon/
├── CampaignWagonManifest.js     # Wagon configuration
├── index.js                     # Wagon entry point
├── components/
│   ├── CampaignDashboard.jsx    # Main campaign overview
│   ├── CampaignCreate.jsx       # Campaign creation form
│   ├── CampaignEdit.jsx         # Campaign editing interface
│   ├── CampaignList.jsx         # Campaign list view
│   └── BannerUpload.jsx         # Multi-platform banner manager
├── hooks/
│   └── useCampaigns.js          # Campaign data management
└── utils/
    └── campaignUtils.js         # Campaign utilities & helpers
```

### **Wagon Benefits:**
- ✅ Self-contained and modular
- ✅ Auto-discovery via WagonRegistry
- ✅ Consistent with existing architecture
- ✅ Easy to maintain and extend
- ✅ Can be disabled/enabled as needed

## **PHASE 1: CAMPAIGN WAGON CREATION** ✅ COMPLETED & DEPLOYED

### **Components to Create:**
1. `CampaignWagonManifest.js` - Wagon configuration and routes
2. `CampaignDashboard.jsx` - Main campaign dashboard
3. `CampaignCreate.jsx` - Campaign creation wizard  
4. `CampaignEdit.jsx` - Campaign editing interface
5. `BannerUpload.jsx` - Multi-platform banner management
6. `useCampaigns.js` - Campaign data hooks

### **Database Schema:**
- campaigns collection with multilingual content
- Banner storage in Firebase Storage
- Affiliate selection logic (all/selected)

### **✅ DEPLOYMENT STATUS (Phase 1 Complete):**
- **Deployed to Production**: https://b8shield-reseller-app.web.app
- **Admin Menu Integration**: Campaign Wagon appears in admin navigation
- **Auto-Discovery**: Working via WagonRegistry.js
- **Routes**: All routes (`/admin/campaigns/*`) functional
- **Components Built**: 4 components built and ready
- **Build Status**: ✅ All components compile successfully
- **Wagon System**: Perfect integration with existing architecture

---

## **PHASE 2: FUNCTIONAL CAMPAIGN CREATION** ✅ COMPLETED & DEPLOYED

### **✅ MAJOR ACHIEVEMENTS ACCOMPLISHED:**
- **4-Step Campaign Creation Wizard**: Professional multi-step form with progress tracking
- **Multilingual Content Support**: Full Swedish/English UK/English US content management
- **Campaign Type Selection**: Competition, Offer, Product Launch, Seasonal, Special Discount
- **Affiliate Targeting System**: Select all affiliates or choose specific ones with live preview
- **Commission & Pricing**: Custom affiliate rates, customer discount rates, lottery system
- **Form Validation & UX**: Step-by-step validation, progress saving, comprehensive error handling
- **Database Integration**: Full CRUD operations with useCampaigns hook
- **Professional UI**: Modern design with icons, progress bars, and campaign summaries

### **✅ DEPLOYMENT STATUS (Phase 2 Complete):**
- **Campaign Creation**: https://b8shield-reseller-app.web.app/admin/campaigns/create
  - ✅ CampaignCreate-56f58530.js (13.17 kB) - Professional multilingual content system
- **Campaign Editing**: https://partner.b8shield.com/admin/campaigns/{ID}
  - ✅ CampaignEdit-18f06bca.js (19.92 kB) - Complete editing with B2C-style translations
- **Build Status**: ✅ Both components compiled successfully with professional translation system
- **Functionality**: ✅ Full campaign lifecycle management (Create → Edit → Delete)
- **Integration**: ✅ Perfect integration with existing Campaign Wagon infrastructure
- **🔧 CRITICAL FIXES**: Fixed campaign loading + implemented professional multilingual system

### **✅ CAMPAIGN EDITING FEATURES ADDED:**
- **Data Fetching**: Loads existing campaign data based on URL ID parameter
- **Pre-populated Forms**: Same 4-step wizard but filled with existing campaign data
- **Status Management**: Active/Paused toggle buttons and full status dropdown
- **Campaign Deletion**: Confirmation modal with permanent deletion capability
- **Real-time Updates**: Changes reflected immediately after saving
- **Error Handling**: Campaign not found, loading states, validation errors
- **Action Buttons**: Professional header with Activate/Pause and Delete actions
- **Campaign Code Display**: Shows generated campaign code (read-only)
- **Advanced Features**: Status badges, loading spinners, comprehensive form validation

### **🔧 CRITICAL TIMING FIX RESOLVED:**
**PROBLEM**: Original `getCampaignById` function was synchronous and relied on the `campaigns` array being populated from Firebase subscription, causing "Kampanj hittades inte" (Campaign not found) errors when components loaded before data.

**SOLUTION**: Added new `fetchCampaignById` async function that directly fetches from Firebase using `getDoc()`:
- **Direct Firebase Fetch**: Uses `doc()` and `getDoc()` to fetch campaign directly by ID
- **Proper Error Handling**: Returns `null` if campaign doesn't exist instead of undefined
- **Safe Date Conversion**: Includes same date handling logic as subscription
- **Debug Logging**: Console logs for troubleshooting campaign loading issues
- **Backward Compatibility**: Keeps original `getCampaignById` for other components

**TECHNICAL**: Updated `CampaignEdit.jsx` to use `fetchCampaignById` instead of synchronous lookup, ensuring reliable campaign loading regardless of subscription timing.

### **🌐 MULTILINGUAL CONTENT SYSTEM IMPLEMENTED:**
**MAJOR UPGRADE**: Campaigns now use the same professional multilingual content system as B2C products, providing enterprise-grade internationalization capabilities.

**BEFORE** (Manual Language Fields):
- Separate input fields for Swedish, English (UK), English (US)
- Complex custom `handleContentChange` functions
- Manual language management
- No visual translation status indicators
- Inconsistent with rest of B8Shield system

**AFTER** (B2C-Style Professional System):
- **ContentLanguageIndicator Component**: Shows current language, completion status, and visual progress bars
- **Automatic Language Detection**: Uses `currentLanguage` from TranslationContext
- **Smart Content Functions**: `getContentValue()` and `setContentValue()` handle all multilingual logic
- **Visual Translation Status**: Real-time indicators showing translation completion (0%-100%)
- **Language Badges**: Current language displayed with flag and color coding
- **Professional UI**: Same system used in AdminProducts, AdminPages, and AdminMarketingMaterials

**TECHNICAL IMPLEMENTATION**:
- Added `ContentLanguageIndicator` import to both CampaignCreate and CampaignEdit
- Replaced manual language fields with single input using `getContentValue(formData.name)`
- Updated onChange handlers to use `setContentValue(formData.name, e.target.value)`
- Removed custom `handleContentChange` functions - now uses standard pattern
- Campaign name and description fields now support full multilingual workflow

**FIELDS ENHANCED**:
- ✅ **Campaign Name** (`name`): Full multilingual support with visual indicators
- ✅ **Campaign Description** (`description`): Full multilingual support with visual indicators
- **Future**: Ready to extend to any other text fields (instructions, terms, etc.)

**USER EXPERIENCE**:
- **Language Switching**: Change language in header, form automatically updates
- **Translation Status**: Visual progress bars show completion percentage
- **Missing Translation Warnings**: Clear indicators when translations needed
- **Professional Workflow**: Same experience as editing B2C product descriptions

**DATABASE STRUCTURE**: Campaign content stored as multilingual objects:
```javascript
{
  name: {
    'sv-SE': 'Sommartävling 2025',
    'en-GB': 'Summer Competition 2025', 
    'en-US': 'Summer Contest 2025'
  },
  description: {
    'sv-SE': 'Vinn fantastiska fiskepriser...',
    'en-GB': 'Win amazing fishing prizes...',
    'en-US': 'Win awesome fishing prizes...'
  }
}
```

**RESULT**: Campaign management now matches the professional standard of B2C product management, ensuring consistency across all B8Shield admin interfaces and preparing campaigns for international affiliate markets.

---

## **PHASE 3: AFFILIATE PORTAL INTEGRATION** 📋 NEXT

### **Key Requirements:**
- Show campaigns only for selected affiliates
- Generate language-aware campaign URLs: `shop.b8shield.com/:currentLang/?ref=CODE&campaign=CAMPAIGN`
- QR code generation respecting `preferredLang`
- Campaign materials download section

---

## **PHASE 3: ENHANCED TRACKING SYSTEM** 📋 PENDING

### **URL Parameter Capture:**
- Extend `AffiliateTracker.jsx` to capture `campaign` parameter
- Store in localStorage with affiliate ref code
- Apply campaign-specific discounts in `CartContext.jsx`

### **Lottery Tracking:**
- Each order with campaign creates `campaignParticipants` entry
- Track SKU count as "tickets" for lottery draw
- Admin interface to view all participants and select winners

---

**IMPLEMENTATION STATUS:**
- Phase 1: 🚧 Starting implementation
- Phase 2: 📋 Planned
- Phase 3: 📋 Planned