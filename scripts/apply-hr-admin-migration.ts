/**
 * Apply HR Admin Test User Migration
 * Creates the HR Admin test user in the remote Supabase database
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

async function applyMigration() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    db: { schema: 'public' },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('Applying migration: 20251029000001_seed_hr_admin_test_user.sql');
  console.log('---');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'migrations', '20251029000001_seed_hr_admin_test_user.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Execute the migration using RPC
    const { error } = await supabase.rpc('exec_sql', { 
      sql_query: migrationSQL 
    });

    if (error) {
      console.error('Error applying migration:', error);
      
      // Fallback: Try to create the user directly using Supabase Admin API
      console.log('\nFallback: Creating HR Admin user using Admin API...');
      
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: 'admin@test.com',
        password: 'Test123!',
        email_confirm: true,
        user_metadata: {
          role: 'hr_admin'
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          console.log('✓ HR Admin test user already exists');
        } else {
          console.error('Error creating auth user:', authError);
          process.exit(1);
        }
      } else {
        console.log(`✓ Created auth user: ${authData.user.id}`);
        
        // Insert into public.users table
        const { error: userError } = await supabase
          .from('users')
          .insert({
            auth_user_id: authData.user.id,
            email: 'admin@test.com',
            role: 'hr_admin',
            is_active: true
          });

        if (userError) {
          if (userError.message.includes('duplicate')) {
            console.log('✓ User record already exists in public.users');
          } else {
            console.error('Error creating user record:', userError);
            process.exit(1);
          }
        } else {
          console.log('✓ Created user record in public.users');
        }
      }
    } else {
      console.log('✓ Migration executed successfully');
    }

    // Verify the user was created
    const { data: users, error: queryError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@test.com')
      .single();

    if (queryError) {
      console.error('Error verifying user:', queryError);
    } else {
      console.log('\nVerification:');
      console.log(`  Email: ${users.email}`);
      console.log(`  Role: ${users.role}`);
      console.log(`  Active: ${users.is_active}`);
      console.log('\n✓ HR Admin test user is ready!');
    }

  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

applyMigration();
