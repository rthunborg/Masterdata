/**
 * Apply External Party Test Users Migration
 * Creates test users for Sodexo, OMC, Payroll, and Toplux
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const testUsers = [
  { email: 'sodexo@test.com', password: 'Test123!', role: 'sodexo' },
  { email: 'omc@test.com', password: 'Test123!', role: 'omc' },
  { email: 'payroll@test.com', password: 'Test123!', role: 'payroll' },
  { email: 'toplux@test.com', password: 'Test123!', role: 'toplux' },
];

async function applyMigration() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    db: { schema: 'public' },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('Creating external party test users...\n');

  for (const user of testUsers) {
    try {
      // Check if user already exists
      const { data: existing } = await supabase
        .from('users')
        .select('email')
        .eq('email', user.email)
        .single();

      if (existing) {
        console.log(`✓ ${user.email} (${user.role}) - already exists`);
        continue;
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          role: user.role
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          console.log(`✓ ${user.email} (${user.role}) - auth user exists`);
          
          // Get the auth user ID
          const { data: authUsers } = await supabase.auth.admin.listUsers();
          const authUser = authUsers?.users.find(u => u.email === user.email);
          
          if (authUser) {
            // Create public.users record
            const { error: userError } = await supabase
              .from('users')
              .insert({
                auth_user_id: authUser.id,
                email: user.email,
                role: user.role,
                is_active: true
              });

            if (userError && !userError.message.includes('duplicate')) {
              console.error(`  Error creating user record: ${userError.message}`);
            } else {
              console.log(`  ✓ Created public.users record`);
            }
          }
        } else {
          console.error(`✗ ${user.email}: ${authError.message}`);
        }
        continue;
      }

      // Create public.users record
      const { error: userError } = await supabase
        .from('users')
        .insert({
          auth_user_id: authData.user.id,
          email: user.email,
          role: user.role,
          is_active: true
        });

      if (userError) {
        console.error(`✗ ${user.email}: Failed to create user record - ${userError.message}`);
      } else {
        console.log(`✓ ${user.email} (${user.role}) - created successfully`);
      }

    } catch (error) {
      console.error(`✗ ${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  console.log('\n✅ External party test users migration complete!');
}

applyMigration();
