const https = require('https');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'supabase-config.json');
const MIGRATION_PATH = path.join(__dirname, 'supabase', 'migrations', '20260608175430_create_travel_tables.sql');

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
const anonKey = config.anonKey;
const accessToken = "sbp_6030e446cee713b5fbfa01ce18be37f3561fa635";
const project = "cxmvoykanctcoyjzcinv";

function api(method, host, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: host,
      path: path,
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
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
  console.log('=== Creating Supabase Tables ===\n');

  // Option 1: Try Management API with access token
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
  console.log(`SQL length: ${sql.length} chars\n`);

  // Split into individual statements
  const statements = sql.split(';').filter(s => s.trim().length > 0);
  console.log(`Found ${statements.length} SQL statements\n`);

  // Try using the database query endpoint
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim();
    const r = await api('POST', 'api.supabase.com', `/v1/projects/${project}/database/query`, 
      { query: stmt + ';' },
      { 'Authorization': `Bearer ${accessToken}` }
    );
    const preview = stmt.substring(0, 70).replace(/\n/g, ' ');
    if (r.status === 200 || r.status === 201) {
      console.log(`  ✓ [${i+1}] ${preview}...`);
    } else {
      const err = r.data.substring(0, 150).replace(/\n/g, ' ');
      console.log(`  ✗ [${i+1}] ${preview}...`);
      console.log(`    → ${err}`);
    }
  }

  // Verify tables were created
  console.log('\n=== Verifying Tables ===\n');
  const check = await api('POST', 'api.supabase.com', `/v1/projects/${project}/database/query`,
    { query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('countries','reviews','favorites') ORDER BY table_name;" },
    { 'Authorization': `Bearer ${accessToken}` }
  );
  if (check.status === 200) {
    const tables = JSON.parse(check.data);
    console.log('Tables found:', tables.map(t => t.table_name).join(', '));
  } else {
    console.log('Check failed:', check.status, check.data.substring(0, 200));
  }

  // Now test with the Supabase client
  console.log('\n=== Testing Supabase Client ===\n');
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(config.url, anonKey);
  
  for (const table of ['countries', 'reviews', 'favorites']) {
    const { data, error } = await supabase.from(table).select('*').limit(3);
    if (error) {
      console.log(`  ✗ ${table}: ${error.message}`);
    } else {
      console.log(`  ✓ ${table}: ${data.length} rows`);
      if (data.length > 0) console.log(`    First: ${JSON.stringify(data[0]).substring(0, 100)}`);
    }
  }

  console.log('\n=== DONE! ===');
}

main().catch(console.error);
