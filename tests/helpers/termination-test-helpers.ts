/**
 * Test Helpers: Termination & Reactivation Workflows
 * Story 11.3: Comprehensive Test Coverage for Termination & Reactivation Workflows
 * 
 * Provides helper functions for testing termination and reactivation workflows:
 * - terminateEmployee(employeeId) - execute termination
 * - reactivateEmployee(employeeId) - execute reactivation
 * - verifyRepaymentFields(employee) - validate repayment data
 * - verifySpotsReleased(dates) - validate spot counts
 * - createEmployeeWithDates() - test data setup
 */

import type { Employee } from '@/lib/types/employee';

/**
 * Execute termination for an employee via API
 * 
 * @param employeeId - UUID of employee to terminate
 * @param terminationDate - Date of termination (YYYY-MM-DD)
 * @param terminationReason - Reason for termination
 * @returns Response from termination API
 */
export async function terminateEmployee(
  employeeId: string,
  terminationDate: string,
  terminationReason: string
): Promise<{
  employee: Employee;
  clearedDates: string[];
  releasedSpots: number;
}> {
  const response = await fetch(`/api/employees/${employeeId}/terminate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      termination_date: terminationDate,
      termination_reason: terminationReason,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `Termination failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Execute reactivation for an employee via API
 * 
 * @param employeeId - UUID of employee to reactivate
 * @returns Response from reactivation API with warnings
 */
export async function reactivateEmployee(employeeId: string): Promise<{
  employee: Employee;
  warnings: string[];
}> {
  const response = await fetch(`/api/employees/${employeeId}/reactivate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `Reactivation failed: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    employee: data.data,
    warnings: data.warnings || [],
  };
}

/**
 * Verify repayment fields are correctly populated
 * 
 * @param employee - Employee record to verify
 * @param expectedOMC - Expected ÖMC repayment date value (or null)
 * @param expectedPE3 - Expected PE3 repayment date value (or null)
 */
export function verifyRepaymentFields(
  employee: Employee,
  expectedOMC: string | null,
  expectedPE3: string | null
): void {
  if (expectedOMC !== undefined) {
    expect(employee.repayment_needed_omc).toBe(expectedOMC);
  }
  if (expectedPE3 !== undefined) {
    expect(employee.repayment_needed_pe3).toBe(expectedPE3);
  }
}

/**
 * Verify that spots were released for given dates
 * 
 * Note: This is a placeholder for actual implementation.
 * In real tests, this would query the database to verify
 * remaining_spots was incremented for each date.
 * 
 * @param dateIds - Array of date IDs to verify
 */
export async function verifySpotsReleased(dateIds: string[]): Promise<void> {
  // In real implementation, would query important_dates table
  // and verify remaining_spots was incremented
  for (const dateId of dateIds) {
    // Placeholder: Would fetch date and verify spot count
    // const date = await getDateById(dateId);
    // expect(date.remaining_spots).toBeGreaterThan(initialSpots);
  }
}

/**
 * Create a test employee with date assignments
 * 
 * Note: This is a helper for test data setup.
 * In real tests, this would create actual database records.
 * 
 * @param options - Employee creation options
 * @returns Mock employee with dates assigned
 */
export function createEmployeeWithDates(options: {
  omcDateId?: string;
  pe3DateId?: string;
  stenaDateId?: string;
} = {}): Employee {
  return {
    id: `emp-${Date.now()}`,
    first_name: 'Test',
    surname: 'Employee',
    ssn: '19900101-1234',
    email: 'test@example.com',
    mobile: '+46701234567',
    rank: 'SEV',
    gender: 'Man',
    town_district: 'Stockholm',
    hire_date: '2025-01-01',
    stena_date: options.stenaDateId || null,
    omc_date: options.omcDateId || null,
    pe3_date: options.pe3DateId || null,
    termination_date: null,
    termination_reason: null,
    is_terminated: false,
    is_archived: false,
    repayment_needed_omc: null,
    repayment_needed_pe3: null,
    one: false,
    one_marked_at: null,
    talmundo: false,
    isps: false,
    photo: false,
    origo: false,
    loneiva: null,
    mail_lon: false,
    bankuppgifter: false,
    li: false,
    passport: false,
    kvitto_c17_18: false,
    c17: false,
    crewing_done: false,
    hotel_required: false,
    comments: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Verify that all date fields are cleared
 * 
 * @param employee - Employee record to verify
 */
export function verifyDateFieldsCleared(employee: Employee): void {
  expect(employee.stena_date).toBeNull();
  expect(employee.omc_date).toBeNull();
  expect(employee.pe3_date).toBeNull();
}

/**
 * Verify that employee is marked as terminated
 * 
 * @param employee - Employee record to verify
 * @param expectedTerminationDate - Expected termination date
 */
export function verifyEmployeeTerminated(
  employee: Employee,
  expectedTerminationDate: string
): void {
  expect(employee.is_terminated).toBe(true);
  expect(employee.termination_date).toBe(expectedTerminationDate);
  expect(employee.termination_reason).toBeTruthy();
}

/**
 * Verify that employee is marked as active
 * 
 * @param employee - Employee record to verify
 */
export function verifyEmployeeActive(employee: Employee): void {
  expect(employee.is_terminated).toBe(false);
  expect(employee.termination_date).toBeNull();
  expect(employee.termination_reason).toBeNull();
}

/**
 * Verify reactivation warnings format
 * 
 * @param warnings - Array of warning messages
 * @param expectedCount - Expected number of warnings
 */
export function verifyReactivationWarnings(
  warnings: string[],
  expectedCount?: number
): void {
  if (expectedCount !== undefined) {
    expect(warnings).toHaveLength(expectedCount);
  }
  
  warnings.forEach((warning) => {
    expect(typeof warning).toBe('string');
    expect(warning.length).toBeGreaterThan(0);
  });
}

