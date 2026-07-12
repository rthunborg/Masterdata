/**
 * E2E Test Seed Data
 * Story 11.7: End-to-End Critical User Journey Tests
 * 
 * Seed data scripts for E2E tests - creates test dates and cleans up test data
 */

import { createClient } from '@supabase/supabase-js';
import { validateNonProductionSupabaseEnvironment } from '../../../src/lib/env/non-production-supabase-guard';

const E2E_SEED_MARKER = 'E2E seed data';
const TEST_USER_PASSWORD = 'Test123!';

const E2E_TEST_USERS = [
  { email: 'admin@test.com', role: 'hr_admin', isActive: true },
  { email: 'hr@test.com', role: 'hr_admin', isActive: true },
  { email: 'sodexo@test.com', role: 'sodexo', isActive: true },
  { email: 'omc@test.com', role: 'omc', isActive: true },
  { email: 'payroll@test.com', role: 'payroll', isActive: true },
  { email: 'toplux@test.com', role: 'toplux', isActive: true },
  { email: 'inactive@test.com', role: 'sodexo', isActive: false },
];

const E2E_EMPLOYEE_FIXTURES = [
  { first_name: 'Anna', surname: 'Test' },
  { first_name: 'Capacity', surname: 'Test1', ssn: '199001011111' },
  { first_name: 'Capacity', surname: 'Test2', ssn: '199001012222' },
  { first_name: 'Capacity', surname: 'Test3', ssn: '199001013333' },
  { first_name: 'Concurrent', surname: 'UserA', ssn: '199001011111' },
  { first_name: 'Concurrent', surname: 'UserB', ssn: '199001012222' },
  { first_name: 'Prereq', surname: 'Test', ssn: '199001018888' },
  { first_name: 'Room', surname: 'Test1', ssn: '199001011111' },
  { first_name: 'Room', surname: 'Test2', ssn: '199001012222' },
  { first_name: 'Room', surname: 'Test3', ssn: '199001013333' },
  { first_name: 'Room', surname: 'Test4', ssn: '199001014444' },
  { first_name: 'Room', surname: 'Test5', ssn: '199001015555' },
  { surname: 'SyncTest', ssn: '199001019999' },
  { first_name: 'Terminate', surname: 'Test', ssn: '199001017777' },
  { first_name: 'Test', surname: 'Employee1', ssn: '199001011234' },
  { first_name: 'Test', surname: 'Employee2', ssn: '199002021234' },
  { first_name: 'Test', surname: 'Employee3', ssn: '199003031234' },
  { first_name: 'Test', surname: 'Employee4', ssn: '199004041234' },
  { first_name: 'Test', surname: 'Employee5', ssn: '199005051234' },
  { first_name: 'Test', surname: 'Employee6', ssn: '199006061234' },
  { first_name: 'Test', surname: 'Employee7', ssn: '199007071234' },
  { first_name: 'Test', surname: 'Employee8', ssn: '199008081234' },
  { first_name: 'Test', surname: 'Employee9', ssn: '199009091234' },
  { first_name: 'Test', surname: 'Employee10', ssn: '199010101234' },
];

const E2E_EMPLOYEE_CLEANUP_PATTERNS = [
  'first_name.ilike.UpdatedName%',
  'first_name.ilike.Capacity%',
  'first_name.ilike.Concurrent%',
  'first_name.ilike.ControlExport%',
  'first_name.ilike.FilterExport%',
  'first_name.ilike.Inline%',
  'and(first_name.ilike.Import%,surname.ilike.Employee%)',
  'first_name.ilike.Prereq%',
  'first_name.ilike.Realtime%',
  'first_name.ilike.Room%',
  'first_name.ilike.Terminate%',
  'and(first_name.eq.Anna,surname.eq.Test)',
  'surname.eq.SyncTest',
  'and(first_name.eq.Test,surname.ilike.Employee%)',
  'ssn.ilike.199001%',
  'ssn.ilike.199002%',
  'ssn.ilike.199003%',
  'ssn.ilike.199004%',
  'ssn.ilike.199005%',
  'ssn.ilike.199006%',
  'ssn.ilike.199007%',
  'ssn.ilike.199008%',
  'ssn.ilike.199009%',
  'ssn.ilike.199010%',
  'email.ilike.import%@example.com',
];

const E2E_DATE_CLEANUP_PATTERNS = [
  'date_description.ilike.%Test%',
  'date_description.ilike.%E2E%',
  'date_description.ilike.%19-20 december%',
  'date_description.ilike.%8-9 mars%',
  'date_description.ilike.%15-16 maj%',
  'date_description.eq.20 april',
];

function isLocalSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^\[(.*)\]$/, '$1');
    return ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(hostname);
  } catch {
    return false;
  }
}

