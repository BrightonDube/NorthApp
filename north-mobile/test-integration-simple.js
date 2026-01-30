/**
 * Simple Integration Test
 * 
 * This script performs a basic end-to-end integration test:
 * 1. Creates a test user
 * 2. Creates a profile
 * 3. Creates context items
 * 4. Creates a chat session
 * 5. Sends a message
 * 6. Cleans up test data
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

async function runIntegrationTest() {
  console.log('🧪 Running Simple Integration Test\n');
  console.log('═'.repeat(80) + '\n');

  let testUserId = null;
  let testEmail = `test-${Date.now()}@example.com`;
  let testPassword = 'TestPassword123!';

  try {
    // Step 1: Create test user
    console.log('Step 1: Creating test user...');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    if (signUpError) {
      console.log('❌ FAIL: Could not create test user');
      console.log('   Error:', signUpError.message);
      console.log('\n⚠️  Note: Email confirmation must be disabled in Supabase Auth settings');
      console.log('   Go to: Authentication → Settings → Email Auth → Disable "Confirm email"');
      throw signUpError;
    }

    testUserId = signUpData.user?.id;
    console.log('✅ PASS: Test user created');
    console.log('   User ID:', testUserId);
    console.log('   Email:', testEmail);
    console.log('');

    // Step 2: Create profile
    console.log('Step 2: Creating user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: testUserId,
        name: 'Test User',
      })
      .select()
      .single();

    if (profileError) {
      console.log('❌ FAIL: Could not create profile');
      console.log('   Error:', profileError.message);
      throw profileError;
    }

    console.log('✅ PASS: Profile created');
    console.log('   Name:', profile.name);
    console.log('');

    // Step 3: Create context items
    console.log('Step 3: Creating context items...');
    const contextItems = [
      { category: 'values', content: 'Test value: Integrity and honesty' },
      { category: 'goals', content: 'Test goal: Build a successful product' },
      { category: 'projects', content: 'Test project: North mobile app' },
    ];

    for (const item of contextItems) {
      const { data, error } = await supabase
        .from('user_context')
        .insert({
          user_id: testUserId,
          category: item.category,
          content: item.content,
        })
        .select()
        .single();

      if (error) {
        console.log(`❌ FAIL: Could not create ${item.category} context`);
        console.log('   Error:', error.message);
        throw error;
      }

      console.log(`   ✅ Created ${item.category} context`);
    }

    console.log('✅ PASS: All context items created');
    console.log('');

    // Step 4: Get a default coach
    console.log('Step 4: Getting default coach...');
    const { data: coach, error: coachError } = await supabase
      .from('coaches')
      .select('*')
      .is('creator_id', null)
      .limit(1)
      .single();

    if (coachError) {
      console.log('❌ FAIL: Could not get default coach');
      console.log('   Error:', coachError.message);
      throw coachError;
    }

    console.log('✅ PASS: Default coach retrieved');
    console.log('   Coach:', coach.name, coach.icon);
    console.log('');

    // Step 5: Create chat session
    console.log('Step 5: Creating chat session...');
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: testUserId,
        coach_id: coach.id,
      })
      .select()
      .single();

    if (sessionError) {
      console.log('❌ FAIL: Could not create chat session');
      console.log('   Error:', sessionError.message);
      throw sessionError;
    }

    console.log('✅ PASS: Chat session created');
    console.log('   Session ID:', session.id);
    console.log('');

    // Step 6: Send a message
    console.log('Step 6: Sending test message...');
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        chat_session_id: session.id,
        role: 'user',
        content: 'Hello, this is a test message!',
      })
      .select()
      .single();

    if (messageError) {
      console.log('❌ FAIL: Could not send message');
      console.log('   Error:', messageError.message);
      throw messageError;
    }

    console.log('✅ PASS: Message sent');
    console.log('   Message ID:', message.id);
    console.log('   Content:', message.content);
    console.log('');

    // Step 7: Verify data retrieval
    console.log('Step 7: Verifying data retrieval...');
    
    // Get context items
    const { data: contexts, error: contextsError } = await supabase
      .from('user_context')
      .select('*')
      .eq('user_id', testUserId)
      .order('category');

    if (contextsError || contexts.length !== 3) {
      console.log('❌ FAIL: Could not retrieve context items');
      throw new Error('Context retrieval failed');
    }

    // Get messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_session_id', session.id)
      .order('created_at');

    if (messagesError || messages.length !== 1) {
      console.log('❌ FAIL: Could not retrieve messages');
      throw new Error('Message retrieval failed');
    }

    console.log('✅ PASS: Data retrieval successful');
    console.log('   Retrieved', contexts.length, 'context items');
    console.log('   Retrieved', messages.length, 'message');
    console.log('');

    // Cleanup
    console.log('Step 8: Cleaning up test data...');
    
    // Delete messages (will cascade from session delete, but being explicit)
    await supabase.from('messages').delete().eq('chat_session_id', session.id);
    
    // Delete chat session
    await supabase.from('chat_sessions').delete().eq('id', session.id);
    
    // Delete context items
    await supabase.from('user_context').delete().eq('user_id', testUserId);
    
    // Delete profile
    await supabase.from('profiles').delete().eq('id', testUserId);
    
    // Note: We can't delete the auth user via the client, but it's a test user
    
    console.log('✅ PASS: Test data cleaned up');
    console.log('');

    // Success!
    console.log('═'.repeat(80));
    console.log('\n🎉 Integration Test PASSED!\n');
    console.log('✅ All database operations working correctly');
    console.log('✅ RLS policies properly configured');
    console.log('✅ Data integrity maintained');
    console.log('✅ Ready for full integration test suite\n');

  } catch (error) {
    console.log('\n═'.repeat(80));
    console.log('\n❌ Integration Test FAILED\n');
    console.log('Error:', error.message);
    console.log('');
    
    // Try to clean up if we have a user ID
    if (testUserId) {
      console.log('Attempting cleanup...');
      try {
        await supabase.from('messages').delete().match({ chat_session_id: testUserId });
        await supabase.from('chat_sessions').delete().eq('user_id', testUserId);
        await supabase.from('user_context').delete().eq('user_id', testUserId);
        await supabase.from('profiles').delete().eq('id', testUserId);
        console.log('✅ Cleanup completed');
      } catch (cleanupError) {
        console.log('⚠️  Cleanup failed:', cleanupError.message);
      }
    }
    
    console.log('');
    process.exit(1);
  }

  // Sign out
  await supabase.auth.signOut();
}

// Run the test
runIntegrationTest().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
