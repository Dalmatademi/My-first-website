const https = require('https');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('supabase-config.json'));

const project = 'cxmvoykanctcoyjzcinv';
const anonKey = config.anonKey;

// Try the Supabase Database API with SQL execution
async function trySQLEndpoint(sql, endpoint, method = 'POST') {
  return new Promise((resolve) => {
    const url = new URL(endpoint);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 10000
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, data: data.substring(0, 500) }));
    });
    req.on('error', (e) => resolve({ status: 'error', data: e.message }));
    if (sql) req.write(JSON.stringify(typeof sql === 'string' ? { query: sql } : sql));
    req.end();
  });
}

(async () => {
  console.log('=== Trying to create tables via Supabase API ===\n');

  // The SQL to run
  const createSQL = `
    CREATE TABLE IF NOT EXISTS countries (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name_en TEXT NOT NULL,
      name_sq TEXT NOT NULL,
      flag_code TEXT NOT NULL,
      image_url TEXT,
      category TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS reviews (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      country_slug TEXT REFERENCES countries(slug) ON DELETE CASCADE,
      author_name TEXT DEFAULT 'Anonymous',
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment_text TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS favorites (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      country_slug TEXT REFERENCES countries(slug) ON DELETE CASCADE,
      visitor_id TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(country_slug, visitor_id)
    );
  `;

  // Try 1: pg_database endpoint
  let r = await trySQLEndpoint(null, `https://${project}.supabase.co/rest/v1/`);
  console.log(`REST v1: ${r.status}`);
  
  // Try 2: Try pg Exec via supabase internal
  r = await trySQLEndpoint({query: createSQL}, `https://${project}.supabase.co/rest/v1/rpc/`);
  console.log(`RPC: ${r.status} ${r.data}`);
  
  // Try 3: Try supabase projects API
  r = await trySQLEndpoint({sql: createSQL}, `https://api.supabase.com/v1/projects/${project}/database/query`, 'POST');
  console.log(`DB query: ${r.status} ${r.data}`);
  
  // Try 4: Try direct pg connection params
  r = await trySQLEndpoint(null, `https://api.supabase.com/v1/projects/${project}/database/roles`, 'GET');
  console.log(`DB roles: ${r.status} ${r.data}`);
  
  // Try 5: Try with content-type sql
  r = await trySQLEndpoint(createSQL, `https://${project}.supabase.co/rest/v1/`, 'POST');
  console.log(`REST v1 POST: ${r.status} ${r.data}`);

  console.log('\n=== Trying alternative: Seed via INSERT ===');
  // Try to insert into countries directly (will fail if table doesn't exist)
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(config.url, anonKey);
  
  const { data, error } = await supabase.from('countries').insert({
    slug: 'test',
    name_en: 'test',
    name_sq: 'test',
    flag_code: 'xx',
    category: 'test'
  });
  console.log(`Insert test: ${error ? error.message : 'WORKED! ' + JSON.stringify(data)}`);
})();
