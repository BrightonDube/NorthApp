const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  const migrationPath = path.join(__dirname, 'update_default_coaches_v2.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('Running migration: update_default_coaches_v2.sql');
  console.log('This will delete and recreate all default coaches...');
  
  try {
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }
    
    console.log('✅ Migration completed successfully');
    
    // Verify coaches were created
    const { data: coaches, error: fetchError } = await supabase
      .from('coaches')
      .select('id, name, icon')
      .is('creator_id', null)
      .order('created_at');
    
    if (fetchError) {
      console.error('Error verifying coaches:', fetchError);
    } else {
      console.log('\n✅ Verified coaches in database:');
      coaches.forEach(coach => {
        console.log(`  ${coach.icon} ${coach.name} (${coach.id})`);
      });
      
      if (coaches.length === 6) {
        console.log('\n✅ All 6 default coaches created successfully!');
      } else {
        console.warn(`\n⚠️  Expected 6 coaches, found ${coaches.length}`);
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

runMigration();
