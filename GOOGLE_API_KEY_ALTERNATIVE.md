# Alternative: Use Service Account Instead of API Key

If you can't create an API key, you can use a Service Account instead:

## Method 1: Service Account (More Secure)

1. **Create Service Account**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "Service account"
   - Name it "B8Shield Translations"
   - Click "Create and Continue"
   - Skip role assignment (click "Continue")
   - Click "Done"

2. **Generate Key**:
   - Click on your new service account
   - Go to "Keys" tab
   - Click "Add Key" → "Create new key"
   - Choose "JSON" format
   - Download the JSON file

3. **Update Code**:
   - Place JSON file in your project root
   - Update GoogleSheetsService to use service account

## Method 2: Try Different Browser

Sometimes the Google Cloud Console interface varies by browser:
- Try Chrome/Firefox/Safari
- Clear browser cache
- Try incognito/private mode

## Method 3: Enable APIs First

Make sure these APIs are enabled:
1. Google Sheets API
2. Google Drive API (sometimes needed)

Then try creating credentials again.
