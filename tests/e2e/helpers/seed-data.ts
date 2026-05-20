/**
 * E2E Test Seed Data
 * Story 11.7: End-to-End Critical User Journey Tests
 * 
 * Seed data scripts for E2E tests - creates test dates and cleans up test data
 */

import { createClient } from '@supabase/supabase-js';

const E2E_SEED_MARKER = 'E2E seed data';

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

function isLocalSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^\[(.*)\]$/, '$1');
    return ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(hostname);
  } catch {
    return false;
  }
}

function getSeedDateFixtures() {
  const stenaFutureDate = new Date();
  stenaFutureDate.setFullYear(stenaFutureDate.getFullYear() + 1);
  const stenaFutureDateStr = stenaFutureDate.toISOString().split('T')[0];
  const stenaFutureYear = stenaFutureDate.getFullYear();

  const omcFutureDate = new Date();
  omcFutureDate.setFullYear(omcFutureDate.getFullYear() + 1);
  const omcFutureDateStr = omcFutureDate.toISOString().split('T')[0];
  const omcFutureYear = omcFutureDate.getFullYear();

  return {
    stena: {
      category: 'Stena Dates',
      date_value: stenaFutureDateStr,
      date_description: `19-20 december ${stenaFutureYear}`,
      year: stenaFutureYear,
      max_spots: 20,
      remaining_spots: 20,
      is_active: true,
      notes: E2E_SEED_MARKER,
    },
    omc: {
      category: 'ÖMC Dates',
      date_value: omcFutureDateStr,
      date_description: `8-9 mars ${omcFutureYear}`,
      year: omcFutureYear,
      max_spots: 3,
      remaining_spots: 3,
      is_active: true,
      notes: E2E_SEED_MARKER,
    },
    pe3: {
      category: 'PE3 Dates',
      date_value: '2025-04-20',
      date_description: '20 april',
      year: 2025,
      max_spots: 1,
      remaining_spots: 1,
      notes: E2E_SEED_MARKER,
    },
    limitedOmc: {
      category: 'ÖMC Dates',
      date_value: '2025-05-15',
      date_description: '15-16 maj',
      year: 2025,
      max_spots: 2,
      remaining_spots: 2,
      notes: E2E_SEED_MARKER,
    },
  };
}

export function assertSafeE2EDatabase() {
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
 * Seed test data for E2E tests
 * Creates important dates with known capacity for testing
 */
export async function seedTestData() {
  const supabase = getSupabaseClient();
  const fixtures = getSeedDateFixtures();

  // Create Stena Date with capacity (required field in form)
  // Use a date far in the future to ensure it's always available
  const { data: stenaDate, error: stenaError } = await supabase
    .from('important_dates')
    .insert(fixtures.stena)
    .select()
    .single();

  if (stenaError && !stenaError.message.includes('duplicate')) {
    console.error('Error seeding Stena date:', stenaError);
  }

  // Create ÖMC date with capacity (set to 3 so that after 1 assignment it becomes "almost-full")
  // ÖMC threshold is 3, so with max_spots: 3 and remaining_spots: 3, after 1 assignment
  // remaining_spots becomes 2, which is <= 3, triggering "almost-full" badge
  // Use a date far in the future to ensure it's always available
  const { data: omcDate, error: omcError } = await supabase
    .from('important_dates')
    .insert(fixtures.omc)
    .select()
    .single();

  if (omcError && !omcError.message.includes('duplicate')) {
    console.error('Error seeding ÖMC date:', omcError);
  }

  // Create PE3 date with limited capacity
  const { data: pe3Date, error: pe3Error } = await supabase
    .from('important_dates')
    .insert(fixtures.pe3)
    .select()
    .single();

  if (pe3Error && !pe3Error.message.includes('duplicate')) {
    console.error('Error seeding PE3 date:', pe3Error);
  }

  // Create ÖMC date with 2 spots (for capacity management test)
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
  
  // Delete test employees created by E2E flows. Keep this scoped to known fixtures.
  for (const fixture of E2E_EMPLOYEE_FIXTURES) {
    const { error } = await supabase
      .from('employees')
      .delete()
      .match(fixture);

    if (error) {
      console.error('Error cleaning up test employee fixture:', fixture, error);
    }
  }

  // Delete test dates created by seedTestData. The notes marker is added only by these fixtures.
  const { error: dateError } = await supabase
    .from('important_dates')
    .delete()
    .eq('notes', E2E_SEED_MARKER);

  if (dateError) {
    console.error('Error cleaning up test dates:', dateError);
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

