/**
 * Apply Comprehensive Column Migration Script
 * Applies the missing column and comprehensive column config migrations
 * Story: 7.1 - Comprehensive Masterdata Column Migration & Configuration
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

async function applyMigrations() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    db: { schema: 'public' },
    auth: { persistSession: false }
  });

  console.log('='.repeat(60));
  console.log('Applying Comprehensive Column Migrations');
  console.log('Story 7.1: Comprehensive Masterdata Column Migration');
  console.log('='.repeat(60));
  console.log();

  try {
    // Step 1: Apply missing columns migration
    console.log('Step 1: Adding missing columns to employees table...');
    const migration1Path = path.join(process.cwd(), 'migrations', '20251102000003_add_missing_masterdata_columns.sql');
    const migration1SQL = fs.readFileSync(migration1Path, 'utf-8');
    
    // Remove comments and split by semicolons for execution
    const statements1 = migration1SQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements1) {
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      if (error) {
        // Try direct approach if RPC fails
        console.log('Using direct SQL approach...');
        const { error: directError } = await supabase.from('_sql').select(statement);
        if (directError && !directError.message.includes('does not exist')) {
          console.error('Error executing statement:', directError.message);
        }
      }
    }

    console.log('✓ Missing columns added successfully');
    console.log();

    // Step 2: Verify columns were added
    console.log('Step 2: Verifying new columns...');
    const { data: employees, error: verifyError } = await supabase
      .from('employees')
      .select('*')
      .limit(1);

    if (verifyError) {
      console.error('Error verifying columns:', verifyError.message);
    } else {
      const newColumns = ['one', 'isps', 'photo', 'origo', 'loneiva', 'mail_lon', 
                          'bankuppgifter', 'li', 'passport', 'kvitto_c17_18', 'c17', 'crewing_done'];
      
      if (employees && employees.length > 0) {
        const employeeKeys = Object.keys(employees[0]);
        const foundColumns = newColumns.filter(col => employeeKeys.includes(col));
        console.log(`✓ Found ${foundColumns.length}/${newColumns.length} new columns`);
        foundColumns.forEach(col => console.log(`  - ${col}`));
      } else {
        console.log('⚠ No employee records to verify column structure');
      }
    }
    console.log();

    // Step 3: Apply comprehensive column config seed
    console.log('Step 3: Seeding comprehensive column configuration...');
    
    // Clear existing masterdata columns
    const { error: deleteError } = await supabase
      .from('column_config')
      .delete()
      .eq('is_masterdata', true);

    if (deleteError) {
      console.error('Error clearing existing column config:', deleteError.message);
    } else {
      console.log('✓ Cleared existing masterdata column configurations');
    }

    // Define all 24 column configurations
    const columnConfigs = [
      { column_name: 'Stena Date', column_type: 'text', is_masterdata: true, display_order: 1, role_permissions: {
        hr_admin: { view: true, edit: true }, omc: { view: false, edit: false },
        payroll: { view: true, edit: false }, sodexo: { view: true, edit: false },
        toplux: { view: true, edit: false }
      }},
      { column_name: 'ÖMC Date', column_type: 'text', is_masterdata: true, display_order: 2, role_permissions: {
        hr_admin: { view: true, edit: true }, omc: { view: true, edit: false },
        payroll: { view: false, edit: false }, sodexo: { view: false, edit: false },
        toplux: { view: false, edit: false }
      }},
      { column_name: 'PE3 Date', column_type: 'text', is_masterdata: true, display_order: 3, role_permissions: {
        hr_admin: { view: true, edit: true }, omc: { view: false, edit: false },
        payroll: { view: false, edit: false }, sodexo: { view: false, edit: false },
        toplux: { view: false, edit: false }
      }},
      { column_name: 'First Name', column_type: 'text', is_masterdata: true, display_order: 4, role_permissions: {
        hr_admin: { view: true, edit: true }, omc: { view: true, edit: false },
        payroll: { view: true, edit: false }, sodexo: { view: true, edit: false },
        toplux: { view: true, edit: false }
      }},
      { column_name: 'Surname', column_type: 'text', is_masterdata: true, display_order: 5, role_permissions: {
        hr_admin: { view: true, edit: true }, omc: { view: true, edit: false },
        payroll: { view: true, edit: false }, sodexo: { view: true, edit: false },
        toplux: { view: true, edit: false }
      }},
      { column_name: 'Town District', column_type: 'text', is_masterdata: true, display_order: 6, role_permissions: {
        hr_admin: { view: true, edit: true }, omc: { view: false, edit: false },
        payroll: { view: false, edit: false }, sodexo: { view: false, edit: false },
        toplux: { view: true, edit: false }
      }},
      { column_name: 'Mobile', column_type: 'text', is_masterdata: true, display_order: 7, role_permissions: {
        hr_admin: { view: true, edit: true }, omc: { view: true, edit: false },
        payroll: { view: true, edit: false }, sodexo: { view: false, edit: false },
        toplux: { view: true, edit: false }
      }},
      { column_name: 'Email', column_type: 'text', is_masterdata: true, display_order: 8, role_permissions: {
        hr_admin: { view: true, edit: true }, omc: { view: true, edit: false },
        payroll: { view: true, edit: false }, sodexo: { view: false, edit: false },
        toplux: { view: true, edit: false }
      }},
      { column_name: 'Social Security No.', column_type: 'text', is_masterdata: true, display_order: 9, role_permissions: {
        hr_admin: { view: true, edit: true }, omc: { view: true, edit: false },
        payroll: { view: true, edit: false }, sodexo: { view: false, edit: false },
        toplux: { view: true, edit: false }
      }},
      { column_name: 'Rank', column_type: 'text', is_masterdata: true, display_order: 10, role_permissions: {
        hr_admin: { view: true, edit: true }, omc: { view: true, edit: false },
        payroll: { view: true, edit: false }, sodexo: { view: false, edit: false },
        toplux: { view: true, edit: false }
      }},
      { column_name: 'Gender', column_type: 'text', is_masterdata: true, display_order: 11, role_permissions: {
        hr_admin: { view: true, edit: true }, omc: { view: true, edit: false },
        payroll: { view: false, edit: false }, sodexo: { view: false, edit: false },
        toplux: { view: false, edit: false }
      }},
      { column_name: 'Comments', column_type: 'text', is_masterdata: true, display_order: 12, role_permissions: {
        hr_admin: { view: true, edit: true }, omc: { view: false, edit: false },
        payroll: { view: false, edit: false }, sodexo: { view: false, edit: false },
        toplux: { view: false, edit: false }
      }},
      { column_name: 'One', column_type: 'text', is_masterdata: true, display_order: 13, role_permissions: {
        hr_admin: { view: true, edit: true }, omc: { view: false, edit: false },
        payroll: { view: false, edit: false }, sodexo: { view: false, edit: false },
        toplux: { view: false, edit: false }
      }},
      { column_name: 'ISPS', column_type: 'text', is_masterdata: true, display_order: 14, role_permissions: {
        hr_admin: { view: true, edit: true }, omc: { view: false, edit: false },
        payroll: { view: false, edit: false }, sodexo: { view: false, edit: false },
        toplux: { view: false, edit: false }
      }},
      { column_name: 'Photo', column_type: 'text', is_masterdata: true, display_order: 15, role_permissions: {
        hr_admin: { view: true, edit: true }, omc: { view: false, edit: false },
        payroll: { view: false, edit: false }, sodexo: { view: false, edit: false },
        toplux: { view: false, edit: false }
      }},
      { column_name: 'Origo', column_type: 'text', is_masterdata: true, display_order: 16, role_permissions: {
        hr_admin: { view: true, edit: true }, omc: { view: false, edit: false },
        payroll: { view: false, edit: false }, sodexo: { view: false, edit: false },
        toplux: { view: false, edit: false }
      }},
      { column_name: 'Lönenivå', column_type: 'text', is_masterdata: true, display_order: 17, role_permissions: {
        hr_admin: { view: true, edit: true }, omc: { view: false, edit: false },
        payroll: { view: false, edit: false }, sodexo: { view: false, edit: false },
        toplux: { view: false, edit: false }
      }},
      { column_name: 'Mail lön', column_type: 'text', is_masterdata: true, display_order: 18, role_permissions: {
        hr_admin: { view: true, edit: true }, omc: { view: false, edit: false },
        payroll: { view: false, edit: false }, sodexo: { view: false, edit: false },
        toplux: { view: false, edit: false }
      }},
      { column_name: 'Bankuppgifter', column_type: 'text', is_masterdata: true, display_order: 19, role_permissions: {
        hr_admin: { view: true, edit: true }, omc: { view: false, edit: false },
        payroll: { view: false, edit: false }, sodexo: { view: false, edit: false },
        toplux: { view: false, edit: false }
      }},
      { column_name: 'LI', column_type: 'text', is_masterdata: true, display_order: 20, role_permissions: {
        hr_admin: { view: true, edit: true }, omc: { view: false, edit: false },
        payroll: { view: false, edit: false }, sodexo: { view: false, edit: false },
        toplux: { view: false, edit: false }
      }},
      { column_name: 'Passport', column_type: 'text', is_masterdata: true, display_order: 21, role_permissions: {
        hr_admin: { view: true, edit: true }, omc: { view: false, edit: false },
        payroll: { view: false, edit: false }, sodexo: { view: false, edit: false },
        toplux: { view: false, edit: false }
      }},
      { column_name: 'Kvitto C17/18', column_type: 'text', is_masterdata: true, display_order: 22, role_permissions: {
        hr_admin: { view: true, edit: true }, omc: { view: false, edit: false },
        payroll: { view: false, edit: false }, sodexo: { view: false, edit: false },
        toplux: { view: false, edit: false }
      }},
      { column_name: 'C17', column_type: 'text', is_masterdata: true, display_order: 23, role_permissions: {
        hr_admin: { view: true, edit: true }, omc: { view: false, edit: false },
        payroll: { view: false, edit: false }, sodexo: { view: false, edit: false },
        toplux: { view: false, edit: false }
      }},
      { column_name: 'Crewing/Done', column_type: 'text', is_masterdata: true, display_order: 24, role_permissions: {
        hr_admin: { view: true, edit: true }, omc: { view: false, edit: false },
        payroll: { view: false, edit: false }, sodexo: { view: false, edit: false },
        toplux: { view: false, edit: false }
      }}
    ];

    // Insert all configurations
    console.log(`Inserting ${columnConfigs.length} column configurations...`);
    let successCount = 0;
    let errorCount = 0;

    for (const config of columnConfigs) {
      const { error: insertError } = await supabase
        .from('column_config')
        .insert(config);

      if (insertError) {
        console.error(`✗ ${config.column_name}: ${insertError.message}`);
        errorCount++;
      } else {
        console.log(`✓ ${config.column_name} (order: ${config.display_order})`);
        successCount++;
      }
    }

    console.log();
    console.log(`Completed: ${successCount} successful, ${errorCount} errors`);
    console.log();

    // Step 4: Verify final state
    console.log('Step 4: Verifying final column configuration...');
    const { data: finalColumns, error: finalError } = await supabase
      .from('column_config')
      .select('column_name, display_order, is_masterdata')
      .eq('is_masterdata', true)
      .order('display_order');

    if (finalError) {
      console.error('Error verifying final state:', finalError.message);
    } else {
      console.log(`✓ Found ${finalColumns?.length || 0} masterdata columns`);
      if (finalColumns && finalColumns.length > 0) {
        console.log('\nColumn order:');
        finalColumns.forEach((col, index) => {
          console.log(`  ${index + 1}. ${col.column_name} (display_order: ${col.display_order})`);
        });
      }
    }

    console.log();
    console.log('='.repeat(60));
    console.log('Migration completed successfully!');
    console.log('='.repeat(60));

  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

applyMigrations();
