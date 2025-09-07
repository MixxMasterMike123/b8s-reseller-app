# EMAIL TEMPLATE DESIGN INVENTORY

## 📧 EXISTING TEMPLATES TO EXTRACT

### **B2C Customer Templates**
- `b2cOrderPending.ts` - Customer order confirmation
  - Languages: sv-SE, en-GB, en-US
  - Features: Product images, color/size display, pricing tables, VAT breakdown
  - Design: Green/yellow color scheme, professional layout

### **B2B Customer Templates**  
- `b2bOrderConfirmationCustomer.ts` - B2B customer order confirmation
  - Languages: sv-SE, en-GB, en-US
  - Features: Business-focused layout, margin information
  - Design: Professional B2B styling

### **Admin Notification Templates**
- `adminB2COrderNotification.ts` - Admin notification for B2C orders
- `b2bOrderConfirmationAdmin.ts` - Admin notification for B2B orders
  - Features: Order details, customer information, admin actions

### **Status Update Templates**
- `orderStatusUpdate.ts` - Order status change notifications
  - Languages: Multi-language support
  - Features: Status progression, tracking information, next steps

### **Welcome & Onboarding Templates**
- `welcomeCredentials.ts` - Customer welcome with credentials
- `affiliateWelcome.ts` - Affiliate welcome and onboarding
- `affiliateCredentials.ts` - Affiliate credentials and login info

### **Authentication Templates**
- `passwordReset.ts` - Password reset emails
  - Languages: Multi-language support
  - Features: Secure reset links, expiration times

## 🎨 DESIGN ELEMENTS TO PRESERVE

### **Brand Colors**
- Primary: #1d4ed8 (Blue)
- Success: #059669 (Green) 
- Warning: #f59e0b (Yellow/Orange)
- Background: #f9fafb (Light gray)

### **Layout Features**
- Max-width: 600px centered emails
- Border-radius: 8px cards
- Box-shadow: Professional depth
- Responsive design principles
- Product image displays (60x60px)
- Pricing tables with proper alignment

### **Typography**
- Font: 'Segoe UI', Arial, sans-serif
- Headers: Bold, proper hierarchy
- Body: Line-height 1.6 for readability

## 🔄 TEMPLATE MAPPING TO NEW SYSTEM

### **NEW UNIFIED FUNCTIONS → EXTRACTED TEMPLATES**

1. `sendOrderConfirmationEmail()`
   - B2C: Extract from `b2cOrderPending.ts`
   - B2B: Extract from `b2bOrderConfirmationCustomer.ts`

2. `sendOrderNotificationAdmin()`
   - B2C: Extract from `adminB2COrderNotification.ts`
   - B2B: Extract from `b2bOrderConfirmationAdmin.ts`

3. `sendOrderStatusUpdateEmail()`
   - Extract from `orderStatusUpdate.ts`

4. `sendWelcomeEmail()`
   - Extract from `welcomeCredentials.ts`

5. `sendAffiliateWelcomeEmail()`
   - Extract from `affiliateWelcome.ts`

6. `sendPasswordResetEmail()`
   - Extract from `passwordReset.ts`

7. `sendVerificationEmail()`
   - Create new template (simple verification design)
