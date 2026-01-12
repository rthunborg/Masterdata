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

/**
 * Get the default year for date creation.
 * Returns current year, or next year if we're in the last 3 months (October, November, December).
 * 
 * @returns The default year to use for new dates
 */
export function getDefaultYear(): number {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11, so add 1 for 1-12
  const currentYear = now.getFullYear();
  
  // If we're in October (10), November (11), or December (12), use next year
  if (currentMonth >= 10) {
    return currentYear + 1;
  }
  
  return currentYear;
}

/**
 * Parse a pasted date string and convert it to ISO format (YYYY-MM-DD).
 * Supports various date formats commonly used:
 * - YYYY-MM-DD (ISO format)
 * - DD/MM/YYYY or DD-MM-YYYY
 * - DD.MM.YYYY
 * - YYYY/MM/DD
 * - DD MMM YYYY (e.g., "15 Mar 2025")
 * 
 * @param pastedText - The pasted text to parse
 * @returns The date in ISO format (YYYY-MM-DD) or null if parsing fails
 */
export function parsePastedDate(pastedText: string): string | null {
  if (!pastedText || typeof pastedText !== 'string') {
    return null;
  }

  const trimmed = pastedText.trim();
  
  // Already in ISO format (YYYY-MM-DD)
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (isoRegex.test(trimmed)) {
    // Validate the date
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return trimmed;
    }
  }

  // Try DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const ddmmyyyyRegex = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/;
  const ddmmyyyyMatch = trimmed.match(ddmmyyyyRegex);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    
    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
      const date = new Date(yearNum, monthNum - 1, dayNum);
      if (date.getFullYear() === yearNum && date.getMonth() === monthNum - 1 && date.getDate() === dayNum) {
        return `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      }
    }
  }

  // Try YYYY/MM/DD or YYYY-MM-DD (already handled above, but check for alternative separators)
  const yyyymmddRegex = /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/;
  const yyyymmddMatch = trimmed.match(yyyymmddRegex);
  if (yyyymmddMatch) {
    const [, year, month, day] = yyyymmddMatch;
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);
    
    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
      const date = new Date(yearNum, monthNum - 1, dayNum);
      if (date.getFullYear() === yearNum && date.getMonth() === monthNum - 1 && date.getDate() === dayNum) {
        return `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      }
    }
  }

  // Try parsing with Date constructor (handles many formats)
  const parsedDate = new Date(trimmed);
  if (!isNaN(parsedDate.getTime())) {
    // Check if it's a reasonable date (not too far in past/future)
    const year = parsedDate.getFullYear();
    if (year >= 1900 && year <= 2100) {
      const month = parsedDate.getMonth() + 1;
      const day = parsedDate.getDate();
      
      // Verify the parsed date components are valid by reconstructing the date
      // This avoids timezone issues when comparing timestamps
      const reconstructedDate = new Date(year, month - 1, day);
      if (
        reconstructedDate.getFullYear() === year &&
        reconstructedDate.getMonth() === month - 1 &&
        reconstructedDate.getDate() === day
      ) {
        const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return isoDate;
      }
    }
  }

  return null;
}
