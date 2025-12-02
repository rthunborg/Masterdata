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

  // Fetch actual date values from important_dates table
  const dateIds = [repaymentDates.omc, repaymentDates.pe3].filter(
    Boolean
  ) as string[];
  
  let omcDateValue = null;
  let pe3DateValue = null;
  
  if (dateIds.length > 0) {
    const { data: dates } = await supabase
      .from('important_dates')
      .select('id, date_value')
      .in('id', dateIds);

    omcDateValue =
      dates?.find((d: { id: string; date_value: string }) => d.id === repaymentDates.omc)?.date_value ?? null;
    pe3DateValue =
      dates?.find((d: { id: string; date_value: string }) => d.id === repaymentDates.pe3)?.date_value ?? null;
  }

  // Update employee with repayment dates
  const { error } = await supabase
    .from('employees')
    .update({
      repayment_needed_omc: omcDateValue,
      repayment_needed_pe3: pe3DateValue,
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

  // Attempt to restore ÖMC date
  if (employee.repayment_needed_omc) {
    try {
      // Find date ID by date_value
      const { data: omcDate, error: dateError } = await supabase
        .from('important_dates')
        .select('id, date_description, remaining_spots')
        .eq('date_value', employee.repayment_needed_omc)
        .eq('category', 'ÖMC Dates')
        .single();

      // Story 8.14 AC 11: Handle deleted dates gracefully
      if (dateError && dateError.code === 'PGRST116') {
        warnings.push(
          `ÖMC Date ${employee.repayment_needed_omc} no longer exists, could not restore`
        );
      } else if (omcDate && omcDate.remaining_spots > 0) {
        // Restore date assignment (assignEmployeeToDate handles spot decrement and assigned_employees)
        // Pass server-side supabase client to avoid webpack bundling issues
        await assignEmployeeToDate(employeeId, omcDate.id, null, 'omc_date', supabase);

        // Clear repayment field
        await supabase
          .from('employees')
          .update({ repayment_needed_omc: null })
          .eq('id', employeeId);

        restored.omc = true;
      } else if (omcDate) {
        warnings.push(
          `Cannot restore ÖMC Date ${omcDate.date_description} - currently fully booked (0 spots remaining)`
        );
      }
    } catch (error) {
      console.error('Error restoring ÖMC date:', error);
      warnings.push(`Failed to restore ÖMC date: ${error}`);
    }
  }

  // Attempt to restore PE3 date (same logic as ÖMC)
  if (employee.repayment_needed_pe3) {
    try {
      // Find date ID by date_value
      const { data: pe3Date, error: dateError } = await supabase
        .from('important_dates')
        .select('id, date_description, remaining_spots')
        .eq('date_value', employee.repayment_needed_pe3)
        .eq('category', 'PE3 Dates')
        .single();

      // Story 8.14 AC 11: Handle deleted dates gracefully
      if (dateError && dateError.code === 'PGRST116') {
        warnings.push(
          `PE3 Date ${employee.repayment_needed_pe3} no longer exists, could not restore`
        );
      } else if (pe3Date && pe3Date.remaining_spots > 0) {
        // Restore date assignment
        // Pass server-side supabase client to avoid webpack bundling issues
        await assignEmployeeToDate(employeeId, pe3Date.id, null, 'pe3_date', supabase);

        // Clear repayment field
        await supabase
          .from('employees')
          .update({ repayment_needed_pe3: null })
          .eq('id', employeeId);

        restored.pe3 = true;
      } else if (pe3Date) {
        warnings.push(
          `Cannot restore PE3 Date ${pe3Date.date_description} - currently fully booked (0 spots remaining)`
        );
      }
    } catch (error) {
      console.error('Error restoring PE3 date:', error);
      warnings.push(`Failed to restore PE3 date: ${error}`);
    }
  }

  return { restored, warnings };
}
