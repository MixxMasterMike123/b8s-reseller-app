import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = join(__dirname, '../serviceAccountKey.json');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('Please paste your Firebase service account key JSON below:');
console.log('(Press Ctrl+D or Ctrl+Z when finished)');

let jsonData = '';

// Read input line by line
rl.on('line', (line) => {
  jsonData += line + '\n';
});

// When the input is complete
rl.on('close', () => {
  try {
    // Validate JSON
    const parsed = JSON.parse(jsonData);
    if (!parsed.project_id || !parsed.private_key || !parsed.client_email) {
      throw new Error('Invalid service account key format');
    }
    
    // Write to file
    writeFileSync(outputPath, jsonData);
    console.log(`Service account key saved to: ${outputPath}`);
    console.log('You can now run the setup script: node scripts/setup-firestore-admin.js');
  } catch (error) {
    console.error('Error saving service account key:', error.message);
    process.exit(1);
  }
});

// Handle errors
rl.on('error', (err) => {
  console.error('Error reading input:', err);
  process.exit(1);
}); 