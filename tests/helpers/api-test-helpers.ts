/**
 * API Test Helpers
 * 
 * Utilities for integration testing of API routes.
 * Provides helpers for making authenticated requests, error assertions,
 * real-time subscriptions, and test data cleanup.
 * 
 * Story: 11.6 - Integration Tests for API Routes
 */

import { getAuthenticatedClient, type TestUserRole } from '../utils/auth-test-helper';
import { createClient } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { validateNonProductionSupabaseEnvironment } from '@/lib/env/non-production-supabase-guard';

validateNonProductionSupabaseEnvironment();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface APIResponse<T = unknown> {
  status: number;
  body: T;
}

/**
 * Make an authenticated API request
 * 
 * @param method - HTTP method (GET, POST, PATCH, DELETE)
 * @param endpoint - API endpoint path (e.g., '/api/employees')
 * @param body - Request body (optional)
 * @param userRole - User role for authentication (default: 'hrAdmin')
 * @returns Response with status and parsed JSON body
 */
export async function makeAPIRequest<T = unknown>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  endpoint: string,
  body?: unknown,
  userRole: TestUserRole = 'hrAdmin'
): Promise<APIResponse<T>> {
  const client = await getAuthenticatedClient(userRole);
  
  let response: Response;
  
  switch (method) {
    case 'GET':
      response = await client.get(endpoint);
      break;
    case 'POST':
      response = await client.post(endpoint, body);
      break;
    case 'PATCH':
      response = await client.post(endpoint, body, { method: 'PATCH' });
      break;
    case 'DELETE':
      response = await client.delete(endpoint);
      break;
  }
  
  const responseBody = await response.json().catch(() => ({}));
  
  return {
    status: response.status,
    body: responseBody as T,
  };
}

/**
 * Assert API error response
 * 
 * @param response - API response from makeAPIRequest
 * @param expectedStatus - Expected HTTP status code
 * @param messageContains - String that should be in error message (optional)
 */
export function expectAPIError(
  response: APIResponse<{ error?: { code?: string; message?: string } }>,
  expectedStatus: number,
  messageContains?: string
): void {
  expect(response.status).toBe(expectedStatus);
  
  if (messageContains && response.body.error?.message) {
    expect(response.body.error.message).toContain(messageContains);
  }
}

/**
 * Setup real-time subscription for testing
 * 
 * @param table - Database table name
 * @param callback - Callback function for received events
 * @returns Subscription channel (call unsubscribe() to cleanup)
 */
export function setupRealTimeSubscription(
  table: string,
  callback: (payload: unknown) => void
): RealtimeChannel {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  const channel = supabase
    .channel(`test-${table}-${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();
  
  return channel;
}

/**
 * Cleanup test data created during tests
 * 
 * Removes test employees and important dates created during test execution.
 * Uses pattern matching on test data identifiers.
 */
export async function cleanupTestData(): Promise<void> {
  const supabase = createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey
  );
  
  // Delete test employees (those with test prefixes in names)
  await supabase
    .from('employees')
    .delete()
    .or('first_name.ilike.Test%,first_name.ilike.Integration%');
  
  // Delete test important dates
  await supabase
    .from('important_dates')
    .delete()
    .or('date_description.ilike.Test%,date_description.ilike.Integration%');
}

/**
 * Wait for a condition with timeout
 * 
 * @param condition - Function that returns true when condition is met
 * @param timeout - Maximum wait time in milliseconds (default: 2000)
 * @param interval - Check interval in milliseconds (default: 100)
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 2000, interval = 100 } = options;
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Create a test employee data object
 */
export function createTestEmployeeData(overrides: Partial<{
  first_name: string;
  surname: string;
  ssn: string;
  email: string;
  rank: string;
  gender: string;
  hire_date: string;
  omc_date: string | null;
  pe3_date: string | null;
}> = {}): {
  first_name: string;
  surname: string;
  ssn: string;
  email: string;
  rank: string;
  gender: string;
  hire_date: string;
  omc_date: string | null;
  pe3_date: string | null;
} {
  const timestamp = Date.now();
  return {
    first_name: `Test${timestamp}`,
    surname: 'Integration',
    ssn: `900101-${String(timestamp).slice(-4)}`,
    email: `test${timestamp}@example.com`,
    rank: 'SEV',
    gender: 'Man',
    hire_date: '2024-01-01',
    omc_date: null,
    pe3_date: null,
    ...overrides,
  };
}

/**
 * Create a test important date data object
 */
export function createTestDateData(overrides: Partial<{
  week_number: number | null;
  year: number;
  category: string;
  date_description: string;
  date_value: string;
  max_spots: number;
  remaining_spots: number;
}> = {}): {
  week_number: number | null;
  year: number;
  category: string;
  date_description: string;
  date_value: string;
  max_spots: number;
  remaining_spots: number;
} {
  const timestamp = Date.now();
  return {
    week_number: 10,
    year: 2025,
    category: 'Stena Dates',
    date_description: `Test Date ${timestamp}`,
    date_value: '15/3',
    max_spots: 10,
    remaining_spots: 10,
    ...overrides,
  };
}

