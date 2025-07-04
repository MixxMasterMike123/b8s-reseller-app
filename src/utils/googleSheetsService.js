/**
 * Google Sheets Integration for B8Shield Translation Management
 * Handles reading from and writing to Google Sheets for translation workflow
 * Uses Service Account for secure access
 */

class GoogleSheetsService {
  constructor() {
    this.baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
    this.serviceAccountEmail = 'b8shield-translations@b8shield-reseller-app.iam.gserviceaccount.com';
    this.initializeAuth();
  }

  /**
   * Initialize authentication
   */
  async initializeAuth() {
    try {
      // For now, we'll use the API key approach with service account email for sharing
      this.apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
      
      // Load service account for future use
      const serviceAccount = await this.loadServiceAccount();
      this.serviceAccount = serviceAccount;
    } catch (error) {
      console.error('Failed to initialize Google Auth:', error);
      // Fallback to API key method
      this.apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
    }
  }

  /**
   * Load service account credentials
   */
  async loadServiceAccount() {
    try {
      const response = await fetch('/service-account.json');
      if (!response.ok) {
        throw new Error('Service account file not found');
      }
      return await response.json();
    } catch (error) {
      console.warn('Service account not available, using API key method');
      return null;
    }
  }

  /**
   * Get service account email for sharing instructions
   */
  getServiceAccountEmail() {
    return this.serviceAccountEmail;
  }

  /**
   * Extract spreadsheet ID from Google Sheets URL
   */
  extractSpreadsheetId(url) {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  }

  /**
   * Get sheet data from Google Sheets
   */
  async getSheetData(spreadsheetUrl, range = 'A:Z') {
    try {
      const spreadsheetId = this.extractSpreadsheetId(spreadsheetUrl);
      if (!spreadsheetId) {
        throw new Error('Invalid Google Sheets URL');
      }

      // First try with API key if available
      if (this.apiKey && this.apiKey !== 'YOUR_API_KEY_HERE') {
        const response = await fetch(
          `${this.baseUrl}/${spreadsheetId}/values/${range}?key=${this.apiKey}`
        );

        if (response.ok) {
          const data = await response.json();
          return this.parseSheetData(data.values || []);
        }
      }

      // Fallback: Try public CSV export method
      console.warn('API key not available, trying public CSV export method...');
      return await this.getSheetDataViaCsv(spreadsheetId);
      
    } catch (error) {
      console.error('Error fetching sheet data:', error);
      throw error;
    }
  }

