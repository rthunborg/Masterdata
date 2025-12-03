/**
 * Date Capacity Management Service
 * 
 * This service handles capacity tracking and validation for important dates.
 * It ensures that dates are not overbooked and provides atomic transaction support
 * for concurrent employee assignments.
 * 
 * Story: 8.7 - Important Dates Capacity Management
 * Story: 8.11 - Important Dates Deadline Columns (added deadline validation)
 */

import { isSubmissionOpen, isCancellationOpen } from '@/lib/utils/deadline-validator';
import type { SupabaseClient } from '@supabase/supabase-js';

// Lazy import client to avoid bundling issues when used in server-only modules
async function getClientClient(): Promise<SupabaseClient> {
  if (typeof window === 'undefined') {
    throw new Error('Cannot use client-side Supabase client in server context. Pass a server client instead.');
  }
  // Dynamic import to avoid bundling client code in server modules
  const { createClient } = await import('@/lib/supabase/client');
  return createClient();
}

/**
 * Get default max capacity for an important date based on its category.
 * 
 * Business rules:
 * - ÖMC Dates: 20 spots
 * - Stena Dates: 99 spots
 * - PE3 Dates: 1 spot
 * - Other: 99 spots (default)
 * 
 * @param category - Date category ("ÖMC Dates", "Stena Dates", "PE3 Dates", "Other")
 * @returns Default max capacity for the category
 */
export function getDefaultMaxCapacity(category: string): number {
  switch (category) {
    case 'ÖMC Dates':
      return 20;
    case 'Stena Dates':
      return 99;
    case 'PE3 Dates':
      return 1;
    default:
      return 99;
  }
}

/**
 * Atomically assign an employee to a date with capacity management.
 * 
 * Uses database transaction (via RPC function) to ensure concurrency safety and prevent overbooking.
 * The RPC function uses SELECT FOR UPDATE to lock date rows during the transaction.
 *
 * Transaction steps:
 * 1. Lock old and new date rows (SELECT FOR UPDATE)
 * 2. If old date exists, increment remaining_spots by 1 and remove from assigned_employees
 * 3. Decrement new date remaining_spots by 1 and add to assigned_employees
 * 4. Check constraint (remaining_spots >= 0)
 * 5. Update employee date field
 * 6. Commit or rollback on constraint violation
 *
 * @param employeeId - UUID of employee being assigned
 * @param newDateId - UUID of date to assign employee to
 * @param oldDateId - UUID of previous date (null if new assignment)
 * @param dateType - Type of date field ('omc_date', 'stena_date', 'pe3_date')
 * @param supabaseClient - Optional Supabase client (pass server-side client when calling from API routes)
 * @returns Success object with message
 * @throws Error if date is fully booked or transaction fails
 */
export async function assignEmployeeToDate(
  employeeId: string,
  newDateId: string,
  oldDateId: string | null,
  dateType: 'omc_date' | 'stena_date' | 'pe3_date',
  supabaseClient?: SupabaseClient | Promise<SupabaseClient>
): Promise<{ success: boolean; message: string }> {
  // Resolve the supabase client if it's a promise (server-side) or use directly (client-side)
  // Default to client-side for backward compatibility with tests and client components
  const supabase = supabaseClient 
    ? (supabaseClient instanceof Promise ? await supabaseClient : supabaseClient)
    : await getClientClient();

  // Story 8.11: Check deadline constraints before assignment
  if (newDateId) {
    const { data: newDate, error: dateError } = await supabase
      .from('important_dates')
      .select('deadline_submit, deadline_cancel')
      .eq('id', newDateId)
      .single();

    if (dateError) {
      console.log('Date Error Debug:', dateError, newDateId);
      throw new Error('Failed to fetch date information');
    }

    // Check if submission deadline has passed (new assignment not allowed)
    if (newDate && !isSubmissionOpen(newDate.deadline_submit)) {
      throw new Error(
        'Inlämningsdeadline har passerat för detta datum. Kan inte tilldela medarbetare.'
      );
    }
  }

  // Story 8.11: Check if cancellation deadline has passed when clearing assignment
  if (oldDateId && !newDateId) {
    const { data: oldDate, error: oldDateError } = await supabase
      .from('important_dates')
      .select('deadline_cancel')
      .eq('id', oldDateId)
      .single();

    if (oldDateError) {
      throw new Error('Failed to fetch previous date information');
    }

    // Check if cancellation deadline has passed (unassignment not allowed)
    if (oldDate && !isCancellationOpen(oldDate.deadline_cancel)) {
      throw new Error(
        'Avbokningsdeadline har passerat. Kan inte ta bort tilldelning.'
      );
    }
  }

  // Query employee details for assigned_employees array
  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('id, first_name, surname, email')
    .eq('id', employeeId)
    .single();

  if (employeeError || !employee) {
    throw new Error('Employee not found');
  }

  // Build employee data object for JSONB array
  // Note: room_number is set to null since room_number_shared column doesn't exist yet
  const employeeData = {
    id: employee.id,
    name: `${employee.first_name} ${employee.surname}`,
    email: employee.email,
    room_number: null,
  };

  // Use Supabase RPC function for atomic transaction with row-level locking
  // This function now handles both capacity AND assigned_employees array
  const { error } = await supabase.rpc('update_date_spots', {
    employee_id: employeeId,
    new_date_id: newDateId,
    old_date_id: oldDateId,
    date_type: dateType,
    employee_data: employeeData,
  });

  if (error) {
    // Check for capacity-specific errors
    if (error.message.includes('No remaining spots')) {
      throw new Error(
        `Cannot assign employee - date is fully booked (0 spots remaining)`
      );
    }
    
    // Check for constraint violations
    if (error.message.includes('remaining_spots_check')) {
      throw new Error(
        'Cannot assign employee - date capacity would be exceeded'
      );
    }
    
    // Generic error
    console.error('Error assigning employee to date:', error);
    throw new Error(`Failed to assign employee to date: ${error.message}`);
  }

  return { 
    success: true, 
    message: 'Employee assigned successfully' 
  };
}

