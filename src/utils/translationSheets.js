/**
 * Google Sheets Translation Workflow Utilities
 * Handles export/import of translation data to/from Google Sheets
 */

// Google Sheets column mapping (zero-indexed)
export const SHEET_COLUMNS = {
  KEY: 0,           // A: Unique translation key
  CONTEXT: 1,       // B: Usage context
  SWEDISH: 2,       // C: Swedish original text
  ENGLISH_UK: 3,    // D: British English translation
  ENGLISH_US: 4,    // E: American English translation
  STATUS: 5,        // F: Translation status
  TRANSLATOR: 6,    // G: Translator name
  LAST_MODIFIED: 7, // H: Last modification timestamp
  NOTES: 8,         // I: Additional notes
  CHAR_COUNT: 9     // J: Character count
};

// Translation status options
export const TRANSLATION_STATUS = {
  NEW: 'Ny',
  IN_PROGRESS: 'Pågående',
  TRANSLATED: 'Översatt',
  REVIEWED: 'Granskad',
  APPROVED: 'Godkänd',
  NEEDS_REVISION: 'Behöver revidering'
};

// Google Sheets URLs for each translation category
export const TRANSLATION_SHEETS = {
  ADMIN: 'https://docs.google.com/spreadsheets/d/1KUyrNujoFGQScQaiivK6ZH5H8ISSVK6onZnjXeiah3g/edit?gid=0#gid=0',
  B2B: '', // To be added
  B2C: '', // To be added
  WEB: ''  // To be added
};

/**
 * Generate translation key from text and context
 * @param {string} text - Original Swedish text
 * @param {string} context - Usage context
 * @returns {string} Unique translation key
 */
export const generateTranslationKey = (text, context) => {
  // Create a readable key from context and text
  const contextKey = context.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
  const textKey = text.toLowerCase()
    .replace(/[åäö]/g, (match) => ({ 'å': 'a', 'ä': 'a', 'ö': 'o' }[match]))
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 30); // Limit length
  
  return `${contextKey}.${textKey}`;
};

/**
 * Extract all translatable strings from a React component
 * @param {string} componentCode - React component source code
 * @returns {Array} Array of translation objects
 */
export const extractTranslatableStrings = (componentCode) => {
  const translations = [];
  
  // Regex patterns for different types of translatable strings
  const patterns = [
    // Button text, labels, headings
    /['"`]([^'"`]*(?:kund|beställ|produkt|admin|hantering|inställning|profil|kontakt|support|historik|katalog|material|användare|ordrar|dashboard)[^'"`]*)['"`]/gi,
    // Form labels and placeholders
    /(?:label|placeholder|title|alt)=['"`]([^'"`]+)['"`]/gi,
    // Toast messages and alerts
    /toast\.(?:success|error|warning|info)\(['"`]([^'"`]+)['"`]/gi,
    // Swedish text in JSX
    />\s*([^<]*(?:kund|beställ|produkt|admin|hantering|inställning|profil|kontakt|support|historik|katalog|material|användare|ordrar|dashboard)[^<]*)\s*</gi
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(componentCode)) !== null) {
      const text = match[1].trim();
      if (text.length > 2 && /[a-zA-ZåäöÅÄÖ]/.test(text)) {
        translations.push({
          key: generateTranslationKey(text, 'component'),
          context: 'React Component',
          swedish: text,
          englishUK: '',
          englishUS: '',
          status: TRANSLATION_STATUS.NEW,
          translator: '',
          lastModified: new Date().toISOString(),
          notes: 'Auto-extracted from component',
          charCount: text.length
        });
      }
    }
  });
  
  return translations;
};

/**
 * Format translation data for Google Sheets export
 * @param {Array} translations - Array of translation objects
 * @returns {Array} 2D array for Google Sheets
 */
export const formatForSheetsExport = (translations) => {
  const rows = [
    // Header row
    ['Key', 'Context', 'Swedish Original', 'English UK', 'English US', 'Status', 'Translator', 'Last Modified', 'Notes', 'Character Count']
  ];
  
  translations.forEach(t => {
    rows.push([
      t.key,
      t.context,
      t.swedish,
      t.englishUK || '',
      t.englishUS || '',
      t.status,
      t.translator || '',
      t.lastModified,
      t.notes || '',
      t.charCount
    ]);
  });
  
  return rows;
};

/**
 * Parse translation data from Google Sheets import
 * @param {Array} rows - 2D array from Google Sheets
 * @returns {Array} Array of translation objects
 */