function futureDateForMonthDay(monthIndex: number, day: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let year = today.getFullYear();
  let date = new Date(Date.UTC(year, monthIndex, day));

  if (date < today) {
    year += 1;
    date = new Date(Date.UTC(year, monthIndex, day));
  }

  return {
    dateValue: date.toISOString().split('T')[0],
    year,
  };
}

function getSeedDateFixtures() {
  const stenaDate = futureDateForMonthDay(11, 19);
  const omcDate = futureDateForMonthDay(2, 8);
  const pe3Date = futureDateForMonthDay(3, 20);
  const limitedOmcDate = futureDateForMonthDay(4, 15);

  return {
    stena: {
      category: 'Stena Dates',
      date_value: stenaDate.dateValue,
      date_description: `E2E 19-20 december ${stenaDate.year}`,
      year: stenaDate.year,
      max_spots: 500,
      remaining_spots: 500,
      is_active: true,
      notes: E2E_SEED_MARKER,
    },
    omc: {
      category: 'ÖMC Dates',
      date_value: omcDate.dateValue,
      date_description: `E2E 8-9 mars ${omcDate.year}`,
      year: omcDate.year,
      max_spots: 500,
      remaining_spots: 500,
      is_active: true,
      notes: E2E_SEED_MARKER,
    },
    pe3: {
      category: 'PE3 Dates',
      date_value: pe3Date.dateValue,
      date_description: 'E2E 20 april',
      year: pe3Date.year,
      max_spots: 1,
      remaining_spots: 1,
      is_active: true,
      notes: E2E_SEED_MARKER,
    },
    limitedOmc: {
      category: 'ÖMC Dates',
      date_value: limitedOmcDate.dateValue,
      date_description: 'E2E 15-16 maj',
      year: limitedOmcDate.year,
      max_spots: 2,
      remaining_spots: 2,
      is_active: true,
      notes: E2E_SEED_MARKER,
    },
  };
}

export function assertSafeE2EDatabase() {
  validateNonProductionSupabaseEnvironment();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const allowRemoteDb = process.env.E2E_ALLOW_REMOTE_DB === 'true';

  if (!supabaseUrl || allowRemoteDb || isLocalSupabaseUrl(supabaseUrl)) {
    return;
  }

  throw new Error(
    'Refusing to run E2E database setup/cleanup against a remote Supabase project. ' +
    'Use a local Supabase instance, or set E2E_ALLOW_REMOTE_DB=true only for an isolated staging database.'
  );
}

/**
 * Get Supabase client (lazy-loaded to ensure env vars are available)
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase environment variables for E2E tests. ' +
      'Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local or .env.test'
    );
  }

  assertSafeE2EDatabase();

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Ensure E2E auth users and matching public.users records exist.
 * Existing auth users are repaired to the standard test password so stale
 * credentials cannot break the entire Playwright suite.
 */
export async function ensureTestUsers() {
  const supabase = getSupabaseClient();
  const { data: listedUsers, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    throw new Error(`Failed to list auth users for E2E setup: ${listError.message}`);
  }

  for (const testUser of E2E_TEST_USERS) {
    let authUser = listedUsers.users.find((user) => user.email === testUser.email);

    if (authUser) {
      const { error: updateAuthError } = await supabase.auth.admin.updateUserById(
        authUser.id,
        {
          password: TEST_USER_PASSWORD,
          email_confirm: true,
          user_metadata: { role: testUser.role },
        }
      );

      if (updateAuthError) {
        throw new Error(
          `Failed to repair E2E auth user ${testUser.email}: ${updateAuthError.message}`
        );
      }
    } else {
      const { data: createdAuth, error: createAuthError } =
        await supabase.auth.admin.createUser({
          email: testUser.email,
          password: TEST_USER_PASSWORD,
          email_confirm: true,
          user_metadata: { role: testUser.role },
        });

      if (createAuthError || !createdAuth.user) {
        throw new Error(
          `Failed to create E2E auth user ${testUser.email}: ${
            createAuthError?.message ?? 'missing auth user'
          }`
        );
      }

      authUser = createdAuth.user;
    }

    const { data: existingProfile, error: profileQueryError } = await supabase
      .from('users')
      .select('id')
      .eq('email', testUser.email)
      .maybeSingle();

    if (profileQueryError) {
      throw new Error(
        `Failed to query E2E profile ${testUser.email}: ${profileQueryError.message}`
      );
    }

    const profile = {
      auth_user_id: authUser.id,
      email: testUser.email,
      role: testUser.role,
      is_active: testUser.isActive,
    };

    const profileResult = existingProfile
      ? await supabase.from('users').update(profile).eq('id', existingProfile.id)
      : await supabase.from('users').insert(profile);

    if (profileResult.error) {
      throw new Error(
        `Failed to upsert E2E profile ${testUser.email}: ${profileResult.error.message}`
      );
    }
  }
}

