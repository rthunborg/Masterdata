/**
 * Apply Missing Columns Migration - Direct SQL Execution
 * Adds the 12 missing columns to the employees table
 * Story: 7.1 - Comprehensive Masterdata Column Migration & Configuration
 */

import { createClient } from '@supabase/supabase-js';
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
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('='.repeat(60));
  console.log('Adding Missing Columns to Employees Table');
  console.log('Story 7.1: Comprehensive Masterdata Column Migration');
  console.log('='.repeat(60));
  console.log();

  const newColumns = [
    'one', 'isps', 'photo', 'origo', 'loneiva', 'mail_lon',
    'bankuppgifter', 'li', 'passport', 'kvitto_c17_18', 'c17', 'crewing_done'
  ];

  try {
    // Check current schema
    console.log('Checking current employee table schema...');
    const { data: sampleEmployee } = await supabase
      .from('employees')
      .select('*')
      .limit(1)
      .single();

    if (sampleEmployee) {
      const existingColumns = Object.keys(sampleEmployee);
      const missingColumns = newColumns.filter(col => !existingColumns.includes(col));
      const alreadyExists = newColumns.filter(col => existingColumns.includes(col));

      if (alreadyExists.length > 0) {
        console.log(`✓ Already exists: ${alreadyExists.join(', ')}`);
      }

      if (missingColumns.length === 0) {
        console.log('\n✓ All columns already exist! No migration needed.');
        console.log('='.repeat(60));
        return;
      }

      console.log(`⚠ Missing columns: ${missingColumns.join(', ')}`);
      console.log();
      console.log('These columns need to be added manually via Supabase SQL Editor.');
      console.log();
      console.log('SQL to execute:');
      console.log('-'.repeat(60));
      console.log(`ALTER TABLE public.employees`);
      missingColumns.forEach((col, index) => {
        const comma = index < missingColumns.length - 1 ? ',' : ';';
        console.log(`  ADD COLUMN ${col} TEXT${comma}`);
      });
      console.log('-'.repeat(60));
    } else {
      console.log('⚠ No employees found to verify schema.');
      console.log();
      console.log('Please execute the following SQL in Supabase SQL Editor:');
      console.log('-'.repeat(60));
      console.log(`ALTER TABLE public.employees`);
      newColumns.forEach((col, index) => {
        const comma = index < newColumns.length - 1 ? ',' : ';';
        console.log(`  ADD COLUMN ${col} TEXT${comma}`);
      });
      console.log('-'.repeat(60));
    }

    console.log();
    console.log('='.repeat(60));

  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

applyMigration();
