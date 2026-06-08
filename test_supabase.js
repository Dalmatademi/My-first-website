const { createClient } = require('@supabase/supabase-js');

// Try with sbp_ key directly - Supabase v2+ can auto-resolve
const key = "sbp_6030e446cee713b5fbfa01ce18be37f3561fa635";

async function main() {
  // Option 1: Just the key (auto-resolve)
  try {
    const supabase = createClient(key, key); // key as both URL and anon key
    const { data, error } = await supabase.from('_dummy').select('*').limit(1);
    console.log("Option 1 (key as URL):", error ? error.message : "Connected! " + JSON.stringify(data));
  } catch(e) {
    console.log("Option 1 failed:", e.message);
  }

  // Option 2: Try different URL patterns
  const hash = key.replace("sbp_", "");
  const patterns = [
    `https://${hash.substring(0, 20)}.supabase.co`,
    `https://${hash}.supabase.co`,
    `https://db.${hash.substring(0, 20)}.supabase.co`,
  ];
  
  for (const url of patterns) {
    try {
      const supabase = createClient(url, key);
      const { data, error } = await supabase.from('_dummy').select('*').limit(1);
      console.log(`${url}: ${error ? error.message : "OK - " + JSON.stringify(data)}`);
    } catch(e) {
      console.log(`${url}: ${e.message}`);
    }
  }
  
  // Option 3: Try listing tables via REST API
  console.log("\n--- Trying to list tables via OpenAPI ---");
  for (const url of patterns) {
    try {
      const supabase = createClient(url, key);
      // Try to query the schema
      const { data, error } = await supabase.rpc('get_schema_version').select().limit(1);
      console.log(`${url}/rpc: ${error ? error.message : "OK"}`);
    } catch(e) {
      // Silently fail
    }
    
    // Try REST directly
    try {
      const https = require('https');
      const result = await new Promise((resolve) => {
        const req = https.get(url + '/rest/v1/', {
          headers: { 
            'apikey': key,
            'Authorization': 'Bearer ' + key,
            'Accept': 'application/json'
          },
          timeout: 5000
        }, (res) => {
          let data = '';
          res.on('data', d => data += d);
          res.on('end', () => resolve({ status: res.statusCode, data: data.substring(0, 500) }));
        });
        req.on('error', (e) => resolve({ error: e.message }));
        req.end();
      });
      if (result.status) {
        console.log(`${url} REST: HTTP ${result.status}`);
        if (result.data) console.log(`  ${result.data}`);
      }
    } catch(e) {}
  }
}

main();
