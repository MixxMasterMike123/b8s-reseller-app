# B8Shield B2C Shop Setup Guide

## 🎯 Overview
This guide explains how to set up `shop.b8shield.com` as a B2C storefront while keeping the existing B2B reseller portal.

## 🏗️ Architecture
- **B2B Portal**: Main domain (`b8shield-reseller-app.web.app`) and future `reseller.b8shield.com`
- **B2C Shop**: `shop.b8shield.com` subdomain
- **Shared Backend**: Same Firebase project, products database, and admin panel

## 📋 Setup Checklist

### ✅ Step 1: DNS Configuration
Add this DNS record in your webhost control panel:
```
Type: CNAME
Name: shop
Value: b8shield-reseller-app.web.app
TTL: 3600 (or Auto)
```

### ✅ Step 2: Firebase Custom Domain
1. Go to [Firebase Console](https://console.firebase.google.com/project/b8shield-reseller-app/hosting/main)
2. Click "Add custom domain"
3. Enter: `shop.b8shield.com`
4. Follow the verification steps

### ✅ Step 3: Code Implementation (DONE)
- ✅ Subdomain detection in `App.jsx`
- ✅ B2C shop components created in `src/pages/shop/`
- ✅ Route separation based on subdomain
- ✅ Debug info for testing

## 🧪 Testing

### Current Status:
- **Main site**: https://b8shield-reseller-app.web.app (B2B Reseller Portal)
- **Shop subdomain**: Will be `https://shop.b8shield.com` (B2C Store)

### Debug Information:
Both modes show debug info at the top:
- **Green bar**: B2B Reseller Mode
- **Yellow bar**: B2C Shop Mode

## 🔄 How Subdomain Detection Works

```javascript
const hostname = window.location.hostname;
const subdomain = hostname.split('.')[0];
const isShopSubdomain = subdomain === 'shop';
const appMode = isShopSubdomain ? 'shop' : 'reseller';
```

## 🛠️ Next Development Steps

### Phase 1: Basic B2C Features (This Week)
- [ ] Enhanced product detail pages
- [ ] Shopping cart functionality
- [ ] Customer authentication
- [ ] Basic checkout flow

### Phase 2: E-commerce Features (Next 2-3 weeks)
- [ ] Stripe payment integration
- [ ] Order management for customers
- [ ] Email notifications
- [ ] Customer account pages

### Phase 3: Advanced Features
- [ ] Inventory management
- [ ] Affiliate system
- [ ] Analytics and reporting
- [ ] SEO optimization

## 📁 File Structure

```
src/
├── pages/
│   ├── shop/                    # B2C Shop Components
│   │   ├── PublicStorefront.jsx # Main shop page
│   │   ├── PublicProductPage.jsx
│   │   ├── ShoppingCart.jsx
│   │   ├── Checkout.jsx
│   │   ├── CustomerLogin.jsx
│   │   ├── CustomerRegister.jsx
│   │   └── CustomerAccount.jsx
│   └── [existing B2B pages]
└── App.jsx                      # Subdomain routing logic
```

## 🚀 Deployment Commands

```bash
# Build the project
npm run build

# Deploy to Firebase
firebase deploy --only hosting

# Test locally
npm run dev
```

## 🔗 URLs After DNS Setup

- **B2B Portal**: https://b8shield-reseller-app.web.app
- **B2C Shop**: https://shop.b8shield.com
- **Future B2B**: https://reseller.b8shield.com (when ready)

## 💰 Cost Benefits

Compared to Shopify ($126-228/month):
- **Firebase Hosting**: $0-25/month
- **Annual Savings**: $1,200-2,400
- **Break-even**: Need 25-45 sales/month just to cover Shopify costs

## 🎨 Current B2C Design Features

- Swedish localization
- Product catalog with images
- Mobile-responsive design
- Professional styling matching B2B portal
- Firebase integration for real-time data

## 🔧 Technical Notes

- Same Firebase project (`b8shield-reseller-app`)
- Uses named database: `b8s-reseller-db`
- Shared product management system
- Role-based access control maintained
- Zero impact on existing B2B functionality 