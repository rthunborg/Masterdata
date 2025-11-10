/**
 * PE3 Deadline Calculator Service
 * 
 * Calculates deadline dates for PE3 import batches based on business rules:
 * - Deadlines are based on the FIRST (earliest) date in the batch
 * - deadline_cancel = Monday of the week BEFORE the first date
 * - deadline_submit = Wednesday of the week BEFORE the first date
 * 
 * Handles edge cases like dates in the first week of the year.
 */

export interface PE3DeadlineCalculation {
  firstDate: string; // Earliest date in batch (ISO format YYYY-MM-DD)
  deadlineCancel: string; // Monday of week before first date (ISO format)
  deadlineSubmit: string; // Wednesday of week before first date (ISO format)
}

/**
 * Calculate deadline dates for PE3 import batch
 * 
 * @param dates - Array of ISO date strings (YYYY-MM-DD) from CSV import
 * @returns Object with deadline_cancel (Monday) and deadline_submit (Wednesday) of previous week
 * @throws Error if no dates provided
 */
export function calculatePE3Deadlines(dates: string[]): PE3DeadlineCalculation {
  if (!dates || dates.length === 0) {
    throw new Error('Cannot calculate deadlines: no dates provided');
  }

  // Filter out invalid dates and parse valid ones
  const parsedDates = dates
    .filter((d) => d && typeof d === 'string' && d.trim() !== '')
    .map((d) => {
      const date = new Date(d);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return null;
      }
      return date;
    })
    .filter((d): d is Date => d !== null);

  if (parsedDates.length === 0) {
    throw new Error('Cannot calculate deadlines: no valid dates provided');
  }

  // Find earliest date in batch
  const sortedDates = parsedDates.sort((a, b) => a.getTime() - b.getTime());
  const firstDate = sortedDates[0];

  // Find Monday of the week that contains firstDate
  const dayOfWeek = firstDate.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days; otherwise go back (dayOfWeek - 1) days
  const mondayOfFirstDateWeek = new Date(firstDate);
  mondayOfFirstDateWeek.setDate(mondayOfFirstDateWeek.getDate() - daysToMonday);

  // Go back 7 days from that Monday to get Monday of the previous week
  const monday = new Date(mondayOfFirstDateWeek);
  monday.setDate(monday.getDate() - 7);

  // Wednesday is Monday + 2 days
  const wednesday = new Date(monday);
  wednesday.setDate(wednesday.getDate() + 2);

  // Format as ISO date strings (YYYY-MM-DD)
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    firstDate: formatDate(firstDate),
    deadlineCancel: formatDate(monday),
    deadlineSubmit: formatDate(wednesday),
  };
}

/**
 * Validate calculated deadlines against business rules
 * 
 * @param deadlineSubmit - Submit deadline date (YYYY-MM-DD)
 * @param deadlineCancel - Cancel deadline date (YYYY-MM-DD)
 * @param firstDate - First PE3 date in batch (YYYY-MM-DD)
 * @returns Validation result with error message if invalid
 */
export function validatePE3Deadlines(
  deadlineSubmit: string,
  deadlineCancel: string,
  firstDate: string
): { valid: boolean; error?: string } {
  const submit = new Date(deadlineSubmit);
  const cancel = new Date(deadlineCancel);
  const first = new Date(firstDate);

  // Check for invalid dates
  if (isNaN(submit.getTime())) {
    return { valid: false, error: 'Invalid submit deadline date format' };
  }
  if (isNaN(cancel.getTime())) {
    return { valid: false, error: 'Invalid cancel deadline date format' };
  }
  if (isNaN(first.getTime())) {
    return { valid: false, error: 'Invalid first date format' };
  }

  // Business rule: deadline_submit <= deadline_cancel
  if (submit > cancel) {
    return {
      valid: false,
      error: 'Submit deadline must be before or equal to cancel deadline',
    };
  }

  // Business rule: deadline_cancel <= first_date
  if (cancel > first) {
    return {
      valid: false,
      error: 'Cancel deadline must be before or equal to the first PE3 date',
    };
  }

  return { valid: true };
}
