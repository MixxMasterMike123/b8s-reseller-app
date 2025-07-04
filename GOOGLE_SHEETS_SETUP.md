# Google Sheets Integration Setup Guide

## 🔑 **Step 1: Get Google Sheets API Key**

### 1.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Name it something like "B8Shield Translations"

### 1.2 Enable Google Sheets API
1. Go to "APIs & Services" → "Library"
2. Search for "Google Sheets API"
3. Click "Enable"

### 1.3 Create API Key
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API Key"
3. Copy the API key
4. **Important**: Restrict the API key:
   - Click "Restrict Key"
   - Under "API restrictions", select "Google Sheets API"
   - Under "Application restrictions", add your domains:
     - `https://partner.b8shield.com`
     - `https://shop.b8shield.com`
     - `http://localhost:5173` (for development)

### 1.4 Add API Key to Environment
1. Open `.env` file in your project root
2. Add your API key:
   ```
   VITE_GOOGLE_SHEETS_API_KEY=your_actual_api_key_here
   ```

## 📋 **Step 2: Configure Google Sheets**

### 2.1 Sheet Permissions
Your Google Sheets must be **publicly viewable** for the API to read them:

1. Open your Google Sheet
2. Click "Share" button
3. Under "General access", select "Anyone with the link"
4. Set permission to "Viewer"
5. Click "Done"

### 2.2 Required Sheet Structure
Each translation sheet must have these columns (exact names):

| Column | Required | Description |
|--------|----------|-------------|
| Key | Yes | Unique identifier for the translation |
| Context | Yes | Where this text appears |
| Swedish Original | Yes | Original Swedish text |
| English UK | No | UK English translation |
| English US | No | US English translation |
| Status | No | Translation status (pending, translated, reviewed) |
| Translator | No | Who translated it |
| Last Modified | No | When it was last changed |
| Notes | No | Additional notes |
| Character Count | No | Length of Swedish text |

### 2.3 Your Current Sheets
Based on your Google Drive setup:

- **Admin Portal**: https://docs.google.com/spreadsheets/d/1KUyrNujoFGQScQaiivK6ZH5H8ISSVK6onZnjXeiah3g/edit?gid=0#gid=0
- **Content Fields**: https://docs.google.com/spreadsheets/d/1lrr7N6NEL3F0Xd4SFPviJaAkpxmxvTALFjpVIM5aoFQ/edit?gid=0#gid=0

## 🔄 **Step 3: Using the Translation System**

### 3.1 Import from Google Sheets
1. Go to Admin → Översättningar
2. Click "Inställningar" tab
3. Paste your Google Sheets URLs
4. Click "Testa anslutning" to verify
5. Go to "Import/Export" tab
6. Click "Importera från Sheets"

### 3.2 Export for Translation
1. Go to "Import/Export" tab
2. Select translation type (Admin, B2B, B2C, Content)
3. Click "Exportera till CSV"
4. Upload the CSV to your Google Sheets
5. Translate the texts in Google Sheets
6. Import back when done

### 3.3 Translation Workflow
1. **Extract** → System finds new texts in code
2. **Export** → Download CSV with new texts
3. **Upload** → Add CSV data to Google Sheets
4. **Translate** → Fill in English columns in Google Sheets
5. **Import** → System reads completed translations
6. **Deploy** → Translations appear on live site

## 🔒 **Security Notes**

### API Key Security
- Never commit API keys to Git
- Use environment variables only
- Restrict API key to specific domains
- Monitor API usage in Google Cloud Console

### Sheet Access
- Use "Anyone with link" + "Viewer" permissions
- Don't use "Anyone on the internet"
- Consider using Service Account for production

## 🐛 **Troubleshooting**

### Common Issues

**"Invalid Google Sheets URL"**
- Check URL format: `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`
- Remove any extra parameters after `/edit`

**"API Key Error"**
- Verify API key is correct in `.env`
- Check API key restrictions in Google Cloud Console
- Ensure Google Sheets API is enabled

**"Permission Denied"**
- Make sure sheet is shared with "Anyone with link"
- Verify sheet permissions are set to "Viewer"

**"No Data Found"**
- Check if sheet has the required column headers
- Verify sheet is not empty
- Make sure you're using the correct sheet URL

### Testing Connection
Use the "Testa anslutning" buttons in Settings to verify:
- ✅ Green dot = Working connection
- ❌ Red dot = Connection failed
- ⚠️ Yellow dot = Partial data

## 📊 **Google Sheets Templates**

### Admin Portal Template
```
Key,Context,Swedish Original,English UK,English US,Status,Translator,Last Modified,Notes,Character Count
dashboard.welcome,Dashboard,Välkommen till B8Shield,Welcome to B8Shield,,translated,Admin,2024-12-20,,24
nav.products,Navigation,Produktkatalog,Product Catalog,,translated,Admin,2024-12-20,,13
```

### B2B Portal Template
```
Key,Context,Swedish Original,English UK,English US,Status,Translator,Last Modified,Notes,Character Count
order.title,Order Page,Lägg en beställning,Place an Order,,pending,,,17
product.catalog,Product Page,Produktkatalog,Product Catalog,,pending,,,13
```

## 🚀 **Next Steps**

1. **Get API Key** → Follow Step 1 above
2. **Configure Sheets** → Set permissions and structure
3. **Test Connection** → Use admin interface to verify
4. **Start Translating** → Begin with Admin Portal translations
5. **Deploy** → Push translations to live site

The system is now ready for real Google Sheets integration!
