import type { ImportantDate } from "@/lib/types/important-date";
import { formatOMCDate, isOMCDate } from "./omc-date-formatter";
import { formatTimeDisplay } from "./time-formatter";
import { format, isValid, parseISO } from "date-fns";
import { sv } from "date-fns/locale";

/**
 * Story 19.3: Unified date display formatting utility
 * 
 * Formats dates consistently across the application using dd-MM format.
 * Database storage remains ISO format (YYYY-MM-DD) - this only affects display.
 * Year is omitted as HR uses this for seasonal work (one year at a time).
 * 
 * Format rules:
 * - ÖMC Dates: Two-day range format "08-03 - 09-03"
 * - PE3 Dates with time: Date with time "07-03 14:30"
 * - Standard dates: "08-03" (dd-MM)
 * - Empty/null: Returns "—"
 * - Invalid dates: Returns "—"
 * 
 * @param date - Date to format (ISO string YYYY-MM-DD or Date object)
 * @param category - Optional date category ("ÖMC Dates", "PE3 Dates", "Stena Dates", etc.)
 * @param time - Optional time value for PE3 dates (HH:mm format)
 * @returns Formatted date string in dd-MM format
 * 
 * @example
 * formatDateForDisplay('2025-03-08') // "08-03"
 * formatDateForDisplay('2025-03-08', 'ÖMC Dates') // "08-03 - 09-03"
 * formatDateForDisplay('2025-03-07', 'PE3 Dates', '14:30') // "07-03 14:30"
 * formatDateForDisplay(null) // "—"
 */
export function formatDateForDisplay(
  date: string | Date | null | undefined,
  category?: string,
  time?: string | null
): string {
  // Handle null/undefined/empty values
  if (!date) {
    return "—";
  }

  // Parse the date
  let dateObj: Date;
  if (typeof date === "string") {
    // Handle ISO date strings (YYYY-MM-DD)
    // Use parseISO for accurate parsing without timezone issues
    dateObj = parseISO(date);
  } else {
    dateObj = date;
  }

  // Validate the parsed date
  if (!isValid(dateObj)) {
    return "—";
  }

  // ÖMC Dates: Two-day range format "dd-MM - dd-MM"
  if (category && isOMCDate(category)) {
    return formatOMCDate(dateObj);
  }

  // PE3 Dates with time: Include time in format "dd-MM HH:mm"
  if (category === "PE3 Dates" && time) {
    const formattedDate = format(dateObj, "dd-MM");
    const formattedTime = formatTimeDisplay(time);
    return `${formattedDate} ${formattedTime}`;
  }

  // Standard dates: "dd-MM" format
  return format(dateObj, "dd-MM");
}

/**
 * Format Important Date for dropdown display
 * 
 * Story 8.9: For ÖMC dates, displays two-day format (e.g., "8-9 mars 2025")
 * Story 8.10: For PE3 dates, displays date with time (e.g., "7 mars 2025 14:30")
 * Story 19.3: Updated to use formatDateForDisplay for consistent Swedish formatting
 * 
 * @param date - ImportantDate object
 * @returns Formatted string: "v. [number] - [formatted date]" or "[formatted date]"
 *          For ÖMC dates: "v. [number] - 8-9 mars 2025"
 *          For PE3 dates with time: "v. [number] - 7 mars 2025 14:30"
 *          For standard dates: "v. [number] - 8 mars 2025"
 * 
 * @example
 * formatImportantDateOption({ week_number: 14, date_value: "2025-02-14", category: "Stena Dates", ... })
 * // Returns: "v. 14 - 14 februari 2025"
 * 
 * @example
 * formatImportantDateOption({ week_number: 10, date_value: "2025-03-08", category: "ÖMC Dates", ... })
 * // Returns: "v. 10 - 8-9 mars 2025"
 * 
 * @example
 * formatImportantDateOption({ week_number: 10, date_value: "2025-03-15", time_value: "14:30", category: "PE3 Dates", ... })
 * // Returns: "v. 10 - 15 mars 2025 14:30"
 */
export function formatImportantDateOption(date: ImportantDate): string {
  // Story 19.3: Use unified formatDateForDisplay for consistent Swedish formatting
  const displayText = formatDateForDisplay(date.date_value, date.category, date.time_value);
  
  if (date.week_number !== null && date.week_number !== undefined) {
    return `v. ${date.week_number} - ${displayText}`;
  }
  return displayText;
}
