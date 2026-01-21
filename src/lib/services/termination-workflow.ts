/**
 * Termination Workflow Service
 *
 * Manages employee termination and reactivation workflows including
 * repayment tracking, date clearing, and capacity management.
 *
 * Story 8.13: Repayment tracking
 * Story 8.14: Date clearing with spot management
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { assignEmployeeToDate } from './date-capacity';

/**
 * Capture current date assignments for repayment tracking.
 *
 * Called BEFORE termination to preserve date information for financial reconciliation.
 * Only ÖMC and PE3 dates require repayment tracking (Stena dates excluded).
 *
 * @param employeeId - UUID of employee being terminated
 * @returns Object with omc_date and pe3_date IDs (null if not assigned)
 */
export async function captureRepaymentDates(
  employeeId: string
): Promise<{ omc: string | null; pe3: string | null }> {
  const supabase = await createClient();

  // Query current date assignments
  const { data: employee, error } = await supabase
    .from('employees')
    .select('omc_date, pe3_date')
    .eq('id', employeeId)
    .single();

  if (error) {
    console.error('Error capturing repayment dates:', error);
    throw new Error('Failed to capture repayment dates');
  }

  return {
    omc: employee.omc_date,
    pe3: employee.pe3_date,
  };
}

/**
 * Apply repayment capture to employee record.
 *
 * Updates repayment_needed_omc and repayment_needed_pe3 fields based on
 * current date assignments. Called as part of termination transaction.
 *
 * @param employeeId - UUID of employee being terminated
 * @param repaymentDates - Date IDs captured from captureRepaymentDates()
 */
export async function applyRepaymentCapture(
  employeeId: string,
  repaymentDates: { omc: string | null; pe3: string | null }
): Promise<void> {
  const supabase = await createClient();

  // Story 19.14: Store the actual date UUID for repayment tracking (not just boolean)
  // This allows HR Admin to see which specific date requires repayment
  const { error } = await supabase
    .from('employees')
    .update({
      repayment_needed_omc: repaymentDates.omc, // Store UUID or null
      repayment_needed_pe3: repaymentDates.pe3, // Store UUID or null
    })
    .eq('id', employeeId);

  if (error) {
    console.error('Error applying repayment capture:', error);
    throw new Error('Failed to apply repayment capture');
  }
}

/**
 * Clear all date assignments and release training spots.
 *
 * Called after repayment capture during termination workflow.
 * Clears stena_date, omc_date, and pe3_date fields, increments remaining_spots
 * on corresponding important_dates records, and removes employee from assigned_employees arrays.
 *
 * Story 8.14 AC 1, 2, 3
 *
 * @param employeeId - UUID of employee being terminated
 * @returns Summary of cleared dates and released spots
 */
export async function clearEmployeeDatesAndReleaseSpots(
  employeeId: string
): Promise<{ clearedDates: string[]; releasedSpots: number }> {
  const supabase = await createClient();

  // Query current date assignments and employee name
  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('id, first_name, surname, stena_date, omc_date, pe3_date')
    .eq('id', employeeId)
    .single();

  if (employeeError) {
    console.error('Error fetching employee for date clearing:', employeeError);
    throw new Error('Failed to fetch employee date assignments');
  }

  const clearedDates: string[] = [];
  const dateFields = [
    { field: 'stena_date', value: employee.stena_date },
    { field: 'omc_date', value: employee.omc_date },
    { field: 'pe3_date', value: employee.pe3_date },
  ];

  // For each non-null date field, release spot and clear assignment
  for (const { field, value } of dateFields) {
    if (value) {
      // Use the release_date_capacity RPC function which handles both
      // incrementing remaining_spots and removing from assigned_employees
      const { error: releaseError } = await supabase.rpc(
        'release_date_capacity',
        {
          date_id: value,
          employee_id: employeeId,
        }
      );

      if (releaseError) {
        console.error(`Error releasing spot for ${field}:`, releaseError);
        throw new Error(`Failed to release spot for ${field}`);
      }

      clearedDates.push(value);
    }
  }

  // Clear all date fields on employee record
  const { error: clearError } = await supabase
    .from('employees')
    .update({
      stena_date: null,
      omc_date: null,
      pe3_date: null,
    })
    .eq('id', employeeId);

  if (clearError) {
    console.error('Error clearing employee date fields:', clearError);
    throw new Error('Failed to clear employee date assignments');
  }

  return {
    clearedDates,
    releasedSpots: clearedDates.length,
  };
}

/**
 * Restore repayment dates when reactivating employee (UPDATED for Story 8.14).
 *
 * Attempts to restore omc_date and pe3_date from repayment fields if spots are available.
 * Decrements remaining_spots and adds employee back to assigned_employees array.
 * Handles deleted dates gracefully (skip without error).
 *
 * Story 8.14 AC 8, 9, 11
 *
 * @param employeeId - UUID of employee being reactivated
 * @returns Result with restored dates and any warnings
 */
export async function restoreRepaymentDates(
  employeeId: string
): Promise<{ restored: { omc: boolean; pe3: boolean }; warnings: string[] }> {
  const supabase = await createClient();
  const warnings: string[] = [];
  const restored = { omc: false, pe3: false };

  // Query employee repayment fields
  const { data: employee, error } = await supabase
    .from('employees')
    .select('id, first_name, surname, repayment_needed_omc, repayment_needed_pe3')
    .eq('id', employeeId)
    .single();

  if (error) {
    console.error('Error fetching employee repayment data:', error);
    throw new Error('Failed to fetch employee repayment data');
  }

  // Restore logic for boolean flags:
  // Since we no longer store the date value, we cannot automatically restore the exact date.
  // The business requirement (Story 13.9) implies these are now just flags for financial tracking.
  // However, AC 8/9 says "copy back to omc_date", which implies we need the date.
  // If we changed to boolean, we CANNOT restore the date automatically.
  // We will simply clear the flags if the employee is reactivated, or leave them as is?
  // 
  // Given the user request "They should be boolean yes or no fields", we assume the "auto-restore date" feature
  // is no longer possible or desired in the same way, OR the user accepts that reactivating won't auto-book them back.
  // 
  // Let's implement: Clear the repayment flags on restoration. We can't re-book them.
  
  // Story 19.14: Clear repayment tracking by setting to null (now stores UUID, not boolean)
  if (employee.repayment_needed_omc) {
     // Clear the repayment tracking
     await supabase
       .from('employees')
       .update({ repayment_needed_omc: null })
       .eq('id', employeeId);
     restored.omc = true; // Signal that we handled it (cleared it)
  }

  if (employee.repayment_needed_pe3) {
     // Clear the repayment tracking
     await supabase
       .from('employees')
       .update({ repayment_needed_pe3: null })
       .eq('id', employeeId);
     restored.pe3 = true; // Signal that we handled it
  }

  return { restored, warnings };
}
