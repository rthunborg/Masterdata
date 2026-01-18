/**
 * ÖMC Date Formatting Utilities
 * 
 * ÖMC training dates are two-day events (consecutive days).
 * Database stores only the start date as ISO string (YYYY-MM-DD).
 * End date is implicitly start date + 1 day.
 * 
 * This module provides formatting, parsing, and validation for ÖMC two-day date ranges.
 */

/**
 * Format ÖMC date as two-day range (e.g., "08-03 - 09-03" in dd-MM format).
 * 
 * @param startDate - Start date (ISO string or Date object)
 * @returns Formatted two-day range string in "dd-MM - dd-MM" format
 * 
 * @example
 * formatOMCDate('2025-03-08') // Returns "08-03 - 09-03"
 * formatOMCDate(new Date(2025, 2, 8)) // Returns "08-03 - 09-03"
 */
export function formatOMCDate(startDate: Date | string): string {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  
  // Validate date
  if (isNaN(start.getTime())) {
    return 'Invalid Date';
  }
  
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  // Format both dates as dd-MM
  const startDay = String(start.getDate()).padStart(2, '0');
  const startMonth = String(start.getMonth() + 1).padStart(2, '0');
  const endDay = String(end.getDate()).padStart(2, '0');
  const endMonth = String(end.getMonth() + 1).padStart(2, '0');

  // Format: "dd-MM - dd-MM"
  return `${startDay}-${startMonth} - ${endDay}-${endMonth}`;
}

/**
 * Parse result for ÖMC date input
 */
export interface OMCDateParseResult {
  startDate: Date;
  endDate: Date;
}

/**
 * Parse ÖMC date input string to start and end Date objects.
 * 
 * Supported formats:
 * - "8-9/3" → 8th-9th of March (current year)
 * - "8-9/03" → 8th-9th of March (current year)
 * - "8-9 mars" → 8th-9th of March (current year, Swedish)
 * - "8-9 mars 2025" → 8th-9th of March 2025
 * - "2025-03-08" → ISO date string (calculates +1 day for end)
 * 
 * @param input - User input string
 * @returns Object with startDate and endDate, or null if invalid
 * 
 * @example
 * parseOMCDateInput('8-9/3') // { startDate: Date(2025-03-08), endDate: Date(2025-03-09) }
 * parseOMCDateInput('8-9 mars 2025') // { startDate: Date(2025-03-08), endDate: Date(2025-03-09) }
 * parseOMCDateInput('2025-03-08') // { startDate: Date(2025-03-08), endDate: Date(2025-03-09) }
 * parseOMCDateInput('10-15/3') // null (non-consecutive days)
 */
export function parseOMCDateInput(input: string): OMCDateParseResult | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();

  // Pattern 1: ISO date format "YYYY-MM-DD"
  const isoPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
  const isoMatch = trimmed.match(isoPattern);
  if (isoMatch) {
    const startDate = new Date(trimmed);
    if (isNaN(startDate.getTime())) {
      return null;
    }
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
    
    // Validate consecutive days
    const validation = validateOMCDateRange(startDate, endDate);
    if (!validation.valid) {
      return null;
    }
    
    return { startDate, endDate };
  }

  // Pattern 2: "8-9/3" or "8-9/03" format (day-day/month)
  const shortPattern = /^(\d{1,2})-(\d{1,2})\/(\d{1,2})$/;
  const shortMatch = trimmed.match(shortPattern);
  if (shortMatch) {
    const startDay = parseInt(shortMatch[1], 10);
    const endDay = parseInt(shortMatch[2], 10);
    const month = parseInt(shortMatch[3], 10);
    const currentYear = new Date().getFullYear();

    // Validate consecutive days
    if (endDay !== startDay + 1) {
      return null;
    }

    const startDate = new Date(currentYear, month - 1, startDay);
    const endDate = new Date(currentYear, month - 1, endDay);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return null;
    }

    return { startDate, endDate };
  }

  // Pattern 3: "8-9 mars" or "8-9 mars 2025" format (Swedish month names)
  const swedishMonths = [
    'januari', 'februari', 'mars', 'april', 'maj', 'juni',
    'juli', 'augusti', 'september', 'oktober', 'november', 'december'
  ];
  
  // Support both with and without year
  const monthPattern = /^(\d{1,2})-(\d{1,2})\s+([a-zåäö]+)(?:\s+(\d{4}))?$/i;
  const monthMatch = trimmed.match(monthPattern);
  if (monthMatch) {
    const startDay = parseInt(monthMatch[1], 10);
    const endDay = parseInt(monthMatch[2], 10);
    const monthName = monthMatch[3].toLowerCase();
    const year = monthMatch[4] ? parseInt(monthMatch[4], 10) : new Date().getFullYear();

    // Validate consecutive days
    if (endDay !== startDay + 1) {
      return null;
    }

    // Find month index
    const monthIndex = swedishMonths.indexOf(monthName);
    if (monthIndex === -1) {
      return null;
    }

    const startDate = new Date(year, monthIndex, startDay);
    const endDate = new Date(year, monthIndex, endDay);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return null;
    }

    return { startDate, endDate };
  }

  // No pattern matched
  return null;
}

