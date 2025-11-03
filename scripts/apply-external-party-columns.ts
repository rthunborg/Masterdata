/**
 * Apply External Party Custom Column Migrations
 * Applies ÖMC, Payroll, and Toplux custom column seed migrations
 * Story: 7.2 - External Party Custom Column Seeding & Defaults
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

interface ColumnConfig {
  column_name: string;
  column_type: string;
  is_masterdata: boolean;
  display_order: number;
  role_permissions: Record<string, { view: boolean; edit: boolean }>;
}

async function applyMigrations() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    db: { schema: 'public' }
  });

  console.log('Applying External Party Custom Column Migrations');
  console.log('================================================\n');

  // ÖMC Custom Columns (13 columns)
  const omcColumns: ColumnConfig[] = [
    { column_name: 'Hotel Required?', column_type: 'boolean', is_masterdata: false, display_order: 100, 
      role_permissions: { hr_admin: { view: true, edit: false }, omc: { view: true, edit: true }, payroll: { view: false, edit: false }, sodexo: { view: false, edit: false }, toplux: { view: false, edit: false } } },
    { column_name: 'Room Number (Shared)', column_type: 'text', is_masterdata: false, display_order: 101,
      role_permissions: { hr_admin: { view: true, edit: false }, omc: { view: true, edit: true }, payroll: { view: false, edit: false }, sodexo: { view: false, edit: false }, toplux: { view: false, edit: false } } },
    { column_name: 'Dietary Requirement?', column_type: 'boolean', is_masterdata: false, display_order: 102,
      role_permissions: { hr_admin: { view: true, edit: false }, omc: { view: true, edit: true }, payroll: { view: false, edit: false }, sodexo: { view: false, edit: false }, toplux: { view: false, edit: false } } },
    { column_name: 'Joining Instructions sent', column_type: 'boolean', is_masterdata: false, display_order: 103,
      role_permissions: { hr_admin: { view: true, edit: false }, omc: { view: true, edit: true }, payroll: { view: false, edit: false }, sodexo: { view: false, edit: false }, toplux: { view: false, edit: false } } },
    { column_name: 'Candidate Confirmed', column_type: 'boolean', is_masterdata: false, display_order: 104,
      role_permissions: { hr_admin: { view: true, edit: false }, omc: { view: true, edit: true }, payroll: { view: false, edit: false }, sodexo: { view: false, edit: false }, toplux: { view: false, edit: false } } },
    { column_name: 'Seably', column_type: 'text', is_masterdata: false, display_order: 105,
      role_permissions: { hr_admin: { view: true, edit: false }, omc: { view: true, edit: true }, payroll: { view: false, edit: false }, sodexo: { view: false, edit: false }, toplux: { view: false, edit: false } } },
    { column_name: 'Receipt C-17', column_type: 'boolean', is_masterdata: false, display_order: 106,
      role_permissions: { hr_admin: { view: true, edit: false }, omc: { view: true, edit: true }, payroll: { view: false, edit: false }, sodexo: { view: false, edit: false }, toplux: { view: false, edit: false } } },
    { column_name: 'C-17 Certificate', column_type: 'boolean', is_masterdata: false, display_order: 107,
      role_permissions: { hr_admin: { view: true, edit: false }, omc: { view: true, edit: true }, payroll: { view: false, edit: false }, sodexo: { view: false, edit: false }, toplux: { view: false, edit: false } } },
    { column_name: 'Receipt C-18', column_type: 'boolean', is_masterdata: false, display_order: 108,
      role_permissions: { hr_admin: { view: true, edit: false }, omc: { view: true, edit: true }, payroll: { view: false, edit: false }, sodexo: { view: false, edit: false }, toplux: { view: false, edit: false } } },
    { column_name: 'C-18 Certificate', column_type: 'boolean', is_masterdata: false, display_order: 109,
      role_permissions: { hr_admin: { view: true, edit: false }, omc: { view: true, edit: true }, payroll: { view: false, edit: false }, sodexo: { view: false, edit: false }, toplux: { view: false, edit: false } } },
    { column_name: 'ÖMC Certificate', column_type: 'boolean', is_masterdata: false, display_order: 110,
      role_permissions: { hr_admin: { view: true, edit: false }, omc: { view: true, edit: true }, payroll: { view: false, edit: false }, sodexo: { view: false, edit: false }, toplux: { view: false, edit: false } } },
    { column_name: 'Uploaded in CrewSF', column_type: 'boolean', is_masterdata: false, display_order: 111,
      role_permissions: { hr_admin: { view: true, edit: false }, omc: { view: true, edit: true }, payroll: { view: false, edit: false }, sodexo: { view: false, edit: false }, toplux: { view: false, edit: false } } },
    { column_name: 'Completed', column_type: 'boolean', is_masterdata: false, display_order: 112,
      role_permissions: { hr_admin: { view: true, edit: false }, omc: { view: true, edit: true }, payroll: { view: false, edit: false }, sodexo: { view: false, edit: false }, toplux: { view: false, edit: false } } },
  ];

  // Payroll Custom Columns (4 columns)
  const payrollColumns: ColumnConfig[] = [
    { column_name: 'Ersatt', column_type: 'text', is_masterdata: false, display_order: 200,
      role_permissions: { hr_admin: { view: true, edit: false }, omc: { view: false, edit: false }, payroll: { view: true, edit: true }, sodexo: { view: false, edit: false }, toplux: { view: false, edit: false } } },
    { column_name: 'Fartyg', column_type: 'text', is_masterdata: false, display_order: 201,
      role_permissions: { hr_admin: { view: true, edit: false }, omc: { view: false, edit: false }, payroll: { view: true, edit: true }, sodexo: { view: false, edit: false }, toplux: { view: false, edit: false } } },
    { column_name: 'Klart/sign', column_type: 'text', is_masterdata: false, display_order: 202,
      role_permissions: { hr_admin: { view: true, edit: false }, omc: { view: false, edit: false }, payroll: { view: true, edit: true }, sodexo: { view: false, edit: false }, toplux: { view: false, edit: false } } },
    { column_name: 'Notering', column_type: 'text', is_masterdata: false, display_order: 203,
      role_permissions: { hr_admin: { view: true, edit: false }, omc: { view: false, edit: false }, payroll: { view: true, edit: true }, sodexo: { view: false, edit: false }, toplux: { view: false, edit: false } } },
  ];

  // Toplux Custom Columns (9 columns)
  const topluxColumns: ColumnConfig[] = [
    { column_name: 'Stena ID- Origo nummer', column_type: 'text', is_masterdata: false, display_order: 300,
      role_permissions: { hr_admin: { view: true, edit: false }, omc: { view: false, edit: false }, payroll: { view: false, edit: false }, sodexo: { view: false, edit: false }, toplux: { view: true, edit: true } } },
    { column_name: 'Beställning gjord', column_type: 'date', is_masterdata: false, display_order: 301,
      role_permissions: { hr_admin: { view: true, edit: false }, omc: { view: false, edit: false }, payroll: { view: false, edit: false }, sodexo: { view: false, edit: false }, toplux: { view: true, edit: true } } },
    { column_name: 'Fartyg (Toplux)', column_type: 'text', is_masterdata: false, display_order: 302,
      role_permissions: { hr_admin: { view: true, edit: false }, omc: { view: false, edit: false }, payroll: { view: false, edit: false }, sodexo: { view: false, edit: false }, toplux: { view: true, edit: true } } },
    { column_name: 'Skickat beställning till Fartyg/Warehouse', column_type: 'date', is_masterdata: false, display_order: 303,
      role_permissions: { hr_admin: { view: true, edit: false }, omc: { view: false, edit: false }, payroll: { view: false, edit: false }, sodexo: { view: false, edit: false }, toplux: { view: true, edit: true } } },
    { column_name: 'Mottaget', column_type: 'date', is_masterdata: false, display_order: 304,
      role_permissions: { hr_admin: { view: true, edit: false }, omc: { view: false, edit: false }, payroll: { view: false, edit: false }, sodexo: { view: false, edit: false }, toplux: { view: true, edit: true } } },
    { column_name: 'Kontaktat medarbetare', column_type: 'text', is_masterdata: false, display_order: 305,
      role_permissions: { hr_admin: { view: true, edit: false }, omc: { view: false, edit: false }, payroll: { view: false, edit: false }, sodexo: { view: false, edit: false }, toplux: { view: true, edit: true } } },
    { column_name: 'Uthämtat', column_type: 'date', is_masterdata: false, display_order: 306,
      role_permissions: { hr_admin: { view: true, edit: false }, omc: { view: false, edit: false }, payroll: { view: false, edit: false }, sodexo: { view: false, edit: false }, toplux: { view: true, edit: true } } },
    { column_name: 'Mottagit kort', column_type: 'date', is_masterdata: false, display_order: 307,
      role_permissions: { hr_admin: { view: true, edit: false }, omc: { view: false, edit: false }, payroll: { view: false, edit: false }, sodexo: { view: false, edit: false }, toplux: { view: true, edit: true } } },
    { column_name: 'Skickat kort till fartyg', column_type: 'date', is_masterdata: false, display_order: 308,
      role_permissions: { hr_admin: { view: true, edit: false }, omc: { view: false, edit: false }, payroll: { view: false, edit: false }, sodexo: { view: false, edit: false }, toplux: { view: true, edit: true } } },
  ];

  // Apply ÖMC columns
  console.log('Seeding ÖMC Custom Columns (13 columns)');
  console.log('----------------------------------------');
  for (const config of omcColumns) {
    const { data: existing } = await supabase
      .from('column_config')
      .select('id')
      .eq('column_name', config.column_name)
      .eq('is_masterdata', false)
      .maybeSingle();

    if (existing) {
      console.log(`  ⊘ ${config.column_name} (already exists)`);
      continue;
    }

    const { error } = await supabase
      .from('column_config')
      .insert(config);

    if (error) {
      console.error(`  ✗ ${config.column_name}: ${error.message}`);
    } else {
      console.log(`  ✓ ${config.column_name} (${config.column_type})`);
    }
  }
  console.log('');

  // Apply Payroll columns
  console.log('Seeding Payroll Custom Columns (4 columns)');
  console.log('-------------------------------------------');
  for (const config of payrollColumns) {
    const { data: existing } = await supabase
      .from('column_config')
      .select('id')
      .eq('column_name', config.column_name)
      .eq('is_masterdata', false)
      .maybeSingle();

    if (existing) {
      console.log(`  ⊘ ${config.column_name} (already exists)`);
      continue;
    }

    const { error } = await supabase
      .from('column_config')
      .insert(config);

    if (error) {
      console.error(`  ✗ ${config.column_name}: ${error.message}`);
    } else {
      console.log(`  ✓ ${config.column_name} (${config.column_type})`);
    }
  }
  console.log('');

  // Apply Toplux columns
  console.log('Seeding Toplux Custom Columns (9 columns)');
  console.log('------------------------------------------');
  for (const config of topluxColumns) {
    const { data: existing } = await supabase
      .from('column_config')
      .select('id')
      .eq('column_name', config.column_name)
      .eq('is_masterdata', false)
      .maybeSingle();

    if (existing) {
      console.log(`  ⊘ ${config.column_name} (already exists)`);
      continue;
    }

    const { error } = await supabase
      .from('column_config')
      .insert(config);

    if (error) {
      console.error(`  ✗ ${config.column_name}: ${error.message}`);
    } else {
      console.log(`  ✓ ${config.column_name} (${config.column_type})`);
    }
  }
  console.log('');

  // Verification
  console.log('Verification Summary');
  console.log('====================\n');

  const roles = ['omc', 'payroll', 'toplux', 'sodexo'];
  
  for (const role of roles) {
    const { data: columns } = await supabase
      .from('column_config')
      .select('column_name, column_type, display_order, role_permissions')
      .eq('is_masterdata', false)
      .order('display_order');

    // Filter columns that have view permissions for this role
    const roleColumns = columns?.filter(col => {
      const config = col as { role_permissions?: Record<string, { view?: boolean; edit?: boolean }> };
      return config.role_permissions?.[role]?.view === true;
    });

    console.log(`${role.toUpperCase()}: ${roleColumns?.length || 0} custom columns`);
    if (roleColumns && roleColumns.length > 0) {
      roleColumns.forEach((col: { column_name: string; column_type: string; display_order: number; role_permissions: Record<string, { view: boolean; edit: boolean }> }) => {
        const canEdit = col.role_permissions[role]?.edit ? 'edit' : 'view-only';
        console.log(`  - ${col.column_name} (${col.column_type}) [${canEdit}]`);
      });
    }
    console.log('');
  }

  console.log('✓ All migrations completed successfully!');
}

applyMigrations();
