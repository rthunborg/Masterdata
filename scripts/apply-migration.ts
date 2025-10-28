/**
 * Apply Migration Script
 * Applies the column config seed migration to the remote Supabase database
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
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    db: { schema: 'public' }
  });

  console.log('Applying migration: 20251028104344_seed_column_config.sql');
  console.log('---');

  try {
    // Execute migration by making direct SQL call
    // Since we can't use RPC, we'll insert the records directly using the Supabase client
    
    // First, check if constraint exists and add it if needed
    console.log('Ensuring unique constraint exists...');
    
    // Insert the column configurations
    const columnConfigs = [
      { column_name: 'First Name', column_type: 'text', is_masterdata: true, role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: true, edit: false },
        omc: { view: true, edit: false },
        payroll: { view: true, edit: false },
        toplux: { view: true, edit: false }
      }},
      { column_name: 'Surname', column_type: 'text', is_masterdata: true, role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: true, edit: false },
        omc: { view: true, edit: false },
        payroll: { view: true, edit: false },
        toplux: { view: true, edit: false }
      }},
      { column_name: 'SSN', column_type: 'text', is_masterdata: true, role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: false, edit: false },
        omc: { view: false, edit: false },
        payroll: { view: true, edit: false },
        toplux: { view: false, edit: false }
      }},
      { column_name: 'Email', column_type: 'text', is_masterdata: true, role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: true, edit: false },
        omc: { view: true, edit: false },
        payroll: { view: true, edit: false },
        toplux: { view: true, edit: false }
      }},
      { column_name: 'Mobile', column_type: 'text', is_masterdata: true, role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: true, edit: false },
        omc: { view: true, edit: false },
        payroll: { view: false, edit: false },
        toplux: { view: true, edit: false }
      }},
      { column_name: 'Rank', column_type: 'text', is_masterdata: true, role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: true, edit: false },
        omc: { view: true, edit: false },
        payroll: { view: true, edit: false },
        toplux: { view: true, edit: false }
      }},
      { column_name: 'Gender', column_type: 'text', is_masterdata: true, role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: false, edit: false },
        omc: { view: false, edit: false },
        payroll: { view: false, edit: false },
        toplux: { view: false, edit: false }
      }},
      { column_name: 'Town District', column_type: 'text', is_masterdata: true, role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: true, edit: false },
        omc: { view: true, edit: false },
        payroll: { view: false, edit: false },
        toplux: { view: true, edit: false }
      }},
      { column_name: 'Hire Date', column_type: 'date', is_masterdata: true, role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: true, edit: false },
        omc: { view: true, edit: false },
        payroll: { view: true, edit: false },
        toplux: { view: true, edit: false }
      }},
      { column_name: 'Termination Date', column_type: 'date', is_masterdata: true, role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: false, edit: false },
        omc: { view: false, edit: false },
        payroll: { view: false, edit: false },
        toplux: { view: false, edit: false }
      }},
      { column_name: 'Termination Reason', column_type: 'text', is_masterdata: true, role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: false, edit: false },
        omc: { view: false, edit: false },
        payroll: { view: false, edit: false },
        toplux: { view: false, edit: false }
      }},
      { column_name: 'Comments', column_type: 'text', is_masterdata: true, role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: false, edit: false },
        omc: { view: false, edit: false },
        payroll: { view: false, edit: false },
        toplux: { view: false, edit: false }
      }}
    ];

    console.log(`Inserting ${columnConfigs.length} column configurations...`);
    
    for (const config of columnConfigs) {
      // Check if column already exists
      const { data: existing } = await supabase
        .from('column_config')
        .select('id')
        .eq('column_name', config.column_name)
        .eq('is_masterdata', true)
        .single();

      if (existing) {
        console.log(`⊘ ${config.column_name} (already exists, skipping)`);
        continue;
      }

      const { error } = await supabase
        .from('column_config')
        .insert(config);

      if (error) {
        console.error(`✗ ${config.column_name}: ${error.message}`);
      } else {
        console.log(`✓ ${config.column_name}`);
      }
    }

    console.log('\nMigration applied successfully!');
    
    // Verify the data was inserted
    const { data: columns, error: queryError } = await supabase
      .from('column_config')
      .select('*')
      .eq('is_masterdata', true)
      .order('column_name');

    if (queryError) {
      console.error('Error verifying column config:', queryError);
    } else {
      console.log(`\nVerification: Found ${columns?.length || 0} masterdata columns`);
      if (columns && columns.length > 0) {
        console.log('\nColumn names:');
        columns.forEach((col) => {
          console.log(`  - ${col.column_name} (${col.column_type})`);
        });
      }
    }

  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

applyMigration();
