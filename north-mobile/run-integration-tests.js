/**
 * Integration Test Runner
 * 
 * This script prepares the environment and runs integration tests.
 * It checks prerequisites and provides helpful error messages.
 */

const { execSync } = require('child_process');

console.log('🧪 North Mobile App - Integration Test Runner\n');

// Check environment variables
console.log('📋 Checking prerequisites...\n');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('   Please ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set\n');
  process.exit(1);
}

console.log('✅ Supabase credentials found');
console.log(`   URL: ${supabaseUrl}`);
console.log(`   Key: ${supabaseKey.substring(0, 20)}...\n`);

// Check if Supabase is accessible
console.log('🔍 Verifying Supabase connection...\n');

try {
  execSync('node verify-supabase.js', { 
    stdio: 'inherit',
    cwd: __dirname 
  });
  console.log('');
} catch (error) {
  console.error('\n❌ Supabase connection failed');
  console.error('   Please check your credentials and network connection\n');
  process.exit(1);
}

// Important notes
console.log('📝 Important Notes:\n');
console.log('   • Integration tests will create temporary test users');
console.log('   • Email confirmation must be disabled in Supabase Auth settings');
console.log('   • Tests will clean up after themselves');
console.log('   • Some tests may take longer due to database operations\n');

// Ask for confirmation
console.log('⚠️  Integration tests will connect to your REAL Supabase database');
console.log('   at: ' + supabaseUrl + '\n');

// Run the tests
console.log('🚀 Running integration tests...\n');
console.log('═'.repeat(80) + '\n');

try {
  execSync('jest --config jest.integration.config.js', {
    stdio: 'inherit',
    cwd: __dirname,
    env: { ...process.env }
  });
  
  console.log('\n' + '═'.repeat(80));
  console.log('\n✅ Integration tests completed successfully!\n');
} catch (error) {
  console.log('\n' + '═'.repeat(80));
  console.error('\n❌ Integration tests failed\n');
  console.error('Common issues:');
  console.error('   • Email confirmation is enabled in Supabase (must be disabled for tests)');
  console.error('   • RLS policies are blocking test operations');
  console.error('   • Network connectivity issues');
  console.error('   • Invalid Supabase credentials\n');
  process.exit(1);
}
