/**
 * E2E Test Seed Data
 * Story 11.7: End-to-End Critical User Journey Tests
 * 
 * Seed data scripts for E2E tests - creates test dates and cleans up test data
 */

import { createClient } from '@supabase/supabase-js';

function isLocalSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  } catch {
    return false;
  }
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
  
  // Create Stena Date with capacity (required field in form)
  // Use a date far in the future to ensure it's always available
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1); // 1 year from now
  const futureDateStr = futureDate.toISOString().split('T')[0];
  const futureYear = futureDate.getFullYear();
  
  const { data: stenaDate, error: stenaError } = await supabase
    .from('important_dates')
    .insert({
      category: 'Stena Dates',
      date_value: futureDateStr,
      date_description: `19-20 december ${futureYear}`,
      year: futureYear,
      max_spots: 20,
      remaining_spots: 20,
      is_active: true, // Ensure date is active
    })
    .select()
    .single();

  if (stenaError && !stenaError.message.includes('duplicate')) {
    console.error('Error seeding Stena date:', stenaError);
  }

  // Create ÖMC date with capacity (set to 3 so that after 1 assignment it becomes "almost-full")
  // ÖMC threshold is 3, so with max_spots: 3 and remaining_spots: 3, after 1 assignment
  // remaining_spots becomes 2, which is <= 3, triggering "almost-full" badge
  // Use a date far in the future to ensure it's always available
  const omcFutureDate = new Date();
  omcFutureDate.setFullYear(omcFutureDate.getFullYear() + 1); // 1 year from now
  const omcFutureDateStr = omcFutureDate.toISOString().split('T')[0];
  const omcFutureYear = omcFutureDate.getFullYear();
  
  const { data: omcDate, error: omcError } = await supabase
    .from('important_dates')
    .insert({
      category: 'ÖMC Dates',
      date_value: omcFutureDateStr,
      date_description: `8-9 mars ${omcFutureYear}`,
      year: omcFutureYear,
      max_spots: 3,
      remaining_spots: 3,
      is_active: true, // Ensure date is active
    })
    .select()
    .single();

  if (omcError && !omcError.message.includes('duplicate')) {
    console.error('Error seeding ÖMC date:', omcError);
  }

  // Create PE3 date with limited capacity
  const { data: pe3Date, error: pe3Error } = await supabase
    .from('important_dates')
    .insert({
      category: 'PE3 Dates',
      date_value: '2025-04-20',
      date_description: '20 april',
      year: 2025,
      max_spots: 1,
      remaining_spots: 1,
    })
    .select()
    .single();

  if (pe3Error && !pe3Error.message.includes('duplicate')) {
    console.error('Error seeding PE3 date:', pe3Error);
  }

  // Create ÖMC date with 2 spots (for capacity management test)
  const { data: limitedDate, error: limitedError } = await supabase
    .from('important_dates')
    .insert({
      category: 'ÖMC Dates',
      date_value: '2025-05-15',
      date_description: '15-16 maj',
      year: 2025,
      max_spots: 2,
      remaining_spots: 2,
    })
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
  
  // Delete test employees created by E2E flows. Keep this in sync with test fixtures.
  const { error: employeeError } = await supabase
    .from('employees')
    .delete()
    .or([
      'first_name.ilike.%Test%',
      'surname.ilike.%Test%',
      'first_name.ilike.%E2E%',
      'surname.ilike.%E2E%',
      'first_name.in.(Anna,Capacity,Concurrent,Prereq,Realtime,Room,Terminate)',
      'surname.in.(SyncTest,UserA,UserB)',
    ].join(','));

  if (employeeError) {
    console.error('Error cleaning up test employees:', employeeError);
  }

  // Delete test dates created by seedTestData.
  const { error: dateError } = await supabase
    .from('important_dates')
    .delete()
    .or([
      'date_description.ilike.%Test%',
      'date_description.ilike.%E2E%',
      'date_description.ilike.%19-20 december%',
      'date_description.ilike.%8-9 mars%',
      'date_description.ilike.%15-16 maj%',
      'date_description.eq.20 april',
    ].join(','));

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

