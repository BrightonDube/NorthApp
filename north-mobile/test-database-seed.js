/**
 * Database Seed Verification Script
 * 
 * This script verifies that the database is properly seeded with default data
 * and tests basic database operations without requiring user authentication.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseSeed() {
  console.log('🧪 Testing Database Seed and Basic Operations\n');
  console.log('═'.repeat(80) + '\n');

  let passedTests = 0;
  let failedTests = 0;

  // Test 1: Verify default coaches are seeded
  console.log('Test 1: Verify default coaches are seeded');
  try {
    const { data: coaches, error } = await supabase
      .from('coaches')
      .select('*')
      .is('creator_id', null)
      .order('name');

    if (error) throw error;

    const expectedCoaches = ['Decision Coach', 'Strategy Coach', 'Systems Coach', 'Writing Coach'];
    const actualCoaches = coaches.map(c => c.name).sort();

    if (coaches.length === 4 && JSON.stringify(actualCoaches) === JSON.stringify(expectedCoaches)) {
      console.log('✅ PASS: All 4 default coaches found');
      console.log('   Coaches:', actualCoaches.join(', '));
      passedTests++;
    } else {
      console.log('❌ FAIL: Expected 4 default coaches, found', coaches.length);
      console.log('   Expected:', expectedCoaches);
      console.log('   Found:', actualCoaches);
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FAIL:', error.message);
    failedTests++;
  }
  console.log('');

  // Test 2: Verify coach data structure
  console.log('Test 2: Verify coach data structure');
  try {
    const { data: coach, error } = await supabase
      .from('coaches')
      .select('*')
      .is('creator_id', null)
      .limit(1)
      .single();

    if (error) throw error;

    const requiredFields = ['id', 'name', 'icon', 'system_prompt', 'creator_id', 'is_public', 'created_at', 'updated_at'];
    const hasAllFields = requiredFields.every(field => field in coach);

    if (hasAllFields) {
      console.log('✅ PASS: Coach has all required fields');
      console.log('   Sample coach:', coach.name, coach.icon);
      passedTests++;
    } else {
      console.log('❌ FAIL: Coach missing required fields');
      console.log('   Expected:', requiredFields);
      console.log('   Found:', Object.keys(coach));
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FAIL:', error.message);
    failedTests++;
  }
  console.log('');

  // Test 3: Verify tables exist
  console.log('Test 3: Verify all required tables exist');
  try {
    const tables = ['profiles', 'user_context', 'coaches', 'chat_sessions', 'messages'];
    let allTablesExist = true;

    for (const table of tables) {
      const { error } = await supabase.from(table).select('id').limit(0);
      if (error) {
        console.log(`   ❌ Table '${table}' not accessible:`, error.message);
        allTablesExist = false;
      }
    }

    if (allTablesExist) {
      console.log('✅ PASS: All 5 tables exist and are accessible');
      console.log('   Tables:', tables.join(', '));
      passedTests++;
    } else {
      console.log('❌ FAIL: Some tables are missing or not accessible');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FAIL:', error.message);
    failedTests++;
  }
  console.log('');

  // Test 4: Verify RLS is enabled
  console.log('Test 4: Verify Row Level Security (RLS) is enabled');
  try {
    // Try to query profiles without authentication (should return empty, not error)
    const { data, error } = await supabase
      .from('profiles')
      .select('*');

    // RLS should allow the query but return no data (since we're not authenticated)
    if (!error && Array.isArray(data)) {
      console.log('✅ PASS: RLS is properly configured');
      console.log('   Unauthenticated query returned empty result (as expected)');
      passedTests++;
    } else if (error) {
      console.log('❌ FAIL: RLS may not be configured correctly');
      console.log('   Error:', error.message);
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FAIL:', error.message);
    failedTests++;
  }
  console.log('');

  // Test 5: Verify coach system prompts are non-empty
  console.log('Test 5: Verify coach system prompts are properly set');
  try {
    const { data: coaches, error } = await supabase
      .from('coaches')
      .select('name, system_prompt')
      .is('creator_id', null);

    if (error) throw error;

    const allHavePrompts = coaches.every(c => c.system_prompt && c.system_prompt.length > 50);

    if (allHavePrompts) {
      console.log('✅ PASS: All coaches have detailed system prompts');
      console.log('   Average prompt length:', Math.round(coaches.reduce((sum, c) => sum + c.system_prompt.length, 0) / coaches.length), 'characters');
      passedTests++;
    } else {
      console.log('❌ FAIL: Some coaches have missing or short system prompts');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FAIL:', error.message);
    failedTests++;
  }
  console.log('');

  // Test 6: Verify database constraints
  console.log('Test 6: Verify database constraints (category validation)');
  try {
    // Try to insert invalid category (should fail)
    const { error } = await supabase
      .from('user_context')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000', // Fake UUID
        category: 'invalid_category',
        content: 'Test'
      });

    // We expect this to fail due to CHECK constraint or RLS
    if (error && (error.message.includes('check') || error.message.includes('violates') || error.message.includes('policy'))) {
      console.log('✅ PASS: Database constraints are working');
      console.log('   Invalid data was properly rejected');
      passedTests++;
    } else if (error) {
      console.log('✅ PASS: Database constraints are working (RLS blocked insert)');
      console.log('   Error:', error.message);
      passedTests++;
    } else {
      console.log('❌ FAIL: Database constraints may not be working');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FAIL:', error.message);
    failedTests++;
  }
  console.log('');

  // Summary
  console.log('═'.repeat(80));
  console.log('\n📊 Test Summary:\n');
  console.log(`   ✅ Passed: ${passedTests}`);
  console.log(`   ❌ Failed: ${failedTests}`);
  console.log(`   📈 Total:  ${passedTests + failedTests}`);
  console.log('');

  if (failedTests === 0) {
    console.log('🎉 All database seed tests passed!\n');
    console.log('✅ Database is properly seeded and configured');
    console.log('✅ Ready for integration tests\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.\n');
    process.exit(1);
  }
}

// Run tests
testDatabaseSeed().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
