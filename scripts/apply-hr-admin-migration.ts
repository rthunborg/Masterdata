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

  console.log('Creating HR Admin test user: admin@test.com');
  console.log('---');

  try {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@test.com')
      .single();

    if (existingUser) {
      console.log('✓ HR Admin test user already exists in database');
      console.log(`  Email: ${existingUser.email}`);
      console.log(`  Role: ${existingUser.role}`);
      console.log(`  Active: ${existingUser.is_active}`);
      
      // Verify auth user exists too
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const authUser = authUsers?.users.find(u => u.email === 'admin@test.com');
      
      if (authUser) {
        console.log('✓ Auth user also exists');
        console.log('\n✓ HR Admin test user is ready!');
        return;
      } else {
        console.log('⚠️  User exists in database but not in auth - creating auth user...');
      }
    }

    // Create the user directly using Supabase Admin API
    console.log('Creating auth user...');
    
    let authUserId: string | null = null;
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'admin@test.com',
      password: 'Test123!',
      email_confirm: true,
      user_metadata: {
        role: 'hr_admin'
      }
    });

    if (authError) {
      // Check for various "already exists" error messages
      const alreadyExists = 
        authError.message.includes('already registered') || 
        authError.message.includes('already exists') ||
        authError.code === 'email_exists' ||
        authError.status === 422;
        
      if (alreadyExists) {
        console.log('✓ Auth user already exists');
        
        // Get the existing auth user
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        const authUser = authUsers?.users.find(u => u.email === 'admin@test.com');
        
        if (!authUser) {
          console.error('❌ Auth user should exist but could not be found');
          process.exit(1);
        }
        
        authUserId = authUser.id;
      } else {
        console.error('❌ Error creating auth user:', authError);
        process.exit(1);
      }
    } else {
      authUserId = authData.user.id;
      console.log(`✓ Created auth user: ${authUserId}`);
    }

    // Insert or update user record in public.users table
    if (!authUserId) {
      console.error('❌ Cannot proceed without auth_user_id');
      process.exit(1);
    }
    
    if (existingUser) {
      // Update existing user with auth_user_id if missing
      if (!existingUser.auth_user_id) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ auth_user_id: authUserId })
          .eq('email', 'admin@test.com');

        if (updateError) {
          console.error('❌ Error updating user record:', updateError);
          process.exit(1);
        }
        console.log('✓ Updated user record with auth_user_id');
      } else {
        console.log('✓ User record already has auth_user_id');
      }
    } else {
      // Insert new user record
      const { error: userError } = await supabase
        .from('users')
        .insert({
          auth_user_id: authUserId,
          email: 'admin@test.com',
          role: 'hr_admin',
          is_active: true
        });

      if (userError) {
        if (userError.message.includes('duplicate') || userError.code === '23505') {
          console.log('✓ User record already exists in public.users');
        } else {
          console.error('❌ Error creating user record:', userError);
          process.exit(1);
        }
      } else {
        console.log('✓ Created user record in public.users');
      }
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