  /**
   * Fallback method using CSV export (works with public sheets)
   */
  async getSheetDataViaCsv(spreadsheetId) {
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`;
      
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error(`CSV export failed: ${response.status}. Make sure your Google Sheet is publicly viewable.`);
      }

      const csvText = await response.text();
      const rows = this.parseCsvToRows(csvText);
      return this.parseSheetData(rows);
    } catch (error) {
      throw new Error(`Fallback CSV method failed: ${error.message}`);
    }
  }

  /**
   * Parse CSV text into rows array
   */
  parseCsvToRows(csvText) {
    const rows = [];
    const lines = csvText.split('\n');
    
    for (const line of lines) {
      if (line.trim()) {
        // Simple CSV parsing (handles basic cases)
        const row = line.split(',').map(cell => 
          cell.replace(/^"(.*)"$/, '$1').trim()
        );
        rows.push(row);
      }
    }
    
    return rows;
  }

  /**
   * Parse sheet data into translation objects
   */
  parseSheetData(rows) {
    if (rows.length === 0) return [];

    const headers = rows[0];
    const translations = [];

    // Expected columns: Key, Context, Swedish Original, English UK, English US, Status, Translator, Last Modified, Notes, Character Count
    const columnMap = {
      key: this.findColumnIndex(headers, ['Key', 'Nyckel']),
      context: this.findColumnIndex(headers, ['Context', 'Kontext']),
      swedish: this.findColumnIndex(headers, ['Swedish Original', 'Svenska', 'Swedish']),
      englishUK: this.findColumnIndex(headers, ['English UK', 'English (UK)', 'Engelska UK']),
      englishUS: this.findColumnIndex(headers, ['English US', 'English (US)', 'Engelska US']),
      status: this.findColumnIndex(headers, ['Status']),
      translator: this.findColumnIndex(headers, ['Translator', 'Översättare']),
      lastModified: this.findColumnIndex(headers, ['Last Modified', 'Senast ändrad']),
      notes: this.findColumnIndex(headers, ['Notes', 'Anteckningar']),
      charCount: this.findColumnIndex(headers, ['Character Count', 'Antal tecken'])
    };

    // Process data rows (skip header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const translation = {
        id: this.getValue(row, columnMap.key) || `row_${i}`,
        context: this.getValue(row, columnMap.context) || '',
        swedish: this.getValue(row, columnMap.swedish) || '',
        englishUK: this.getValue(row, columnMap.englishUK) || '',
        englishUS: this.getValue(row, columnMap.englishUS) || '',
        status: this.getValue(row, columnMap.status) || 'pending',
        translator: this.getValue(row, columnMap.translator) || '',
        lastModified: this.getValue(row, columnMap.lastModified) || '',
        notes: this.getValue(row, columnMap.notes) || '',
        charCount: parseInt(this.getValue(row, columnMap.charCount)) || 0,
        rowIndex: i + 1 // For updating specific rows
      };

      // Only include rows with actual content
      if (translation.swedish || translation.englishUK || translation.englishUS) {
        translations.push(translation);
      }
    }

    return translations;
  }

  /**
   * Find column index by header name (case-insensitive, multiple options)
   */
  findColumnIndex(headers, possibleNames) {
    for (const name of possibleNames) {
      const index = headers.findIndex(header => 
        header && header.toLowerCase().trim() === name.toLowerCase().trim()
      );
      if (index !== -1) return index;
    }
    return -1;
  }

  /**
   * Get value from row by column index
   */
  getValue(row, columnIndex) {
    return columnIndex !== -1 && row[columnIndex] ? row[columnIndex].trim() : '';
  }

  /**
   * Export translations to Google Sheets format
   */
  formatForExport(translations, sheetType = 'admin') {
    const headers = [
      'Key',
      'Context', 
      'Swedish Original',
      'English UK',
      'English US',
      'Status',
      'Translator',
      'Last Modified',
      'Notes',
      'Character Count'
    ];

    const rows = [headers];

    translations.forEach(translation => {
      rows.push([
        translation.key || translation.id,
        translation.context || '',
        translation.swedish || '',
        translation.englishUK || '',
        translation.englishUS || '',
        translation.status || 'pending',
        translation.translator || '',
        translation.lastModified || new Date().toISOString().split('T')[0],
        translation.notes || '',
        (translation.swedish || '').length
      ]);
    });

    return rows;
  }

  /**
   * Generate CSV content for download
   */
  generateCSV(translations) {
    const rows = this.formatForExport(translations);
    return rows.map(row => 
      row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`)
         .join(',')
    ).join('\n');
  }

  /**
   * Download CSV file
   */
  downloadCSV(translations, filename = 'translations.csv') {
    const csv = this.generateCSV(translations);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  /**
   * Validate Google Sheets URL
   */
  validateSheetUrl(url) {
    if (!url) return { valid: false, error: 'URL is required' };
    
    const spreadsheetId = this.extractSpreadsheetId(url);
    if (!spreadsheetId) {
      return { valid: false, error: 'Invalid Google Sheets URL format' };
    }

    return { valid: true, spreadsheetId };
  }

  /**
   * Get sheet statistics
   */
  getSheetStats(translations) {
    const total = translations.length;
    const translated = translations.filter(t => 
      (t.englishUK && t.englishUK.trim()) || (t.englishUS && t.englishUS.trim())
    ).length;
    const pending = total - translated;
    
    const byStatus = translations.reduce((acc, t) => {
      const status = t.status || 'pending';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return {
      total,
      translated,
      pending,
      completionPercentage: total > 0 ? Math.round((translated / total) * 100) : 0,
      byStatus
    };
  }
}

export default GoogleSheetsService;