/**
 * Seed test data for E2E tests
 * Creates important dates with known capacity for testing
 */
export async function seedTestData() {
  const supabase = getSupabaseClient();
  const fixtures = getSeedDateFixtures();

  // Create Stena Date with high capacity for general employee creation tests.
  const { error: stenaError } = await supabase
    .from('important_dates')
    .insert(fixtures.stena)
    .select()
    .single();

  if (stenaError && !stenaError.message.includes('duplicate')) {
    console.error('Error seeding Stena date:', stenaError);
  }

  // Create ÖMC Date with high capacity for general employee creation tests.
  const { data: omcDate, error: omcError } = await supabase
    .from('important_dates')
    .insert(fixtures.omc)
    .select()
    .single();

  if (omcError && !omcError.message.includes('duplicate')) {
    console.error('Error seeding ÖMC date:', omcError);
  }

  // Create PE3 date with limited capacity.
  const { data: pe3Date, error: pe3Error } = await supabase
    .from('important_dates')
    .insert(fixtures.pe3)
    .select()
    .single();

  if (pe3Error && !pe3Error.message.includes('duplicate')) {
    console.error('Error seeding PE3 date:', pe3Error);
  }

  // Create ÖMC date with 2 spots for legacy/skipped capacity tests.
  const { data: limitedDate, error: limitedError } = await supabase
    .from('important_dates')
    .insert(fixtures.limitedOmc)
    .select()
    .single();

  if (limitedError && !limitedError.message.includes('duplicate')) {
    console.error('Error seeding limited capacity date:', limitedError);
  }

  return {
    omcDate,
    pe3Date,
    limitedDate,
  };
}

/**
 * Clean up test data created during E2E tests
 * Removes employees and dates created by tests
 */
export async function cleanupTestData() {
  const supabase = getSupabaseClient();

  // Employees created through the UI may have non-test names but still point at
  // E2E-only dates. Remove those rows before deleting the dates to avoid FK
  // violations during teardown.
  const [{ data: markedDates, error: markedDateQueryError }, { data: namedDates, error: namedDateQueryError }] =
    await Promise.all([
      supabase.from('important_dates').select('id').eq('notes', E2E_SEED_MARKER),
      supabase
        .from('important_dates')
        .select('id')
        .or(E2E_DATE_CLEANUP_PATTERNS.join(',')),
    ]);

  if (markedDateQueryError) {
    console.error('Error querying marked test dates for cleanup:', markedDateQueryError);
  }

  if (namedDateQueryError) {
    console.error('Error querying named test dates for cleanup:', namedDateQueryError);
  }

  const testDateIds = [
    ...(markedDates?.map((date) => date.id).filter(Boolean) ?? []),
    ...(namedDates?.map((date) => date.id).filter(Boolean) ?? []),
  ];
  const uniqueTestDateIds = [...new Set(testDateIds)];

  for (const dateId of uniqueTestDateIds) {
    const { error } = await supabase
      .from('employees')
      .delete()
      .or(`stena_date.eq.${dateId},omc_date.eq.${dateId},pe3_date.eq.${dateId}`);

    if (error) {
      console.error(`Error cleaning up employees by E2E date ${dateId}:`, error);
    }
  }
  
  // Delete test employees created by E2E flows. Keep this scoped to known fixtures.
  const { error: patternCleanupError } = await supabase
    .from('employees')
    .delete()
    .or(E2E_EMPLOYEE_CLEANUP_PATTERNS.join(','));

  if (patternCleanupError) {
    console.error('Error cleaning up patterned E2E employees:', patternCleanupError);
  }

  for (const fixture of E2E_EMPLOYEE_FIXTURES) {
    const { error } = await supabase
      .from('employees')
      .delete()
      .match(fixture);

    if (error) {
      console.error('Error cleaning up test employee fixture:', fixture, error);
    }
  }

  for (const dateId of uniqueTestDateIds) {
    const { error } = await supabase
      .from('important_dates')
      .delete()
      .eq('id', dateId);

    if (error) {
      console.error(`Error cleaning up E2E date ${dateId}:`, error);
    }
  }
}

/**
 * Reset capacity for a specific date
 * 
 * @param dateDescription - Date description to reset
 * @param maxSpots - Maximum spots to set
 */
export async function resetDateCapacity(dateDescription: string, maxSpots: number) {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('important_dates')
    .update({
      max_spots: maxSpots,
      remaining_spots: maxSpots,
    })
    .eq('date_description', dateDescription);

  if (error) {
    console.error(`Error resetting capacity for ${dateDescription}:`, error);
  }
}