/**
 * Validation result for ÖMC date range
 */
export interface OMCDateValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate that ÖMC date range consists of consecutive days only.
 * 
 * Business rule: ÖMC training dates must be exactly 2 consecutive days.
 * End date must be exactly 1 day after start date.
 * 
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Validation result with error message if invalid
 * 
 * @example
 * validateOMCDateRange(new Date(2025, 2, 8), new Date(2025, 2, 9)) // { valid: true }
 * validateOMCDateRange(new Date(2025, 2, 8), new Date(2025, 2, 10)) // { valid: false, error: '...' }
 */
export function validateOMCDateRange(
  startDate: Date,
  endDate: Date
): OMCDateValidationResult {
  // Validate inputs are valid Date objects
  if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
    return {
      valid: false,
      error: 'Start date and end date must be valid Date objects',
    };
  }

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return {
      valid: false,
      error: 'Start date and end date must be valid dates',
    };
  }

  // Calculate day difference
  const dayDiff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  if (dayDiff !== 1) {
    return {
      valid: false,
      error: 'ÖMC-datum måste vara två på varandra följande dagar (slutdatum måste vara exakt 1 dag efter startdatum)',
    };
  }

  return { valid: true };
}

/**
 * Check if a date string or category indicates an ÖMC date.
 * 
 * @param category - Important date category
 * @returns True if category is ÖMC Dates
 */
export function isOMCDate(category: string): boolean {
  return category === 'ÖMC Dates';
}

/**
 * Format ÖMC date description for date_description field.
 * Formats as "7-8 mars" or "28 feb, 1 mars" if spanning two months.
 * 
 * @param startDate - Start date (ISO string or Date object)
 * @returns Formatted description string without year
 * 
 * @example
 * formatOMCDateDescription('2025-03-08') // Returns "8-9 mars"
 * formatOMCDateDescription('2025-02-28') // Returns "28 feb, 1 mars"
 */
export function formatOMCDateDescription(startDate: Date | string): string {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  
  // Validate date
  if (isNaN(start.getTime())) {
    return '';
  }
  
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = start.getMonth();
  const endMonth = end.getMonth();
  
  const swedishMonths = [
    'januari', 'februari', 'mars', 'april', 'maj', 'juni',
    'juli', 'augusti', 'september', 'oktober', 'november', 'december'
  ];
  
  const swedishMonthsShort = [
    'jan', 'feb', 'mar', 'apr', 'maj', 'jun',
    'jul', 'aug', 'sep', 'okt', 'nov', 'dec'
  ];
  
  // If same month: "7-8 mars"
  if (startMonth === endMonth) {
    const monthName = swedishMonths[startMonth];
    return `${startDay}-${endDay} ${monthName}`;
  }
  
  // If different months: "28 feb, 1 mars"
  const startMonthName = swedishMonthsShort[startMonth];
  const endMonthName = swedishMonths[endMonth];
  return `${startDay} ${startMonthName}, ${endDay} ${endMonthName}`;
}