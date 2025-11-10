/**
 * Termination Workflow Service
 *
 * Manages employee termination and reactivation workflows including
 * repayment tracking, date clearing, and capacity management.
 *
 * Story 8.13: Repayment tracking
 * Story 8.14: Date clearing with spot management
 */

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
      dates?.find((d) => d.id === repaymentDates.omc)?.date_value ?? null;
    pe3DateValue =
      dates?.find((d) => d.id === repaymentDates.pe3)?.date_value ?? null;
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

  // Audit log
  console.log(
    `[Repayment Capture] Employee ${employeeId}: ÖMC=${omcDateValue}, PE3=${pe3DateValue}`
  );
}

/**
 * Restore repayment dates when reactivating employee.
 *
 * Attempts to restore omc_date and pe3_date from repayment fields if spots are available.
 * If spots unavailable, leaves repayment fields set and returns warnings.
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
    .select('id, repayment_needed_omc, repayment_needed_pe3')
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
      const { data: omcDate } = await supabase
        .from('important_dates')
        .select('id, date_description, remaining_spots')
        .eq('date_value', employee.repayment_needed_omc)
        .eq('category', 'ÖMC Dates')
        .single();

      if (omcDate && omcDate.remaining_spots > 0) {
        // Restore date assignment
        await assignEmployeeToDate(employeeId, omcDate.id, null, 'omc_date');

        // Clear repayment field
        await supabase
          .from('employees')
          .update({ repayment_needed_omc: null })
          .eq('id', employeeId);

        restored.omc = true;
        console.log(
          `[Reactivation] Restored ÖMC date for employee ${employeeId}`
        );
      } else {
        warnings.push(
          `Cannot restore ÖMC Date ${omcDate?.date_description ?? employee.repayment_needed_omc} - currently fully booked (0 spots remaining)`
        );
      }
    } catch (error) {
      console.error('Error restoring ÖMC date:', error);
      warnings.push(`Failed to restore ÖMC date: ${error}`);
    }
  }

  // Attempt to restore PE3 date
  if (employee.repayment_needed_pe3) {
    try {
      // Find date ID by date_value
      const { data: pe3Date } = await supabase
        .from('important_dates')
        .select('id, date_description, remaining_spots')
        .eq('date_value', employee.repayment_needed_pe3)
        .eq('category', 'PE3 Dates')
        .single();

      if (pe3Date && pe3Date.remaining_spots > 0) {
        // Restore date assignment
        await assignEmployeeToDate(employeeId, pe3Date.id, null, 'pe3_date');

        // Clear repayment field
        await supabase
          .from('employees')
          .update({ repayment_needed_pe3: null })
          .eq('id', employeeId);

        restored.pe3 = true;
        console.log(
          `[Reactivation] Restored PE3 date for employee ${employeeId}`
        );
      } else {
        warnings.push(
          `Cannot restore PE3 Date ${pe3Date?.date_description ?? employee.repayment_needed_pe3} - currently fully booked (0 spots remaining)`
        );
      }
    } catch (error) {
      console.error('Error restoring PE3 date:', error);
      warnings.push(`Failed to restore PE3 date: ${error}`);
    }
  }

  return { restored, warnings };
}
