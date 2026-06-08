const fs = require('fs');
const path = require('path');

// Read the full key from config
const config = JSON.parse(fs.readFileSync('supabase-config.json', 'utf-8'));
const fullKey = config.anonKey;

// Read the HTML
const htmlPath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf-8');

// Check current content
const currentMatch = html.match(/SUPABASE_KEY\s*=\s*'([^']+)'/);
if (currentMatch) {
  console.log('Current key in HTML:', currentMatch[1].substring(0, 30) + '...');
  console.log('Config key:', fullKey.substring(0, 30) + '...');
  
  // Replace
  html = html.replace(
    /SUPABASE_KEY\s*=\s*'[^']+'/,
    `SUPABASE_KEY = '${fullKey}'`
  );
  
  fs.writeFileSync(htmlPath, html, 'utf-8');
  console.log('Updated!');
  
  // Verify
  const verify = html.match(/SUPABASE_KEY\s*=\s*'([^']+)'/);
  if (verify) {
    console.log('New key in HTML:', verify[1].substring(0, 30) + '...');
    console.log('Length:', verify[1].length, '(expected:', fullKey.length, ')');
  }
} else {
  console.log('Could not find SUPABASE_KEY in HTML');
}
