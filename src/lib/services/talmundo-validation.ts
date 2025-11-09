/**
 * Talmundo Field Validation Service
 * 
 * Business Rule: The Talmundo field represents completion status of the Talmundo 
 * external system integration. Talmundo can only be edited after the One field 
 * has been marked as complete for at least 24 hours.
 * 
 * This enforces the correct operational sequence and prevents data integrity issues
 * from premature editing during the Talmundo system synchronization period.
 * 
 * Dependencies:
 * - Story 8.3: One field time-based status logic (getOneFieldStatus)
 * - Story 8.2: One field as boolean completion tracker
 */

import { getOneFieldStatus } from './one-field-status';

/**
 * Determine if Talmundo field can be edited based on One field status.
 * 
 * Business Rule: Talmundo field requires One field to be true for >= 24 hours
 * before editing is allowed. This enforces the correct operational sequence
 * and prevents premature editing during the Talmundo system sync period.
 * 
 * @param oneValue - Current boolean value of the One field
 * @param oneMarkedAt - Timestamp when One was set to true (ISO 8601 format)
 * @returns true if Talmundo can be edited (One is green), false otherwise
 * 
 * @example
 * // One is false - Talmundo cannot be edited
 * canEditTalmundo(false, null) // Returns false
 * 
 * @example
 * // One is true but less than 24 hours elapsed (yellow status)
 * const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
 * canEditTalmundo(true, twelveHoursAgo) // Returns false
 * 
 * @example
 * // One is true and 24+ hours elapsed (green status)
 * const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
 * canEditTalmundo(true, twentyFiveHoursAgo) // Returns true
 * 
 * @example
 * // One is true but timestamp is missing (edge case)
 * canEditTalmundo(true, null) // Returns false
 */
export function canEditTalmundo(
  oneValue: boolean | null,
  oneMarkedAt: string | null
): boolean {
  // If One is not true, Talmundo cannot be edited
  if (!oneValue) {
    return false;
  }

  // If One is true but timestamp is missing, cannot edit (should be yellow but treat as not ready)
  if (!oneMarkedAt) {
    return false;
  }

  // Convert ISO string to Date object for getOneFieldStatus
  let markedAtDate: Date;
  try {
    markedAtDate = new Date(oneMarkedAt);
  } catch {
    // Invalid date format - cannot edit
    return false;
  }

  // Calculate One field status (yellow = pending, green = ready)
  const oneStatus = getOneFieldStatus(oneValue, markedAtDate);

  // Talmundo can only be edited when One field is green (24+ hours elapsed)
  return oneStatus === 'green';
}
