/**
 * Calculate the ISO week number for a given date.
 * ISO 8601 week date system:
 * - Week 1 is the first week with a Thursday in the new year
 * - Weeks start on Monday
 * 
 * @param date - The date to calculate the week number for
 * @returns The ISO week number (1-53)
 */
export function getISOWeek(date: Date): number {
  // Create a copy to avoid mutating the original date
  const target = new Date(date.valueOf());
  
  // Get day of week (0 = Sunday, 6 = Saturday), convert to ISO (0 = Monday, 6 = Sunday)
  const dayNr = (date.getDay() + 6) % 7;
  
  // Set to nearest Thursday (current date + 4 - current day number)
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  
  // Set to January 1st of the year
  target.setMonth(0, 1);
  
  // If Jan 1st is not a Thursday, find the first Thursday
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  
  // Calculate week number: (days between first Thursday and target Thursday) / 7 + 1
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

/**
 * Parse a date string in ISO format (YYYY-MM-DD) and return the ISO week number.
 * 
 * @param dateString - The date string in YYYY-MM-DD format
 * @returns The ISO week number or null if the date is invalid
 */
export function getWeekNumberFromDateString(dateString: string): number | null {
  // Validate ISO date format (YYYY-MM-DD)
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoDateRegex.test(dateString)) {
    return null;
  }
  
  const date = new Date(dateString);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    return null;
  }
  
  return getISOWeek(date);
}
