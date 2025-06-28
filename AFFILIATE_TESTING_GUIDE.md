# Affiliate System Testing Guide

## 🎯 **Testing the Complete Affiliate Flow**

This guide will help you test the entire affiliate system from click tracking to conversion and commission calculation.

## 🔧 **Prerequisites**

1. **Active Affiliate Account**: You need at least one approved affiliate
2. **B2C Shop Access**: Use `shop.b8shield.com` subdomain
3. **Admin Access**: For verifying tracking data

## 📋 **Step-by-Step Testing Process**

### **Phase 1: Create Test Affiliate**

1. **Register New Affiliate**:
   - Go to: `https://shop.b8shield.com/affiliate-registration`
   - Fill in test data (use a real email you can access)
   - Submit application

2. **Admin Approval**:
   - Login to B2B portal: `https://b8shield-reseller-app.web.app/admin/affiliates`
   - Find pending application
   - Click "Granska" → Set discount percentage (e.g., 15%) → "Godkänn"
   - Note the generated affiliate code (e.g., `MIKAEL-432`)

### **Phase 2: Test Click Tracking**

1. **Create Affiliate Link**:
   ```
   https://shop.b8shield.com/?ref=MIKAEL-432
   ```

2. **Test Click Logging**:
   - Open affiliate link in **incognito/private browser**
   - Check browser console for: `"Affiliate code detected: MIKAEL-432"`
   - Verify localStorage contains affiliate data:
     ```javascript
     localStorage.getItem('b8s_affiliate_ref')
     // Should show: {"code":"MIKAEL-432","expiry":...}
     ```

3. **Verify in Admin**:
   - Go to: Admin → Affiliates → Find your affiliate
   - Check that "Klick" count increased by 1

### **Phase 3: Test Discount Application**

1. **Add Products to Cart**:
   - Browse products on `https://shop.b8shield.com/`
   - Add at least one product to cart
   - Go to cart page

2. **Verify Auto-Applied Discount**:
   - Discount should appear automatically with affiliate code
   - Should show: "Rabatt (MIKAEL-432) 15% - XX kr"
   - Green banner should display affiliate discount info

### **Phase 4: Test Shopify-Style Checkout**

1. **Navigate to Checkout**:
   - Click "Gå till kassan" from cart
   - Should see 3-step progress: Kontakt → Leverans → Betalning

2. **Complete Contact Step**:
   - Enter email address
   - Optional: Check marketing consent
   - Click "Fortsätt till leveransadress"

3. **Complete Shipping Step**:
   - Fill in all required fields (marked with *)
   - Select country (affects shipping cost)
   - Click "Fortsätt till betalning"

4. **Complete Payment Step**:
   - Review order summary on right sidebar
   - Verify affiliate discount is shown
   - Click "Slutför beställning (Test)"

### **Phase 5: Verify Order Confirmation**

1. **Order Confirmation Page**:
   - Should redirect to `/order-confirmation/{orderId}`
   - Order number format: `B8S-XXXXXX`
   - Green success message with order details

2. **Affiliate Section**:
   - Look for green "🎉 Affiliate-rabatt tillämpad" section
   - Should show affiliate code and discount details
   - Tracking status confirmation message

### **Phase 6: Verify Conversion Tracking**

1. **Check Admin Affiliate Stats**:
   - Go to: Admin → Affiliates
   - Find your test affiliate
   - Verify stats updated:
     - **Klick**: Should be 1 (or more if multiple tests)
     - **Konverteringar**: Should be 1
     - **Intjänat**: Should show commission amount (15% of order total)

2. **Check Order in Admin**:
   - Go to: Admin → Ordrar
   - Find your test order
   - Should show `affiliateCode` field
   - Should show `affiliateCommission` amount

### **Phase 7: Verify Database Records**

1. **Firestore Collections to Check**:

   **affiliateClicks**:
   ```javascript
   {
     affiliateCode: "MIKAEL-432",
     converted: true,
     orderId: "order_id_here",
     commissionAmount: 45.67,
     timestamp: ...
   }
   ```

   **orders**:
   ```javascript
   {
     orderNumber: "B8S-123456",
     affiliateCode: "MIKAEL-432",
     affiliateCommission: 45.67,
     affiliateDiscount: {
       code: "MIKAEL-432",
       percentage: 15,
       amount: 30.00
     },
     ...
   }
   ```

   **affiliates** (updated stats):
   ```javascript
   {
     stats: {
       clicks: 1,
       conversions: 1,
       totalEarnings: 45.67,
       balance: 45.67
     }
   }
   ```

## 🐛 **Common Issues & Debugging**

### **Issue: Affiliate Code Not Detected**
- **Solution**: Check URL format, ensure `?ref=CODE` parameter
- **Debug**: Check browser console for error messages

### **Issue: Discount Not Applied**
- **Solution**: Clear localStorage and try again
- **Debug**: Check affiliate exists and is active in database

### **Issue: Conversion Not Tracked**
- **Solution**: Check Cloud Function logs in Firebase Console
- **Debug**: Verify order contains `affiliateCode` field

### **Issue: Commission Not Calculated**
- **Solution**: Check `processAffiliateConversion` function execution
- **Debug**: Look for function errors in Firebase Console → Functions

## 📊 **Expected Test Results**

After completing a full test cycle:

1. **Affiliate Stats Updated**:
   - Clicks: +1
   - Conversions: +1
   - Earnings: Order total × commission rate

2. **Order Created Successfully**:
   - Contains affiliate tracking data
   - Proper discount calculation
   - Customer information captured

3. **Database Consistency**:
   - Click marked as converted
   - Commission amount matches calculation
   - All related records linked properly

## 🎉 **Success Criteria**

✅ **Click Tracking**: Affiliate links log clicks to database  
✅ **Discount Application**: Automatic discount application in cart  
✅ **Checkout Flow**: Complete 3-step Shopify-style checkout  
✅ **Order Creation**: Orders saved with affiliate data  
✅ **Conversion Tracking**: Commissions calculated and recorded  
✅ **Admin Visibility**: All data visible in admin interface  

## 🔄 **Testing Multiple Scenarios**

1. **Different Affiliate Codes**: Test with multiple affiliates
2. **Expired Codes**: Test 30-day expiry (manually adjust localStorage)
3. **No Affiliate**: Test normal checkout without affiliate code
4. **Different Countries**: Test shipping cost calculations
5. **Multiple Products**: Test with various cart combinations

## 📝 **Test Data Examples**

### **Test Affiliate Registration**:
```
Name: Test Affiliate
Email: test@example.com
Phone: +46 70 123 4567
Address: Testgatan 123
City: Stockholm
Country: SE
Website: https://testblog.se
Instagram: @testaffiliate
```

### **Test Customer Information**:
```
Email: customer@test.se
Name: Test Customer
Address: Kundgatan 456
Postal Code: 123 45
City: Göteborg
Country: SE
```

This comprehensive testing will verify that your affiliate system is working correctly and ready for real-world use! 