/**
 * Verify Comprehensive Column Configuration
 * Story 7.1 - Verification script for column configuration
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verify() {
  console.log('='.repeat(60));
  console.log('Verifying Comprehensive Column Configuration');
  console.log('Story 7.1: Comprehensive Masterdata Column Migration');
  console.log('='.repeat(60));
  console.log();

  // Test 1: Count masterdata columns
  const { data: columns, error } = await supabase
    .from('column_config')
    .select('*')
    .eq('is_masterdata', true)
    .order('display_order');

  if (error) {
    console.error('❌ Error fetching columns:', error.message);
    return;
  }

  console.log(`✓ Found ${columns?.length || 0} masterdata columns (expected: 24)`);
  console.log();

  if (!columns || columns.length === 0) {
    console.error('❌ No columns found. Please run the migration script.');
    return;
  }

  // Test 2: Verify display order
  const expectedOrder = [
    "Stena Date", "ÖMC Date", "PE3 Date", "First Name", "Surname",
    "Town District", "Mobile", "Email", "Social Security No.", "Rank",
    "Gender", "Comments", "One", "ISPS", "Photo", "Origo",
    "Lönenivå", "Mail lön", "Bankuppgifter", "LI", "Passport",
    "Kvitto C17/18", "C17", "Crewing/Done"
  ];

  console.log('Column Display Order:');
  columns.forEach((col, index) => {
    const expected = expectedOrder[index];
    const match = col.column_name === expected ? '✓' : '✗';
    console.log(`  ${match} ${index + 1}. ${col.column_name} (expected: ${expected})`);
  });
  console.log();

  // Test 3: Verify role permissions
  const roles = ['omc', 'payroll', 'sodexo', 'toplux', 'hr_admin'];
  
  for (const role of roles) {
    const visibleColumns = columns.filter(c => {
      const perms = c.role_permissions as Record<string, { view: boolean; edit: boolean }>;
      return perms[role] && perms[role].view === true;
    });
    
    console.log(`${role.toUpperCase()} can view ${visibleColumns.length} columns:`);
    visibleColumns.forEach(col => {
      const perms = col.role_permissions as Record<string, { view: boolean; edit: boolean }>;
      const canEdit = perms[role].edit ? '(edit)' : '(view only)';
      console.log(`  - ${col.column_name} ${canEdit}`);
    });
    console.log();
  }

  console.log('='.repeat(60));
  console.log('Verification Complete!');
  console.log('='.repeat(60));
}

verify();
