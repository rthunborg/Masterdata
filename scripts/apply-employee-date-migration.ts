/**
 * Apply Employee Date Fields Migration
 * Adds stena_date, omc_date, and pe3_date columns to employees table
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

  console.log('Applying migration: 20251030000000_add_employee_date_fields.sql');
  console.log('---');

  try {
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'migrations', '20251030000000_add_employee_date_fields.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    
    // Execute the SQL directly
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql doesn't exist, try direct column addition
      console.log('Attempting direct column addition...');
      
      // Check if columns already exist
      const { data: existingColumns, error: checkError } = await supabase
        .from('employees')
        .select('stena_date, omc_date, pe3_date')
        .limit(1);

      if (!checkError) {
        console.log('✓ Columns already exist in employees table');
        console.log('\nMigration applied successfully (columns already present)!');
        return;
      }

      // Columns don't exist, need to add them via SQL
      console.log('Note: Direct SQL execution not available. Columns need to be added via Supabase Dashboard SQL Editor.');
      console.log('\nSQL to execute:');
      console.log('---');
      console.log(sql);
      console.log('---');
      console.log('\nPlease run the above SQL in your Supabase Dashboard > SQL Editor');
    } else {
      console.log('✓ Migration SQL executed successfully');
      console.log('\nMigration applied successfully!');
    }

    // Verify the columns
    console.log('\nVerifying columns...');
    const { data: testData, error: verifyError } = await supabase
      .from('employees')
      .select('id, stena_date, omc_date, pe3_date')
      .limit(1);

    if (verifyError) {
      console.error('⚠ Could not verify columns:', verifyError.message);
    } else {
      console.log('✓ Columns verified successfully');
    }

  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

applyMigration();
