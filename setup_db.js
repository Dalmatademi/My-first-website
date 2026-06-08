const https = require('https');
const fs = require('fs');
const path = require('path');

const PROJECT_DIR = __dirname;
const CONFIG = JSON.parse(fs.readFileSync(path.join(PROJECT_DIR, 'supabase-config.json'), 'utf-8'));
const ACCESS_TOKEN = fs.readFileSync(path.join(PROJECT_DIR, '.access_token'), 'utf-8').trim();
const MIGRATION_SQL = fs.readFileSync(
  path.join(PROJECT_DIR, 'supabase', 'migrations', '20260608175430_create_travel_tables.sql'), 'utf-8'
);
const PROJECT = 'cxmvoykanctcoyjzcinv';

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.supabase.com',
      path: '/v1' + path,
      method,
      headers: {
        'Authorization': 'Bearer ' + ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      timeout: 30000
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('=== Creating Supabase Tables via Management API ===\n');
  console.log('Access token length:', ACCESS_TOKEN.length);
  console.log('SQL length:', MIGRATION_SQL.length, 'chars\n');

  // Split SQL into statements
  const statements = MIGRATION_SQL.split(';').filter(s => s.trim().length > 0);
  let success = 0, fails = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim() + ';';
    const preview = stmt.replace(/\n/g, ' ').substring(0, 80).trim();
    
    const r = await api('POST', `/projects/${PROJECT}/database/query`, { query: stmt });
    
    if (r.status === 200 || r.status === 201) {
      success++;
      if (stmt.toLowerCase().includes('create table')) {
        console.log('  ✓ Created table: ' + stmt.match(/CREATE TABLE\s+(\S+)/i)?.[1] || preview);
      } else if (stmt.toLowerCase().includes('insert into')) {
        process.stdout.write('.'); // don't spam seeds
      }
    } else {
      fails++;
      // Check if it's a "already exists" error
      const errMsg = r.data.substring(0, 200);
      if (errMsg.includes('already exists') || errMsg.includes('duplicate key')) {
        success++; // treat as success
        process.stdout.write('.');
      } else {
        console.log('  ✗ [' + (i+1) + '] ' + preview);
        console.log('    → ' + errMsg);
      }
    }
  }

  console.log('\n\n=== Results: ' + success + ' OK, ' + fails + ' failed ===\n');

  // Verify
  console.log('=== Verifying tables... ===');
  const check = await api('POST', `/projects/${PROJECT}/database/query`, {
    query: "SELECT table_name, (SELECT count(*) FROM " + 
      "information_schema.columns WHERE table_name=t.table_name AND table_schema='public') as cols " +
      "FROM information_schema.tables t WHERE table_schema='public' AND " +
      "table_name IN ('countries','reviews','favorites') ORDER BY table_name;"
  });
  
  if (check.status === 200) {
    try {
      const tables = JSON.parse(check.data);
      console.log('Tables found:');
      tables.forEach(t => console.log('  ✓ ' + t.table_name + ' (' + t.cols + ' columns)'));
    } catch(e) {
      console.log('Raw:', check.data.substring(0, 500));
    }
  } else {
    console.log('Check failed:', check.status, check.data.substring(0, 200));
  }

  // Test data access via anon key
  console.log('\n=== Testing data access via anon key ===');
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(CONFIG.url, CONFIG.anonKey);
  
  const { data: countries, error: cErr } = await supabase.from('countries').select('slug, name_en, category').limit(5);
  if (cErr) console.log('  ✗ countries: ' + cErr.message);
  else console.log('  ✓ countries: ' + countries.length + ' rows (e.g. ' + countries[0]?.name_en + ')');

  const { data: reviews, error: rErr } = await supabase.from('reviews').select('country_slug, rating, author_name').limit(3);
  if (rErr) console.log('  ✗ reviews: ' + rErr.message);
  else console.log('  ✓ reviews: ' + reviews.length + ' rows');

  const { data: favs, error: fErr } = await supabase.from('favorites').select('country_slug, visitor_id').limit(3);
  if (fErr) console.log('  ✗ favorites: ' + fErr.message);
  else console.log('  ✓ favorites: ' + favs.length + ' rows');

  console.log('\n=== ALL DONE! Supabase is ready! ===');
}

main().catch(console.error);
