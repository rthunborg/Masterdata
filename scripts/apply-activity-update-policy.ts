/**
 * Apply Activity Update Policy Migration
 * Adds RLS policy to allow users to update their own last_active_at timestamp
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
    db: { schema: 'public' }
  });

  console.log('Applying migration: 20251102000002_allow_user_activity_update.sql');
  console.log('---');

  try {
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'migrations', '20251102000002_allow_user_activity_update.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Remove comments and extract the CREATE POLICY statement
    const policySQL = `
CREATE POLICY "Users can update own last_active_at" ON public.users
  FOR UPDATE 
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());
`;

    console.log('Creating RLS policy: "Users can update own last_active_at"...');

    // Execute the policy creation using the Supabase RPC
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: policySQL 
    });

    if (error) {
      // If the RPC doesn't exist, we'll have to do this manually via Supabase dashboard
      console.error('Error creating policy via RPC:', error.message);
      console.log('\n⚠️  Please apply this migration manually via Supabase SQL Editor:');
      console.log('---');
      console.log(migrationSQL);
      console.log('---');
      console.log('\nOr run this SQL directly:');
      console.log(policySQL);
      process.exit(1);
    } else {
      console.log('✓ RLS policy created successfully!');
      console.log('\nMigration applied successfully!');
    }

  } catch (err) {
    console.error('Unexpected error:', err);
    console.log('\n⚠️  Please apply this migration manually via Supabase SQL Editor:');
    
    // Read and display the migration file
    const migrationPath = path.join(process.cwd(), 'migrations', '20251102000002_allow_user_activity_update.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('---');
    console.log(migrationSQL);
    console.log('---');
    
    process.exit(1);
  }
}

applyMigration();
