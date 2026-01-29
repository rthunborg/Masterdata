/**
 * Apply Changed By Tracking Migration
 * Updates the employee_column_changes trigger to capture which user made changes
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
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function applyMigration() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    db: { schema: 'public' }
  });

  console.log('Applying migration: add_changed_by_tracking.sql');
  console.log('---');

  try {
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'migrations', 'add_changed_by_tracking.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`Migration file not found: ${migrationPath}`);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Updating trigger function to track changed_by field...');

    // Execute the migration SQL
    // Note: Supabase doesn't have a direct SQL execution API in the client library
    // We need to use the REST API directly or Supabase CLI
    console.log('\n⚠️  Please apply this migration manually via Supabase SQL Editor:');
    console.log('---');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the following SQL:');
    console.log('---\n');
    console.log(migrationSQL);
    console.log('\n---');
    console.log('4. Click "Run" to execute the migration');
    console.log('---');
    console.log('\nAlternatively, you can run this via Supabase CLI:');
    console.log('  supabase db execute --file migrations/add_changed_by_tracking.sql');
    console.log('---');

  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

applyMigration();
