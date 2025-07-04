const fs = require('fs');
const path = require('path');

// Read the comprehensive CSV and convert to Google Sheets format
function convertToGoogleSheetsFormat() {
  const comprehensiveFile = 'b2b_customer_portal_translations_comprehensive.csv';
  
  if (!fs.existsSync(comprehensiveFile)) {
    console.error('❌ Comprehensive CSV file not found!');
    return;
  }

  const content = fs.readFileSync(comprehensiveFile, 'utf8');
  const lines = content.split('\n');
  
  // Skip header line and process data
  const dataLines = lines.slice(1).filter(line => line.trim().length > 0);
  
  console.log(`📊 Processing ${dataLines.length} translation entries...`);
  
  // Create new CSV with Google Sheets structure
  const header = 'key,swedish,englishUK,englishUS,notes\n';
  
  const googleSheetsRows = dataLines.map(line => {
    // Parse CSV line (handling quoted fields)
    const fields = parseCSVLine(line);
    
    if (fields.length < 6) {
      console.warn(`⚠️  Skipping malformed line: ${line.substring(0, 50)}...`);
      return null;
    }
    
    const [key, swedish, englishUK, englishUS, context, file, lineNumber] = fields;
    
    // Create notes from file and context
    const notes = `From: ${file}`;
    
    // Escape quotes and create CSV line
    const escapedKey = escapeCSVField(key);
    const escapedSwedish = escapeCSVField(swedish);
    const escapedNotes = escapeCSVField(notes);
    
    return `${escapedKey},${escapedSwedish},"","",${escapedNotes}`;
  }).filter(row => row !== null);
  
  const googleSheetsCSV = header + googleSheetsRows.join('\n');
  
  // Write to new file
  const outputFile = 'b2b_customer_portal_translations_final.csv';
  fs.writeFileSync(outputFile, googleSheetsCSV);
  
  console.log(`✅ Created ${outputFile} with ${googleSheetsRows.length} entries`);
  console.log(`📋 Ready for Google Sheets import!`);
  
  return googleSheetsRows.length;
}

// Parse CSV line handling quoted fields
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    
    if (char === '"' && (i === 0 || line[i-1] === ',')) {
      // Start of quoted field
      inQuotes = true;
    } else if (char === '"' && inQuotes && (i === line.length - 1 || line[i+1] === ',')) {
      // End of quoted field
      inQuotes = false;
    } else if (char === '"' && inQuotes && line[i+1] === '"') {
      // Escaped quote within quoted field
      current += '"';
      i++; // Skip next quote
    } else if (char === ',' && !inQuotes) {
      // Field separator
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
    
    i++;
  }
  
  // Add last field
  fields.push(current);
  
  return fields;
}

// Escape CSV field
function escapeCSVField(field) {
  if (field.includes('"') || field.includes(',') || field.includes('\n')) {
    return '"' + field.replace(/"/g, '""') + '"';
  }
  return `"${field}"`;
}

// Main execution
console.log('🔄 Converting comprehensive CSV to Google Sheets format...\n');

const count = convertToGoogleSheetsFormat();

if (count) {
  console.log(`\n🎉 Success! Created final B2B translations CSV with ${count} entries`);
  console.log('📝 File: b2b_customer_portal_translations_final.csv');
  console.log('🚀 Ready to import to Google Sheets!');
} 