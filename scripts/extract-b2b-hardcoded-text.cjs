const fs = require('fs');
const path = require('path');

// B2B Customer Portal files to analyze
const b2bFiles = [
  'src/pages/DashboardPage.jsx',
  'src/pages/ProductViewPage.jsx',
  'src/pages/OrderPage.jsx',
  'src/pages/OrderHistoryPage.jsx',
  'src/pages/OrderDetailPage.jsx',
  'src/pages/MarketingMaterialsPage.jsx',
  'src/pages/ProfilePage.jsx',
  'src/pages/ContactPage.jsx',
  'src/components/layout/AppLayout.jsx',
  'src/components/TrainingModal.jsx',
  'src/components/ProductDetailPopup.jsx'
];

// Swedish language patterns
const swedishPatterns = [
  // Swedish characters
  /[åäöÅÄÖ]/,
  
  // Swedish words and phrases
  /\b(och|eller|men|att|som|för|med|till|från|över|under|mellan|genom|inom|utom|vid|på|av|i|är|var|har|hade|kommer|ska|skulle|kan|kunde|vill|ville|måste|bör|får|fick|gör|gjorde|säger|sade|vet|visste|tror|trodde|ser|såg|hör|hörde|känner|kände)\b/gi,
  
  // Swedish suffixes
  /\w+(tion|ning|het|dom|skap|else|ande|ende|isk|lig|bar|sam|full|lös)\b/gi,
  
  // Common Swedish prefixes
  /\b(för|över|under|mellan|genom|inom|utom|vid|på|av|i|är|var|har|hade|kommer|ska|skulle|kan|kunde|vill|ville|måste|bör|får|fick|gör|gjorde|säger|sade|vet|visste|tror|trodde|ser|såg|hör|hörde|känner|kände)\w+/gi
];

// Function to check if text is a CSS class or technical string
function isTechnicalString(text) {
  // CSS classes and technical patterns
  const technicalPatterns = [
    // CSS classes
    /^[\w-]+(\s+[\w-]+)*$/,  // Words separated by spaces or hyphens (CSS classes)
    /^(flex|grid|inline|block|hidden|visible|absolute|relative|fixed|sticky)/,
    /^(w-|h-|p-|m-|px-|py-|mx-|my-|mt-|mb-|ml-|mr-|pt-|pb-|pl-|pr-)/,
    /^(text-|bg-|border-|rounded-|shadow-|hover:|focus:|active:)/,
    /^(justify-|items-|content-|self-|place-)/,
    /^(sm:|md:|lg:|xl:|2xl:)/,
    /^(min-|max-)/,
    
    // Technical strings
    /^[A-Z_]+$/,  // ALL_CAPS constants
    /^\d+$/,      // Numbers only
    /^[\w-]+\.(js|jsx|ts|tsx|css|scss|json|png|jpg|jpeg|gif|svg|webp)$/,  // File names
    /^(http|https|ftp|mailto):/,  // URLs
    /^(data-|aria-|id=|key=|className|style=)/,  // HTML attributes
    /^(console\.|window\.|document\.)/,  // JavaScript objects
    /^(import|export|from|require)/,  // Import/export statements
    /^(function|const|let|var|if|else|for|while|return)/,  // JavaScript keywords
    /^[\{\}\[\]\(\);,\.]+$/,  // Punctuation only
    /^[a-zA-Z0-9_-]+$/,  // Technical identifiers (no spaces, no Swedish chars)
  ];
  
  return technicalPatterns.some(pattern => pattern.test(text));
}

