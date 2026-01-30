/**
 * Supabase Credentials Verification Script
 * Tests connection to Supabase using credentials from .env file
 */

const https = require('https');

// Read environment variables
require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Verifying Supabase credentials...\n');
console.log('URL:', SUPABASE_URL);
console.log('Key:', SUPABASE_ANON_KEY ? `${SUPABASE_ANON_KEY.substring(0, 20)}...` : 'NOT SET');
console.log('');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing credentials in .env file');
  process.exit(1);
}

// Extract hostname from URL
const url = new URL(SUPABASE_URL);

// Test connection to Supabase REST API
const options = {
  hostname: url.hostname,
  port: 443,
  path: '/rest/v1/',
  method: 'GET',
  headers: {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  }
};

console.log('📡 Testing connection to Supabase...\n');

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Status Message: ${res.statusMessage}\n`);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ SUCCESS: Supabase credentials are valid!');
      console.log('✅ Connection established successfully');
      console.log('\nYou can now proceed with database schema creation (Task 3.2)');
      process.exit(0);
    } else if (res.statusCode === 401) {
      console.error('❌ FAILED: Invalid API key');
      console.error('The anon key appears to be incorrect or expired.');
      console.error('\nPlease update your credentials in the .env file:');
      console.error('1. Go to https://supabase.com');
      console.error('2. Open your project');
      console.error('3. Navigate to Settings → API');
      console.error('4. Copy the Project URL and anon key');
      process.exit(1);
    } else if (res.statusCode === 404) {
      console.error('❌ FAILED: Project not found');
      console.error('The Supabase URL appears to be incorrect.');
      console.error('\nPlease verify your EXPO_PUBLIC_SUPABASE_URL in the .env file');
      process.exit(1);
    } else {
      console.error(`❌ FAILED: Unexpected response (${res.statusCode})`);
      console.error('Response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ FAILED: Connection error');
  console.error('Error:', error.message);
  console.error('\nPossible issues:');
  console.error('- Invalid Supabase URL');
  console.error('- Network connectivity problems');
  console.error('- Firewall blocking the connection');
  process.exit(1);
});

req.end();
