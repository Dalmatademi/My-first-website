const https = require('https');
const fs = require('fs');

const token = "***";
const project = "cxmvoykanctcoyjzcinv";

// Read SQL from migrations file
const sql = fs.readFileSync('supabase/migrations/20260608175430_create_travel_tables.sql', 'utf-8');

function apiCall(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.supabase.com',
      path: `/v1${path}`,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, data: data.substring(0, 2000) }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('=== Using Management API to execute SQL ===\n');
  
  // Try database query endpoint
  const queries = sql.split(';').filter(q => q.trim().length > 0);
  console.log(`Found ${queries.length} SQL statements\n`);
  
  for (let i = 0; i < Math.min(queries.length, 5); i++) {
    const q = queries[i].trim();
    const r = await apiCall('POST', `/projects/${project}/database/query`, { query: q });
    console.log(`[${i+1}] ${q.substring(0, 60)}... -> HTTP ${r.status}`);
    if (r.status !== 200) console.log(`  ${r.data.substring(0, 200)}`);
  }
  
  console.log('\n=== Checking results ===\n');
  // Check if tables exist
  const checkSQL = `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('countries','reviews','favorites')`;
  const r = await apiCall('POST', `/projects/${project}/database/query`, { query: checkSQL });
  console.log(`Tables check: HTTP ${r.status}`);
  console.log(r.data);
}

main().catch(console.error);
