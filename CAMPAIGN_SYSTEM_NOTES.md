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

## **PHASE 2: AFFILIATE PORTAL INTEGRATION** 📋 PENDING

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