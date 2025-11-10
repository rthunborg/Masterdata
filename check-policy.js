import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPolicy() {
  console.log('Checking RLS policies on users table...\n');

  // Query to check policies
  const { data: policies, error } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'users');

  if (error) {
    console.error('Error fetching policies:', error);

    // Try alternative method - direct query
    console.log('\nTrying direct SQL query...');
    const { data: directData, error: directError } = await supabase.rpc(
      'exec_sql',
      {
        sql: "SELECT * FROM pg_policies WHERE tablename = 'users';",
      }
    );

    if (directError) {
      console.error('Direct query also failed:', directError);
      console.log('\n⚠️  Cannot verify policies programmatically.');
      console.log(
        'Please check manually in Supabase Dashboard → Database → Policies'
      );
    } else {
      console.log('Policies:', directData);
    }
  } else {
    console.log('Found', policies?.length || 0, 'policies on users table:');
    policies?.forEach((p) => {
      console.log(`\n- ${p.policyname}`);
      console.log(`  Command: ${p.cmd}`);
      console.log(`  Using: ${p.qual}`);
      console.log(`  With Check: ${p.with_check}`);
    });
  }

  // Also test if we can update a user's last_active_at
  console.log('\n\nTesting update capability...');
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, auth_user_id, email, last_active_at')
    .limit(1);

  if (userError) {
    console.error('Error fetching user:', userError);
  } else if (users && users.length > 0) {
    const testUser = users[0];
    console.log('Test user:', testUser.email);
    console.log('Current last_active_at:', testUser.last_active_at);

    // Try updating as service role (should work)
    const { error: updateError } = await supabase
      .from('users')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', testUser.id);

    if (updateError) {
      console.error('❌ Update failed:', updateError);
    } else {
      console.log('✓ Update succeeded with service role');

      // Fetch again to confirm
      const { data: updated } = await supabase
        .from('users')
        .select('last_active_at')
        .eq('id', testUser.id)
        .single();

      console.log('New last_active_at:', updated?.last_active_at);
    }
  }
}

checkPolicy()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
