# 📊 B8Shield Affiliate CSV Import Guide

The B8Shield system includes a powerful CSV import tool for batch importing affiliates. This guide covers everything you need to know to successfully import your existing affiliate database.

## 🎯 **What the Import Script Does**

✅ **Creates Firebase Auth accounts** (or uses existing ones)  
✅ **Generates unique affiliate codes** (e.g., ERIK-432, ANNA-567)  
✅ **Imports all affiliate data** into the `affiliates` collection  
✅ **Sets default commission rates** and checkout discounts  
✅ **Handles duplicate prevention** (skips existing affiliates)  
✅ **Generates secure temporary passwords** for new accounts  
✅ **Provides detailed import summary** with credentials  

## 📋 **Required CSV Format**

Your CSV file must have these **exact column headers** (order doesn't matter):

```csv
name,email,phone,address,postalCode,city,country,commissionRate,checkoutDiscount,website,instagram,youtube,facebook,tiktok,promotionMethod,message
```

### **Required Fields:**
- `name` - Full name of affiliate
- `email` - Valid email address (unique)

### **Optional Fields:**
- `phone` - Phone number
- `address` - Street address
- `postalCode` - Postal code
- `city` - City
- `country` - Country code (default: SE)
- `commissionRate` - Commission percentage 0-100 (default: 15)
- `checkoutDiscount` - Customer discount percentage 0-100 (default: 10)
- `website` - Website URL
- `instagram` - Instagram handle
- `youtube` - YouTube channel
- `facebook` - Facebook page
- `tiktok` - TikTok handle
- `promotionMethod` - How they promote
- `message` - Additional notes

## 📝 **Example CSV File**

```csv
name,email,phone,address,postalCode,city,country,commissionRate,checkoutDiscount,website,instagram,youtube,facebook,tiktok,promotionMethod,message
Erik Andersson,erik@example.com,08-123456,Storgatan 15,11523,Stockholm,SE,20,15,https://eriksfish.com,@eriksfish,@eriksfish,,@eriksfish,Instagram & YouTube,Experienced fishing influencer
Anna Johansson,anna@example.com,031-987654,Fiskehamn 23,41124,Göteborg,SE,15,10,https://annasangling.se,@annasangling,,,@annas_angling,Instagram,Passionate angler sharing tips
```

## 🚀 **How to Import**

### **Step 1: Prepare Your CSV File**
1. Export your current affiliate data to CSV
2. Ensure column headers match exactly (see format above)
3. Save as `your-affiliates.csv`

### **Step 2: Place CSV in Project**
```bash
# Copy your CSV file to the project root
cp /path/to/your-affiliates.csv ./affiliates.csv
```

### **Step 3: Run Import Script**
```bash
# Import your affiliates
node scripts/import-affiliates-csv.js affiliates.csv
```

### **Step 4: Review Results**
The script will show detailed progress and provide a summary with:
- ✅ Successfully imported affiliates
- ❌ Any errors encountered  
- ⚠️ Duplicates skipped
- 🔑 Generated passwords for new accounts

## 📊 **Import Process**

For each CSV row, the script will:

1. **Validate data** (required fields, email format, percentages)
2. **Check for duplicates** (skip if email already exists)
3. **Create/find Firebase Auth account** with secure password
4. **Generate unique affiliate code** (NAME-XXX format)
5. **Create affiliate document** with all data and default stats
6. **Provide credentials** for new accounts

## 🎉 **What Gets Created**

Each imported affiliate gets:

```javascript
{
  id: "firebase-auth-uid",
  email: "erik@example.com",
  name: "Erik Andersson", 
  affiliateCode: "ERIK-432",
  status: "active",
  commissionRate: 20,
  checkoutDiscount: 15,
  
  // Contact info
  phone: "08-123456",
  address: "Storgatan 15",
  city: "Stockholm",
  country: "SE",
  
  // Social media
  socials: {
    website: "https://eriksfish.com",
    instagram: "@eriksfish",
    youtube: "@eriksfish"
  },
  
  // Fresh stats
  stats: {
    clicks: 0,
    conversions: 0,
    totalEarnings: 0,
    balance: 0
  },
  
  // Import metadata
  importedAt: timestamp,
  temporaryPassword: "SecurePass123!", // For admin reference
  createdAt: timestamp
}
```

## 🔐 **Firebase Auth Accounts**

The script automatically:
- **Creates new Firebase Auth users** for new emails
- **Uses existing Firebase Auth accounts** if email already exists
- **Generates secure 12-character passwords** for new accounts
- **Sets displayName** to affiliate's full name
- **Marks email as verified**

## ⚙️ **Default Settings**

All imported affiliates get:
- **Status**: `active` (ready to start earning)
- **Commission Rate**: 15% (unless specified in CSV)
- **Checkout Discount**: 10% (unless specified in CSV)
- **Stats**: All zeros (fresh start)
- **Payment Info**: Empty (to be filled by affiliate)

## 🛡️ **Duplicate Protection**

The script automatically:
- **Checks existing emails** before creating affiliates
- **Skips duplicates** with clear logging
- **Prevents Firebase Auth conflicts** by checking existing users
- **Reports duplicate count** in final summary

## 📈 **After Import**

Your imported affiliates will:
- **Appear in Admin → Affiliates** with full management capabilities
- **Have working affiliate links** like `shop.b8shield.com?ref=ERIK-432`
- **Receive automatic commission tracking** for B2C orders
- **Be able to log in** to their affiliate portal (once you send credentials)

## 🚨 **Important Next Steps**

After successful import:

### **1. Send Welcome Emails**
- Use the provided temporary passwords from import summary
- Send affiliates their login credentials and affiliate codes
- Direct them to the affiliate portal at your domain

### **2. Verify Import in Admin**
- Go to Admin → Affiliates to see all imported affiliates
- Check stats, commission rates, and contact information
- Test a few affiliate links to ensure tracking works

### **3. Customize Settings**
- Adjust commission rates per affiliate if needed
- Set up payment preferences for each affiliate
- Configure any special terms or conditions

## 🔧 **Troubleshooting**

### **Common Issues:**

**❌ "Service account file not found"**
```bash
# Generate the required service account file
node scripts/generate-service-account.js
```

**❌ "name is required" or "email must be valid"**
- Check your CSV format and ensure required fields are filled
- Verify column headers match exactly

**❌ "Could not generate unique affiliate code"**
- This is rare but can happen with very similar names
- Check if you have many affiliates with the same first name

**❌ "Permission denied"**
- Ensure your Firebase service account has admin permissions
- Check that you're using the correct Firebase project

### **CSV Format Issues:**

**Problem**: Headers don't match
**Solution**: Copy exact headers from this guide

**Problem**: Special characters in data
**Solution**: Ensure CSV is UTF-8 encoded

**Problem**: Missing required data
**Solution**: Fill in at least `name` and `email` for all rows

## 📋 **Testing the Import**

Before importing your full database:

1. **Test with sample data:**
   ```bash
   node scripts/import-affiliates-csv.js temp/affiliates-example.csv
   ```

2. **Verify in admin panel:**
   - Check Admin → Affiliates for imported data
   - Test affiliate link functionality
   - Verify commission tracking works

3. **Import your full data:**
   ```bash
   node scripts/import-affiliates-csv.js your-full-affiliates.csv
   ```

## 🎉 **Success Criteria**

A successful import should show:
- ✅ All CSV rows processed without errors
- ✅ Affiliate codes generated (NAME-XXX format)
- ✅ Firebase Auth accounts created/linked
- ✅ All affiliates visible in admin panel
- ✅ Affiliate links working for tracking

## 📞 **Support**

If you encounter issues:
1. Check the error messages from the import script
2. Verify your CSV format matches the requirements
3. Ensure Firebase permissions are correct
4. Review the troubleshooting section above

Your affiliate system is now ready for business! 🎣 