// Function to extract hardcoded Swedish text
function extractHardcodedSwedish(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const swedishTexts = [];
  
  // Find all string literals (both single and double quotes)
  const stringRegex = /(['"`])((?:(?!\1)[^\\]|\\.)*)(\1)/g;
  let match;
  
  while ((match = stringRegex.exec(content)) !== null) {
    const quote = match[1];
    const text = match[2];
    const fullMatch = match[0];
    
    // Skip if it's already a translation call
    const beforeMatch = content.substring(Math.max(0, match.index - 20), match.index);
    if (beforeMatch.includes('t(')) {
      continue;
    }
    
    // Skip technical strings
    if (text.includes('/') || text.includes('.') || text.includes('http') || 
        text.includes('src') || text.includes('className') || text.includes('data-') ||
        text.includes('aria-') || text.includes('id=') || text.includes('key=') ||
        text.length < 2 || isTechnicalString(text)) {
      continue;
    }
    
    // Check if text contains Swedish patterns
    let isSwedish = false;
    for (const pattern of swedishPatterns) {
      if (pattern.test(text)) {
        isSwedish = true;
        break;
      }
    }
    
    // Also include any text with Swedish characters
    if (/[åäöÅÄÖ]/.test(text)) {
      isSwedish = true;
    }
    
    // Include common Swedish words even without special characters
    const commonSwedishWords = [
      'Välkommen', 'Produkter', 'Beställning', 'Ordrar', 'Kunder', 'Hantera', 'Skapa', 'Redigera', 'Ta bort',
      'Spara', 'Avbryt', 'Stäng', 'Öppna', 'Ladda', 'Visa', 'Dölj', 'Sök', 'Filtrera', 'Sortera',
      'Namn', 'Beskrivning', 'Pris', 'Antal', 'Datum', 'Status', 'Aktiv', 'Inaktiv', 'Ny', 'Gammal',
      'Första', 'Sista', 'Nästa', 'Föregående', 'Alla', 'Inga', 'Välj', 'Markera', 'Bekräfta',
      'Företag', 'Kontakt', 'Adress', 'Telefon', 'Email', 'Hemsida', 'Kommentar', 'Meddelande',
      'Inställningar', 'Profil', 'Konto', 'Lösenord', 'Logga in', 'Logga ut', 'Registrera',
      'Marknadsföring', 'Material', 'Bilder', 'Dokument', 'Ladda ner', 'Ladda upp', 'Importera', 'Exportera'
    ];
    
    for (const word of commonSwedishWords) {
      if (text.includes(word)) {
        isSwedish = true;
        break;
      }
    }
    
    if (isSwedish) {
      // Find the line number
      const beforeText = content.substring(0, match.index);
      const lineNumber = beforeText.split('\n').length;
      
      // Get some context around the match
      const lines = content.split('\n');
      const contextStart = Math.max(0, lineNumber - 2);
      const contextEnd = Math.min(lines.length, lineNumber + 1);
      const context = lines.slice(contextStart, contextEnd).join('\n');
      
      swedishTexts.push({
        text: text,
        quote: quote,
        fullMatch: fullMatch,
        lineNumber: lineNumber,
        context: context,
        file: filePath
      });
    }
  }
  
  return swedishTexts;
}

// Function to generate translation key from text
function generateTranslationKey(text, filePath) {
  const fileName = path.basename(filePath, '.jsx').toLowerCase();
  
  // Clean the text to create a key
  let key = text
    .toLowerCase()
    .replace(/[åäö]/g, (match) => {
      const replacements = { 'å': 'a', 'ä': 'a', 'ö': 'o' };
      return replacements[match] || match;
    })
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50); // Limit key length
  
  // Add file-based prefix
  let prefix = 'b2b';
  if (fileName.includes('dashboard')) prefix = 'b2b.dashboard';
  else if (fileName.includes('product')) prefix = 'b2b.products';
  else if (fileName.includes('order')) prefix = 'b2b.orders';
  else if (fileName.includes('marketing')) prefix = 'b2b.marketing';
  else if (fileName.includes('profile')) prefix = 'b2b.profile';
  else if (fileName.includes('contact')) prefix = 'b2b.contact';
  else if (fileName.includes('training')) prefix = 'b2b.training';
  else if (fileName.includes('layout')) prefix = 'b2b.nav';
  
  return `${prefix}.${key}`;
}

// Function to create Google Sheets compatible CSV
function createGoogleSheetsCSV(allTexts) {
  // Google Sheets compatible header
  const header = 'key,context,swedish,englishUK,englishUS,status,translator,lastModified,notes,charCount\n';
  
  // Remove duplicates based on text content
  const uniqueTexts = {};
  allTexts.forEach(item => {
    const textKey = item.text.toLowerCase().trim();
    if (!uniqueTexts[textKey]) {
      uniqueTexts[textKey] = item;
    }
  });
  
  const sortedTexts = Object.values(uniqueTexts).sort((a, b) => {
    // Sort by file first, then by line number
    if (a.file !== b.file) {
      return a.file.localeCompare(b.file);
    }
    return a.lineNumber - b.lineNumber;
  });
  
  const rows = sortedTexts.map(item => {
    const key = generateTranslationKey(item.text, item.file);
    const swedish = item.text.replace(/"/g, '""'); // Escape quotes
    const context = `${path.basename(item.file)}:${item.lineNumber}`;
    const notes = `From ${path.basename(item.file)}`;
    const charCount = item.text.length;
    
    // Google Sheets structure: key,context,swedish,englishUK,englishUS,status,translator,lastModified,notes,charCount
    return `"${key}","${context}","${swedish}","","","new","","","${notes}",${charCount}`;
  });
  
  return header + rows.join('\n');
}

// Main execution
async function main() {
  console.log('🔍 Scanning B2B Customer Portal for hardcoded Swedish text...\n');
  
  let allSwedishTexts = [];
  
  for (const filePath of b2bFiles) {
    console.log(`📄 Analyzing ${filePath}...`);
    const swedishTexts = extractHardcodedSwedish(filePath);
    allSwedishTexts = allSwedishTexts.concat(swedishTexts);
    console.log(`  Found ${swedishTexts.length} Swedish text strings`);
  }
  
  console.log(`\n📊 Total Swedish text strings found: ${allSwedishTexts.length}`);
  
  // Create Google Sheets compatible CSV
  const csvContent = createGoogleSheetsCSV(allSwedishTexts);
  const fileName = 'b2b_customer_portal_translations_comprehensive.csv';
  
  fs.writeFileSync(fileName, csvContent);
  console.log(`✅ Created ${fileName}`);
  
  // Show summary by file
  console.log('\n📋 Summary by file:');
  const fileStats = {};
  allSwedishTexts.forEach(item => {
    const file = path.basename(item.file);
    fileStats[file] = (fileStats[file] || 0) + 1;
  });
  
  Object.entries(fileStats).forEach(([file, count]) => {
    console.log(`  ${file}: ${count} strings`);
  });
  
  console.log('\n🎉 B2B Customer Portal analysis complete!');
  console.log('Next steps:');
  console.log('1. Review the CSV file');
  console.log('2. Update components to use t() function calls');
  console.log('3. Import to Google Sheets for translation');
}

main().catch(console.error); 