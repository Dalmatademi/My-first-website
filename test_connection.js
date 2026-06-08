const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cxmvoykanctcoyjzcinv.supabase.co';
const supabaseKey = 'eyJhbG...58xs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setup() {
  console.log("=== Testing Supabase Connection ===");
  
  // Try to query some tables
  const tables = ['countries', 'reviews', 'favorites', 'destinations', 'ratings'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`${table}: ${error.message}`);
    } else {
      console.log(`${table}: Found (${data?.length || 0} rows)`);
    }
  }
  
  // Check auth
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  console.log(`\nAuth session: ${session ? 'Has session' : 'No session'}`);
  if (authError) console.log(`Auth error: ${authError.message}`);
  
  console.log("\n=== Setup Complete ===");
}

setup().catch(console.error);
