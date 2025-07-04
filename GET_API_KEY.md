# Getting Google Sheets API Key (Simple Method)

## 🔑 Quick Steps to Get API Key

### Step 1: Go Back to Google Cloud Console
1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Make sure you're in the "b8shield-reseller-app" project

### Step 2: Create API Key (Alternative Method)
1. Go to "APIs & Services" → "Credentials"
2. Look for "API Keys" section at the bottom
3. If you see an existing API key, click the copy icon
4. If not, try these steps:

**Method A: Direct API Key Creation**
1. Click "Create Credentials" dropdown
2. You should see "API key" option
3. If not visible, try refreshing the page

**Method B: Enable API First**
1. Go to "APIs & Services" → "Library"
2. Search for "Google Sheets API"
3. Make sure it's "ENABLED"
4. Go back to "Credentials"
5. Try "Create Credentials" → "API key" again

### Step 3: Copy Your API Key
Once you have the API key:
1. Copy the key (starts with "AIza...")
2. In your project, open `.env` file
3. Replace `YOUR_API_KEY_HERE` with your actual key:
   ```
   VITE_GOOGLE_SHEETS_API_KEY=AIzaSyC-your-actual-key-here
   ```

### Step 4: Test the Connection
1. Restart your dev server: `npm run dev`
2. Go to Admin → Översättningar
3. Click "Testa anslutning" for Admin Portal
4. Should see green success message

## 🔄 Alternative: Use Public Sheets Without API Key

If you can't get an API key, we can modify the approach:

1. Make your Google Sheets public (Anyone on the internet can view)
2. Use a different API endpoint that doesn't require authentication
3. This is less secure but works for testing

Let me know which approach you prefer!
