/**
 * Apply Missing Columns Migration - PostgreSQL Direct
 * Uses pg library to execute ALTER TABLE directly
 * Story: 7.1 - Comprehensive Masterdata Column Migration & Configuration
 */

import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

if (!supabaseUrl) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Extract project ref from Supabase URL
const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

async function applyMigration() {
  console.log('='.repeat(60));
  console.log('Adding Missing Columns to Employees Table');
  console.log('Story 7.1: Comprehensive Masterdata Column Migration');
  console.log('='.repeat(60));
  console.log();

  const alterTableSQL = `
    ALTER TABLE public.employees
    ADD COLUMN IF NOT EXISTS one TEXT,
    ADD COLUMN IF NOT EXISTS isps TEXT,
    ADD COLUMN IF NOT EXISTS photo TEXT,
    ADD COLUMN IF NOT EXISTS origo TEXT,
    ADD COLUMN IF NOT EXISTS loneiva TEXT,
    ADD COLUMN IF NOT EXISTS mail_lon TEXT,
    ADD COLUMN IF NOT EXISTS bankuppgifter TEXT,
    ADD COLUMN IF NOT EXISTS li TEXT,
    ADD COLUMN IF NOT EXISTS passport TEXT,
    ADD COLUMN IF NOT EXISTS kvitto_c17_18 TEXT,
    ADD COLUMN IF NOT EXISTS c17 TEXT,
    ADD COLUMN IF NOT EXISTS crewing_done TEXT;
  `;

  console.log('⚠ This script requires database password which is not available.');
  console.log('Please execute the following SQL manually in Supabase SQL Editor:');
  console.log();
  console.log('-'.repeat(60));
  console.log(alterTableSQL);
  console.log('-'.repeat(60));
  console.log();
  console.log('Steps:');
  console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
  console.log('2. Paste the SQL above');
  console.log('3. Click "Run"');
  console.log();
  console.log('='.repeat(60));
}

applyMigration();