export const parseFromSheetsImport = (rows) => {
  const translations = [];
  
  // Skip header row
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[SHEET_COLUMNS.KEY] && row[SHEET_COLUMNS.SWEDISH]) {
      translations.push({
        key: row[SHEET_COLUMNS.KEY],
        context: row[SHEET_COLUMNS.CONTEXT] || '',
        swedish: row[SHEET_COLUMNS.SWEDISH],
        englishUK: row[SHEET_COLUMNS.ENGLISH_UK] || '',
        englishUS: row[SHEET_COLUMNS.ENGLISH_US] || '',
        status: row[SHEET_COLUMNS.STATUS] || TRANSLATION_STATUS.NEW,
        translator: row[SHEET_COLUMNS.TRANSLATOR] || '',
        lastModified: row[SHEET_COLUMNS.LAST_MODIFIED] || new Date().toISOString(),
        notes: row[SHEET_COLUMNS.NOTES] || '',
        charCount: parseInt(row[SHEET_COLUMNS.CHAR_COUNT]) || 0
      });
    }
  }
  
  return translations;
};

/**
 * Validate translation data before import
 * @param {Array} translations - Array of translation objects
 * @returns {Object} Validation results
 */
export const validateTranslations = (translations) => {
  const errors = [];
  const warnings = [];
  
  translations.forEach((t, index) => {
    // Required fields
    if (!t.key) errors.push(`Row ${index + 2}: Missing translation key`);
    if (!t.swedish) errors.push(`Row ${index + 2}: Missing Swedish text`);
    
    // Character count validation
    if (t.englishUK && t.englishUK.length > t.swedish.length * 1.5) {
      warnings.push(`Row ${index + 2}: English UK text significantly longer than Swedish`);
    }
    if (t.englishUS && t.englishUS.length > t.swedish.length * 1.5) {
      warnings.push(`Row ${index + 2}: English US text significantly longer than Swedish`);
    }
    
    // Status validation
    if (t.status && !Object.values(TRANSLATION_STATUS).includes(t.status)) {
      warnings.push(`Row ${index + 2}: Invalid status "${t.status}"`);
    }
  });
  
  return { errors, warnings, isValid: errors.length === 0 };
};

/**
 * Generate sample translation data for testing
 * @returns {Array} Sample translation objects
 */
export const generateSampleTranslations = () => {
  return [
    {
      key: 'admin.dashboard.title',
      context: 'Admin Dashboard Page Title',
      swedish: 'Administratörspanel',
      englishUK: 'Administrator Panel',
      englishUS: 'Administrator Panel',
      status: TRANSLATION_STATUS.APPROVED,
      translator: 'Professional Translator',
      lastModified: new Date().toISOString(),
      notes: 'Main admin dashboard title',
      charCount: 18
    },
    {
      key: 'customer.management.title',
      context: 'Customer Management Section',
      swedish: 'Kundhantering',
      englishUK: 'Customer Management',
      englishUS: 'Customer Management',
      status: TRANSLATION_STATUS.APPROVED,
      translator: 'Professional Translator',
      lastModified: new Date().toISOString(),
      notes: 'Customer management section title',
      charCount: 13
    },
    {
      key: 'product.catalog.title',
      context: 'Product Catalog Page',
      swedish: 'Produktkatalog',
      englishUK: 'Product Catalogue',
      englishUS: 'Product Catalog',
      status: TRANSLATION_STATUS.APPROVED,
      translator: 'Professional Translator',
      lastModified: new Date().toISOString(),
      notes: 'Note UK/US spelling difference',
      charCount: 13
    },
    {
      key: 'order.history.title',
      context: 'Order History Page',
      swedish: 'Orderhistorik',
      englishUK: 'Order History',
      englishUS: 'Order History',
      status: TRANSLATION_STATUS.TRANSLATED,
      translator: 'Professional Translator',
      lastModified: new Date().toISOString(),
      notes: 'Order history page title',
      charCount: 12
    },
    {
      key: 'marketing.materials.title',
      context: 'Marketing Materials Section',
      swedish: 'Marknadsföringsmaterial',
      englishUK: 'Marketing Materials',
      englishUS: 'Marketing Materials',
      status: TRANSLATION_STATUS.NEW,
      translator: '',
      lastModified: new Date().toISOString(),
      notes: 'Marketing materials section',
      charCount: 21
    }
  ];
}; 